import { Controller, Post, Body, Res, Get } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmService, ChatMessage } from '../llm/llm.service';
import type { Response } from 'express';

@Controller('api/chat')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly llmService: LlmService
  ) {}

  @Get('config')
  getConfig() {
    return {
      name: '01-basic-agent',
      port: 3001,
      mode: 'naive',
      systemPrompt: this.llmService.getSystemPrompt(),
      toolsSchema: this.llmService.getToolsSchema(),
      defaultBaseUrl: process.env.LLM_BASE_URL || 'http://localhost:1234/v1',
      defaultModel: process.env.LLM_MODEL || 'qwen3.8-4b',
      defaultApiKey: process.env.LLM_API_KEY || 'lm-studio',
    };
  }

  @Post('stream')
  async streamChat(
    @Body()
    body: {
      messages: ChatMessage[];
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    },
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await this.agentService.runAgentLoop(body.messages, res, {
      baseUrl: body.baseUrl,
      model: body.model,
      apiKey: body.apiKey,
    });
  }
}
