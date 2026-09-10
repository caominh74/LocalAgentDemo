import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

const workspaceRoot = path.resolve(process.env.WORKSPACE_DIR || path.join(__dirname, '../../sandbox'));
if (!fs.existsSync(workspaceRoot)) {
  fs.mkdirSync(workspaceRoot, { recursive: true });
}

function resolvePath(targetPath: string): string {
  const resolved = path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(workspaceRoot, targetPath);
  const normalizedRoot = path.normalize(workspaceRoot);
  const normalizedResolved = path.normalize(resolved);
  if (!normalizedResolved.startsWith(normalizedRoot)) {
    throw new Error(`Security Violation: Access denied. Path '${targetPath}' is outside the sandbox directory.`);
  }
  return resolved;
}

// 1. read
async function toolRead(args: { path: string; offset?: number; limit?: number }): Promise<string> {
  const filePath = resolvePath(args.path);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${args.path}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const offset = args.offset ?? 1;
  const limit = args.limit ?? lines.length;
  return lines.slice(offset - 1, offset - 1 + limit).join('\n');
}

// 2. write
async function toolWrite(args: { path: string; content: string }): Promise<string> {
  const filePath = resolvePath(args.path);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, args.content, 'utf-8');
  const bytes = Buffer.byteLength(args.content, 'utf-8');
  return `Successfully wrote ${bytes} bytes to ${args.path}`;
}

// 3. edit
async function toolEdit(args: { path: string; oldText: string; newText: string }): Promise<string> {
  const filePath = resolvePath(args.path);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${args.path}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes(args.oldText)) {
    throw new Error(`Target oldText block not found in ${args.path}`);
  }
  const newContent = content.replace(args.oldText, args.newText);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return `Successfully replaced text chunk in ${args.path}`;
}

// 4. bash
async function toolBash(args: { command: string; timeout?: number }): Promise<string> {
  const timeout = args.timeout || 30000;
  return new Promise((resolve) => {
    exec(
      args.command,
      {
        cwd: workspaceRoot,
        timeout,
        maxBuffer: 1024 * 1024 * 10,
        shell: process.platform === 'win32' ? 'powershell.exe' : undefined,
      },
      (error, stdout, stderr) => {
        const output = (stdout || '') + (stderr ? `\n[STDERR]\n${stderr}` : '');
        if (error) {
          resolve(`[Exit Code ${error.code ?? 1}]\n${output || error.message}`);
        } else {
          resolve(output || '(command completed with empty output)');
        }
      }
    );
  });
}

// 5. list_dir
async function toolListDir(args: { path?: string; depth?: number }): Promise<string> {
  const dirPath = resolvePath(args.path || '.');
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${args.path || '.'}`);
  }
  const maxDepth = args.depth || 1;

  const walk = (currentDir: string, currentDepth: number): string[] => {
    if (currentDepth > maxDepth) return [];
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const rel = path.relative(workspaceRoot, path.join(currentDir, entry.name));
      const prefix = entry.isDirectory() ? '[DIR] ' : '[FILE]';
      results.push(`${'  '.repeat(currentDepth - 1)}${prefix} ${rel}`);
      if (entry.isDirectory() && currentDepth < maxDepth) {
        results.push(...walk(path.join(currentDir, entry.name), currentDepth + 1));
      }
    }
    return results;
  };

  const tree = walk(dirPath, 1);
  return tree.length > 0 ? tree.join('\n') : '(empty directory)';
}

const server = new Server(
  {
    name: 'mcp-agent-tools-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// MCP Tool Discovery Handler: ListToolsRequestSchema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read',
        description: 'Read file contents from workspace filesystem (MCP Tool).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Relative or absolute file path' },
            offset: { type: 'number', description: '1-indexed line offset to start reading from' },
            limit: { type: 'number', description: 'Maximum number of lines to return' },
          },
          required: ['path'],
        },
      },
      {
        name: 'write',
        description: 'Write or overwrite file contents (MCP Tool).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Target file path' },
            content: { type: 'string', description: 'Textual content to write' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'edit',
        description: 'Surgical search and replace text in file (MCP Tool).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Target file path' },
            oldText: { type: 'string', description: 'Exact text chunk to replace' },
            newText: { type: 'string', description: 'Replacement text' },
          },
          required: ['path', 'oldText', 'newText'],
        },
      },
      {
        name: 'bash',
        description: 'Execute shell command in workspace (MCP Tool).',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command string to execute in host shell' },
            timeout: { type: 'number', description: 'Execution timeout in milliseconds' },
          },
          required: ['command'],
        },
      },
      {
        name: 'list_dir',
        description: 'Inspect directory tree and structure (MCP Tool).',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Directory path to inspect' },
            depth: { type: 'number', description: 'Maximum traversal depth' },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// MCP Tool Execution Handler: CallToolRequestSchema
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: toolArgs } = request.params;

  try {
    let textResult = '';
    switch (name) {
      case 'read':
        textResult = await toolRead(toolArgs as any);
        break;
      case 'write':
        textResult = await toolWrite(toolArgs as any);
        break;
      case 'edit':
        textResult = await toolEdit(toolArgs as any);
        break;
      case 'bash':
        textResult = await toolBash(toolArgs as any);
        break;
      case 'list_dir':
        textResult = await toolListDir(toolArgs as any);
        break;
      default:
        throw new Error(`MCP tool "${name}" not recognized`);
    }

    return {
      content: [
        {
          type: 'text',
          text: textResult,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `MCP Tool Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Attached to stdio transport, ready for JSON-RPC requests');
}

main().catch((err) => {
  console.error('[MCP Server] Fatal process error:', err);
  process.exit(1);
});
