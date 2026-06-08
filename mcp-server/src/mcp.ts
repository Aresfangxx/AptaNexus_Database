import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AptamerRecord } from './schema.js';
import { mcpTools, executeTool } from './tools.js';

/**
 * Build a configured MCP `Server` whose tool list and execution both come from
 * the shared definitions in tools.ts. Used by every MCP transport (stdio and
 * Streamable HTTP) so the surfaces stay identical.
 */
export function createMcpServer(getData: () => AptamerRecord[], version = '0.2.0'): Server {
  const server = new Server(
    { name: 'aptanexus-mcp', version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: mcpTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await executeTool(getData(), name, (args ?? {}) as Record<string, unknown>);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}
