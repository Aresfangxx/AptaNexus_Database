export interface AptamerRecord {
  article_title: string;
  year: string;
  journal: string;
  doi: string;
  target_name: string;
  target_type: string;
  sequence_id: string;
  sequence: string;
  affinity: string;
  buffer_condition: string;
  best: boolean;
  external_id: string;
  external_name: string;
  gene_symbol: string;
  id_type: string;
  pkd?: number;
  level?: string;
}

export type SearchResult = AptamerRecord & {
  score: number;
  match_strategy: 'exact' | 'contains' | 'token_overlap';
  normalized_query: string;
};

export function toRecord(raw: any): AptamerRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec: AptamerRecord = {
    article_title: String(raw['Article title'] ?? ''),
    year: String(raw['Year'] ?? ''),
    journal: String(raw['Journal'] ?? ''),
    doi: String(raw['Doi'] ?? ''),
    target_name: String(raw['Target name'] ?? ''),
    target_type: String(raw['Target type'] ?? ''),
    sequence_id: String(raw['Sequence ID'] ?? ''),
    sequence: String(raw['Aptamer sequence'] ?? ''),
    affinity: String(raw['Affinity'] ?? ''),
    buffer_condition: String(raw['Buffer condition'] ?? ''),
    best: Boolean(raw['Best'] ?? false),
    external_id: String(raw['External_ID'] ?? ''),
    external_name: String(raw['External_Name'] ?? ''),
    gene_symbol: String(raw['Gene_Symbol'] ?? ''),
    id_type: String(raw['ID_Type'] ?? ''),
    pkd: typeof raw['pKd'] === 'number' ? raw['pKd'] : (raw['pKd'] ? Number(raw['pKd']) : undefined),
    level: raw['Level'] ? String(raw['Level']) : undefined,
  };
  return rec;
}

export function validateRecord(rec: AptamerRecord): boolean {
  if (!rec.article_title || !rec.doi || !rec.target_name || !rec.sequence_id) return false;
  return true;
}
