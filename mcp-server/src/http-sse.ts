import http from 'http';
import url from 'url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { loadJSONL } from './loader.js';
import { searchByTarget, getByDoi, listTargets, getByExternalId, topByPkd } from './search.js';
import { createMcpServer } from './mcp.js';
import { chatTools, executeTool } from './tools.js';
import { AptamerRecord } from './schema.js';
import { handleReport } from './report.js';

// --- Helper: read full POST body ---
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

// OpenAI-compatible chat-completions provider. Defaults to Volcano Ark / Doubao;
// override LLM_URL / LLM_API_KEY / LLM_MODEL to point at any compatible endpoint
// (e.g. DeepSeek) without code changes.
const DOUBAO_API = {
  url: process.env.LLM_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  key: () => process.env.LLM_API_KEY || process.env.ARK_API_KEY || '',
  model: process.env.LLM_MODEL || 'doubao-seed-2-0-pro-260215',
};

// --- /chat endpoint handler with streaming + tool-use loop ---
async function handleChat(
  data: AptamerRecord[],
  userMessages: { role: string; content: string }[],
  lang: string,
  res: http.ServerResponse
) {
  if (!DOUBAO_API.key()) {
    res.write(`data: ${JSON.stringify({ delta: 'Error: ARK_API_KEY is not configured on the server.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const systemPrompt = lang === 'cn'
    ? `你是AptaNexus的AI助手，专门帮助用户查询适配体（Aptamer）数据库。数据库包含超过12500条记录，涵盖1900多种靶标。

【工具使用规则】
- 回答涉及具体适配体、靶标或文献时，必须先调用工具查询数据库，不得凭记忆回答。
- 调用工具前，若用户输入为中文、缩写或俗名（如"苯丙氨酸"→"phenylalanine"、"phe"→"phenylalanine"、"乳酸"→"L-lactate"、"lac"→"L-lactate"），在内部完成翻译/标准化后再调用，不得向用户确认。
- 当用户询问某靶标的适配体、检测方法或最佳适配体时，优先调用 top_by_pkd 获取亲和力最高的结果；仅当用户明确需要更多记录或 top_by_pkd 无结果时，再调用 search_by_target 补充。
- 如果用户询问应用场景、检测方法、传感器设计、实验条件或临床细节，在数据库检索后，从结果中选择最相关的 1 篇论文，使用 fetch_abstract 工具获取其摘要，再基于摘要内容回答。每次回答最多调用 fetch_abstract 1 次，不得对多篇论文批量调用。

【输出格式规则——展示检索结果时】
- 先用一两句话简要说明（解释 / 推荐 / 为什么），不要逐条复述字段。
- 然后输出一个 \`\`\`aptamers 代码块，块内为 JSON 数组，每个元素是你要展示的一条记录，字段如下（值必须严格来自工具返回结果，不得编造或修改；缺失填 null）：sequence_id, target_name, sequence, affinity, pkd, doi, article_title, journal, year。
- 这个 JSON 块会被前端渲染成卡片。因此在块的前后，叙述文字都不要再逐条复述这些记录的字段值（序列 / pKd / 亲和力 / DOI / 标题 等），也不要用表格或编号列表把这些记录再列一遍。叙述只做总体性说明或推荐（如"其中 Lac201 亲和力最高，适合血清检测"），具体数值交给卡片。
- 一次回答只输出一个 \`\`\`aptamers 块，把要展示的记录都放进同一个数组。
- 若本次回答不涉及具体记录（如列靶标、讲摘要、闲聊），正常用文字回答，不要输出该块。

示例：
这是乳酸亲和力最高的适配体：

\`\`\`aptamers
[{"sequence_id":"Lac201","target_name":"L-lactate","sequence":"GACGACGAGTAGCGCGTATGAATGCTTTTCTATGGAGTC","affinity":"0.43 mM","pkd":3.37,"doi":"10.1002/anie.202212879","article_title":"Simultaneous Detection of L-lactate and D-glucose Using DNA Aptamers in Human Blood Serum","journal":"Angew Chem","year":"2023"}]
\`\`\`

如果问题与适配体数据库无关，礼貌引导回主题。`
    : `You are an expert AI assistant for AptaNexus, a comprehensive aptamer database with 12,500+ curated records across 1,900+ unique targets.

TOOL USAGE RULES:
- For any question about specific aptamers, targets, or literature, you MUST call the appropriate tool first. Never answer from memory.
- Before calling any tool, if the user's input is in Chinese, an abbreviation, or a common name (e.g. "phe" → "phenylalanine", "苯丙氨酸" → "phenylalanine", "lac" → "L-lactate"), translate/normalize it to the standard English scientific name internally. Never ask the user to confirm.
- When a user asks to find aptamers for a target, or asks about detection or the best aptamer, prefer calling top_by_pkd first to surface the highest-affinity aptamers. Fall back to search_by_target only when the user explicitly needs more records or top_by_pkd returns no results.
- If the user asks about applications, detection methods, sensor design, experimental conditions, or clinical details, after retrieving database results pick the single most relevant paper and call fetch_abstract once with its DOI. Do not call fetch_abstract more than once per response. Do not supplement with unverified information.

OUTPUT FORMAT RULES — when presenting retrieved records:
- First give a one or two sentence narrative (explanation / recommendation / why). Do NOT restate the fields one by one.
- Then output a \`\`\`aptamers code block containing a JSON array; each element is one record you want to show, with these fields (values MUST come verbatim from the tool results — never invent or alter them; use null if missing): sequence_id, target_name, sequence, affinity, pkd, doi, article_title, journal, year.
- The frontend renders this JSON block as cards. So neither before nor after the block should the prose restate per-record field values (sequence / pKd / affinity / DOI / title, etc.), and do NOT re-list these records as a table or numbered list. Keep the prose to overall commentary or a recommendation (e.g. "Lac201 has the highest affinity, best for serum detection"); leave the concrete values to the cards.
- Emit at most one \`\`\`aptamers block per answer; put every record to show in that single array.
- If the answer does not involve specific records (listing targets, discussing an abstract, chit-chat), just answer in prose and do not emit the block.

Example:
Here are the highest-affinity aptamers for lactate:

\`\`\`aptamers
[{"sequence_id":"Lac201","target_name":"L-lactate","sequence":"GACGACGAGTAGCGCGTATGAATGCTTTTCTATGGAGTC","affinity":"0.43 mM","pkd":3.37,"doi":"10.1002/anie.202212879","article_title":"Simultaneous Detection of L-lactate and D-glucose Using DNA Aptamers in Human Blood Serum","journal":"Angew Chem","year":"2023"}]
\`\`\`

If the query is unrelated to aptamers or the database, politely redirect.`;

  const messages: unknown[] = [
    { role: 'system', content: systemPrompt },
    ...userMessages,
  ];

  const MAX_ITERATIONS = 5;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let apiRes: Response;
    try {
      apiRes = await fetch(DOUBAO_API.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API.key()}`,
        },
        body: JSON.stringify({
          model: DOUBAO_API.model,
          messages,
          tools: chatTools,
          stream: true,
        }),
      });
    } catch (err: unknown) {
      res.write(`data: ${JSON.stringify({ delta: `API error: ${String(err)}` })}\n\n`);
      break;
    }

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      res.write(`data: ${JSON.stringify({ delta: `API error ${apiRes.status}: ${errText}` })}\n\n`);
      break;
    }

    // Parse the streaming response
    const reader = apiRes.body!.getReader();
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
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments || '{}'); } catch { /* ignore */ }
      let result: unknown;
      try { result = await executeTool(data, tc.name, args); }
      catch (err: unknown) { result = { error: String(err) }; }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
    }
    // Continue loop for the model to generate its final answer
  }

  res.write('data: [DONE]\n\n');
  res.end();
}

let data: AptamerRecord[] = [];
const port = Number(process.env.PORT || 3333);

// HTTP server: Streamable-HTTP MCP endpoint (/mcp) + /chat + legacy REST
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || '', true);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, Last-Event-ID');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // MCP Streamable HTTP endpoint (replaces the deprecated /sse + /message pair).
  // Stateless mode: one short-lived server+transport per request, which is a
  // good fit for a read-only tool server behind Render.
  if (parsed.pathname === '/mcp') {
    if (req.method === 'POST') {
      try {
        const body = await readBody(req);
        const parsedBody = body ? JSON.parse(body) : undefined;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // stateless
          enableJsonResponse: true,
        });
        const mcp = createMcpServer(() => data);
        res.on('close', () => { transport.close(); mcp.close(); });
        await mcp.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
      } catch (err: unknown) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: `Internal error: ${String(err)}` },
          id: null,
        }));
      }
      return;
    }
    // GET (server-initiated stream) / DELETE (session teardown) are unused in
    // stateless mode.
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed; this server uses stateless POST /mcp.' },
      id: null,
    }));
    return;
  }

  // Chat endpoint (LLM + tool-use, streaming SSE)
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

  // Correction-report endpoint (emails the curation team via Resend)
  if (parsed.pathname === '/report' && req.method === 'POST') {
    const body = await readBody(req);
    await handleReport(req, body, res);
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
        version: '0.2.0',
        endpoints: {
          mcp: '/mcp',
          chat: '/chat',
          rest: ['/search', '/top', '/bydoi', '/targets', '/byid'],
          report: '/report'
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
    console.error(`MCP endpoint (Streamable HTTP): http://localhost:${port}/mcp`);
    console.error(`REST API: http://localhost:${port}/search`);
    process.stdout.write(JSON.stringify({ http_port: port }) + '\n');
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
