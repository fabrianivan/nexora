import React, { useRef, useEffect, useState } from 'react';
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  ChevronUp,
} from 'lucide-react';
import { parseBlockMarkdown, renderInlines } from '@/lib/chatMarkdown';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  citations?: string[];
  entityLabel?: string;
}

export interface NexoraCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  chatHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  onSendMessage: (customPrompt?: string) => void;
  isLoading: boolean;
  activeEntityLabel: string;
  copilotPresets: { id: string; label: string; prompt: string }[];
}

export function NexoraCopilot({
  isOpen,
  onClose,
  isExpanded,
  onToggleExpand,
  chatHistory,
  chatInput,
  setChatInput,
  onSendMessage,
  isLoading,
  activeEntityLabel,
  copilotPresets,
}: NexoraCopilotProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && isOpen && !isMinimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading, isOpen, isMinimized]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  if (!isOpen) {
    // Floating FAB Button
    return (
      <div className="fixed right-5 bottom-6 z-40">
        <button
          type="button"
          onClick={() => {
            setIsMinimized(false);
            onSendMessage(); // Opens or toggles
          }}
          className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0F172A] hover:bg-blue-600 text-white shadow-xl border border-blue-400/30 transition-all duration-150 cursor-pointer"
          aria-label="Open Nexora AI Tax Copilot"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-600 group-hover:bg-white/20 flex items-center justify-center relative">
            <Bot className="w-4 h-4 text-white" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#0F172A] absolute -top-0.5 -right-0.5" />
          </div>
          <div className="text-left pr-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">Nexora AI Copilot</span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/30 text-[9px] font-bold">
                Vertex AI
              </span>
            </div>
            <span className="block text-[10px] text-slate-300">
              Tax Treaty, BEPS &amp; Forensic Advisory
            </span>
          </div>
        </button>
      </div>
    );
  }

  // Minimized Dock Bar in bottom right
  if (isMinimized) {
    return (
      <div className="fixed right-5 bottom-6 z-40">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0F172A] text-white shadow-xl border border-blue-400/30 text-xs">
          <Bot className="w-4 h-4 text-blue-400" />
          <span className="font-bold">Nexora AI Copilot</span>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer ml-1"
            aria-label="Restore window"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            aria-label="Close copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full or Standard Modal
  const modalWidth = isExpanded
    ? 'w-[720px] max-w-[95vw] h-[85vh]'
    : 'w-[420px] max-w-[95vw] h-[min(640px,80vh)]';

  return (
    <div className={`fixed right-3 sm:right-6 bottom-4 sm:bottom-6 z-50 ${modalWidth} flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-300 overflow-hidden transition-all duration-200`}>
      {/* Dark Navy Header */}
      <div className="bg-[#0F172A] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold tracking-tight text-white">
                Nexora AI Tax Copilot
              </h3>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono">
                ID · SG · MY · US
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
              {activeEntityLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Minimize Copilot"
            title="Minimize"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label={isExpanded ? 'Restore Size' : 'Expand Window'}
            title={isExpanded ? 'Restore Size' : 'Expand'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Copilot"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Chips Bar */}
      <div className="p-2.5 bg-slate-50 border-b border-slate-200/80 shrink-0 overflow-x-auto">
        <div className="flex flex-wrap gap-1.5">
          {copilotPresets.slice(0, 4).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setChatInput(p.prompt);
                onSendMessage(p.prompt);
              }}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition cursor-pointer truncate max-w-[280px]"
            >
              ⚡ {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Message Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 space-y-3.5 overflow-y-auto bg-slate-50/40 text-xs"
      >
        {chatHistory.map((msg, index) => {
          const isUser = msg.role === 'user';
          const blocks = parseBlockMarkdown(msg.text);

          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              {msg.entityLabel && (
                <span className="text-[10px] text-slate-400 font-mono mb-1 px-1">
                  {msg.entityLabel}
                </span>
              )}

              <div
                className={`max-w-[88%] p-3.5 rounded-2xl shadow-2xs space-y-2 ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                {blocks.map((b, bIdx) => {
                  if (b.type === 'h2') {
                    return (
                      <h3 key={bIdx} className="font-extrabold text-sm text-slate-900 mt-2 mb-1">
                        {renderInlines(b.inlines, isUser)}
                      </h3>
                    );
                  }
                  if (b.type === 'h3' || b.type === 'h4') {
                    return (
                      <h4 key={bIdx} className="font-bold text-xs text-slate-900 mt-1.5 mb-0.5">
                        {renderInlines(b.inlines, isUser)}
                      </h4>
                    );
                  }
                  if (b.type === 'divider') {
                    return <hr key={bIdx} className="my-2 border-slate-200" />;
                  }
                  if (b.type === 'formula') {
                    return (
                      <div
                        key={bIdx}
                        className="my-1.5 p-2.5 rounded-lg bg-slate-100 border border-slate-200/90 font-mono text-[11px] text-slate-900 font-semibold"
                      >
                        {renderInlines(b.inlines, false)}
                      </div>
                    );
                  }
                  if (b.type === 'bullet') {
                    return (
                      <div key={bIdx} className="flex items-start gap-1.5 ml-1">
                        <span className={isUser ? 'text-white' : 'text-blue-600 font-bold'}>•</span>
                        <div className="flex-1">{renderInlines(b.inlines, isUser)}</div>
                      </div>
                    );
                  }
                  if (b.type === 'ordered') {
                    return (
                      <div key={bIdx} className="flex items-start gap-1.5 ml-1 font-mono">
                        <span className={isUser ? 'text-white font-bold' : 'text-blue-600 font-bold'}>
                          {b.order}.
                        </span>
                        <div className="flex-1 font-sans">{renderInlines(b.inlines, isUser)}</div>
                      </div>
                    );
                  }
                  return (
                    <p key={bIdx} className="leading-relaxed">
                      {renderInlines(b.inlines, isUser)}
                    </p>
                  );
                })}

                {/* Citations Footer */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {msg.citations.map((cite, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono"
                      >
                        📚 {cite}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-500 w-fit shadow-2xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Analyzing multi-country tax treaties &amp; BigQuery data...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSendMessage();
        }}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Ask a tax treaty or compliance question..."
          className="flex-1 bg-slate-50 border border-slate-300 hover:border-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-lg px-3.5 py-2 text-xs shadow-2xs transition outline-none text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isLoading}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center transition cursor-pointer disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
