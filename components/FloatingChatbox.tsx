
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

const API_BASE = 'https://aptanexus-api.onrender.com';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const UI_TEXT = {
  en: {
    title: 'AptaNexus AI Assistant',
    placeholder: 'Ask about aptamers, targets, sequences…',
    welcome: 'Hello! I can help you search the AptaNexus aptamer database. Try asking:\n• "What aptamers target thrombin?"\n• "Show me high-affinity VEGF aptamers"\n• "List the most studied targets"',
    tooltip: 'AI Assistant',
    send: 'Send',
    thinking: 'Searching database…',
  },
  cn: {
    title: 'AptaNexus AI 助手',
    placeholder: '询问适配体、靶标或序列…',
    welcome: '您好！我可以帮您查询 AptaNexus 适配体数据库。试试这些问题：\n• "有哪些靶向凝血酶的适配体？"\n• "查找高亲和力VEGF适配体"\n• "列出研究最多的靶标"',
    tooltip: 'AI 助手',
    send: '发送',
    thinking: '正在检索数据库…',
  },
};

export const FloatingChatbox: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = UI_TEXT[lang];
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t.welcome },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            const { delta } = JSON.parse(payload) as { delta?: string };
            if (delta) {
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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      {isOpen && (
        <div
          className="flex flex-col bg-white rounded-2xl shadow-2xl border border-academic-200 overflow-hidden"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-academic-900 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧬</span>
              <span className="text-sm font-semibold tracking-wide">{t.title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-academic-300 hover:text-white transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
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
      <button
        onClick={() => setIsOpen(prev => !prev)}
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
  );
};
