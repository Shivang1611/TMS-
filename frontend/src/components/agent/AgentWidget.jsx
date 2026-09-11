import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageCircle, X, Send, Loader2, Trash2, Bot, AlertCircle, CheckCircle2, 
  XCircle, ChevronDown, Calendar, User, Clock, Flame, Sparkles, CheckSquare, Layers, ExternalLink 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { agentApi } from '../../api/agentApi';
import { useAuth } from '../../context/AuthContext';
import { useAgentContext } from '../../context/AgentContext';

// ─── Live Page Context Resolver ───────────────────────────────────────────────

const getCombinedPageContext = (location, context) => {
  const pathname = location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');

  let pageName = 'Dashboard';
  if (pathname === '/dashboard' || pathname === '/') pageName = 'Dashboard';
  else if (pathname === '/my-tasks') pageName = 'My Tasks';
  else if (pathname === '/tasks') pageName = 'All Tasks List';
  else if (pathname === '/projects') pageName = 'Projects List';
  else if (pathname.startsWith('/projects/') && pathname !== '/projects/new') {
    pageName = 'Project Details View';
  } else if (pathname === '/projects/new') {
    pageName = 'Create Project Form';
  } else if (pathname.startsWith('/tasks/') && pathname !== '/tasks/new') {
    pageName = 'Task Details View';
  } else if (pathname === '/assign-task' || pathname === '/tasks/new') {
    pageName = 'Assign Task Form';
  } else if (pathname === '/org-structure' || pathname === '/teams') {
    pageName = 'Org Structure & Teams';
  } else if (pathname === '/manage-staff' || pathname === '/users') {
    pageName = 'Manage Staff & Users Directory';
  } else if (pathname === '/notes') pageName = 'Notes';
  else if (pathname === '/notifications') pageName = 'Notifications';
  else if (pathname === '/reports') pageName = 'Reports';
  else if (pathname === '/audit-log') pageName = 'Audit Log';
  else if (pathname === '/profile') pageName = 'User Profile';

  let routeEntityId = null;
  let routeEntityType = null;
  const projectMatch = pathname.match(/^\/projects\/([a-f0-9]{24})/i);
  if (projectMatch) {
    routeEntityType = 'project';
    routeEntityId = projectMatch[1];
  }
  const taskMatch = pathname.match(/^\/tasks\/([a-f0-9]{24})/i);
  if (taskMatch) {
    routeEntityType = 'task';
    routeEntityId = taskMatch[1];
  }

  return {
    routePath: pathname,
    pageName,
    entityType: context?.entityType || routeEntityType || null,
    entityId: context?.entityId || routeEntityId || null,
    isFormView: context?.isFormView || pathname.includes('/new') || pathname === '/assign-task',
    draftFields: context?.draftFields || null,
  };
};

// ─── Status & Priority Helpers ───────────────────────────────────────────────

const getStatusBadge = (status) => {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s.includes('done') || s.includes('complete')) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"><CheckCircle2 className="h-3 w-3" /> Done</span>;
  }
  if (s.includes('progress')) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60"><Clock className="h-3 w-3" /> In Progress</span>;
  }
  if (s.includes('review')) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60"><Layers className="h-3 w-3" /> In Review</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60"><CheckSquare className="h-3 w-3" /> {status}</span>;
};

const getPriorityBadge = (priority) => {
  if (!priority) return null;
  const p = String(priority).toLowerCase();
  if (p.includes('high') || p.includes('urgent')) {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-700 border border-red-200/60"><Flame className="h-3 w-3 text-red-500" /> High</span>;
  }
  if (p.includes('medium')) {
    return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">Medium</span>;
  }
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">Low</span>;
};

// ─── Smart Formatting Parser ──────────────────────────────────────────────────

function FormattedText({ content }) {
  if (!content) return null;

  // Pre-process text to convert single-line squashed task responses into markdown lists if needed
  let cleaned = content
    .replace(/(?:\r\n|\r|\n)?-\s*\*\*Title:\*\*/g, '\n- **Title:**')
    .replace(/\s*\*\*Description:\*\*/g, '\n  **Description:**');

  return (
    <div className="prose prose-sm max-w-none text-surface-900 text-xs sm:text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-surface-900">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-surface-950 bg-surface-100 px-1 py-0.2 rounded">
              {children}
            </strong>
          ),
          ul: ({ children }) => <ul className="my-2 space-y-2 pl-0 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 space-y-2 pl-4 list-decimal text-surface-700">{children}</ol>,
          li: ({ children }) => {
            return (
              <li className="relative bg-surface-50 hover:bg-surface-100 border border-surface-200 rounded-xl p-2.5 shadow-2xs transition-colors my-1">
                <div className="text-xs text-surface-900 space-y-1">{children}</div>
              </li>
            );
          },
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1.5 py-0.5 rounded-md bg-surface-100 text-slate-800 dark:text-slate-200 font-mono text-[12px] border border-surface-200">
                {children}
              </code>
            ) : (
              <pre className="p-2.5 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto my-2">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}

// ─── Data & Task Card Renderer ────────────────────────────────────────────────

function TaskCardItem({ item }) {
  const navigate = useNavigate();
  const id = item.id || item._id;
  const title = item.title || item.name || 'Untitled Task';
  const rawDescription = item.description || item.details;
  const description = typeof rawDescription === 'string' ? rawDescription.replace(/<[^>]*>/g, '').trim() : '';
  const status = item.status;
  const priority = item.priority;
  const manager = item.manager?.name || item.managerName;
  const assignee = item.assignedTo?.name || item.assigneeName || item.user?.name || (Array.isArray(item.assignees) ? item.assignees.map(a => a.name || a).join(', ') : item.assignees) || manager;
  const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (item.endDate ? new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null);

  const handleClick = () => {
    if (!id) return;
    if (item.title || (item.status && !item.startDate)) {
      navigate(`/tasks/${id}`);
    } else if (item.manager || item.managerName || item.teams || (item.name && !item.email && !item.role)) {
      navigate(`/projects/${id}`);
    } else if (item.email || item.role) {
      navigate(`/users`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 bg-white hover:bg-surface-100 border border-surface-200 rounded-xl shadow-2xs space-y-2 transition-all group ${
        id ? 'cursor-pointer hover:shadow-xs' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold text-surface-900 group-hover:text-primary-600 leading-snug flex-1 flex items-center gap-1.5">
          {title}
          {id && <ExternalLink className="h-3 w-3 text-surface-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
        </h4>
        <div className="flex items-center gap-1 shrink-0">
          {getStatusBadge(status)}
          {getPriorityBadge(priority)}
        </div>
      </div>

      {description && (
        <p className="text-[11px] text-surface-600 line-clamp-2 leading-normal">
          {description}
        </p>
      )}

      {(assignee || dueDate || item.role || item.score !== undefined) && (
        <div className="flex items-center gap-3 pt-1 border-t border-surface-100 text-[10px] text-surface-500">
          {assignee && (
            <span className="flex items-center gap-1 text-surface-600 font-medium truncate max-w-[140px]">
              <User className="h-3 w-3 text-surface-400 shrink-0" />
              {assignee}
            </span>
          )}
          {item.role && (
            <span className="flex items-center gap-1 text-surface-600 font-medium">
              <User className="h-3 w-3 text-surface-400 shrink-0" />
              {item.role}
            </span>
          )}
          {item.score !== undefined && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              ⭐ {item.score} pts
            </span>
          )}
          {dueDate && (
            <span className="flex items-center gap-1 text-surface-500 ml-auto shrink-0">
              <Calendar className="h-3 w-3 text-surface-400 shrink-0" />
              {dueDate}
            </span>
          )}
          {id && (
            <span className="text-[10px] font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
              View →
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DataMessage({ message, toolName, data }) {
  const [expanded, setExpanded] = useState(true);
  
  let records = [];
  const rawData = data?.data !== undefined ? data.data : data;
  if (Array.isArray(rawData)) {
    records = rawData;
  } else if (rawData && typeof rawData === 'object') {
    records = [rawData];
  }

  return (
    <div className="space-y-2.5 w-full">
      <FormattedText content={message} />
      {records && records.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-surface-50/50 overflow-hidden space-y-2 p-2">
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="text-[11px] font-semibold text-surface-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> {records.length} Item(s) Found
            </span>
            {records.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-[11px] font-medium text-surface-600 hover:text-surface-900 transition-colors"
              >
                {expanded ? 'Show Less' : 'Show All'}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(expanded ? records : records.slice(0, 3)).map((item, i) => (
              <TaskCardItem key={item._id || item.id || i} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auxiliary Message Renderers ──────────────────────────────────────────────

function DenialMessage({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-3 shadow-2xs">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
        <FormattedText content={message} />
      </div>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red-50/90 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 p-3 shadow-2xs">
      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
      <div className="text-xs text-red-900 dark:text-red-200 leading-relaxed">
        <FormattedText content={message} />
      </div>
    </div>
  );
}

function SuccessMessage({ message }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-3 shadow-2xs">
      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
      <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
        <FormattedText content={message} />
      </div>
    </div>
  );
}

function ConfirmCard({ summary, requiresTypeConfirm, confirmTarget, onConfirm, onCancel, isLoading }) {
  const [typeValue, setTypeValue] = useState('');
  const canConfirm = !requiresTypeConfirm || typeValue.trim() === confirmTarget;

  return (
    <div className="rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50/80 dark:bg-surface-100 p-3.5 space-y-3 shadow-xs">
      <div className="flex items-start gap-2.5">
        <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 text-xs text-surface-900 leading-relaxed">
          <FormattedText content={summary} />
        </div>
      </div>

      {requiresTypeConfirm && (
        <div className="space-y-1 pl-8">
          <p className="text-[11px] text-surface-600">
            Type <strong className="text-surface-900 bg-surface-100 px-1 py-0.5 rounded">"{confirmTarget}"</strong> to confirm:
          </p>
          <input
            type="text"
            value={typeValue}
            onChange={(e) => setTypeValue(e.target.value)}
            placeholder={confirmTarget}
            className="w-full rounded-lg border border-surface-300 bg-white dark:bg-surface-200 px-3 py-1.5 text-xs text-surface-900 focus:outline-none focus:ring-2 focus:ring-slate-700"
            autoFocus
          />
        </div>
      )}

      <div className="flex items-center gap-2 pl-8">
        <button
          onClick={() => onConfirm(typeValue)}
          disabled={!canConfirm || isLoading}
          className="flex-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-2xs py-1.5 text-xs font-semibold"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Confirm Action
        </button>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-surface-200 bg-white dark:bg-surface-200 px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
        >
          <XCircle className="h-3.5 w-3.5" />
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
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      type: 'text',
      content: `Hi **${user?.name?.split(' ')[0] || 'there'}**! 👋 I'm TaskBuddy AI. How can I help you manage your tasks today?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isManagementRole = ['Founder', 'Admin', 'Manager', 'HR', 'Team Lead'].includes(user?.role);

  const promptChips = isManagementRole
    ? [
        { label: "📋 Today's tasks of everyone", prompt: "Show today's tasks for all team members" },
        { label: "👤 Check an employee's tasks", prompt: "Show Aditi's tasks" },
        { label: "➕ Create & assign a new task", prompt: "Create a new task" },
        { label: "✅ Update task status to Done", prompt: "Update task status to Done" },
        { label: "📊 Overloaded team members", prompt: "Show overloaded team members" },
      ]
    : [
        { label: "📋 Show my tasks today", prompt: "Show my tasks due today" },
        { label: "⭐ My total points & score", prompt: "Tell me my total points and score" },
        { label: "⏳ My upcoming deadlines", prompt: "Show my upcoming deadlines" },
        { label: "▶ Start task (In Progress)", prompt: "Change my task status from To Do to In Progress" },
        { label: "💬 Add description / comment", prompt: "Add description or comment to my task" },
      ];

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

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || isLoading) return;

    setInput('');
    addMessage({ role: 'user', type: 'user', content: text });
    setIsLoading(true);

    try {
      const activeContext = getCombinedPageContext(location, pageContext);
      const res = await agentApi.sendMessage(text, activeContext);

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
            <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 dark:border-slate-700 px-3.5 py-2.5 shadow-xs">
              <p className="text-xs sm:text-sm text-white leading-relaxed">{msg.content}</p>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="flex justify-start gap-2">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs border border-slate-700/60">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-white border border-surface-200 px-3.5 py-2.5 shadow-xs">
              <FormattedText content={msg.content} />
            </div>
          </div>
        );
      case 'data':
        return (
          <div className="flex justify-start gap-2 w-full">
            <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs border border-slate-700/60">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-xs bg-white border border-surface-200 px-3.5 py-2.5 shadow-xs w-full">
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
          className="fixed bottom-20 right-4 z-50 flex flex-col w-80 sm:w-96 h-[540px] rounded-2xl border border-surface-200 bg-white shadow-2xl overflow-hidden transition-all duration-200"
          style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.22)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0 shadow-xs border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/90 border border-slate-700/60">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none flex items-center gap-1.5 text-white">
                  TaskBuddy AI
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] font-bold tracking-wider text-slate-200 uppercase border border-slate-700/80">Enterprise</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{user.role} • Secure Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface-50/60">
            {messages.map((msg) => (
              <div key={msg.id}>
                {renderMessage(msg)}
              </div>
            ))}

            {/* Quick Action Prompt Chips */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-medium text-surface-500 px-1">Quick suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {promptChips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip.prompt)}
                      className="text-xs bg-white hover:bg-surface-100 text-surface-800 hover:text-surface-900 border border-surface-200 hover:border-surface-300 rounded-full px-3 py-1 font-medium transition-all shadow-2xs"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs border border-slate-700/60">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs bg-white border border-surface-200 px-4 py-2.5 shadow-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="px-3 py-2.5 border-t border-surface-200 bg-white shrink-0 space-y-1.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask TaskBuddy anything about your tasks..."
                rows={1}
                disabled={isLoading || !!pendingConfirm}
                className="flex-1 resize-none rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-xs sm:text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-white disabled:opacity-50 transition-all"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading || !!pendingConfirm}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-2xs"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            {pendingConfirm && (
              <p className="text-[10px] text-amber-600 text-center font-medium">
                ⚠ Confirm or cancel the pending action above to continue.
              </p>
            )}
            <p className="text-[9px] text-surface-400 text-center">
              AI responses may be inaccurate. Always verify important changes.
            </p>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 active:scale-95 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 shadow-slate-900/25`}
        title={isOpen ? 'Close TaskBuddy AI' : 'Ask TaskBuddy'}
        aria-label="TaskBuddy AI"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <MessageCircle className="h-5 w-5 text-white" />
        )}
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
