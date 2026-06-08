# Author Correction-Reporting Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an author/reader data-correction channel: a navbar "Report Error" entry → `/report` page (workflow explainer + general ticket form), a "Report correction" button on aptamer detail pages with a field-level correction picker, and a backend `POST /report` endpoint that emails structured reports to the team via Resend for manual review.

**Architecture:** Frontend (React + Vite + react-router) adds one shared `ReportForm` component used by both a standalone `/report` page and a modal on `AptamerDetailPage`. Pure form logic (field groups, payload build, client validation) lives in a testable `components/reportSchema.ts`. Backend adds a self-contained `mcp-server/src/report.ts` (validation + email build + Resend send + in-memory rate limit + honeypot), wired into the existing raw-`http` dispatch in `http-sse.ts`. Reports are delivered by email only — no DB, no admin UI.

**Tech Stack:** React 19, react-router-dom 7, Vite 6, TypeScript; Node `http` server, Resend HTTP API; vitest (frontend pure-logic tests) + the existing `mcp-server` assert-based test runner.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `components/reportSchema.ts` (new) | Pure: field groups, `currentValueOf`, `clientValidate`, payload types, `API_BASE` |
| `components/reportSchema.test.ts` (new) | vitest unit tests for the pure module |
| `components/ReportForm.tsx` (new) | Shared controlled form (`general` / `record` modes), submit + status UI |
| `components/ReportPage.tsx` (new) | `/report` page: workflow explainer + general ticket form |
| `components/AptamerDetailPage.tsx` (modify) | Add `lang` prop, "Report correction" button + modal |
| `App.tsx` (modify) | `/report` route, navbar links (both navs), pass `lang` to detail page |
| `constants.ts` (modify) | `report` bilingual content |
| `types.ts` (modify) | `ContentText.report` shape |
| `mcp-server/src/report.ts` (new) | Backend: validate, build email, send via Resend, rate limit, honeypot, `handleReport` |
| `mcp-server/tests/run-tests.ts` (modify) | Assertions for report pure logic |
| `mcp-server/src/http-sse.ts` (modify) | Wire `POST /report` |
| `render.yaml` (modify) | Add `RESEND_API_KEY` / `REPORT_TO_EMAIL` / `REPORT_FROM_EMAIL` |
| `mcp-server/.env.example` (new) | Document the three new env vars |

---

## Task 1: Backend — report validation + email builder (pure)

**Files:**
- Create: `mcp-server/src/report.ts`
- Test: `mcp-server/tests/run-tests.ts` (append)

- [ ] **Step 1: Write `mcp-server/src/report.ts` with pure functions + rate limit**

```ts
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
```

- [ ] **Step 2: Append assertions to `mcp-server/tests/run-tests.ts`**

Add this import at the top (after the existing imports):

```ts
import { validateReport, buildReportEmail, rateLimited } from '../src/report.js';
```

Add these assertions just before the final `process.stdout.write('OK\n');` line:

```ts
// --- report.ts ---
assert.ok(!validateReport(null).ok, 'report: null invalid');
assert.ok(!validateReport({ mode: 'x', reporter: {}, reason: '' }).ok, 'report: bad mode invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: '', email: 'a@b.com' }, reason: 'r' }).ok, 'report: empty name invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: 'X', email: 'bad' }, reason: 'r' }).ok, 'report: bad email invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: 'X', email: 'a@b.com' }, reason: '' }).ok, 'report: empty reason invalid');
assert.ok(validateReport({ mode: 'general', reporter: { name: 'X', email: 'a@b.com', isOriginalAuthor: true }, reason: 'r' }).ok, 'report: valid passes');

const em = buildReportEmail({ mode: 'record', record: { target_name: 'TNF', doi: '10.x' }, category: 'Affinity', corrections: [{ field: 'pKd', current: '8.2', suggested: '7.6' }], reason: 'wrong', reporter: { name: 'X', email: 'a@b.com', isOriginalAuthor: true }, lang: 'en' });
assert.ok(em.subject.includes('TNF') && em.subject.includes('Affinity'), 'report: subject ok');
assert.ok(em.text.includes('pKd') && em.text.includes('7.6'), 'report: body has correction');

const ts = 1000;
for (let i = 0; i < 5; i++) assert.ok(!rateLimited('ip-test', ts + i), 'report: within limit');
assert.ok(rateLimited('ip-test', ts + 6), 'report: over limit blocked');
```

- [ ] **Step 3: Build and run backend tests — expect PASS**

Run: `cd mcp-server && npm run build && npm test`
Expected: ends with `OK` and no AssertionError.

- [ ] **Step 4: Commit**

```bash
git add mcp-server/src/report.ts mcp-server/tests/run-tests.ts
git commit -m "feat(report): add backend report validation, email build, rate limit"
```

---

## Task 2: Backend — wire `POST /report` into the HTTP server

**Files:**
- Modify: `mcp-server/src/http-sse.ts`

- [ ] **Step 1: Add the import**

At the top of `mcp-server/src/http-sse.ts`, after the line `import { AptamerRecord } from './schema.js';`, add:

```ts
import { handleReport } from './report.js';
```

- [ ] **Step 2: Add the route block**

In the request handler, immediately AFTER the `/chat` block (the `if (parsed.pathname === '/chat' && req.method === 'POST') { ... return; }` block ends around line 280) and BEFORE the `// Legacy REST API endpoints` comment, insert:

```ts
  // Correction-report endpoint (emails the curation team via Resend)
  if (parsed.pathname === '/report' && req.method === 'POST') {
    const body = await readBody(req);
    await handleReport(req, body, res);
    return;
  }
```

- [ ] **Step 3: Add `/report` to the health-check endpoint listing**

In the `/health` response object, change the `rest` array line to include report (optional but keeps docs honest):

Find:
```ts
          rest: ['/search', '/top', '/bydoi', '/targets', '/byid']
```
Replace with:
```ts
          rest: ['/search', '/top', '/bydoi', '/targets', '/byid'],
          report: '/report'
```

- [ ] **Step 4: Build — expect success**

Run: `cd mcp-server && npm run build`
Expected: tsc completes with no errors.

- [ ] **Step 5: Smoke-test the endpoint without email configured**

Run (start server in background on the bundled data, then POST):
```bash
cd mcp-server && (PORT=3334 node dist/src/http-sse.js & SRV=$!; sleep 2; \
curl -s -X POST http://localhost:3334/report -H 'Content-Type: application/json' \
  -d '{"mode":"general","reason":"test","reporter":{"name":"A","email":"a@b.com","isOriginalAuthor":false}}'; \
echo; kill $SRV)
```
Expected: JSON `{"ok":false,"error":"email not configured"}` (validation passed; only the unset Resend env stops it). A body missing `reason` should instead return `{"ok":false,"error":"reason required"}`.

- [ ] **Step 6: Commit**

```bash
git add mcp-server/src/http-sse.ts
git commit -m "feat(report): wire POST /report endpoint"
```

---

## Task 3: Backend — env var configuration

**Files:**
- Modify: `render.yaml`
- Create: `mcp-server/.env.example`

- [ ] **Step 1: Add env vars to `render.yaml`**

In `render.yaml`, under the existing `envVars:` list (after the `ARK_API_KEY` entry), append:

```yaml
      # Correction-report email delivery (Resend HTTP API).
      - key: RESEND_API_KEY
        sync: false
      - key: REPORT_TO_EMAIL
        sync: false
      - key: REPORT_FROM_EMAIL
        sync: false
```

- [ ] **Step 2: Create `mcp-server/.env.example`**

```bash
# Volcano Ark / Doubao key for the /chat endpoint
ARK_API_KEY=

# Correction-report email delivery (Resend HTTP API)
RESEND_API_KEY=
REPORT_TO_EMAIL=team@example.com
REPORT_FROM_EMAIL=AptaNexus <noreply@yourdomain.com>
```

- [ ] **Step 3: Commit**

```bash
git add render.yaml mcp-server/.env.example
git commit -m "chore(report): document Resend env vars for /report"
```

---

## Task 4: Frontend — pure report schema module + vitest

**Files:**
- Create: `components/reportSchema.ts`
- Create: `components/reportSchema.test.ts`
- Modify: `package.json` (add vitest dev dep + test script)

- [ ] **Step 1: Create `components/reportSchema.ts`**

```ts
import { AptamerRecord } from '../types';

export const API_BASE = 'https://aptamer-database.onrender.com';

export interface FieldDef { key: string; label: string }
export interface FieldGroup { key: string; label: string; fields: FieldDef[] }

export const FIELD_GROUPS: FieldGroup[] = [
  { key: 'Target', label: 'Target', fields: [
    { key: 'target_name', label: 'Target name' },
    { key: 'target_type', label: 'Target type' },
    { key: 'gene_symbol', label: 'Gene symbol' },
    { key: 'external_id', label: 'External ID' },
  ] },
  { key: 'Sequence', label: 'Sequence', fields: [
    { key: 'aptamer_sequence', label: 'Aptamer sequence' },
    { key: 'sequence_id', label: 'Aptamer name' },
  ] },
  { key: 'Affinity', label: 'Affinity', fields: [
    { key: 'affinity', label: 'Affinity (Kd)' },
    { key: 'pKd', label: 'pKd' },
    { key: 'buffer_condition', label: 'Buffer condition' },
  ] },
  { key: 'Secondary structure', label: 'Secondary structure', fields: [
    { key: 'secstr_dotbracket', label: 'Dot-bracket' },
    { key: 'mfe', label: 'MFE' },
    { key: 'secstr_image', label: 'Structure image' },
  ] },
  { key: 'Literature', label: 'Literature', fields: [
    { key: 'article_title', label: 'Article title' },
    { key: 'journal', label: 'Journal' },
    { key: 'year', label: 'Year' },
    { key: 'doi', label: 'DOI' },
  ] },
  { key: 'Quality', label: 'Quality', fields: [
    { key: 'level', label: 'Quality level' },
  ] },
  { key: 'Other', label: 'Other', fields: [] },
];

export interface CorrectionItem { field: string; current: string; suggested: string }
export interface ReportReporter { name: string; email: string; affiliation?: string; isOriginalAuthor: boolean }
export interface ReportPayload {
  mode: 'record' | 'general';
  record?: { internal_id?: string; sequence_id?: string; target_name?: string; doi?: string };
  category: string;
  corrections: CorrectionItem[];
  reason: string;
  reporter: ReportReporter;
  lang: 'en' | 'cn';
  pageUrl?: string;
  _hp?: string;
}

export function currentValueOf(record: AptamerRecord | undefined, field: string): string {
  if (!record) return '';
  const v = (record as any)[field];
  return v === undefined || v === null ? '' : String(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function clientValidate(p: ReportPayload): 'name' | 'email' | 'reason' | null {
  if (!p.reporter.name.trim()) return 'name';
  if (!EMAIL_RE.test(p.reporter.email.trim())) return 'email';
  if (!p.reason.trim()) return 'reason';
  return null;
}
```

- [ ] **Step 2: Write the failing test `components/reportSchema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { clientValidate, currentValueOf, FIELD_GROUPS, ReportPayload } from './reportSchema';

const base: ReportPayload = {
  mode: 'general', category: 'Other', corrections: [], reason: 'x',
  reporter: { name: 'A', email: 'a@b.com', isOriginalAuthor: false }, lang: 'en',
};

describe('clientValidate', () => {
  it('passes a valid payload', () => { expect(clientValidate(base)).toBeNull(); });
  it('flags empty name', () => { expect(clientValidate({ ...base, reporter: { ...base.reporter, name: ' ' } })).toBe('name'); });
  it('flags bad email', () => { expect(clientValidate({ ...base, reporter: { ...base.reporter, email: 'bad' } })).toBe('email'); });
  it('flags empty reason', () => { expect(clientValidate({ ...base, reason: '' })).toBe('reason'); });
});

describe('currentValueOf', () => {
  it('returns empty for missing record', () => { expect(currentValueOf(undefined, 'pKd')).toBe(''); });
  it('stringifies a numeric field', () => { expect(currentValueOf({ pKd: 7.6 } as any, 'pKd')).toBe('7.6'); });
});

describe('FIELD_GROUPS', () => {
  it('includes an Affinity group containing pKd', () => {
    const g = FIELD_GROUPS.find(x => x.key === 'Affinity');
    expect(g?.fields.some(f => f.key === 'pKd')).toBe(true);
  });
});
```

- [ ] **Step 3: Add vitest to `package.json`**

In the root `package.json`, add to `scripts`:
```json
    "test": "vitest run"
```
Then install vitest:
```bash
npm install -D vitest
```

- [ ] **Step 4: Run the tests — expect PASS**

Run: `npm test`
Expected: all reportSchema tests pass.

- [ ] **Step 5: Commit**

```bash
git add components/reportSchema.ts components/reportSchema.test.ts package.json package-lock.json
git commit -m "feat(report): add frontend report schema module + vitest tests"
```

---

## Task 5: Frontend — i18n content (`types.ts` + `constants.ts`)

**Files:**
- Modify: `types.ts`
- Modify: `constants.ts`

- [ ] **Step 1: Add `report` to the `ContentText` interface in `types.ts`**

Inside `interface ContentText { ... }`, after the `ai` field block, add:

```ts
  report: {
    navLabel: string;
    pageTitle: string;
    pageSubtitle: string;
    steps: { title: string; body: string }[];
    scopeTitle: string;
    scopeItems: string[];
    formHeading: string;
    labels: {
      category: string;
      whichFields: string;
      currentValue: string;
      suggestedValue: string;
      reason: string;
      reasonPlaceholder: string;
      name: string;
      email: string;
      affiliation: string;
      isAuthor: string;
      recordLocator: string;
      submit: string;
      submitting: string;
      requiredMark: string;
    };
    success: { title: string; body: string };
    errorBody: string;
    validation: { name: string; email: string; reason: string };
    cardButton: string;
    recordSummaryTitle: string;
  };
```

- [ ] **Step 2: Add the English `report` block in `constants.ts`**

Inside `CONTENT.en`, after the `history: { ... }` block (add a comma after its closing `}`), insert:

```ts
    report: {
      navLabel: 'Report Error',
      pageTitle: 'Report a Data Correction',
      pageSubtitle: 'AptaNexus combines LLM-driven extraction with human calibration. If you are an original author — or a reader who spotted an error — this channel lets you submit corrections directly to our curation team.',
      steps: [
        { title: 'Tell us what is wrong', body: 'Choose whether you are correcting a specific database record or reporting a general issue. For a specific record, open it and use the "Report correction" button so the fields are pre-filled.' },
        { title: 'Select the affected fields', body: 'Pick the category (target, sequence, affinity, structure, literature, quality) and check the exact fields that are incorrect. The current stored value is shown next to each one.' },
        { title: 'Provide the correct information', body: 'Enter the corrected value for each field and explain the reason, ideally citing the relevant table, figure or section of the original paper.' },
        { title: 'We review and follow up', body: 'Your report is sent to our curation team for manual review. We may reply to your email for clarification, and confirmed corrections are applied to the database. Typical turnaround is 1–2 weeks.' },
      ],
      scopeTitle: 'What you can report',
      scopeItems: [
        'Incorrect target, gene symbol or external identifier',
        'Wrong or truncated aptamer sequence or name',
        'Incorrect affinity (Kd), pKd or buffer conditions',
        'Errors in secondary structure, dot-bracket or MFE',
        'Wrong article title, journal, year or DOI',
        'Misclassified quality level, or anything else',
      ],
      formHeading: 'Submit a correction ticket',
      labels: {
        category: 'Problem category',
        whichFields: 'Which fields are incorrect?',
        currentValue: 'Current value',
        suggestedValue: 'Correct value',
        reason: 'Reason / evidence',
        reasonPlaceholder: 'e.g. Table 2 of the original paper reports Kd = 38 nM, not 380 nM.',
        name: 'Your name',
        email: 'Your email',
        affiliation: 'Affiliation (optional)',
        isAuthor: 'I am an original author of this work',
        recordLocator: 'Record (DOI / sequence name / target)',
        submit: 'Submit report',
        submitting: 'Submitting…',
        requiredMark: '*',
      },
      success: { title: 'Thank you — report received', body: 'Our curation team will review your correction and may follow up by email. Typical turnaround is 1–2 weeks.' },
      errorBody: 'Submission failed. Please try again in a moment — your entries have been kept.',
      validation: { name: 'Please enter your name.', email: 'Please enter a valid email address.', reason: 'Please describe the issue.' },
      cardButton: 'Report correction',
      recordSummaryTitle: 'Reporting on this record',
    }
```

- [ ] **Step 3: Add the Chinese `report` block in `constants.ts`**

Inside `CONTENT.cn`, after its `history: { ... }` block (add a comma after its closing `}`), insert:

```ts
    report: {
      navLabel: '报错',
      pageTitle: '提交数据更正',
      pageSubtitle: 'AptaNexus 由大模型抽取并经人工校准。如果您是原作者，或在使用中发现了错误，可通过此渠道将更正直接提交给我们的数据审核团队。',
      steps: [
        { title: '说明问题所在', body: '先选择您是要更正某条具体的数据库记录，还是反馈一般性问题。若针对具体记录，请打开该记录并使用 “Report correction” 按钮，相关字段会自动带入。' },
        { title: '选择出错的字段', body: '选择问题类别（靶标、序列、亲和力、结构、文献、质量），并勾选确切出错的字段；每个字段旁会显示当前存储的值。' },
        { title: '填写正确的内容', body: '为每个字段填写正确值，并说明理由，最好引用原文的相应表格、图或章节。' },
        { title: '我们审核并回复', body: '您的报告会发送给数据审核团队进行人工审核。我们可能通过邮件与您联系核实，确认无误的更正将更新到数据库。通常处理周期为 1–2 周。' },
      ],
      scopeTitle: '可报告的内容',
      scopeItems: [
        '靶标、基因符号或外部标识符有误',
        '适配体序列或名称错误、被截断',
        '亲和力（Kd）、pKd 或缓冲条件有误',
        '二级结构、点括号或 MFE 错误',
        '文章标题、期刊、年份或 DOI 错误',
        '质量等级分类错误，或其他任何问题',
      ],
      formHeading: '提交纠错工单',
      labels: {
        category: '问题类别',
        whichFields: '哪些字段有误？',
        currentValue: '当前值',
        suggestedValue: '正确值',
        reason: '理由 / 依据',
        reasonPlaceholder: '例如：原文 Table 2 报告的 Kd 为 38 nM，而非 380 nM。',
        name: '您的姓名',
        email: '您的邮箱',
        affiliation: '单位（选填）',
        isAuthor: '我是这项工作的原作者',
        recordLocator: '记录（DOI / 序列名称 / 靶标）',
        submit: '提交报告',
        submitting: '提交中…',
        requiredMark: '*',
      },
      success: { title: '感谢您——报告已收到', body: '我们的数据审核团队会审核您的更正，并可能通过邮件与您联系。通常处理周期为 1–2 周。' },
      errorBody: '提交失败，请稍后重试——您填写的内容已保留。',
      validation: { name: '请填写您的姓名。', email: '请填写有效的邮箱地址。', reason: '请描述问题。' },
      cardButton: '报错纠正',
      recordSummaryTitle: '正在报告此记录',
    }
```

- [ ] **Step 4: Type-check — expect success**

Run: `npx tsc --noEmit`
Expected: no errors (the `ContentText.report` shape now matches both locales).

- [ ] **Step 5: Commit**

```bash
git add types.ts constants.ts
git commit -m "feat(report): add bilingual report content"
```

---

## Task 6: Frontend — shared `ReportForm` component

**Files:**
- Create: `components/ReportForm.tsx`

- [ ] **Step 1: Create `components/ReportForm.tsx`**

```tsx
import React, { useState } from 'react';
import { AptamerRecord, Language } from '../types';
import { CONTENT } from '../constants';
import { API_BASE, FIELD_GROUPS, currentValueOf, clientValidate, CorrectionItem, ReportPayload } from './reportSchema';

interface ReportFormProps {
  mode: 'record' | 'general';
  lang: Language;
  record?: AptamerRecord;
  onClose?: () => void;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export const ReportForm: React.FC<ReportFormProps> = ({ mode, lang, record, onClose }) => {
  const t = CONTENT[lang].report;
  const [category, setCategory] = useState<string>(FIELD_GROUPS[0].key);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [suggested, setSuggested] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [isAuthor, setIsAuthor] = useState(false);
  const [hp, setHp] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [fieldError, setFieldError] = useState<'name' | 'email' | 'reason' | null>(null);

  const activeGroup = FIELD_GROUPS.find(g => g.key === category) || FIELD_GROUPS[0];
  const toggleField = (key: string) => setChecked(c => ({ ...c, [key]: !c[key] }));

  const buildPayload = (): ReportPayload => {
    const corrections: CorrectionItem[] = activeGroup.fields
      .filter(f => checked[f.key])
      .map(f => ({ field: f.key, current: currentValueOf(record, f.key), suggested: suggested[f.key] || '' }));
    return {
      mode,
      record: record ? { internal_id: record.internal_id, sequence_id: record.sequence_id, target_name: record.target_name, doi: record.doi } : undefined,
      category,
      corrections,
      reason,
      reporter: { name, email, affiliation: affiliation || undefined, isOriginalAuthor: isAuthor },
      lang,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      _hp: hp,
    };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    const invalid = clientValidate(payload);
    if (invalid) { setFieldError(invalid); return; }
    setFieldError(null);
    setStatus('submitting');
    try {
      const res = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <h3 className="font-serif text-2xl text-academic-900 mb-2">{t.success.title}</h3>
        <p className="text-academic-600">{t.success.body}</p>
        {onClose && <button onClick={onClose} className="mt-6 px-6 py-2 bg-academic-900 text-white rounded-sm">OK</button>}
      </div>
    );
  }

  const inputCls = 'w-full border border-academic-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-academic-200';
  const labelCls = 'block text-xs uppercase tracking-wider text-academic-500 font-semibold mb-1';

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode === 'record' && record && (
        <div className="bg-academic-50 border border-academic-200 rounded-sm p-4 text-sm">
          <div className="text-xs uppercase tracking-wider text-academic-500 font-semibold mb-2">{t.recordSummaryTitle}</div>
          <div className="text-academic-800"><span className="font-medium">{record.sequence_id}</span> · {record.target_name}{record.doi ? ` · ${record.doi}` : ''}</div>
        </div>
      )}

      <div>
        <label className={labelCls}>{t.labels.category}</label>
        <select value={category} onChange={e => { setCategory(e.target.value); setChecked({}); }} className={inputCls}>
          {FIELD_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
        </select>
      </div>

      {activeGroup.fields.length > 0 && (
        <div>
          <label className={labelCls}>{t.labels.whichFields}</label>
          <div className="space-y-3">
            {activeGroup.fields.map(f => (
              <div key={f.key} className="border border-academic-200 rounded-sm p-3">
                <label className="flex items-center gap-2 text-sm text-academic-800 cursor-pointer">
                  <input type="checkbox" checked={!!checked[f.key]} onChange={() => toggleField(f.key)} />
                  {f.label}
                </label>
                {checked[f.key] && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-academic-500 mb-1">{t.labels.currentValue}</div>
                      <div className="bg-academic-50 border border-academic-200 rounded-sm px-3 py-2 text-sm text-academic-700 break-all min-h-[2.25rem]">{currentValueOf(record, f.key) || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-academic-500 mb-1">{t.labels.suggestedValue}</div>
                      <input value={suggested[f.key] || ''} onChange={e => setSuggested(s => ({ ...s, [f.key]: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelCls}>{t.labels.reason} {t.labels.requiredMark}</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder={t.labels.reasonPlaceholder} className={inputCls} />
        {fieldError === 'reason' && <p className="text-xs text-red-600 mt-1">{t.validation.reason}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t.labels.name} {t.labels.requiredMark}</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          {fieldError === 'name' && <p className="text-xs text-red-600 mt-1">{t.validation.name}</p>}
        </div>
        <div>
          <label className={labelCls}>{t.labels.email} {t.labels.requiredMark}</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          {fieldError === 'email' && <p className="text-xs text-red-600 mt-1">{t.validation.email}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t.labels.affiliation}</label>
          <input value={affiliation} onChange={e => setAffiliation(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-academic-700 cursor-pointer">
            <input type="checkbox" checked={isAuthor} onChange={e => setIsAuthor(e.target.checked)} />
            {t.labels.isAuthor}
          </label>
        </div>
      </div>

      {/* honeypot — hidden from real users */}
      <input type="text" value={hp} onChange={e => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {status === 'error' && <p className="text-sm text-red-600">{t.errorBody}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={status === 'submitting'} className="px-6 py-2.5 bg-academic-900 text-white rounded-sm font-medium hover:bg-academic-800 disabled:opacity-50 transition-colors">
          {status === 'submitting' ? t.labels.submitting : t.labels.submit}
        </button>
        {onClose && <button type="button" onClick={onClose} className="px-6 py-2.5 border border-academic-300 rounded-sm hover:bg-academic-50 transition-colors">Cancel</button>}
      </div>
    </form>
  );
};
```

- [ ] **Step 2: Type-check — expect success**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ReportForm.tsx
git commit -m "feat(report): add shared ReportForm component"
```

---

## Task 7: Frontend — `/report` page

**Files:**
- Create: `components/ReportPage.tsx`

- [ ] **Step 1: Create `components/ReportPage.tsx`**

```tsx
import React from 'react';
import { CONTENT } from '../constants';
import { Language } from '../types';
import { ReportForm } from './ReportForm';

export const ReportPage: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = CONTENT[lang].report;
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-12 py-12">
      <h1 className="font-serif text-3xl lg:text-4xl text-academic-900 mb-3">{t.pageTitle}</h1>
      <p className="text-academic-600 text-lg font-light mb-10">{t.pageSubtitle}</p>

      <div className="space-y-6 mb-10">
        {t.steps.map((s, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-academic-900 text-white flex items-center justify-center text-sm font-bold">{i + 1}</div>
            <div>
              <h3 className="font-medium text-academic-900">{s.title}</h3>
              <p className="text-academic-600 text-sm mt-1 leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-academic-50 border border-academic-200 rounded-lg p-6 mb-12">
        <h3 className="font-serif text-lg text-academic-900 mb-3">{t.scopeTitle}</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-academic-700">
          {t.scopeItems.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      </div>

      <div className="border-t border-academic-200 pt-10">
        <h2 className="font-serif text-2xl text-academic-900 mb-6">{t.formHeading}</h2>
        <ReportForm mode="general" lang={lang} />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Type-check — expect success**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ReportPage.tsx
git commit -m "feat(report): add /report page"
```

---

## Task 8: Frontend — route + navbar links in `App.tsx`

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Add the import**

After `import { AptamerDetailPage } from './components/AptamerDetailPage';`, add:

```ts
import { ReportPage } from './components/ReportPage';
```

- [ ] **Step 2: Add a nav link in the HomePage navbar**

In `HomePage`, inside the `<div className="hidden md:flex gap-6 ...">` group, after the `API` anchor (`<a href="#api" ...>API</a>`), add:

```tsx
            <Link
              to="/report"
              className="hover:text-academic-900 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-[-4px] after:left-0 after:bg-academic-900 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left"
            >
              {CONTENT[lang].report.navLabel}
            </Link>
```

- [ ] **Step 3: Add a nav link in the InnerPageLayout navbar**

In `InnerPageLayout`, inside `<div className="flex gap-4 items-center">`, after the `Home` link (`<Link to="/" ...>Home</Link>`), add:

```tsx
          <Link to="/report" className="text-sm font-medium text-academic-600 hover:text-academic-900">{CONTENT[lang].report.navLabel}</Link>
```

- [ ] **Step 4: Add the `/report` route**

In the `<Routes>` block, after the `/aptamer/:aptamerId` route, add:

```tsx
        <Route
          path="/report"
          element={
            <InnerPageLayout lang={lang} setLang={setLang}>
              <ReportPage lang={lang} />
            </InnerPageLayout>
          }
        />
```

- [ ] **Step 5: Pass `lang` to the aptamer detail route**

Change the `/aptamer/:aptamerId` route element from:
```tsx
              <AptamerDetailPage />
```
to:
```tsx
              <AptamerDetailPage lang={lang} />
```

(`AptamerDetailPage` gains the `lang` prop in Task 9 — do Task 9 before type-checking.)

- [ ] **Step 6: Commit (after Task 9 type-check passes)**

Deferred to Task 9 Step 4 so the `lang` prop exists.

---

## Task 9: Frontend — "Report correction" button + modal on detail page

**Files:**
- Modify: `components/AptamerDetailPage.tsx`

- [ ] **Step 1: Update imports and component signature**

Change the imports at the top to add `Language`, `CONTENT`, `ReportForm`:

From:
```tsx
import { AptamerRecord } from '../types';
import { fetchAptamerById } from '../utils/dataLoader';
import { ArrowRight, StemLoopIcon } from './Icons';
```
To:
```tsx
import { AptamerRecord, Language } from '../types';
import { fetchAptamerById } from '../utils/dataLoader';
import { ArrowRight, StemLoopIcon } from './Icons';
import { CONTENT } from '../constants';
import { ReportForm } from './ReportForm';
```

Change the component signature from:
```tsx
export const AptamerDetailPage: React.FC = () => {
```
To:
```tsx
export const AptamerDetailPage: React.FC<{ lang: Language }> = ({ lang }) => {
```

- [ ] **Step 2: Add modal state**

After `const [loading, setLoading] = useState(true);`, add:

```tsx
  const [showReport, setShowReport] = useState(false);
```

- [ ] **Step 3: Replace the back-button row with a back + report toolbar, and add the modal**

Replace this block:
```tsx
      <button onClick={onBack} className="flex items-center text-sm text-academic-500 hover:text-academic-900 mb-8 transition-colors">
        <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to List
      </button>
```
With:
```tsx
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center text-sm text-academic-500 hover:text-academic-900 transition-colors">
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to List
        </button>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 text-sm text-academic-500 hover:text-academic-900 border border-academic-300 rounded-sm px-3 py-1.5 hover:bg-academic-50 transition-colors"
        >
          ⚐ {CONTENT[lang].report.cardButton}
        </button>
      </div>

      {showReport && record && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 overflow-y-auto py-10 px-4" onClick={() => setShowReport(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-8 my-auto" onClick={e => e.stopPropagation()}>
            <h2 className="font-serif text-2xl text-academic-900 mb-6">{CONTENT[lang].report.formHeading}</h2>
            <ReportForm mode="record" lang={lang} record={record} onClose={() => setShowReport(false)} />
          </div>
        </div>
      )}
```

- [ ] **Step 4: Type-check the whole app — expect success**

Run: `npx tsc --noEmit`
Expected: no errors (App.tsx now passes `lang`, detail page accepts it).

- [ ] **Step 5: Commit (App.tsx + detail page together)**

```bash
git add App.tsx components/AptamerDetailPage.tsx
git commit -m "feat(report): add navbar entry, /report route, and detail-page report modal"
```

---

## Task 10: Full build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Frontend production build — expect success**

Run: `npm run build`
Expected: Vite build completes with no TypeScript errors.

- [ ] **Step 2: Backend build + tests — expect success**

Run: `cd mcp-server && npm run build && npm test`
Expected: tsc clean; tests end with `OK`.

- [ ] **Step 3: Manual smoke (dev server)**

Run: `npm run dev`, then in the browser:
- Navbar shows "Report Error" (EN) / "报错" (CN); clicking goes to `/report`.
- `/report` shows the 4 workflow steps, the scope list, and the general ticket form.
- Submitting with an empty name/email/reason shows the inline validation message.
- Open any aptamer detail page (`/aptamer/...`): the "⚐ Report correction" button opens a modal with the record summary pre-filled; selecting the Affinity category and checking `pKd` shows the current stored value beside an editable "Correct value" box.
- Toggling EN/CN updates all report labels.

(Network submit will fail against the deployed backend until Resend env vars are set on Render — the form should then show the "submission failed, entries kept" message. That is expected pre-deploy.)

- [ ] **Step 4: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore(report): verification fixups"
```

---

## Self-Review Notes

- **Spec coverage:** navbar entry (Task 8) ✓; `/report` page explainer + general form (Task 7) ✓; field-level picker aligned to `AptamerRecord` (Task 4 FIELD_GROUPS + Task 6 form) ✓; detail-page button + modal, detail page only (Task 9) ✓; backend `/report` + Resend email (Tasks 1–2) ✓; name+email required (Task 1 `validateReport`, Task 4 `clientValidate`) ✓; honeypot + rate limit, no captcha/DB (Task 1) ✓; bilingual (Task 5) ✓; no public email shown, failure keeps entries (Task 6 keeps state on `error`, no mailto) ✓; env vars (Task 3) ✓.
- **Type consistency:** `ReportPayload` defined twice intentionally (frontend `reportSchema.ts` and backend `report.ts`) since they are separate packages; field names/shape kept identical so the JSON contract matches. `clientValidate` returns `'name' | 'email' | 'reason' | null`, consumed by `ReportForm`'s `fieldError` state of the same type.
- **No placeholders:** every code step contains full content.
