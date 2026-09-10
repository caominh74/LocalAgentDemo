import { Controller, Post, Body, Res, Get } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmService, ChatMessage } from '../llm/llm.service';
import { McpClientService } from '../mcp/mcp-client.service';
import { Response } from 'express';

@Controller('api')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly llmService: LlmService,
    private readonly mcpClientService: McpClientService
  ) {}

  @Get('chat/config')
  getConfig() {
    return {
      name: '03-mcp-agent',
      port: 3003,
      mode: 'mcp-decoupled',
      systemPrompt: this.llmService.getSystemPrompt(),
      dynamicTools: this.mcpClientService.getOpenAiTools(),
      defaultBaseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
      defaultModel: process.env.LLM_MODEL || 'llama3.2',
    };
  }

  @Get('mcp/status')
  getMcpStatus() {
    return this.mcpClientService.getStatus();
  }

  @Post('chat/stream')
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

  @Post('chat/action/approve')
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

  @Post('chat/action/reject')
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
