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
