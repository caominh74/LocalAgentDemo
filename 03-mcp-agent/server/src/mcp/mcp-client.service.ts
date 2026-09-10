import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';

export interface RpcLogEntry {
  id: string;
  method: string;
  params?: any;
  result?: any;
  error?: any;
  timestamp: string;
  durationMs: number;
}

export interface McpServerStatus {
  connected: boolean;
  serverName: string;
  serverVersion: string;
  toolsCount: number;
  tools: Array<{ name: string; description?: string; inputSchema?: any }>;
  recentRpcLogs: RpcLogEntry[];
}

@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpClientService.name);
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private discoveredTools: Array<{ name: string; description?: string; inputSchema?: any }> = [];
  private openAiTools: any[] = [];
  private isConnected = false;
  private rpcLogs: RpcLogEntry[] = [];

  async onModuleInit() {
    await this.connectToServer();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private addRpcLog(entry: Omit<RpcLogEntry, 'id' | 'timestamp'>) {
    const log: RpcLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.rpcLogs.unshift(log);
    if (this.rpcLogs.length > 50) {
      this.rpcLogs.pop();
    }
  }

  async connectToServer(): Promise<void> {
    const mcpServerPath = path.resolve(__dirname, '../../../mcp-server/src/index.ts');
    this.logger.log(`Spawning MCP Server over stdio at ${mcpServerPath}`);

    this.transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', mcpServerPath],
      stderr: 'pipe',
    });

    if (this.transport.stderr) {
      this.transport.stderr.on('data', (chunk) => {
        this.logger.debug(`[MCP Server stdio:stderr] ${chunk.toString().trim()}`);
      });
    }

    this.client = new Client(
      {
        name: 'mcp-agent-backend-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    const startTime = Date.now();
    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
      this.logger.log('Connected to MCP Server via stdio successfully');

      // Discover Tools dynamically
      await this.refreshTools();

      this.addRpcLog({
        method: 'initialize',
        result: { status: 'connected', toolsCount: this.discoveredTools.length },
        durationMs: Date.now() - startTime,
      });
    } catch (err: any) {
      this.isConnected = false;
      this.logger.error(`Failed to connect to MCP Server: ${err.message}`);
      this.addRpcLog({
        method: 'initialize',
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    }
  }

  async refreshTools(): Promise<void> {
    if (!this.client) return;

    const startTime = Date.now();
    try {
      const response = await this.client.listTools();
      this.discoveredTools = response.tools || [];

      // Convert MCP tool schemas to OpenAI tool format
      this.openAiTools = this.discoveredTools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema || { type: 'object', properties: {} },
        },
      }));

      this.addRpcLog({
        method: 'tools/list',
        result: { count: this.discoveredTools.length, names: this.discoveredTools.map((t) => t.name) },
        durationMs: Date.now() - startTime,
      });

      this.logger.log(`Discovered ${this.discoveredTools.length} tools from MCP Server: ${this.discoveredTools.map((t) => t.name).join(', ')}`);
    } catch (err: any) {
      this.logger.error(`Failed to list MCP tools: ${err.message}`);
      this.addRpcLog({
        method: 'tools/list',
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    }
  }

  getOpenAiTools(): any[] {
    return this.openAiTools;
  }

  getStatus(): McpServerStatus {
    return {
      connected: this.isConnected,
      serverName: 'mcp-agent-tools-server',
      serverVersion: '1.0.0',
      toolsCount: this.discoveredTools.length,
      tools: this.discoveredTools,
      recentRpcLogs: this.rpcLogs.slice(0, 20),
    };
  }

  async callTool(name: string, args: any): Promise<string> {
    if (!this.client || !this.isConnected) {
      throw new Error('MCP Client is disconnected from mcp-server');
    }

    const startTime = Date.now();
    try {
      const result: any = await this.client.callTool({
        name,
        arguments: args,
      });

      this.addRpcLog({
        method: 'tools/call',
        params: { name, arguments: args },
        result,
        durationMs: Date.now() - startTime,
      });

      if (result.isError) {
        const errText = result.content?.map((c: any) => c.text).join('\n') || 'Unknown MCP error';
        throw new Error(errText);
      }

      const text = result.content
        ?.filter((c: any) => c.type === 'text')
        ?.map((c: any) => c.text)
        ?.join('\n') || '';

      return text || '(tool executed with empty text output)';
    } catch (err: any) {
      this.addRpcLog({
        method: 'tools/call',
        params: { name, arguments: args },
        error: err.message,
        durationMs: Date.now() - startTime,
      });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (e) {
        // ignore close error
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}
