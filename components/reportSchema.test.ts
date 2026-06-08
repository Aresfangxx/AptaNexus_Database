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
