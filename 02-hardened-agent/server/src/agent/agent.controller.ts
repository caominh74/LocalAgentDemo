import { Controller, Post, Body, Res, Get } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmService, ChatMessage } from '../llm/llm.service';
import { Response } from 'express';

@Controller('api/chat')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly llmService: LlmService
  ) {}

  @Get('config')
  getConfig() {
    return {
      name: '02-hardened-agent',
      port: 3002,
      mode: 'hardened',
      systemPrompt: this.llmService.getSystemPrompt(),
      toolsSchema: this.llmService.getToolsSchema(),
      defaultBaseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
      defaultModel: process.env.LLM_MODEL || 'llama3.2',
      maxRetries: 2,
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

  @Post('action/approve')
  async approveAction(
    @Body() body: { actionId: string },
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await this.agentService.resumeAction(body.actionId, true, res);
  }

  @Post('action/reject')
  async rejectAction(
    @Body() body: { actionId: string; reason?: string },
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await this.agentService.resumeAction(body.actionId, false, res, body.reason);
  }
}
