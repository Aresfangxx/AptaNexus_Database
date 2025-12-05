const SYNONYMS: Record<string, string[]> = {
  '乳酸': ['lactate', 'l-lactate', 'lactic acid'],
  'l-乳酸': ['l-lactate', 'lactate'],
  '乳酸根': ['lactate'],
  '乳酸钠': ['sodium lactate'],
};

function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(s: string): string {
  const t = stripDiacritics(s).toLowerCase().replace(/[^a-z0-9\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}

export function expandSynonyms(query: string): string[] {
  const base = normalizeText(query);
  const direct = SYNONYMS[query] || SYNONYMS[base] || [];
  const uniq = new Set<string>([base, ...direct.map(normalizeText)]);
  return Array.from(uniq).filter(Boolean);
}
