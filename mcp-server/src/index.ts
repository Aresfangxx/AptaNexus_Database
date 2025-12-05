import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadJSONL } from './loader.js';
import { searchByTarget, getByDoi, listTargets, getByExternalId, topByPkd } from './search.js';

const data = loadJSONL();

const server = new Server(
  {
    name: 'aptamer-db',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_by_target',
        description: 'Search aptamers by target molecule name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Target molecule name to search for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 50,
            },
            offset: {
              type: 'number',
              description: 'Offset for pagination',
              default: 0,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_by_doi',
        description: 'Get aptamer by DOI',
        inputSchema: {
          type: 'object',
          properties: {
            doi: {
              type: 'string',
              description: 'DOI of the publication',
            },
          },
          required: ['doi'],
        },
      },
      {
        name: 'list_targets',
        description: 'List all available targets with counts',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional query to filter targets',
            },
          },
        },
      },
      {
        name: 'get_by_external_id',
        description: 'Get aptamer by external ID (e.g., Aptagen ID)',
        inputSchema: {
          type: 'object',
          properties: {
            external_id: {
              type: 'string',
              description: 'External ID to search for',
            },
          },
          required: ['external_id'],
        },
      },
      {
        name: 'top_by_pkd',
        description: 'Get top aptamers by pKd value for a target',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Target molecule name',
            },
            top: {
              type: 'number',
              description: 'Number of top results to return',
              default: 3,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case 'search_by_target': {
        const { query = '', limit = 50, offset = 0 } = request.params.arguments as any;
        const result = searchByTarget(data, String(query), Number(limit), Number(offset));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      case 'get_by_doi': {
        const { doi = '' } = request.params.arguments as any;
        const result = getByDoi(data, String(doi));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      case 'list_targets': {
        const { query } = request.params.arguments as any;
        const result = listTargets(data, query ? String(query) : undefined);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      case 'get_by_external_id': {
        const { external_id = '' } = request.params.arguments as any;
        const result = getByExternalId(data, String(external_id));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      case 'top_by_pkd': {
        const { query = '', top = 3 } = request.params.arguments as any;
        const result = topByPkd(data, String(query), Number(top));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error: any) {
    throw new Error(`Error executing tool: ${error.message}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Aptamer DB MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
