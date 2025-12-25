import http from 'http';
import url from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadJSONL } from './loader.js';
import { searchByTarget, getByDoi, listTargets, getByExternalId, topByPkd } from './search.js';
import { AptamerRecord } from './schema.js';

let data: AptamerRecord[] = [];
const port = Number(process.env.PORT || 3333);

// Create MCP server instance
const mcpServer = new Server(
  {
    name: 'aptanexus-mcp',
    version: '0.1.4',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_by_target',
        description: 'Search for aptamers by target name. Supports partial matching and Chinese queries.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Target name to search for (e.g., "thrombin", "VEGF", "乳酸")',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 50,
            },
            offset: {
              type: 'number',
              description: 'Number of results to skip (for pagination)',
              default: 0,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'top_by_pkd',
        description: 'Get the top aptamers with the highest binding affinity (pKd) for a specific target.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Target name to search for',
            },
            top: {
              type: 'number',
              description: 'Number of top aptamers to return',
              default: 3,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_by_doi',
        description: 'Retrieve all aptamers from a specific publication using its DOI.',
        inputSchema: {
          type: 'object',
          properties: {
            doi: {
              type: 'string',
              description: 'Digital Object Identifier of the publication',
            },
          },
          required: ['doi'],
        },
      },
      {
        name: 'list_targets',
        description: 'List all target molecules in the database with aptamer counts.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Optional filter by target name',
            },
          },
        },
      },
      {
        name: 'get_by_external_id',
        description: 'Retrieve a specific aptamer using its external identifier (e.g., Aptagen ID).',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'External identifier',
            },
          },
          required: ['id'],
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_by_target': {
        const query = String(args?.query || '');
        const limit = Number(args?.limit || 50);
        const offset = Number(args?.offset || 0);
        const results = searchByTarget(data, query, limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'top_by_pkd': {
        const query = String(args?.query || '');
        const top = Number(args?.top || 3);
        const results = topByPkd(data, query, top);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_by_doi': {
        const doi = String(args?.doi || '');
        const results = getByDoi(data, doi);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'list_targets': {
        const query = args?.query ? String(args.query) : undefined;
        const results = listTargets(data, query);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_by_external_id': {
        const id = String(args?.id || '');
        const results = getByExternalId(data, id);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// HTTP server with SSE endpoint
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '', true);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // MCP SSE endpoint
  if (parsed.pathname === '/sse' && req.method === 'GET') {
    console.error('New SSE connection established');
    const transport = new SSEServerTransport('/message', res);
    await mcpServer.connect(transport);
    return;
  }

  // MCP message endpoint
  if (parsed.pathname === '/message' && req.method === 'POST') {
    // This is handled by SSEServerTransport
    return;
  }

  // Legacy REST API endpoints (for backward compatibility)
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    if (parsed.pathname === '/search') {
      const q = String(parsed.query.q || '');
      const limit = parsed.query.limit ? Number(parsed.query.limit) : 50;
      const offset = parsed.query.offset ? Number(parsed.query.offset) : 0;
      const out = searchByTarget(data, q, limit, offset);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/bydoi') {
      const doi = String(parsed.query.doi || '');
      const out = getByDoi(data, doi);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/targets') {
      const q = parsed.query.q ? String(parsed.query.q) : undefined;
      const out = listTargets(data, q);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/byid') {
      const id = String(parsed.query.id || '');
      const out = getByExternalId(data, id);
      res.end(JSON.stringify(out));
      return;
    }
    if (parsed.pathname === '/top') {
      const q = String(parsed.query.q || '');
      const n = parsed.query.n ? Number(parsed.query.n) : 3;
      const out = topByPkd(data, q, n);
      res.end(JSON.stringify(out));
      return;
    }

    // Health check
    if (parsed.pathname === '/' || parsed.pathname === '/health') {
      res.end(JSON.stringify({
        status: 'ok',
        name: 'AptaNexus MCP Server',
        version: '0.1.4',
        endpoints: {
          mcp: '/sse',
          rest: ['/search', '/top', '/bydoi', '/targets', '/byid']
        },
        records: data.length
      }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
});

async function main() {
  console.error('Loading aptamer data...');
  data = await loadJSONL();
  console.error(`Loaded ${data.length} aptamer records`);

  server.listen(port, () => {
    console.error(`Server running on port ${port}`);
    console.error(`MCP SSE endpoint: http://localhost:${port}/sse`);
    console.error(`REST API: http://localhost:${port}/search`);
    process.stdout.write(JSON.stringify({ http_port: port }) + '\n');
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
