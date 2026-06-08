import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadJSONL } from './loader.js';
import { createMcpServer } from './mcp.js';
import { AptamerRecord } from './schema.js';

let data: AptamerRecord[] = [];

const server = createMcpServer(() => data);

async function main() {
  console.error('Loading aptamer data...');
  data = await loadJSONL();
  console.error(`Loaded ${data.length} aptamer records`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Aptamer DB MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
