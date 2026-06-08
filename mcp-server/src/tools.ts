import { AptamerRecord } from './schema.js';
import { searchByTarget, getByDoi, listTargets, getByExternalId, topByPkd } from './search.js';

// ---------------------------------------------------------------------------
// Single source of truth for the database tools.
//
// Every surface (stdio MCP, Streamable-HTTP MCP, and the /chat LLM loop) is
// derived from TOOL_DEFINITIONS + executeTool below, so they can never drift
// apart again (previously the param name external_id↔id and the search limit
// default 50↔8 had diverged across files).
// ---------------------------------------------------------------------------

const DEFAULT_SEARCH_LIMIT = 25;

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_by_target',
    description: 'Search for aptamers by target name. Supports partial matching. Pass the standard English scientific name (translate/expand abbreviations, common names, and non-English input before calling).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Target name to search for (e.g., "thrombin", "VEGF")' },
        limit: { type: 'number', description: `Maximum number of results to return (default: ${DEFAULT_SEARCH_LIMIT})` },
        offset: { type: 'number', description: 'Number of results to skip (for pagination)' },
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
        query: { type: 'string', description: 'Target name to search for' },
        top: { type: 'number', description: 'Number of top aptamers to return (default: 5)' },
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
        doi: { type: 'string', description: 'Digital Object Identifier of the publication' },
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
        query: { type: 'string', description: 'Optional filter by target name' },
      },
    },
  },
  {
    name: 'get_by_external_id',
    description: 'Retrieve a specific aptamer using its external identifier (e.g., Aptagen ID).',
    inputSchema: {
      type: 'object',
      properties: {
        external_id: { type: 'string', description: 'External identifier' },
      },
      required: ['external_id'],
    },
  },
  {
    name: 'fetch_abstract',
    description: 'Fetch the abstract of a paper using its DOI. Use this when the user asks about applications, detection methods, sensor design, experimental conditions, or clinical details that are not available in the database records.',
    inputSchema: {
      type: 'object',
      properties: {
        doi: { type: 'string', description: 'DOI of the paper to fetch the abstract for' },
      },
      required: ['doi'],
    },
  },
];

/** MCP `tools/list` shape. */
export const mcpTools = TOOL_DEFINITIONS.map((t) => ({
  name: t.name,
  description: t.description,
  inputSchema: t.inputSchema,
}));

/** OpenAI/Doubao chat-completions `tools` shape. */
export const chatTools = TOOL_DEFINITIONS.map((t) => ({
  type: 'function' as const,
  function: { name: t.name, description: t.description, parameters: t.inputSchema },
}));

// --- Fetch paper abstract via CrossRef, fallback to PubMed ---
export async function fetchAbstract(doi: string): Promise<string> {
  // Try CrossRef first
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'AptaNexus/1.0 (mailto:aptanexus@proton.me)' },
    });
    if (res.ok) {
      const json = (await res.json()) as { message?: { abstract?: string } };
      const abstract = json.message?.abstract;
      if (abstract) {
        const text = abstract.replace(/<[^>]+>/g, '').trim();
        return text.length > 800 ? text.slice(0, 800) + '…' : text;
      }
    }
  } catch {
    /* fall through */
  }

  // Fallback: PubMed E-utilities
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi)}[doi]&retmode=json`
    );
    if (searchRes.ok) {
      const searchJson = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } };
      const pmid = searchJson.esearchresult?.idlist?.[0];
      if (pmid) {
        const fetchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`
        );
        if (fetchRes.ok) {
          const text = (await fetchRes.text()).trim();
          return text.length > 800 ? text.slice(0, 800) + '…' : text;
        }
      }
    }
  } catch {
    /* fall through */
  }

  return 'Abstract not available for this DOI.';
}

/**
 * Execute a tool by name against the in-memory dataset.
 * Returns a plain JS value; callers are responsible for serialization
 * (MCP wraps it in a text content block, /chat JSON-stringifies it).
 */
export async function executeTool(
  data: AptamerRecord[],
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'search_by_target': {
      const results = searchByTarget(
        data,
        String(args.query || ''),
        Number(args.limit || DEFAULT_SEARCH_LIMIT),
        Number(args.offset || 0)
      );
      if (results.length === 0) {
        return {
          results: [],
          hint: 'No results found. If the query is an abbreviation, common name, synonym, or non-English text, expand/translate to the full standard scientific name and call search_by_target again.',
        };
      }
      return results;
    }
    case 'top_by_pkd':
      return topByPkd(data, String(args.query || ''), Number(args.top || 5));
    case 'get_by_doi':
      return getByDoi(data, String(args.doi || ''));
    case 'list_targets':
      return listTargets(data, args.query ? String(args.query) : undefined);
    case 'get_by_external_id':
      // Accept both `external_id` (canonical) and legacy `id` for resilience.
      return getByExternalId(data, String(args.external_id ?? args.id ?? ''));
    case 'fetch_abstract':
      return { abstract: await fetchAbstract(String(args.doi || '')) };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
