import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

@Injectable()
export class ToolsService {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.resolve(process.env.WORKSPACE_DIR || path.join(__dirname, '../../../sandbox'));
    if (!fs.existsSync(this.workspaceRoot)) {
      fs.mkdirSync(this.workspaceRoot, { recursive: true });
    }
  }

  private resolvePath(targetPath: string): string {
    const resolved = path.isAbsolute(targetPath) ? path.resolve(targetPath) : path.resolve(this.workspaceRoot, targetPath);
    const normalizedRoot = path.normalize(this.workspaceRoot);
    const normalizedResolved = path.normalize(resolved);
    // Security check: ensure path does not escape sandbox workspace
    if (!normalizedResolved.startsWith(normalizedRoot)) {
      throw new Error(`Security Violation: Access denied. Path '${targetPath}' is outside the sandbox directory.`);
    }
    return resolved;
  }

  async read(args: { path: string; offset?: number; limit?: number }): Promise<string> {
    const filePath = this.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const offset = args.offset ?? 1;
    const limit = args.limit ?? lines.length;

    const slice = lines.slice(offset - 1, offset - 1 + limit);
    return slice.join('\n');
  }

  async write(args: { path: string; content: string }): Promise<string> {
    const filePath = this.resolvePath(args.path);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, args.content, 'utf-8');
    const bytes = Buffer.byteLength(args.content, 'utf-8');
    return `Successfully wrote ${bytes} bytes to ${args.path}`;
  }

  async edit(args: { path: string; oldText: string; newText: string }): Promise<string> {
    const filePath = this.resolvePath(args.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${args.path}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes(args.oldText)) {
      throw new Error(`Target oldText block was not found in ${args.path}. Ensure exact match including whitespace.`);
    }

    const newContent = content.replace(args.oldText, args.newText);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return `Successfully replaced text chunk in ${args.path}`;
  }

  async bash(args: { command: string; timeout?: number }): Promise<string> {
    const timeout = args.timeout || 30000;
    return new Promise((resolve) => {
      exec(
        args.command,
        {
          cwd: this.workspaceRoot,
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

  async list_dir(args: { path?: string; depth?: number }): Promise<string> {
    const dirPath = this.resolvePath(args.path || '.');
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

  async executeTool(toolName: string, validatedArgs: any): Promise<string> {
    switch (toolName) {
      case 'read':
        return this.read(validatedArgs);
      case 'write':
        return this.write(validatedArgs);
      case 'edit':
        return this.edit(validatedArgs);
      case 'bash':
        return this.bash(validatedArgs);
      case 'list_dir':
        return this.list_dir(validatedArgs);
      default:
        throw new Error(`Tool "${toolName}" is not implemented`);
    }
  }
}
