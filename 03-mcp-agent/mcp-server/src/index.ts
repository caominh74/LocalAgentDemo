import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export const server = new Server(
  {
    name: 'local-agent-tools-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP Server] Connected to stdio transport');
}

main().catch((err) => {
  console.error('[MCP Server] Fatal startup error:', err);
  process.exit(1);
});
