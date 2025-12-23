
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TargetGroup, AptamerRecord } from '../types';
import { fetchTargetByName } from '../utils/dataLoader';
import { ArrowRight, StemLoopIcon, SearchIcon } from './Icons';

export const TargetDetailPage: React.FC = () => {
  const { targetName } = useParams<{ targetName: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TargetGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'P' | 'A' | 'B' | 'C'>('All');

  useEffect(() => {
    if (!targetName) return;

    setLoading(true);
    fetchTargetByName(decodeURIComponent(targetName)).then((res) => {
      setData(res);
      setLoading(false);

      // Auto-select best tab
      if (res && res.count_P > 0) setActiveTab('P');
      else if (res && res.count_A > 0) setActiveTab('A');
      else setActiveTab('All');
    });
  }, [targetName]);

  const onNavigateAptamer = (id: string) => {
    navigate(`/aptamer/${encodeURIComponent(id)}`);
  };

  const onBack = () => {
    navigate('/search');
  };

  if (loading) {
    return <div className="p-12 text-center text-academic-500 animate-pulse">Loading target data...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center">Target not found. <button onClick={onBack} className="underline">Go back</button></div>;
  }

  // Filter records
  let displayedRecords = data.records;
  if (activeTab !== 'All') {
     displayedRecords = displayedRecords.filter(r => 
        activeTab === 'B' ? (r.level === 'B' || r.level === 'C') : r.level === activeTab
     );
     // If we are filtering for B, we usually group B/C or just B. Let's do exact match for P/A. 
     // For B, let's include C or separate. The logic above does 'B' -> B or C for simplicity if user clicked B? 
     // Let's stick to strict if tabs are strict.
     if (activeTab === 'B') displayedRecords = data.records.filter(r => r.level === 'B');
     if (activeTab === 'C') displayedRecords = data.records.filter(r => r.level === 'C');
  }

  // Sort: P/A by pKd desc, others by year desc
  displayedRecords.sort((a, b) => {
    if (activeTab === 'P' || activeTab === 'A') {
        return (b.pKd || 0) - (a.pKd || 0);
    }
    return b.year - a.year;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
      {/* Breadcrumb */}
      <button onClick={onBack} className="flex items-center text-sm text-academic-500 hover:text-academic-900 mb-8 transition-colors">
        <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Search
      </button>

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
            <h1 className="font-serif text-4xl text-academic-900">{data.target_name}</h1>
            {data.gene_symbol && <span className="text-sm bg-academic-100 text-academic-600 px-2 py-1 rounded font-mono">{data.gene_symbol}</span>}
        </div>
        <div className="text-academic-500 uppercase tracking-wider text-sm font-medium">{data.target_type}</div>
        
        {/* Stats Row */}
        <div className="flex gap-8 mt-6 text-sm text-academic-600 border-t border-b border-academic-100 py-4">
             <div><span className="font-bold text-academic-900">{data.total_aptamers}</span> Total Sequences</div>
             <div><span className="font-bold text-emerald-700">{data.count_P}</span> High Confidence (P)</div>
             <div><span className="font-bold text-blue-700">{data.count_A}</span> Verified (A)</div>
             <div><span className="font-bold text-academic-900">{data.year_min}–{data.year_max}</span> Year Range</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-academic-200 mb-6">
        {['All', 'P', 'A', 'B', 'C'].map(tab => {
            const count = tab === 'All' ? data.total_aptamers : data[`count_${tab}` as keyof TargetGroup] as number;
            if (count === 0 && tab !== 'All') return null; // Hide empty tabs

            return (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab 
                        ? 'border-academic-900 text-academic-900' 
                        : 'border-transparent text-academic-500 hover:text-academic-700 hover:border-academic-300'
                    }`}
                >
                    Level {tab} <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
            );
        })}
      </div>

      {/* List */}
      <div className="bg-white border border-academic-200 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-academic-50 border-b border-academic-200 text-xs font-semibold text-academic-500 uppercase tracking-wider">
            <div className="col-span-3">ID & Sequence</div>
            <div className="col-span-3">Affinity</div>
            <div className="col-span-4">Publication</div>
            <div className="col-span-2 text-right">Quality</div>
        </div>
        
        <div className="divide-y divide-academic-100">
            {displayedRecords.map((apt) => (
                <div 
                  key={apt.internal_id} 
                  onClick={() => onNavigateAptamer(apt.internal_id)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-academic-50/50 cursor-pointer transition-colors group items-center"
                >
                    <div className="col-span-3 min-w-0">
                        <div className="font-semibold text-academic-900 truncate" title={apt.sequence_id}>{apt.sequence_id}</div>
                        <div className="font-mono text-xs text-academic-500 truncate mt-1">{apt.aptamer_sequence}</div>
                    </div>
                    <div className="col-span-3">
                        <div className="text-sm font-medium text-academic-800">{apt.affinity || '-'}</div>
                        {apt.pKd && <div className="text-xs text-academic-400">pKd {apt.pKd}</div>}
                    </div>
                    <div className="col-span-4 pr-4">
                        <div className="text-sm text-academic-900 truncate" title={apt.article_title}>{apt.article_title}</div>
                        <div className="text-xs text-academic-500 truncate">{apt.journal}, {apt.year}</div>
                    </div>
                    <div className="col-span-2 text-right">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            apt.level === 'P' ? 'bg-emerald-100 text-emerald-800' :
                            apt.level === 'A' ? 'bg-blue-100 text-blue-800' :
                            'bg-academic-100 text-academic-600'
                        }`}>
                            Level {apt.level}
                        </span>
                    </div>
                </div>
            ))}
        </div>
        {displayedRecords.length === 0 && <div className="p-8 text-center text-academic-500">No records found for this filter.</div>}
      </div>
    </div>
  );
};
