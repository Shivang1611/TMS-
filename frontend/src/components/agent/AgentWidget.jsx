import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Trash2, Bot, AlertCircle, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { agentApi } from '../../api/agentApi';
import { useAuth } from '../../context/AuthContext';
import { useAgentContext } from '../../context/AgentContext';

// ─── Message Renderers ────────────────────────────────────────────────────────

function TextMessage({ message }) {
  return (
    <div className="text-sm text-surface-700 leading-relaxed whitespace-pre-wrap">
      {message}
    </div>
  );
}

function DenialMessage({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-sm text-amber-800">{message}</p>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}

function SuccessMessage({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
      <p className="text-sm text-emerald-800">{message}</p>
    </div>
  );
}

function DataMessage({ message, toolName, data }) {
  const [expanded, setExpanded] = useState(false);
  const records = data?.data || (Array.isArray(data) ? data : null);

  return (
    <div className="space-y-2">
      <p className="text-sm text-surface-700 leading-relaxed">{message}</p>
      {records && records.length > 0 && (
        <div className="rounded-xl border border-surface-200 overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full px-3 py-2 bg-surface-50 hover:bg-surface-100 text-xs font-medium text-surface-600 transition-colors"
          >
            <span>View {records.length} result(s)</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && (
            <div className="max-h-48 overflow-y-auto divide-y divide-surface-100">
              {records.map((item, i) => (
                <div key={item._id || i} className="px-3 py-2 text-xs text-surface-700">
                  <span className="font-medium">{item.title || item.name || item.email || JSON.stringify(item).substring(0, 60)}</span>
                  {item.status && <span className="ml-2 text-surface-400">• {item.status}</span>}
                  {item.role && <span className="ml-2 text-surface-400">• {item.role}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmCard({ summary, requiresTypeConfirm, confirmTarget, onConfirm, onCancel, isLoading }) {
  const [typeValue, setTypeValue] = useState('');
  const canConfirm = !requiresTypeConfirm || typeValue.trim() === confirmTarget;

  // Render markdown-style bold in summary
  const renderSummary = (text) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i} className="text-surface-900">{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Bot className="h-4 w-4 text-primary-600 mt-0.5 shrink-0" />
        <p className="text-sm text-surface-800 leading-relaxed">{renderSummary(summary)}</p>
      </div>

      {requiresTypeConfirm && (
        <div className="space-y-1">
          <p className="text-xs text-surface-500">
            Type <strong className="text-surface-700">"{confirmTarget}"</strong> to confirm this action:
          </p>
          <input
            type="text"
            value={typeValue}
            onChange={(e) => setTypeValue(e.target.value)}
            placeholder={confirmTarget}
            className="w-full rounded-lg border border-surface-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
            autoFocus
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(typeValue)}
          disabled={!canConfirm || isLoading}
          className="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          Confirm
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
        >
          <XCircle className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function AgentWidget() {
  const { user } = useAuth();
  const { pageContext } = useAgentContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      type: 'text',
      content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm TaskBuddy AI. I can help you check tasks, view reports, and manage your work. What would you like to do?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    addMessage({ role: 'user', type: 'user', content: text });
    setIsLoading(true);

    try {
      const res = await agentApi.sendMessage(text, pageContext);

      switch (res.type) {
        case 'text':
          addMessage({ role: 'assistant', type: 'text', content: res.message });
          break;
        case 'data':
          addMessage({ role: 'assistant', type: 'data', content: res.message, toolName: res.toolName, data: res.data });
          break;
        case 'denial':
          addMessage({ role: 'assistant', type: 'denial', content: res.message });
          break;
        case 'error':
          addMessage({ role: 'assistant', type: 'error', content: res.message });
          break;
        case 'confirm':
          setPendingConfirm({
            summary: res.summary,
            requiresTypeConfirm: res.requiresTypeConfirm,
            confirmTarget: res.confirmTarget,
          });
          addMessage({
            role: 'assistant',
            type: 'confirm',
            summary: res.summary,
            requiresTypeConfirm: res.requiresTypeConfirm,
            confirmTarget: res.confirmTarget,
          });
          break;
        case 'pending_confirm':
          addMessage({ role: 'assistant', type: 'text', content: res.message });
          if (res.pendingConfirm) {
            setPendingConfirm(res.pendingConfirm);
          }
          break;
        default:
          addMessage({ role: 'assistant', type: 'text', content: res.message || 'Done.' });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      addMessage({ role: 'assistant', type: 'error', content: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (typeValue) => {
    setIsConfirming(true);
    try {
      const res = await agentApi.confirm(typeValue);
      setPendingConfirm(null);
      // Update the confirm card message to show result
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated.findLastIndex((m) => m.type === 'confirm');
        if (last !== -1) updated[last] = { ...updated[last], type: 'text', content: res.message };
        return updated;
      });
      if (res.type === 'success') {
        addMessage({ role: 'assistant', type: 'success', content: res.message });
      } else if (res.type === 'denial') {
        addMessage({ role: 'assistant', type: 'denial', content: res.message });
      } else if (res.type === 'error') {
        addMessage({ role: 'assistant', type: 'error', content: res.message });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Confirmation failed. Please try again.';
      addMessage({ role: 'assistant', type: 'error', content: errorMsg });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsConfirming(true);
    try {
      await agentApi.cancel();
      setPendingConfirm(null);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated.findLastIndex((m) => m.type === 'confirm');
        if (last !== -1) updated[last] = { ...updated[last], type: 'text', content: 'Action cancelled.' };
        return updated;
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await agentApi.clearHistory();
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        type: 'text',
        content: `History cleared! How can I help you?`,
      }]);
      setPendingConfirm(null);
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg) => {
    switch (msg.type) {
      case 'user':
        return (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary-600 px-3 py-2">
              <p className="text-sm text-white">{msg.content}</p>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-surface-200 px-3 py-2 shadow-sm">
              <TextMessage message={msg.content} />
            </div>
          </div>
        );
      case 'data':
        return (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white border border-surface-200 px-3 py-2 shadow-sm w-full">
              <DataMessage message={msg.content} toolName={msg.toolName} data={msg.data} />
            </div>
          </div>
        );
      case 'denial':
        return <DenialMessage message={msg.content} />;
      case 'error':
        return <ErrorMessage message={msg.content} />;
      case 'success':
        return <SuccessMessage message={msg.content} />;
      case 'confirm':
        return (
          <ConfirmCard
            summary={msg.summary}
            requiresTypeConfirm={msg.requiresTypeConfirm}
            confirmTarget={msg.confirmTarget}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            isLoading={isConfirming}
          />
        );
      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col w-80 sm:w-96 h-[520px] rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none flex items-center gap-1.5">
                  TaskBuddy AI
                  <span className="px-1.5 py-0.5 rounded-full bg-primary-800 text-[9px] font-bold tracking-wider text-primary-100 uppercase">Enterprise</span>
                </p>
                <p className="text-[10px] text-primary-200 mt-0.5">{user.role} • Secure Mode</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface-50/50">
            {messages.map((msg) => (
              <div key={msg.id}>
                {renderMessage(msg)}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white border border-surface-200 px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-surface-200 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask TaskBuddy anything about your tasks..."
                rows={1}
                disabled={isLoading || !!pendingConfirm}
                className="flex-1 resize-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-800 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent disabled:opacity-50 transition-all"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !!pendingConfirm}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {pendingConfirm && (
              <p className="text-[10px] text-amber-600 mt-1 text-center">
                ⚠ Confirm or cancel the action above to continue.
              </p>
            )}
            <p className="text-[9px] text-surface-300 text-center mt-1">
              AI responses may be inaccurate. Always verify important changes.
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg shadow-primary-200 transition-all duration-300 active:scale-95 ${
          isOpen
            ? 'bg-surface-700 hover:bg-surface-800 rotate-0'
            : 'bg-primary-600 hover:bg-primary-700 hover:scale-105'
        }`}
        title={isOpen ? 'Close TaskBuddy AI' : 'Ask TaskBuddy'}
        aria-label="TaskBuddy AI"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageCircle className="h-5 w-5 text-white" />
        )}
        {/* Pulse indicator when closed */}
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
        )}
      </button>
    </>
  );
}
