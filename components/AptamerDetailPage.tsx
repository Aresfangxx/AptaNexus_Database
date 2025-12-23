
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AptamerRecord } from '../types';
import { fetchAptamerById } from '../utils/dataLoader';
import { ArrowRight, StemLoopIcon } from './Icons';

export const AptamerDetailPage: React.FC = () => {
  const { aptamerId } = useParams<{ aptamerId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AptamerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!aptamerId) return;

    setLoading(true);
    fetchAptamerById(decodeURIComponent(aptamerId)).then(rec => {
        setRecord(rec);
        setLoading(false);
    });
  }, [aptamerId]);

  const onBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (loading) return <div className="p-12 text-center animate-pulse">Loading aptamer details...</div>;
  if (!record) return <div className="p-12 text-center">Record not found. <button onClick={onBack}>Back</button></div>;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12">
      <button onClick={onBack} className="flex items-center text-sm text-academic-500 hover:text-academic-900 mb-8 transition-colors">
        <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to List
      </button>

      {/* Header Card */}
      <div className="bg-white border border-academic-200 rounded-lg p-8 shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <StemLoopIcon className="w-48 h-48" />
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
                <h1 className="font-serif text-3xl text-academic-900">{record.sequence_id}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    record.level === 'P' ? 'bg-emerald-100 text-emerald-800' :
                    record.level === 'A' ? 'bg-blue-100 text-blue-800' :
                    'bg-academic-100 text-academic-600'
                }`}>
                    Level {record.level}
                </span>
                {record.best && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-200">Best in Class</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                    <h3 className="text-xs uppercase tracking-wider text-academic-500 font-semibold mb-1">Target</h3>
                    <div className="text-xl text-academic-800 font-medium">{record.target_name}</div>
                    <div className="text-sm text-academic-500">{record.target_type}</div>
                    {record.gene_symbol ? (
                      <div className="mt-1 inline-block px-2 py-0.5 bg-academic-100 text-academic-600 text-xs rounded font-medium font-mono">
                        {record.gene_symbol}
                      </div>
                    ) : (record.id_type === 'PubChem CID' && record.external_name) ? (
                      <div className="mt-1 inline-block px-2 py-0.5 bg-academic-100 text-academic-600 text-xs rounded font-medium">
                        {record.external_name}
                      </div>
                    ) : null}
                </div>
                <div>
                    <h3 className="text-xs uppercase tracking-wider text-academic-500 font-semibold mb-1">Affinity (Kd)</h3>
                    <div className="text-xl text-academic-800 font-medium">{record.affinity || 'Not Reported'}</div>
                    {record.pKd && <div className="text-sm text-academic-500">pKd: {record.pKd}</div>}
                </div>
            </div>
        </div>
      </div>

      {/* Sequence Box */}
      <div className="mb-8">
        <h3 className="text-lg font-serif text-academic-900 mb-3">Nucleotide Sequence</h3>
        <div className="bg-academic-50 border border-academic-200 rounded-lg p-6 font-mono text-academic-800 break-all text-lg leading-relaxed shadow-inner">
            {record.aptamer_sequence}
        </div>
        <div className="mt-2 text-right text-xs text-academic-500">{record.aptamer_sequence.length} nucleotides</div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Experimental Conditions */}
         <div className="bg-white border border-academic-200 rounded-lg p-6">
            <h3 className="font-serif text-lg text-academic-900 mb-4 pb-2 border-b border-academic-100">Experimental Conditions</h3>
            <div className="space-y-4">
                <div>
                    <div className="text-xs text-academic-500 uppercase">Buffer Condition</div>
                    <div className="text-sm text-academic-800 mt-1">{record.buffer_condition || 'Not specified'}</div>
                </div>
                {/* Add more fields if available in JSON */}
            </div>
         </div>

         {/* Secondary Structure */}
         <div className="bg-white border border-academic-200 rounded-lg p-6">
            <h3 className="font-serif text-lg text-academic-900 mb-4 pb-2 border-b border-academic-100">Secondary Structure</h3>
            <div className="space-y-4">
               {record.secstr_image ? (
                 <div className="rounded border border-academic-100 bg-academic-50 overflow-hidden">
                    <img src={`/${record.secstr_image}`} alt={`${record.sequence_id} secondary structure`} className="w-full h-auto" />
                 </div>
               ) : (
                 <div className="text-sm text-academic-500">Not available</div>
               )}

               <div>
                 <div className="text-xs text-academic-500 uppercase">Dot-Bracket</div>
                 <div className="mt-1 bg-academic-50 border border-academic-200 rounded p-3 font-mono text-sm text-academic-800 break-all">
                   {record.secstr_dotbracket || 'Not specified'}
                 </div>
               </div>

               <div className="text-sm text-academic-700">MFE: {record.mfe !== undefined ? record.mfe : 'Not specified'}</div>
            </div>
         </div>

         {/* Literature */}
         <div className="bg-white border border-academic-200 rounded-lg p-6">
            <h3 className="font-serif text-lg text-academic-900 mb-4 pb-2 border-b border-academic-100">Source Literature</h3>
            <div className="space-y-4">
                <div>
                    <div className="font-medium text-academic-900 leading-snug">{record.article_title}</div>
                    <div className="text-sm text-academic-600 mt-1 italic">{record.journal}, {record.year}</div>
                </div>
                {record.doi && (
                    <a href={`https://doi.org/${record.doi}`} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-academic-900 hover:underline">
                        View DOI <ArrowRight className="w-3 h-3 ml-1" />
                    </a>
                )}
            </div>
         </div>
      </div>
    </div>
  );
};
