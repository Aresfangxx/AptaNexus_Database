import { AptamerRecord, SearchResult } from './schema.js';
import { normalizeText, expandSynonyms } from './normalize.js';

export function buildIndex(records: AptamerRecord[]): Map<string, AptamerRecord[]> {
  const idx = new Map<string, AptamerRecord[]>();
  for (const r of records) {
    const key = normalizeText(r.target_name);
    const list = idx.get(key) || [];
    list.push(r);
    idx.set(key, list);
  }
  return idx;
}

export function searchByTarget(records: AptamerRecord[], query: string, limit = 50, offset = 0): SearchResult[] {
  const qlist = expandSynonyms(query);
  const pool: SearchResult[] = [];
  const nq = qlist[0] || normalizeText(query);
  for (const rec of records) {
    const t = normalizeText(rec.target_name);
    let matched = false;
    let score = 0;
    let strategy: SearchResult['match_strategy'] = 'token_overlap';
    for (const q of qlist) {
      if (t === q) {
        matched = true; score = Math.max(score, 1.0); strategy = 'exact'; break;
      }
      if (!matched && t.includes(q)) {
        matched = true; score = Math.max(score, 0.8); strategy = 'contains';
      }
    }
    if (!matched) {
      const tt = new Set(t.split(' '));
      const qq = new Set(nq.split(' '));
      const inter = Array.from(qq).filter(w => tt.has(w));
      if (inter.length > 0) {
        matched = true;
        score = Math.max(score, inter.length / Math.max(tt.size, 1));
        strategy = 'token_overlap';
      }
    }
    if (matched) {
      pool.push({ ...rec, score, match_strategy: strategy, normalized_query: nq });
    }
  }
  pool.sort((a, b) => b.score - a.score);
  return pool.slice(offset, offset + limit);
}

export function getByDoi(records: AptamerRecord[], doi: string): AptamerRecord[] {
  const nd = normalizeText(doi);
  return records.filter(r => normalizeText(r.doi) === nd);
}

export function listTargets(records: AptamerRecord[], query?: string): { target: string; count: number }[] {
  const m = new Map<string, number>();
  for (const r of records) {
    const key = normalizeText(r.target_name);
    m.set(key, (m.get(key) || 0) + 1);
  }
  let arr = Array.from(m.entries()).map(([target, count]) => ({ target, count }));
  if (query) {
    const q = normalizeText(query);
    arr = arr.filter(x => x.target.includes(q));
  }
  arr.sort((a, b) => b.count - a.count);
  return arr;
}

export function getByExternalId(records: AptamerRecord[], externalId: string): AptamerRecord[] {
  const nid = normalizeText(externalId);
  return records.filter(r => normalizeText(r.external_id) === nid);
}

export function topByPkd(records: AptamerRecord[], query: string, topN = 3): AptamerRecord[] {
  const hits = searchByTarget(records, query, 1000, 0);
  const withPkd = hits.filter(h => typeof h.pkd === 'number');
  withPkd.sort((a, b) => (b.pkd || 0) - (a.pkd || 0));
  return withPkd.slice(0, topN);
}
