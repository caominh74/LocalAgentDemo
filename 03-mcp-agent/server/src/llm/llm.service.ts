import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { McpClientService } from '../mcp/mcp-client.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

@Injectable()
export class LlmService {
  private systemPromptPath: string;

  constructor(private readonly mcpClientService: McpClientService) {
    const promptsDir = path.resolve(__dirname, '../../../prompts');
    this.systemPromptPath = path.join(promptsDir, 'system-prompt.txt');
  }

  getSystemPrompt(): string {
    if (fs.existsSync(this.systemPromptPath)) {
      return fs.readFileSync(this.systemPromptPath, 'utf-8').trim();
    }
    return 'You are an AI programming assistant connected to an external Model Context Protocol (MCP) server.';
  }

  async callChatCompletion(
    messages: ChatMessage[],
    options?: {
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    }
  ): Promise<any> {
    const baseUrl = (options?.baseUrl?.trim() || process.env.LLM_BASE_URL || 'http://localhost:1234/v1').replace(/\/+$/, '');
    const model = options?.model?.trim() || process.env.LLM_MODEL || 'qwen3.8-4b';
    const apiKey = options?.apiKey?.trim() || process.env.LLM_API_KEY || 'lm-studio';

    // Dynamically retrieve tools discovered from MCP server
    const tools = this.mcpClientService.getOpenAiTools();

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...messages,
    ];

    const body: any = {
      model,
      messages: fullMessages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: false,
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM completion failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message;
  }
}
