
import React from 'react';
import { TargetGroup, AptamerRecord } from '../types';
import { ArrowRight, StemLoopIcon } from './Icons';

interface Props {
  group: TargetGroup;
  onViewAll: (target: string) => void;
  onViewAptamer: (id: string) => void;
}

const SequencePreview: React.FC<{ seq: string }> = ({ seq }) => {
  if (seq.length <= 15) return <span className="font-mono text-xs text-academic-700">{seq}</span>;
  return (
    <span className="font-mono text-xs text-academic-700 group-hover:text-academic-900 transition-colors">
      {seq.slice(0, 7)}
      <span className="text-academic-400">...</span>
      {seq.slice(-7)}
    </span>
  );
};

export const TargetCard: React.FC<Props> = ({ group, onViewAll, onViewAptamer }) => {
  
  // Helper to render preview message
  const getPreviewHeader = () => {
    if (group.preview_type === 'P') {
      return (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
            Level P (High Confidence)
          </span>
          <span className="text-xs text-academic-400 font-light">— Top affinity sorted</span>
        </div>
      );
    } else if (group.preview_type === 'A') {
      return (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Level A (Verified)
          </span>
          <span className="text-xs text-academic-400 font-light">— No Level P records found</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-academic-400"></div>
          <span className="text-xs font-semibold text-academic-600 uppercase tracking-wide">
            Level B/C (Reported)
          </span>
          <span className="text-xs text-academic-400 font-light">— No quantitative affinity</span>
        </div>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-academic-200 hover:border-academic-300 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group/card">
      
      {/* --- HEADER --- */}
      <div className="p-6 border-b border-academic-50">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 
                className="font-serif text-2xl text-academic-900 cursor-pointer hover:underline decoration-academic-300 underline-offset-4"
                onClick={() => onViewAll(group.target_name)}
              >
                {group.target_name}
              </h3>
              {group.gene_symbol && (
                <span className="px-2 py-0.5 bg-academic-100 text-academic-600 text-xs rounded font-medium font-mono">
                  {group.gene_symbol}
                </span>
              )}
            </div>
            <span className="inline-block text-xs font-medium uppercase tracking-wider text-academic-500 bg-academic-50 px-2 py-1 rounded-sm">
              {group.target_type}
            </span>
          </div>
          
          {/* Action Icon */}
          <button 
            onClick={() => onViewAll(group.target_name)}
            className="p-2 text-academic-300 hover:text-academic-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* --- STATS SUMMARY --- */}
        <div className="mt-4 flex flex-wrap gap-y-2 gap-x-6 text-sm text-academic-600 font-light">
          <div className="font-medium text-academic-900">
            {group.total_aptamers} <span className="font-light text-academic-500">aptamers</span>
          </div>
          <div className="flex gap-3 text-xs items-center border-l border-academic-200 pl-4">
             {group.count_P > 0 && <span title="Level P"><strong className="text-emerald-700">P:</strong> {group.count_P}</span>}
             {group.count_A > 0 && <span title="Level A"><strong className="text-blue-700">A:</strong> {group.count_A}</span>}
             {group.count_B > 0 && <span title="Level B"><strong className="text-academic-600">B:</strong> {group.count_B}</span>}
             {group.count_C > 0 && <span title="Level C"><strong className="text-academic-500">C:</strong> {group.count_C}</span>}
          </div>
          <div className="ml-auto text-academic-400 text-xs tabular-nums">
             {group.year_min === group.year_max ? group.year_min : `${group.year_min}–${group.year_max}`}
          </div>
        </div>
      </div>

      {/* --- PREVIEW TABLE --- */}
      <div className="bg-academic-50/50 p-6">
        {getPreviewHeader()}
        
        <div className="space-y-2">
          {group.preview_records.map((apt, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-3 bg-white rounded border border-academic-100 hover:border-academic-300 cursor-pointer transition-all hover:translate-x-1 group/row"
              onClick={() => onViewAptamer(apt.sequence_id)}
            >
               <div className="flex items-center gap-4 min-w-0">
                  <div className="text-academic-300 group-hover/row:text-academic-500">
                    <StemLoopIcon className="w-4 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                     <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-academic-800 truncate" title={apt.sequence_id}>
                          {apt.sequence_id}
                        </span>
                        {apt.best && (
                          <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase rounded border border-yellow-100">
                            Best
                          </span>
                        )}
                     </div>
                     <SequencePreview seq={apt.aptamer_sequence} />
                  </div>
               </div>

               <div className="flex items-center gap-6 text-right pl-4">
                  {(group.preview_type === 'P' || group.preview_type === 'A') ? (
                     <div className="flex flex-col items-end w-20">
                        <span className="text-sm font-bold text-academic-800 tabular-nums">
                           {apt.affinity || (apt.pKd ? `pKd ${apt.pKd}` : '-')}
                        </span>
                        <span className="text-[10px] text-academic-400 uppercase">Affinity</span>
                     </div>
                  ) : (
                     <div className="text-xs text-academic-400 italic">Reported</div>
                  )}
                  <div className="text-xs text-academic-400 font-mono hidden sm:block">
                     {apt.year}
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="mt-5 flex justify-between items-center">
           <button 
             onClick={() => onViewAll(group.target_name)}
             className="text-sm font-medium text-academic-700 hover:text-academic-900 hover:underline decoration-academic-300 underline-offset-4 transition-all"
           >
             View all {group.total_aptamers} variants
           </button>
           
           {(group.count_P === 0 && (group.count_A > 0 || group.count_B > 0)) && (
             <span className="text-xs text-academic-400 italic">
               Note: No Level P data available
             </span>
           )}
        </div>
      </div>
    </div>
  );
};
