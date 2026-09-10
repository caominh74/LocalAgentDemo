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
  private systemPrompt: string;
  private toolsSchema: any[];

  constructor() {
    const promptsDir = path.resolve(__dirname, '../../../prompts');
    const systemPromptPath = path.join(promptsDir, 'system-prompt.txt');

    this.systemPrompt = fs.existsSync(systemPromptPath)
      ? fs.readFileSync(systemPromptPath, 'utf-8').trim()
      : 'You are a defensively guarded coding assistant.';

    // Dynamically derive schemas from strict Zod definitions
    this.toolsSchema = getOpenAIToolDefinitions();
  }

  getSystemPrompt(): string {
    return this.systemPrompt;
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
    const baseUrl = (options?.baseUrl || process.env.LLM_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
    const model = options?.model || process.env.LLM_MODEL || 'llama3.2';
    const apiKey = options?.apiKey || process.env.LLM_API_KEY || 'ollama';

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: this.systemPrompt },
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
