import { Injectable } from '@nestjs/common';

export enum ActionTier {
  TIER_1_SAFE = 'TIER_1_SAFE',
  TIER_2_MUTATE = 'TIER_2_MUTATE',
  TIER_3_HIGH_RISK = 'TIER_3_HIGH_RISK',
}

export interface PermissionCheck {
  tier: ActionTier;
  requiresApproval: boolean;
  label: string;
  description: string;
}

@Injectable()
export class PermissionGuard {
  evaluate(toolName: string): PermissionCheck {
    switch (toolName) {
      case 'read':
      case 'list_dir':
        return {
          tier: ActionTier.TIER_1_SAFE,
          requiresApproval: false,
          label: 'Safe (MCP Read-Only)',
          description: 'Autonomous execution via MCP stdio client.',
        };

      case 'write':
      case 'edit':
        return {
          tier: ActionTier.TIER_2_MUTATE,
          requiresApproval: true,
          label: 'Mutate (MCP Workspace Write)',
          description: 'Modifies files via MCP tool. Requires interactive confirmation.',
        };

      case 'bash':
        return {
          tier: ActionTier.TIER_3_HIGH_RISK,
          requiresApproval: true,
          label: 'High-Risk (MCP Shell Execution)',
          description: 'Executes command via isolated MCP runner. Full preview and confirmation required.',
        };

      default:
        return {
          tier: ActionTier.TIER_3_HIGH_RISK,
          requiresApproval: true,
          label: 'Unknown Tool (High-Risk)',
          description: 'Dynamic tool requires manual authorization.',
        };
    }
  }
}
