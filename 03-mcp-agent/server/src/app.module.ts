import { Module } from '@nestjs/common';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { McpClientService } from './mcp/mcp-client.service';
import { PermissionGuard } from './guards/permission.guard';
import { LlmService } from './llm/llm.service';

@Module({
  imports: [],
  controllers: [AgentController],
  providers: [AgentService, McpClientService, PermissionGuard, LlmService],
})
export class AppModule {}
