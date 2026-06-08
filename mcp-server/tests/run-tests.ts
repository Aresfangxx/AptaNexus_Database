import assert from 'assert';
import { loadJSONL } from '../src/loader.js';
import { searchByTarget, getByDoi } from '../src/search.js';
import { validateReport, buildReportEmail, rateLimited } from '../src/report.js';

// --- report.ts (pure, network-independent: run first) ---
assert.ok(!validateReport(null).ok, 'report: null invalid');
assert.ok(!validateReport({ mode: 'x', reporter: {}, reason: '' }).ok, 'report: bad mode invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: '', email: 'a@b.com' }, reason: 'r' }).ok, 'report: empty name invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: 'X', email: 'bad' }, reason: 'r' }).ok, 'report: bad email invalid');
assert.ok(!validateReport({ mode: 'general', reporter: { name: 'X', email: 'a@b.com' }, reason: '' }).ok, 'report: empty reason invalid');
assert.ok(validateReport({ mode: 'general', reporter: { name: 'X', email: 'a@b.com', isOriginalAuthor: true }, reason: 'r' }).ok, 'report: valid passes');

const reportEmail = buildReportEmail({ mode: 'record', record: { target_name: 'TNF', doi: '10.x' }, category: 'Affinity', corrections: [{ field: 'pKd', current: '8.2', suggested: '7.6' }], reason: 'wrong', reporter: { name: 'X', email: 'a@b.com', isOriginalAuthor: true }, lang: 'en' });
assert.ok(reportEmail.subject.includes('TNF') && reportEmail.subject.includes('Affinity'), 'report: subject ok');
assert.ok(reportEmail.text.includes('pKd') && reportEmail.text.includes('7.6'), 'report: body has correction');

const rlNow = 1000;
for (let i = 0; i < 5; i++) assert.ok(!rateLimited('ip-test', rlNow + i), 'report: within limit');
assert.ok(rateLimited('ip-test', rlNow + 6), 'report: over limit blocked');

process.stdout.write('report tests OK\n');

const data = loadJSONL();

assert.ok(Array.isArray(data) && data.length > 0, 'data loaded');

const r1 = searchByTarget(data, '乳酸', 10, 0);
assert.ok(Array.isArray(r1), 'search returns array');

const sampleDoi = data[0]?.doi || '';
if (sampleDoi) {
  const r2 = getByDoi(data, sampleDoi);
  assert.ok(r2.length >= 1, 'get by doi returns');
}

process.stdout.write('OK\n');
