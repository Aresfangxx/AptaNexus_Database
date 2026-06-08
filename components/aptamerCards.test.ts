import { describe, it, expect } from 'vitest';
import { parseAssistantContent } from './aptamerCards';

const block = (json: string) => '```aptamers\n' + json + '\n```';
const rec =
  '{"sequence_id":"Lac201","target_name":"L-lactate","sequence":"GACGAC","affinity":"0.43 mM","pkd":3.37,"doi":"10.1/x","article_title":"T","journal":"J","year":"2023"}';

describe('parseAssistantContent', () => {
  it('plain prose → single text segment', () => {
    const segs = parseAssistantContent('Hello, no records here.');
    expect(segs).toEqual([{ kind: 'text', text: 'Hello, no records here.' }]);
  });

  it('empty content → no segments', () => {
    expect(parseAssistantContent('')).toEqual([]);
  });

  it('prose + complete block → text then cards', () => {
    const segs = parseAssistantContent('Here you go:\n\n' + block('[' + rec + ']'));
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ kind: 'text', text: 'Here you go:' });
    expect(segs[1].kind).toBe('cards');
    if (segs[1].kind === 'cards') {
      expect(segs[1].cards[0].sequence_id).toBe('Lac201');
      expect(segs[1].cards[0].pkd).toBe(3.37);
    }
  });

  it('block still streaming (no closing fence) → pending', () => {
    const segs = parseAssistantContent('Looking:\n\n```aptamers\n[{"sequence_id":"Lac2');
    expect(segs[0]).toEqual({ kind: 'text', text: 'Looking:' });
    expect(segs[segs.length - 1]).toEqual({ kind: 'pending' });
    // partial JSON is never surfaced as text
    expect(segs.some((s) => s.kind === 'text' && s.text.includes('Lac2'))).toBe(false);
  });

  it('malformed JSON in a closed block → falls back to raw text, never crashes', () => {
    const segs = parseAssistantContent(block('[not valid json'));
    expect(segs).toHaveLength(1);
    expect(segs[0].kind).toBe('text');
  });

  it('missing/null fields are normalized to empty/null', () => {
    const segs = parseAssistantContent(block('[{"sequence_id":"X"}]'));
    expect(segs[0].kind).toBe('cards');
    if (segs[0].kind === 'cards') {
      const c = segs[0].cards[0];
      expect(c.sequence_id).toBe('X');
      expect(c.target_name).toBe('');
      expect(c.pkd).toBeNull();
    }
  });

  it('pkd given as a string number is coerced', () => {
    const segs = parseAssistantContent(block('[{"sequence_id":"X","pkd":"8.2"}]'));
    if (segs[0].kind === 'cards') expect(segs[0].cards[0].pkd).toBe(8.2);
  });

  it('accepts {"records":[...]} wrapper too', () => {
    const segs = parseAssistantContent(block('{"records":[' + rec + ']}'));
    expect(segs[0].kind).toBe('cards');
  });

  it('cards followed by trailing prose', () => {
    const segs = parseAssistantContent(block('[' + rec + ']') + '\n\nLet me know if you need more.');
    expect(segs[0].kind).toBe('cards');
    expect(segs[1]).toEqual({ kind: 'text', text: 'Let me know if you need more.' });
  });
});
