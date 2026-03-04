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

// --- Helper: read full POST body ---
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// --- DeepSeek tool definitions (mirrors MCP tools) ---
const DEEPSEEK_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_by_target',
      description: 'Search for aptamers by target name. Supports partial matching and Chinese queries.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Target name to search for (e.g., "thrombin", "VEGF", "乳酸")' },
          limit: { type: 'number', description: 'Maximum number of results to return (default: 8)' },
          offset: { type: 'number', description: 'Number of results to skip' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'top_by_pkd',
      description: 'Get the top aptamers with the highest binding affinity (pKd) for a specific target.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Target name to search for' },
          top: { type: 'number', description: 'Number of top aptamers to return (default: 3)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_by_doi',
      description: 'Retrieve all aptamers from a specific publication using its DOI.',
      parameters: {
        type: 'object',
        properties: {
          doi: { type: 'string', description: 'Digital Object Identifier of the publication' },
        },
        required: ['doi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_targets',
      description: 'List all target molecules in the database with aptamer counts.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional filter by target name' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_by_external_id',
      description: 'Retrieve a specific aptamer using its external identifier.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'External identifier' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_abstract',
      description: 'Fetch the abstract of a paper using its DOI. Use this when the user asks about applications, detection methods, sensor design, experimental conditions, or clinical details that are not available in the database records.',
      parameters: {
        type: 'object',
        properties: {
          doi: { type: 'string', description: 'DOI of the paper to fetch the abstract for' },
        },
        required: ['doi'],
      },
    },
  },
];

// --- Fetch paper abstract via CrossRef, fallback to PubMed ---
async function fetchAbstract(doi: string): Promise<string> {
  // Try CrossRef first
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'AptaNexus/1.0 (mailto:aptanexus@proton.me)' },
    });
    if (res.ok) {
      const json = await res.json() as { message?: { abstract?: string } };
      const abstract = json.message?.abstract;
      if (abstract) {
        return abstract.replace(/<[^>]+>/g, '').trim();
      }
    }
  } catch { /* fall through */ }

  // Fallback: PubMed E-utilities
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`
    );
    if (searchRes.ok) {
      const searchJson = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
      const pmid = searchJson.esearchresult?.idlist?.[0];
      if (pmid) {
        const fetchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`
        );
        if (fetchRes.ok) {
          return (await fetchRes.text()).trim();
        }
      }
    }
  } catch { /* fall through */ }

  return 'Abstract not available for this DOI.';
}

// --- Execute a tool call locally ---
async function executeTool(data: AptamerRecord[], name: string, argsStr: string): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try { args = JSON.parse(argsStr); } catch { /* ignore */ }
  switch (name) {
    case 'search_by_target':
      return searchByTarget(data, String(args.query || ''), Number(args.limit || 8), Number(args.offset || 0));
    case 'top_by_pkd':
      return topByPkd(data, String(args.query || ''), Number(args.top || 3));
    case 'get_by_doi':
      return getByDoi(data, String(args.doi || ''));
    case 'list_targets':
      return listTargets(data, args.query ? String(args.query) : undefined);
    case 'get_by_external_id':
      return getByExternalId(data, String(args.id || ''));
    case 'fetch_abstract':
      return { abstract: await fetchAbstract(String(args.doi || '')) };
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// --- /chat endpoint handler with DeepSeek streaming + tool-use loop ---
async function handleChat(
  data: AptamerRecord[],
  userMessages: { role: string; content: string }[],
  lang: string,
  res: http.ServerResponse
) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.write(`data: ${JSON.stringify({ delta: 'Error: DEEPSEEK_API_KEY is not configured on the server.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const systemPrompt = lang === 'cn'
    ? `你是AptaNexus的AI助手，专门帮助用户查询适配体（Aptamer）数据库。数据库包含超过12500条记录，涵盖1900多种靶标。

【工具使用规则】
- 回答涉及具体适配体、靶标或文献时，必须先调用工具查询数据库，不得凭记忆回答。
- 如果用户询问应用场景、检测方法、传感器设计、实验条件或临床细节，在数据库检索后，使用 fetch_abstract 工具获取该论文的摘要，再基于摘要内容回答，不得自行补充未经核实的信息。

【输出格式规则——每条检索结果必须包含以下字段，缺一不可】
- 文章标题
- 期刊 / 年份
- DOI 链接：https://doi.org/{doi}
- 适配体序列（等宽格式）
- 亲和力（如有 pKd 或 affinity 字段）
- 靶标名称

示例格式：
**[序列ID]** 靶标：Thrombin
序列：\`GGTTGGTGTGGTTGG\`
亲和力：pKd = 8.2
文章：*Selection of DNA aptamers...* — Nucleic Acids Res, 2003
DOI：https://doi.org/10.1093/nar/gkg649

如果工具返回的数据缺少某字段（如无 DOI），注明"暂无"，不得省略整条信息。
如果问题与适配体数据库无关，礼貌引导回主题。`
    : `You are an expert AI assistant for AptaNexus, a comprehensive aptamer database with 12,500+ curated records across 1,900+ unique targets.

TOOL USAGE RULES:
- For any question about specific aptamers, targets, or literature, you MUST call the appropriate tool first. Never answer from memory.
- If the user asks about applications, detection methods, sensor design, experimental conditions, or clinical details, after retrieving database results use fetch_abstract with the DOI to get the paper abstract before answering. Do not supplement with unverified information.

OUTPUT FORMAT RULES — when presenting retrieved records, ALWAYS include ALL of the following fields (mark "N/A" if missing, never omit the field):
- Article title
- Journal / Year
- DOI link: https://doi.org/{doi}
- Aptamer sequence (monospace)
- Affinity (pKd or affinity string if available)
- Target name

Example format:
**[Sequence ID]** Target: Thrombin
Sequence: \`GGTTGGTGTGGTTGG\`
Affinity: pKd = 8.2
Article: *Selection of DNA aptamers...* — Nucleic Acids Res, 2003
DOI: https://doi.org/10.1093/nar/gkg649

If a field is absent in the tool result, write "N/A" — do not silently skip the entire record.
If the query is unrelated to aptamers or the database, politely redirect.`;

  const messages: unknown[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];

  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let deepseekRes: Response;
    try {
      deepseekRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          tools: DEEPSEEK_TOOLS,
          stream: true,
        }),
      });
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ delta: `Error calling DeepSeek API: ${String(err)}` })}\n\n`);
      break;
    }

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text();
      res.write(`data: ${JSON.stringify({ delta: `DeepSeek API error ${deepseekRes.status}: ${errText}` })}\n\n`);
      break;
    }

    // Parse the streaming response
    const reader = deepseekRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentContent = '';
    interface ToolCallAccum { id: string; name: string; arguments: string; }
    const toolCallsAccum: ToolCallAccum[] = [];
    let finishReason = '';

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') { finishReason = finishReason || 'stop'; break outer; }
        try {
          const chunk = JSON.parse(payload) as {
            choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] }; finish_reason?: string }[];
          };
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;
          if (choice.delta?.content) {
            currentContent += choice.delta.content;
            res.write(`data: ${JSON.stringify({ delta: choice.delta.content })}\n\n`);
          }
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { id: tc.id || '', name: '', arguments: '' };
              if (tc.id) toolCallsAccum[idx].id = tc.id;
              if (tc.function?.name) toolCallsAccum[idx].name += tc.function.name;
              if (tc.function?.arguments) toolCallsAccum[idx].arguments += tc.function.arguments;
            }
          }
        } catch { /* ignore malformed chunks */ }
      }
    }

    const toolCalls = toolCallsAccum.filter(Boolean);
    if (toolCalls.length === 0) break; // No tool calls → done

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: currentContent || null,
      tool_calls: toolCalls.map(tc => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments },
      })),
    });

    // Execute each tool and add results
    for (const tc of toolCalls) {
      if (tc.name === 'fetch_abstract') {
        const statusMsg = lang === 'cn' ? '正在通过 DOI 获取论文摘要…' : 'Fetching paper by DOI…';
        res.write(`data: ${JSON.stringify({ toolStatus: statusMsg })}\n\n`);
      }
      let result: unknown;
      try { result = await executeTool(data, tc.name, tc.arguments); }
      catch (err: unknown) { result = { error: String(err) }; }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
    // Continue loop for DeepSeek to generate final answer
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

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

  // Chat endpoint (DeepSeek + tool-use, streaming SSE)
  if (parsed.pathname === '/chat' && req.method === 'POST') {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try {
      const body = await readBody(req);
      const { messages: userMessages = [], lang = 'en' } = JSON.parse(body) as {
        messages?: { role: string; content: string }[];
        lang?: string;
      };
      await handleChat(data, userMessages, lang, res);
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ delta: `Server error: ${String(err)}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
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
          chat: '/chat',
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
