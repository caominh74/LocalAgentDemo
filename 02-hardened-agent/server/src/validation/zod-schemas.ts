import { z } from 'zod';
import { zodToJsonSchema as _zodToJsonSchema } from 'zod-to-json-schema';
const zodToJsonSchema: (schema: any, options?: any) => any = _zodToJsonSchema;

// 1. read schema
export const ReadToolSchema = z.object({
  path: z.string().min(1, 'path cannot be empty').describe('Relative path to the file within workspace (e.g. "sample.txt", "./package.json")'),
  offset: z.number().int().positive('offset must be a positive integer (1-indexed)').optional().default(1).describe('Optional 1-indexed line offset to start reading from'),
  limit: z.number().int().positive('limit must be a positive integer').max(5000, 'limit cannot exceed 5000 lines').optional().describe('Optional maximum number of lines to read (max 5000)'),
});

// 2. write schema
export const WriteToolSchema = z.object({
  path: z.string().min(1, 'path cannot be empty').describe('Relative path to the file to create or overwrite'),
  content: z.string({ required_error: 'content is required' }).describe('Full textual content to write into the file'),
});

// 3. edit schema (catches missing oldText or empty strings)
export const EditToolSchema = z.object({
  path: z.string().min(1, 'path cannot be empty').describe('Relative path to the file to edit (e.g. "./package.json")'),
  oldText: z.string().min(1, 'oldText is required and cannot be empty').describe('Exact non-empty text chunk to replace (must be at least 1 character)'),
  newText: z.string({ required_error: 'newText is required' }).describe('New replacement text block'),
});

// 4. bash schema
export const BashToolSchema = z.object({
  command: z
    .string()
    .min(1, 'command cannot be empty')
    .describe('Host-shell command. On Windows this runs in PowerShell (e.g. Remove-Item, Get-Date). On macOS/Linux this runs in bash.'),
  timeout: z.number().int().positive('timeout must be a positive millisecond value').max(120000, 'timeout cannot exceed 120s').optional().default(30000).describe('Maximum execution time in milliseconds (default 30000)'),
});

// 5. list_dir schema (catches string depths like "maximum")
export const ListDirToolSchema = z.object({
  path: z.string().min(1, 'path cannot be empty').optional().default('.').describe('Relative directory path to inspect (defaults to ".")'),
  depth: z.number({ invalid_type_error: 'depth must be a number, not a string' }).int().min(1).max(10, 'depth cannot exceed 10').optional().default(1).describe('Maximum recursion depth as an integer between 1 and 10 (do not pass strings)'),
}).strict();

export const ToolSchemas = {
  read: ReadToolSchema,
  write: WriteToolSchema,
  edit: EditToolSchema,
  bash: BashToolSchema,
  list_dir: ListDirToolSchema,
};

export type ToolName = keyof typeof ToolSchemas;

export function getOpenAIToolDefinitions(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'read',
        description: 'Read file contents from the workspace filesystem with strict path boundaries.',
        parameters: zodToJsonSchema(ReadToolSchema, { target: 'openApi3' }) as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'write',
        description: 'Create a new file or overwrite an existing file. Requires Tier 2 approval.',
        parameters: zodToJsonSchema(WriteToolSchema, { target: 'openApi3' }) as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'edit',
        description: 'Perform surgical search-and-replace of an exact text block in a file. Requires Tier 2 approval.',
        parameters: zodToJsonSchema(EditToolSchema, { target: 'openApi3' }) as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'bash',
        description: 'Execute a host-shell command (PowerShell on Windows, bash on macOS/Linux). Requires Tier 3 confirmation with command preview.',
        parameters: zodToJsonSchema(BashToolSchema, { target: 'openApi3' }) as any,
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_dir',
        description: 'Inspect directory structures and file hierarchy safely.',
        parameters: zodToJsonSchema(ListDirToolSchema, { target: 'openApi3' }) as any,
      },
    },
  ];
}
