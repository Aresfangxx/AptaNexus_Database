
import React, { useEffect, useState, useRef } from 'react';
import { TargetGroup } from '../types';
import { fetchAndProcessData } from '../utils/dataLoader';
import { TargetCard } from './TargetCard';
import { SearchIcon } from './Icons';
import { SearchInteractiveBackground } from './SearchInteractiveBackground';
import { CONTENT } from '../constants';
import { Language } from '../types';

interface Props {
  initialQuery: string;
  onNavigateHome: () => void;
  lang: Language;
}

export const SearchResults: React.FC<Props> = ({ initialQuery, onNavigateHome, lang }) => {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState<TargetGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Get hints based on current language
  const hints = CONTENT[lang].search.hints;

  useEffect(() => {
    // Auto focus the input when this view loads
    if (inputRef.current) {
        inputRef.current.focus();
    }
  }, []);

  // Re-fetch when query changes
  useEffect(() => {
    let isMounted = true;
    
    // If query is empty, clear data and don't fetch
    if (!query.trim()) {
        setData([]);
        setLoading(false);
        return;
    }

    setLoading(true);
    
    // Simulate slight network delay
    const timer = setTimeout(() => {
        fetchAndProcessData(query).then(results => {
            if (isMounted) {
                setData(results);
                setLoading(false);
            }
        });
    }, 400);

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleSuggestionClick = (suggestion: string) => {
      // Extract example if present: "Search by X (e.g. Value)" -> "Value"
      // or just set the suggestion text for now
      if (suggestion.includes("e.g.") || suggestion.includes("如")) {
          // English "e.g." or Chinese "如"
          const match = suggestion.match(/(?:e\.g\.|如)\s*([^)]+)/);
          if (match && match[1]) {
              setQuery(match[1].trim());
          } else {
             inputRef.current?.focus();
          }
      } else {
         inputRef.current?.focus();
      }
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      
      {/* --- SEARCH HEADER --- */}
      <div 
        className="bg-white border-b border-academic-200 sticky top-16 z-40 shadow-sm relative overflow-hidden"
        onMouseEnter={() => setIsHeaderHovered(true)}
        onMouseLeave={() => setIsHeaderHovered(false)}
      >
        {/* Interactive Background */}
        <SearchInteractiveBackground isActive={isHeaderHovered} />
        
        {/* White overlay gradient to make text readable but keep background visible */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 relative z-10">
           <form onSubmit={handleSearch} className="flex gap-4 max-w-3xl relative">
              <div className="flex-1 relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-academic-400 group-focus-within:text-academic-600 transition-colors">
                  <SearchIcon className="w-5 h-5" />
                </div>
                <input 
                  ref={inputRef}
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-academic-50/80 border border-academic-200 rounded py-3 pl-12 pr-4 text-academic-900 placeholder:text-academic-400 focus:outline-none focus:ring-2 focus:ring-academic-200 focus:bg-white transition-all font-light shadow-sm"
                  placeholder={CONTENT[lang].search.placeholder}
                  autoComplete="off"
                />
              </div>
              <button type="submit" className="bg-academic-900 text-white px-8 rounded font-medium hover:bg-academic-800 transition-colors shadow-md">
                {lang === 'en' ? 'Search' : '搜索'}
              </button>
           </form>
           
           <div className="mt-3 min-h-[20px] text-sm text-academic-500">
             {loading ? (
                <span className="animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 bg-academic-400 rounded-full animate-bounce"></div>
                    {lang === 'en' ? 'Searching knowledgebase...' : '正在检索数据库...'}
                </span>
             ) : hasQuery ? (
                <span>
                    {lang === 'en' ? 'Found ' : '找到 '}
                    <strong>{data.length}</strong>
                    {lang === 'en' ? ' targets matching "' : ' 个靶标匹配 "'}
                    <span className="text-academic-900">{query}</span>"
                </span>
             ) : (
                <span className="opacity-0">Placeholder</span>
             )}
           </div>
        </div>
      </div>

      {/* --- RESULTS OR GUIDE GRID --- */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 min-h-[60vh]">
        
        {!hasQuery ? (
            // --- EMPTY STATE / SEARCH GUIDE ---
            <div className="flex flex-col items-center justify-center py-12 animate-fade-in-up">
                 <div className="w-16 h-16 bg-academic-50 rounded-full flex items-center justify-center mb-6 border border-academic-100">
                    <SearchIcon className="w-8 h-8 text-academic-300" />
                 </div>
                 <h2 className="text-2xl font-serif text-academic-900 mb-3">
                    {lang === 'en' ? 'What are you looking for?' : '您想查找什么？'}
                 </h2>
                 <p className="text-academic-500 max-w-lg text-center mb-10 font-light">
                    {lang === 'en' 
                        ? 'Enter a target name, gene symbol, or specific aptamer sequence to explore our database of 18,000+ curated records.'
                        : '输入靶标名称、基因符号或特定适配体序列，探索包含 18,000+ 条校准记录的数据库。'
                    }
                 </p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    {hints.map((hint, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleSuggestionClick(hint)}
                          className="flex items-center gap-3 p-4 bg-white border border-academic-200 rounded hover:border-academic-400 hover:shadow-md transition-all group text-left"
                        >
                            <div className="w-8 h-8 rounded bg-academic-50 text-academic-500 flex items-center justify-center group-hover:bg-academic-900 group-hover:text-white transition-colors">
                                <SearchIcon className="w-4 h-4" />
                            </div>
                            <span className="text-academic-700 group-hover:text-academic-900">{hint}</span>
                        </button>
                    ))}
                 </div>
            </div>
        ) : loading ? (
          // --- SKELETON LOADING ---
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-academic-100 rounded-lg p-8 h-64 animate-pulse">
                 <div className="h-8 bg-academic-100 w-1/3 mb-4 rounded"></div>
                 <div className="h-4 bg-academic-50 w-1/4 rounded"></div>
                 <div className="mt-8 space-y-3">
                   <div className="h-12 bg-academic-50 rounded"></div>
                   <div className="h-12 bg-academic-50 rounded"></div>
                 </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          // --- NO RESULTS FOUND ---
          <div className="text-center py-20">
             <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-academic-100 text-academic-400 mb-6">
               <SearchIcon className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-serif text-academic-900 mb-2">
                {lang === 'en' ? 'No matching targets found' : '未找到匹配靶标'}
             </h3>
             <p className="text-academic-500 max-w-md mx-auto">
               {lang === 'en' 
                 ? `We couldn't find any targets matching "${query}". Try searching for a gene symbol (e.g., "VEGFA"), a general term (e.g., "Thrombin"), or checking your spelling.`
                 : `未找到与 "${query}" 匹配的靶标。尝试搜索基因符号（如 "VEGFA"）、通用名称（如 "Thrombin"）或检查拼写。`
               }
             </p>
             <button onClick={() => setQuery('')} className="mt-8 text-academic-900 underline underline-offset-4 hover:text-academic-700">
               {lang === 'en' ? 'Clear Search' : '清空搜索'}
             </button>
          </div>
        ) : (
          // --- RESULTS LIST ---
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-fade-in-up">
             {data.map(group => (
               <TargetCard 
                 key={group.target_name} 
                 group={group} 
                 onViewAll={(target) => console.log(`Navigate to /target/${target}`)}
                 onViewAptamer={(id) => console.log(`Navigate to /aptamer/${id}`)}
               />
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
