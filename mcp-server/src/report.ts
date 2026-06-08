import http from 'http';

export interface CorrectionItem { field: string; current: string; suggested: string }
export interface ReportReporter { name: string; email: string; affiliation?: string; isOriginalAuthor: boolean }
export interface ReportPayload {
  mode: 'record' | 'general';
  record?: { internal_id?: string; sequence_id?: string; target_name?: string; doi?: string };
  category?: string;
  corrections?: CorrectionItem[];
  reason: string;
  reporter: ReportReporter;
  lang?: 'en' | 'cn';
  pageUrl?: string;
  _hp?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateReport(p: any): { ok: true; value: ReportPayload } | { ok: false; error: string } {
  if (!p || typeof p !== 'object') return { ok: false, error: 'invalid body' };
  if (p.mode !== 'record' && p.mode !== 'general') return { ok: false, error: 'invalid mode' };
  const r = p.reporter;
  if (!r || typeof r.name !== 'string' || !r.name.trim()) return { ok: false, error: 'name required' };
  if (typeof r.email !== 'string' || !EMAIL_RE.test(r.email.trim())) return { ok: false, error: 'valid email required' };
  if (typeof p.reason !== 'string' || !p.reason.trim()) return { ok: false, error: 'reason required' };
  return { ok: true, value: p as ReportPayload };
}

export function buildReportEmail(p: ReportPayload): { subject: string; text: string } {
  const target = p.record?.target_name || (p.mode === 'record' ? 'record' : 'general');
  const subject = `[AptaNexus Correction] ${p.category || 'General'} – ${target}`;
  const lines: string[] = [];
  lines.push(`Mode: ${p.mode}`);
  lines.push(`Category: ${p.category || '(none)'}`);
  if (p.record) {
    lines.push('', 'Record:');
    lines.push(`  internal_id: ${p.record.internal_id || ''}`);
    lines.push(`  sequence_id: ${p.record.sequence_id || ''}`);
    lines.push(`  target_name: ${p.record.target_name || ''}`);
    lines.push(`  doi: ${p.record.doi || ''}`);
  }
  if (p.corrections && p.corrections.length) {
    lines.push('', 'Field corrections:');
    for (const c of p.corrections) lines.push(`  - ${c.field}: "${c.current}" -> "${c.suggested}"`);
  }
  lines.push('', 'Reason:', p.reason);
  lines.push('', 'Reporter:');
  lines.push(`  name: ${p.reporter.name}`);
  lines.push(`  email: ${p.reporter.email}`);
  lines.push(`  affiliation: ${p.reporter.affiliation || ''}`);
  lines.push(`  original author: ${p.reporter.isOriginalAuthor ? 'yes' : 'no'}`);
  lines.push('', `Page: ${p.pageUrl || ''}`, `Lang: ${p.lang || ''}`);
  return { subject, text: lines.join('\n') };
}

export async function sendReportEmail(p: ReportPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY || '';
  const to = process.env.REPORT_TO_EMAIL || '';
  const from = process.env.REPORT_FROM_EMAIL || '';
  if (!apiKey || !to || !from) throw new Error('email not configured');
  const { subject, text } = buildReportEmail(p);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, reply_to: p.reporter.email, subject, text }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend error ${res.status}: ${errText}`);
  }
}

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, now: number = Date.now()): boolean {
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) { hits.set(ip, arr); return true; }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

export async function handleReport(req: http.IncomingMessage, bodyStr: string, res: http.ServerResponse): Promise<void> {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  let body: any;
  try { body = bodyStr ? JSON.parse(bodyStr) : null; }
  catch { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: 'invalid json' })); return; }

  if (body && typeof body._hp === 'string' && body._hp.trim() !== '') {
    res.end(JSON.stringify({ ok: true })); // honeypot: accept silently, drop
    return;
  }

  const ip = req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) { res.statusCode = 429; res.end(JSON.stringify({ ok: false, error: 'too many requests' })); return; }

  const v = validateReport(body);
  if (!v.ok) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, error: v.error })); return; }

  try {
    await sendReportEmail(v.value);
    res.end(JSON.stringify({ ok: true }));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  }
}
