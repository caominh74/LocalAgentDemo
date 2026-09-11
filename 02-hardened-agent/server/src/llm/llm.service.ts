import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenAIToolDefinitions } from '../validation/zod-schemas';

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
  private toolsSchema: any[];

  constructor() {
    const promptsDir = path.resolve(__dirname, '../../../prompts');
    this.systemPromptPath = path.join(promptsDir, 'system-prompt.txt');

    // Dynamically derive schemas from strict Zod definitions
    this.toolsSchema = getOpenAIToolDefinitions();
  }

  getSystemPrompt(): string {
    const base = fs.existsSync(this.systemPromptPath)
      ? fs.readFileSync(this.systemPromptPath, 'utf-8').trim()
      : 'You are a defensively guarded coding assistant.';
    const host =
      process.platform === 'win32'
        ? 'Host environment: Windows. The bash tool executes in PowerShell. Prefer PowerShell cmdlets such as Remove-Item, Get-Date, and Get-ChildItem.'
        : 'Host environment: Unix. The bash tool executes in bash. Prefer POSIX commands such as rm, date, and ls.';
    return `${base}\n\n${host}`;
  }

  getToolsSchema(): any[] {
    return this.toolsSchema;
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

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...messages,
    ];

    const body: any = {
      model,
      messages: fullMessages,
      tools: this.toolsSchema,
      tool_choice: 'auto',
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
