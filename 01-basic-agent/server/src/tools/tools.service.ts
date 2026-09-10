import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class ToolsService {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.resolve(process.env.WORKSPACE_DIR || path.join(__dirname, '../../../'));
  }

  private resolvePath(targetPath: string): string {
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    return path.resolve(this.workspaceRoot, targetPath);
  }

  // 1. read: Read file contents (supports offset, limit)
  async read(args: any): Promise<string> {
    // Naive execution: direct access without schema validation
    const filePath = this.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const offset = args.offset ? Number(args.offset) : 1;
    const limit = args.limit ? Number(args.limit) : lines.length;

    const slice = lines.slice(offset - 1, offset - 1 + limit);
    return slice.join('\n');
  }

  // 2. write: Write or overwrite content, creating parent dirs
  async write(args: any): Promise<string> {
    // Naive execution: blind write
    const filePath = this.resolvePath(args.path);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, args.content ?? '', 'utf-8');
    const bytes = Buffer.byteLength(args.content ?? '', 'utf-8');
    return `Successfully wrote ${bytes} bytes to ${args.path}`;
  }

  // 3. edit: Surgical search-and-replace
  async edit(args: any): Promise<string> {
    // Naive execution: will fail or corrupt if oldText is missing or undefined
    const filePath = this.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(args.oldText)) {
      throw new Error(`oldText not found in ${args.path}`);
    }

    const newContent = content.replace(args.oldText, args.newText);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return `Successfully replaced text chunk in ${args.path}`;
  }

  // 4. bash: Execute shell command
  async bash(args: any): Promise<string> {
    // Naive execution: directly runs shell command without confirmation
    const timeout = args.timeout ? Number(args.timeout) : 30000;
    return new Promise((resolve, reject) => {
      exec(
        args.command,
        {
          cwd: this.workspaceRoot,
          timeout,
          maxBuffer: 1024 * 1024 * 10,
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

  // 5. list_dir: Inspect directory structure
  async list_dir(args: any): Promise<string> {
    const dirPath = this.resolvePath(args.path || '.');
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${args.path}`);
    }

    const maxDepth = args.depth ? Number(args.depth) : 1;

    const walk = (currentDir: string, currentDepth: number): string[] => {
      if (currentDepth > maxDepth) return [];
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const results: string[] = [];

      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const rel = path.relative(this.workspaceRoot, path.join(currentDir, entry.name));
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

  // Dispatch tool by name
  async executeTool(toolName: string, rawArgs: any): Promise<string> {
    switch (toolName) {
      case 'read':
        return this.read(rawArgs);
      case 'write':
        return this.write(rawArgs);
      case 'edit':
        return this.edit(rawArgs);
      case 'bash':
        return this.bash(rawArgs);
      case 'list_dir':
        return this.list_dir(rawArgs);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
