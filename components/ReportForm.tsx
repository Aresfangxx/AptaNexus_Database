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
  const [locator, setLocator] = useState('');
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
      locator: mode === 'general' ? (locator.trim() || undefined) : undefined,
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

      {mode === 'general' && (
        <div>
          <label className={labelCls}>{t.labels.recordLocator}</label>
          <input value={locator} onChange={e => setLocator(e.target.value)} placeholder={t.labels.recordLocatorPlaceholder} className={inputCls} />
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
