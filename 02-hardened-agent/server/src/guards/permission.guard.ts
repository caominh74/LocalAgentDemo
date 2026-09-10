import { Injectable } from '@nestjs/common';

export enum ActionTier {
  TIER_1_SAFE = 'TIER_1_SAFE',         // read, list_dir -> Autonomous
  TIER_2_MUTATE = 'TIER_2_MUTATE',     // write, edit -> User approval
  TIER_3_HIGH_RISK = 'TIER_3_HIGH_RISK' // bash -> High risk approval
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
          label: 'Safe (Read-Only)',
          description: 'Autonomous execution permitted.',
        };

      case 'write':
      case 'edit':
        return {
          tier: ActionTier.TIER_2_MUTATE,
          requiresApproval: true,
          label: 'Mutate (Workspace Write)',
          description: 'Modifies files in the workspace. Requires interactive confirmation.',
        };

      case 'bash':
        return {
          tier: ActionTier.TIER_3_HIGH_RISK,
          requiresApproval: true,
          label: 'High-Risk (Shell Execution)',
          description: 'Executes arbitrary command in host shell. Strict approval with preview required.',
        };

      default:
        return {
          tier: ActionTier.TIER_3_HIGH_RISK,
          requiresApproval: true,
          label: 'Unknown Tool (High-Risk)',
          description: 'Unrecognized tool requires manual authorization.',
        };
    }
  }
}
