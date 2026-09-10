import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LlmService, ChatMessage } from '../llm/llm.service';
import { McpClientService } from '../mcp/mcp-client.service';
import { PermissionGuard, ActionTier } from '../guards/permission.guard';
import type { Response } from 'express';

export interface PendingActionFrame {
  actionId: string;
  toolCallId: string;
  toolName: string;
  args: any;
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
    private readonly mcpClientService: McpClientService,
    private readonly permissionGuard: PermissionGuard
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
    const maxIterations = 6;
    let iteration = 0;

    try {
      while (iteration < maxIterations) {
        iteration++;

        // 1. Invoke LLM with dynamic MCP tools
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

            let parsedArgs: any;
            try {
              parsedArgs = JSON.parse(rawArgsString);
            } catch (jsonErr: any) {
              this.sendSSE(res, 'TOOL_ERROR', {
                toolCallId: toolCall.id,
                toolName,
                rawArgs: rawArgsString,
                error: `MCP payload JSON syntax error: ${jsonErr.message}`,
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Error: Invalid JSON syntax for MCP tool: ${jsonErr.message}`,
              });
              continue;
            }

            // Emit tool intent & MCP dispatch trace
            this.sendSSE(res, 'TOOL_DISPATCH_MCP', {
              toolCallId: toolCall.id,
              toolName,
              arguments: parsedArgs,
            });

            // Permission Evaluation
            const perm = this.permissionGuard.evaluate(toolName);

            if (perm.requiresApproval) {
              // Pause loop for HITL gate
              const actionId = uuidv4();
              this.pendingActions.set(actionId, {
                actionId,
                toolCallId: toolCall.id,
                toolName,
                args: parsedArgs,
                tier: perm.tier,
                conversation,
                res,
                options,
              });

              this.sendSSE(res, 'APPROVAL_REQUIRED', {
                actionId,
                toolCallId: toolCall.id,
                toolName,
                arguments: parsedArgs,
                tier: perm.tier,
                label: perm.label,
                description: perm.description,
              });

              needsHitlPause = true;
              break;
            }

            // Execute Tier 1 tool via MCP Client over stdio
            try {
              const result = await this.mcpClientService.callTool(toolName, parsedArgs);

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
            } catch (mcpErr: any) {
              this.sendSSE(res, 'TOOL_ERROR', {
                toolCallId: toolCall.id,
                toolName,
                error: mcpErr.message,
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `MCP Protocol Error: ${mcpErr.message}`,
              });
            }
          }

          if (needsHitlPause) {
            return;
          }
        } else {
          // Final text synthesis
          this.sendSSE(res, 'FINAL_ANSWER', {
            content: assistantMessage.content || '',
          });
          res.end();
          return;
        }
      }
    } catch (err: any) {
      this.sendSSE(res, 'ERROR', {
        message: err.message || 'MCP Agent loop error',
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
      this.sendSSE(res, 'ACTION_REJECTED', {
        actionId,
        toolName: frame.toolName,
        reason: reason || 'Action denied by user operator.',
      });

      frame.conversation.push({
        role: 'tool',
        tool_call_id: frame.toolCallId,
        content: `Execution Denied: The operator rejected ${frame.toolName}. Reason: ${reason || 'Action denied.'}`,
      });

      await this.runAgentLoop(frame.conversation, res, frame.options);
      return;
    }

    this.sendSSE(res, 'ACTION_APPROVED', {
      actionId,
      toolName: frame.toolName,
      arguments: frame.args,
    });

    try {
      // Execute via MCP stdio client
      const result = await this.mcpClientService.callTool(frame.toolName, frame.args);

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

      await this.runAgentLoop(frame.conversation, res, frame.options);
    } catch (mcpErr: any) {
      this.sendSSE(res, 'TOOL_ERROR', {
        toolCallId: frame.toolCallId,
        toolName: frame.toolName,
        error: mcpErr.message,
      });

      frame.conversation.push({
        role: 'tool',
        tool_call_id: frame.toolCallId,
        content: `MCP Execution Error: ${mcpErr.message}`,
      });

      await this.runAgentLoop(frame.conversation, res, frame.options);
    }
  }
}
