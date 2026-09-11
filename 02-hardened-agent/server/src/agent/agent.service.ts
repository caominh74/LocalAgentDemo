import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LlmService, ChatMessage } from '../llm/llm.service';
import { ValidatorService } from '../validation/validator.service';
import { PermissionGuard, ActionTier } from '../guards/permission.guard';
import { ToolsService } from '../tools/tools.service';
import type { Response } from 'express';

export interface PendingActionFrame {
  actionId: string;
  toolCallId: string;
  toolName: string;
  validatedArgs: any;
  tier: ActionTier;
  conversation: ChatMessage[];
  res?: Response;
  options?: { baseUrl?: string; model?: string; apiKey?: string };
}

@Injectable()
export class AgentService {
  private pendingActions = new Map<string, PendingActionFrame>();

  constructor(
    private readonly llmService: LlmService,
    private readonly validatorService: ValidatorService,
    private readonly permissionGuard: PermissionGuard,
    private readonly toolsService: ToolsService
  ) {}

  private sendSSE(res: Response, type: string, data: any) {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    }
  }

  async runAgentLoop(
    messages: ChatMessage[],
    res: Response,
    options?: { baseUrl?: string; model?: string; apiKey?: string }
  ): Promise<void> {
    const conversation: ChatMessage[] = [...messages];
    const maxIterations = 8;
    let iteration = 0;
    const retryTracker = new Map<string, number>();

    try {
      while (iteration < maxIterations) {
        iteration++;

        // 1. Invoke LLM
        const assistantMessage = await this.llmService.callChatCompletion(conversation, options);

        if (!assistantMessage) {
          throw new Error('LLM returned an empty response');
        }

        conversation.push(assistantMessage);

        // 2. Check for tool invocations
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          let needsHitlPause = false;

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const rawArgsString = toolCall.function.arguments;

            // Step A: Parse JSON safely
            let parsedArgs: any;
            try {
              parsedArgs = JSON.parse(rawArgsString);
            } catch (jsonErr: any) {
              this.sendSSE(res, 'VALIDATION_FAILED', {
                toolCallId: toolCall.id,
                toolName,
                rawArgs: rawArgsString,
                error: `JSON syntax error: ${jsonErr.message}`,
                badge: 'Hallucinated',
              });

              // Push feedback for self-correction
              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Invalid JSON syntax in arguments: ${jsonErr.message}. Please provide valid JSON.`,
              });
              continue;
            }

            // Step B: Zod Schema Validation
            const validation = this.validatorService.validate(toolName, parsedArgs);

            if (!validation.valid) {
              const currentRetries = (retryTracker.get(toolName) || 0) + 1;
              retryTracker.set(toolName, currentRetries);

              // Circuit Breaker Check (Max 2 retries)
              if (currentRetries > 2) {
                this.sendSSE(res, 'CIRCUIT_BREAKER_TRIPPED', {
                  toolCallId: toolCall.id,
                  toolName,
                  retries: currentRetries,
                  errors: validation.errors,
                  badge: 'Circuit Breaker',
                  message: `Circuit breaker tripped for "${toolName}". Exceeded maximum 2 retries with invalid arguments.`,
                });

                conversation.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: `Execution halted: Circuit breaker tripped after 2 failed validation attempts for ${toolName}.`,
                });
                break;
              }

              // Self-Correction Loop Triggered
              this.sendSSE(res, 'VALIDATION_FAILED', {
                toolCallId: toolCall.id,
                toolName,
                arguments: parsedArgs,
                errors: validation.errors,
                retryCount: currentRetries,
                badge: 'Hallucinated',
              });

              this.sendSSE(res, 'SELF_CORRECTING', {
                toolCallId: toolCall.id,
                toolName,
                retryCount: currentRetries,
                badge: 'Correcting',
                feedback: validation.feedback,
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: validation.feedback || 'Validation failed. Please correct parameters.',
              });
              // Loop continues to re-query LLM for self-correction
              continue;
            }

            // Step C: Validation Passed
            const validatedArgs = validation.data;
            this.sendSSE(res, 'VALIDATION_PASSED', {
              toolCallId: toolCall.id,
              toolName,
              arguments: validatedArgs,
              badge: 'Passed',
            });

            // Step D: 3-Tier Permission Guard
            const perm = this.permissionGuard.evaluate(toolName);

            if (perm.requiresApproval) {
              // Pause execution and create Pending Action Frame
              const actionId = uuidv4();
              this.pendingActions.set(actionId, {
                actionId,
                toolCallId: toolCall.id,
                toolName,
                validatedArgs,
                tier: perm.tier,
                conversation,
                res,
                options,
              });

              this.sendSSE(res, 'APPROVAL_REQUIRED', {
                actionId,
                toolCallId: toolCall.id,
                toolName,
                arguments: validatedArgs,
                tier: perm.tier,
                label: perm.label,
                description: perm.description,
              });

              needsHitlPause = true;
              break; // Suspend current loop iteration until user responds
            }

            // Autonomous Tier 1 Execution
            this.sendSSE(res, 'TOOL_EXECUTING', {
              toolCallId: toolCall.id,
              toolName,
              arguments: validatedArgs,
            });

            try {
              const result = await this.toolsService.executeTool(toolName, validatedArgs);
              this.sendSSE(res, 'TOOL_RESULT', {
                toolCallId: toolCall.id,
                toolName,
                result,
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
              });
            } catch (toolErr: any) {
              this.sendSSE(res, 'TOOL_ERROR', {
                toolCallId: toolCall.id,
                toolName,
                error: toolErr.message,
              });
              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Tool Execution Error: ${toolErr.message}`,
              });
            }
          }

          if (needsHitlPause) {
            // Do not close connection or emit final answer; waiting for user action
            return;
          }
        } else {
          // Final text reply from model
          this.sendSSE(res, 'FINAL_ANSWER', {
            content: assistantMessage.content || '',
          });
          res.end();
          return;
        }
      }
    } catch (err: any) {
      this.sendSSE(res, 'ERROR', {
        message: err.message || 'Defensive loop exception',
      });
      res.end();
    }
  }

  // Resume paused execution after User Approval / Rejection
  async resumeAction(
    actionId: string,
    approved: boolean,
    res: Response,
    reason?: string
  ): Promise<void> {
    const frame = this.pendingActions.get(actionId);
    if (!frame) {
      throw new Error(`No pending action found for ID: ${actionId}`);
    }

    this.pendingActions.delete(actionId);

    if (!approved) {
      const blocked =
        frame.toolName === 'bash'
          ? String(frame.validatedArgs?.command ?? '')
          : JSON.stringify(frame.validatedArgs);
      const denialReason = reason || 'User declined approval.';
      const content =
        `Operator denied this ${frame.toolName} command. It was NOT executed, so no files were changed.\n\n` +
        `Blocked command: ${blocked}\n` +
        `Reason: ${denialReason}`;

      this.sendSSE(res, 'ACTION_REJECTED', {
        actionId,
        toolCallId: frame.toolCallId,
        toolName: frame.toolName,
        reason: denialReason,
        command: blocked,
      });

      // Do not ask the model to summarize a denial. Small local models treat
      // "delete debug.log" as a completed story and claim success anyway.
      this.sendSSE(res, 'FINAL_ANSWER', { content });
      res.end();
      return;
    }

    // User approved execution
    this.sendSSE(res, 'ACTION_APPROVED', {
      actionId,
      toolName: frame.toolName,
      arguments: frame.validatedArgs,
    });

    try {
      const result = await this.toolsService.executeTool(frame.toolName, frame.validatedArgs);

      this.sendSSE(res, 'TOOL_RESULT', {
        toolCallId: frame.toolCallId,
        toolName: frame.toolName,
        result,
      });

      frame.conversation.push({
        role: 'tool',
        tool_call_id: frame.toolCallId,
        content: result,
      });

      // Resume loop with tool result
      await this.runAgentLoop(frame.conversation, res, frame.options);
    } catch (toolErr: any) {
      this.sendSSE(res, 'TOOL_ERROR', {
        toolCallId: frame.toolCallId,
        toolName: frame.toolName,
        error: toolErr.message,
      });

      frame.conversation.push({
        role: 'tool',
        tool_call_id: frame.toolCallId,
        content: `Error executing approved action: ${toolErr.message}`,
      });

      await this.runAgentLoop(frame.conversation, res, frame.options);
    }
  }
}
