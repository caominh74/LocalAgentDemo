import { Injectable } from '@nestjs/common';
import { ToolSchemas, ToolName } from './zod-schemas';

export interface ValidationResult {
  valid: boolean;
  data?: any;
  errors?: string[];
  feedback?: string;
}

@Injectable()
export class ValidatorService {
  validate(toolName: string, rawArgs: any): ValidationResult {
    const schema = ToolSchemas[toolName as ToolName];
    if (!schema) {
      return {
        valid: false,
        errors: [`Unknown tool: "${toolName}"`],
        feedback: `The tool "${toolName}" does not exist. Available tools: ${Object.keys(ToolSchemas).join(', ')}.`,
      };
    }

    const result = schema.safeParse(rawArgs);

    if (!result.success) {
      const fieldErrors = result.error.errors.map((e) => {
        const path = e.path.length > 0 ? e.path.join('.') : 'root';
        return `[Parameter '${path}']: ${e.message}`;
      });

      const structuredFeedback = [
        `Schema Validation Failed for tool "${toolName}":`,
        ...fieldErrors.map((err) => ` - ${err}`),
        `Please correct your arguments and try calling the tool again with valid parameters.`,
      ].join('\n');

      return {
        valid: false,
        errors: fieldErrors,
        feedback: structuredFeedback,
      };
    }

    return {
      valid: true,
      data: result.data,
    };
  }
}
