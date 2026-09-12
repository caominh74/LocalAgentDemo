import { Injectable } from '@nestjs/common';
import { LlmService, ChatMessage } from '../llm/llm.service';
import { ToolsService } from '../tools/tools.service';
import type { Response } from 'express';

export interface StreamEvent {
  type:
    | 'TOKEN'
    | 'LLM_ROUND_START'
    | 'LLM_ROUND_DONE'
    | 'TOOL_INVOCATION'
    | 'TOOL_RESULT'
    | 'TOOL_ERROR'
    | 'FINAL_ANSWER'
    | 'ERROR';
  data: any;
}

@Injectable()
export class AgentService {
  constructor(
    private readonly llmService: LlmService,
    private readonly toolsService: ToolsService
  ) {}

  private sendSSE(res: Response, event: StreamEvent) {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.socket?.setNoDelay(true);
    const flush = (res as Response & { flush?: () => void }).flush;
    if (typeof flush === 'function') flush.call(res);
  }

  async runAgentLoop(
    messages: ChatMessage[],
    res: Response,
    options?: { baseUrl?: string; model?: string; apiKey?: string }
  ): Promise<void> {
    const conversation: ChatMessage[] = [...messages];
    const maxIterations = 8;
    let iteration = 0;

    try {
      while (iteration < maxIterations) {
        iteration++;

        const roundId = crypto.randomUUID();
        this.sendSSE(res, {
          type: 'LLM_ROUND_START',
          data: { roundId, iteration, maxIterations },
        });

        const assistantMessage = await this.llmService.callChatCompletion(conversation, options);

        if (!assistantMessage) {
          throw new Error('LLM returned an empty response');
        }

        const toolCount = assistantMessage.tool_calls?.length ?? 0;
        this.sendSSE(res, {
          type: 'LLM_ROUND_DONE',
          data: { roundId, iteration, hasToolCalls: toolCount > 0, toolCount },
        });

        conversation.push(assistantMessage);

        // 2. Check for tool invocations
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const rawArgsString = toolCall.function.arguments;

            // Naive Execution: Blind JSON.parse with no schema validation
            let parsedArgs: any;
            try {
              parsedArgs = JSON.parse(rawArgsString);
            } catch (jsonErr: any) {
              this.sendSSE(res, {
                type: 'TOOL_ERROR',
                data: {
                  toolCallId: toolCall.id,
                  toolName,
                  rawArgs: rawArgsString,
                  error: `Naive JSON.parse syntax error: ${jsonErr.message}`,
                },
              });
              // In naive agent, push raw failure to history and abort iteration
              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Error: Invalid JSON arguments: ${jsonErr.message}`,
              });
              continue;
            }

            // Emit tool invocation event to UI trace
            this.sendSSE(res, {
              type: 'TOOL_INVOCATION',
              data: {
                toolCallId: toolCall.id,
                toolName,
                arguments: parsedArgs,
                rawArguments: rawArgsString,
              },
            });

            // Blind execution of the tool
            try {
              const toolResult = await this.toolsService.executeTool(toolName, parsedArgs);

              this.sendSSE(res, {
                type: 'TOOL_RESULT',
                data: {
                  toolCallId: toolCall.id,
                  toolName,
                  result: toolResult,
                },
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResult,
              });
            } catch (toolErr: any) {
              this.sendSSE(res, {
                type: 'TOOL_ERROR',
                data: {
                  toolCallId: toolCall.id,
                  toolName,
                  arguments: parsedArgs,
                  error: toolErr.message || String(toolErr),
                  stack: toolErr.stack,
                },
              });

              conversation.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `Runtime Execution Error: ${toolErr.message}`,
              });
            }
          }
        } else {
          // Final text response
          this.sendSSE(res, {
            type: 'FINAL_ANSWER',
            data: {
              content: assistantMessage.content || '',
            },
          });
          break;
        }
      }
    } catch (err: any) {
      this.sendSSE(res, {
        type: 'ERROR',
        data: {
          message: err.message || 'Fatal error during agent execution',
          stack: err.stack,
        },
      });
    } finally {
      res.end();
    }
  }
}
