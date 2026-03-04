
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

const API_BASE = 'https://aptamer-database.onrender.com';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const UI_TEXT = {
  en: {
    title: 'AptaNexus AI Assistant',
    placeholder: 'Ask about aptamers, targets, sequences…',
    welcome: 'Hello! I can help you search the AptaNexus aptamer database. Try asking:\n• "How to detect the phenylalanine?"\n• "How to target Nucleolin?"\n• "List the most studied targets"',
    tooltip: 'AI Assistant',
    send: 'Send',
    thinking: 'Searching database…',
  },
  cn: {
    title: 'AptaNexus AI 助手',
    placeholder: '询问适配体、靶标或序列…',
    welcome: '您好！我可以帮您查询 AptaNexus 适配体数据库。试试这些问题：\n• "怎么检测苯丙氨酸？"\n• "我想要靶向Nucleolin传递药物"\n• "列出研究最多的靶标"',
    tooltip: 'AI 助手',
    send: '发送',
    thinking: '正在检索数据库…',
  },
};

export const FloatingChatbox: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = UI_TEXT[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t.welcome },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: UI_TEXT[lang].welcome }];
      }
      return prev;
    });
  }, [lang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    // Prepare history for API (exclude the static welcome message if it's the first)
    const historyForAPI = nextMessages
      .filter(m => !(m.role === 'assistant' && m.content === UI_TEXT[lang].welcome && nextMessages.indexOf(m) === 0))
      .map(m => ({ role: m.role, content: m.content }));

    // Add placeholder assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForAPI, lang }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const { delta, toolStatus: status } = JSON.parse(payload) as { delta?: string; toolStatus?: string };
            if (status) {
              setToolStatus(status);
            }
            if (delta) {
              setToolStatus('');
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + delta,
                };
                return updated;
              });
            }
          } catch { /* ignore malformed SSE chunks */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Sorry, an error occurred: ${String(err)}`,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
      setToolStatus('');
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {isOpen && isExpanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Chat panel - directly fixed-positioned */}
      {isOpen && (
        <div
          className="fixed z-50 flex flex-col bg-white shadow-2xl border border-academic-200 overflow-hidden transition-all duration-200"
          style={isExpanded
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(760px, calc(100vw - 48px))', height: '80vh', borderRadius: '16px' }
            : { bottom: '88px', right: '24px', width: '380px', height: '520px', borderRadius: '16px' }
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-academic-900 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧬</span>
              <span className="text-sm font-semibold tracking-wide">{t.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Expand/collapse toggle */}
              <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="text-academic-300 hover:text-white transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                className="text-academic-300 hover:text-white transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 thin-scrollbar">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-academic-800 text-white rounded-br-sm'
                      : 'bg-academic-50 text-academic-900 border border-academic-200 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.role === 'assistant' && idx === messages.length - 1 && isLoading && msg.content === '' && (
                    <span className="inline-flex items-center gap-1 text-academic-500 text-xs">
                      <span className="animate-pulse">{t.thinking}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {/* Tool status indicator */}
            {toolStatus && (
              <div className="flex justify-start">
                <span className="text-xs text-academic-400 animate-pulse flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {toolStatus}
                </span>
              </div>
            )}
            {/* Blinking cursor while streaming */}
            {isLoading && messages[messages.length - 1]?.content !== '' && (
              <span className="text-academic-400 text-xs animate-pulse ml-1">▌</span>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-academic-200 px-3 py-2 flex items-end gap-2 bg-white">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-academic-200 px-3 py-2 text-sm text-academic-900 placeholder-academic-400 focus:outline-none focus:border-academic-500 disabled:opacity-50 thin-scrollbar"
              style={{ maxHeight: '96px', overflowY: 'auto' }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex-shrink-0 bg-academic-900 hover:bg-academic-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              {t.send}
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen((prev: boolean) => !prev)}
          title={t.tooltip}
          className="w-14 h-14 rounded-full bg-academic-900 hover:bg-academic-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label={t.tooltip}
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
};
