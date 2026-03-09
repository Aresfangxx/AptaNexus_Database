function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(s: string): string {
  const t = stripDiacritics(s).toLowerCase().replace(/[^a-z0-9\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
