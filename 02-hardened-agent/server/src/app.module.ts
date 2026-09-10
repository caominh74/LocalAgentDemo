import { Module } from '@nestjs/common';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { ValidatorService } from './validation/validator.service';
import { PermissionGuard } from './guards/permission.guard';
import { ToolsService } from './tools/tools.service';
import { LlmService } from './llm/llm.service';

@Module({
  imports: [],
  controllers: [AgentController],
  providers: [
    AgentService,
    ValidatorService,
    PermissionGuard,
    ToolsService,
    LlmService,
  ],
})
export class AppModule {}
