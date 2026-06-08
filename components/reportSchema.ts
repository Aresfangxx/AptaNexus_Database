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
