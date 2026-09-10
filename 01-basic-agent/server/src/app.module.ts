import { Module } from '@nestjs/common';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { ToolsService } from './tools/tools.service';
import { LlmService } from './llm/llm.service';

@Module({
  imports: [],
  controllers: [AgentController],
  providers: [AgentService, ToolsService, LlmService],
})
export class AppModule {}
