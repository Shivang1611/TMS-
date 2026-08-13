import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, commentApi, documentApi, userApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useTaskSocket } from '../context/SocketContext';
import {
  ArrowLeft, Clock, User, Calendar, Flag, GitBranch,
  MessageSquare, Send, Trash2, CheckCircle2,
  Paperclip, Upload, FileText, File, AlertCircle,
  ChevronRight, Check, X as XIcon, Loader2, ExternalLink
} from 'lucide-react';
import { formatDate, getInitials, priorityConfig, statusConfig } from '../utils/helpers';
import ImageGallery from '../components/images/ImageGallery';
import toast from 'react-hot-toast';
import { lazy, Suspense } from 'react';

const NotionEditor = lazy(() => import('../components/editor/NotionEditor'));

// Mirror of backend Task.VALID_TRANSITIONS for frontend UX
const VALID_TRANSITIONS = {
  'To Do': ['In Progress', 'Blocked'],
  'In Progress': ['In Review', 'Blocked', 'To Do'],
  'In Review': ['Done', 'Blocked', 'In Progress'],
  'Done': [],
  'Blocked': ['To Do', 'In Progress'],
};

const STATUS_BUTTON_STYLES = {
  'To Do': { active: 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200', icon: Clock },
  'In Progress': { active: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200', icon: Clock },
  'In Review': { active: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200', icon: Clock },
  'Done': { active: 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200', icon: CheckCircle2 },
  'Blocked': { active: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200', icon: AlertCircle },
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { joinTask, leaveTask } = useTaskSocket();
  const [comment, setComment] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [isDescDirty, setIsDescDirty] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const fileInputRef = useRef(null);
  const blockedInputRef = useRef(null);

  useEffect(() => {
    if (showBlockedModal && blockedInputRef.current) {
      blockedInputRef.current?.focus();
    }
  }, [showBlockedModal]);

  useEffect(() => {
    joinTask(id);
    return () => leaveTask(id);
  }, [id, joinTask, leaveTask]);

  const { data, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => taskApi.get(id),
  });

  const { data: docsData } = useQuery({
    queryKey: ['documents', 'task', id],
    queryFn: () => documentApi.list({ taskId: id }),
    enabled: !!id,
  });
  const documents = docsData?.data || [];

  const task = data?.data;

  const isManager = user?.role === 'Founder' || user?.role === 'Manager' || user?.role === 'Team Leader';
  const canEdit = isManager || (task?.assignee?._id === user?._id && task?.allowAssigneeToEdit);

  useEffect(() => {
    if (task) {
      setDescDraft(task.description || '');
      setIsDescDirty(false);
    }
  }, [task?.description]);

  const statusMutation = useMutation({
    mutationFn: (statusData) => taskApi.updateStatus(id, statusData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      setShowBlockedModal(false);
      toast.success('Status updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body) => commentApi.create(id, { body, mentions: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      setComment('');
      toast.success('Comment added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => commentApi.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Comment deleted');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', id);
      return documentApi.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'task', id] });
      toast.success('File uploaded!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => userApi.list({}),
    enabled: showAssigneePicker,
  });
  const allUsers = usersData?.data || [];

  const assignMutation = useMutation({
    mutationFn: (assigneeId) => taskApi.assign(id, { assigneeId: assigneeId || undefined }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      setShowAssigneePicker(false);
      toast.success(res.message || 'Assignee updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update assignee'),
  });

  const updateTitleMutation = useMutation({
    mutationFn: (newTitle) => taskApi.update(id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Title updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update title'),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: (newDesc) => taskApi.update(id, { description: newDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsDescDirty(false);
    }
  });

  const toggleEditAccessMutation = useMutation({
    mutationFn: (allowEdit) => taskApi.update(id, { allowAssigneeToEdit: allowEdit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      toast.success('Assignee edit access updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update access'),
  });

  useEffect(() => {
    if (isDescDirty && task && descDraft !== task.description) {
      const timer = setTimeout(() => {
        updateDescriptionMutation.mutate(descDraft);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [descDraft, isDescDirty]);

  const handleTitleBlur = (e) => {
    const trimmed = e.target.value.trim();
    if (trimmed && trimmed !== task?.title) {
      updateTitleMutation.mutate(trimmed);
    }
  };

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => documentApi.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'task', id] });
      toast.success('File deleted');
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds 25MB limit');
        return;
      }
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-lg font-medium text-surface-500">Task not found</p>
        <button onClick={() => navigate('/tasks')} className="btn-ghost mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to tasks
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-white rounded-2xl border border-surface-200 p-8 shadow-sm font-sans space-y-6">
      <div className="flex items-center justify-between border-b border-surface-100 pb-4">
        <button
          onClick={() => navigate('/tasks')}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to tasks
        </button>

        <div className="flex items-center gap-1.5">
          {(isManager ? ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].filter(s => s !== task.status) : VALID_TRANSITIONS[task.status])?.map((s) => {
            const isDoneAction = s === 'Done';
            const isBlockedAction = s === 'Blocked';
            return (
              <button
                key={s}
                onClick={() => {
                  if (isBlockedAction) {
                    setShowBlockedModal(true);
                    setBlockedReason('');
                  } else {
                    statusMutation.mutate({ status: s });
                  }
                }}
                disabled={statusMutation.isPending}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  isDoneAction
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : isBlockedAction
                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    : 'bg-surface-50 text-surface-700 border-surface-200 hover:bg-surface-100'
                }`}
              >
                Mark {s}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="mb-8">
          {canEdit ? (
            <input
              type="text"
              defaultValue={task.title}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
              className="w-full border-0 bg-transparent text-3xl font-extrabold text-surface-900 focus:outline-none focus:ring-0 leading-snug p-0"
            />
          ) : (
            <h1 className="text-3xl font-extrabold text-surface-900 leading-snug">
              {task.title}
            </h1>
          )}
        </div>

        <div className="space-y-2.5 text-xs border-y border-surface-100 py-4 max-w-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-32 text-surface-400 font-medium">
              <Calendar className="h-4 w-4" />
              Date
            </div>
            <div className="text-surface-800 font-medium">
              {task.dueDate ? formatDate(task.dueDate) : formatDate(task.createdAt)}
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
            <div className="flex items-center gap-2 w-32 text-surface-400 font-medium">
              <User className="h-4 w-4" />
              Employee
            </div>
            <button
              onClick={() => setShowAssigneePicker(!showAssigneePicker)}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
            >
              {task.assignee?.name || 'Unassigned'}
            </button>

            {showAssigneePicker && (
              <div className="absolute left-36 top-full z-30 mt-1 w-56 rounded-xl border border-surface-200 bg-white p-2 shadow-xl animate-fade-in">
                <p className="px-2 py-1 text-[10px] font-bold text-surface-400 uppercase">Select Assignee</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {allUsers.filter((u) => u.isActive).map((u) => (
                    <button
                      key={u._id}
                      onClick={() => assignMutation.mutate(u._id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition-colors ${
                        task.assignee?._id === u._id ? 'bg-amber-100 text-amber-900 font-semibold' : 'hover:bg-surface-100 text-surface-700'
                      }`}
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold">
                        {getInitials(u.name)}
                      </span>
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isManager && task.assignee && (
            <div className="flex items-center gap-4">
              <div className="w-32" />
              <label className="flex items-center gap-2 text-[10px] text-surface-500 cursor-pointer hover:text-surface-700 transition-colors">
                <input
                  type="checkbox"
                  checked={!!task.allowAssigneeToEdit}
                  onChange={(e) => toggleEditAccessMutation.mutate(e.target.checked)}
                  disabled={toggleEditAccessMutation.isPending}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 h-3 w-3"
                />
                {toggleEditAccessMutation.isPending ? 'Updating...' : 'Allow assignee to edit task details'}
              </label>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-32 text-surface-400 font-medium">
              <MessageSquare className="h-4 w-4" />
              Remarks
            </div>
            <div className="text-surface-600">
              {task.blockedReason || (task.estimatedEffort ? `${task.estimatedEffort}h est.` : 'Empty')}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-32 text-surface-400 font-medium">
              <Clock className="h-4 w-4" />
              Status
            </div>
            <div>
              {task.status === 'Done' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  Completed
                </span>
              ) : task.status === 'Blocked' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-0.5 text-xs font-bold text-red-800">
                  <span className="h-2 w-2 rounded-full bg-red-600" />
                  Blocked
                </span>
              ) : task.status === 'In Progress' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-blue-800">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  In Progress
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  To Do
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold text-surface-500">Comments</div>
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              {getInitials(user?.name)}
            </div>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && comment.trim()) {
                  commentMutation.mutate(comment);
                }
              }}
              placeholder="Add a comment..."
              className="flex-1 border-0 bg-transparent text-sm text-surface-700 placeholder-surface-400 focus:outline-none focus:ring-0"
            />
            {comment.trim() && (
              <button
                onClick={() => commentMutation.mutate(comment)}
                disabled={commentMutation.isPending}
                className="btn-primary text-xs px-3 py-1"
              >
                Send
              </button>
            )}
          </div>

          {task.comments?.length > 0 && (
            <div className="mt-3 space-y-2 bg-surface-50 p-3 rounded-xl">
              {task.comments.map((c) => (
                <div key={c._id} className="flex gap-2.5 text-xs">
                  <span className="font-semibold text-surface-900">{c.author?.name}:</span>
                  <span className="text-surface-700" dangerouslySetInnerHTML={{ __html: c.body }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-surface-100 my-6" />

      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" /> Description
          </h2>
          {updateDescriptionMutation.isPending && (
            <span className="text-[10px] text-surface-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </span>
          )}
        </div>
        
        {canEdit ? (
          <div className="bg-transparent -mx-4 px-4">
            <Suspense fallback={<div className="h-20 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-surface-400" /></div>}>
              <NotionEditor
                content={descDraft}
                onChange={(html) => {
                  setDescDraft(html);
                  setIsDescDirty(true);
                }}
                placeholder="Type / for commands, or start writing..."
              />
            </Suspense>
          </div>
        ) : task.description ? (
          <div className="prose dark:prose-invert prose-sm max-w-none text-surface-800 leading-relaxed bg-white p-6 rounded-2xl border border-surface-200 shadow-sm">
            <div dangerouslySetInnerHTML={{ __html: task.description }} />
          </div>
        ) : (
          <p className="text-xs italic text-surface-400 py-4">No detailed description attached.</p>
        )}
      </div>

      <div className="h-px bg-surface-100 my-6" />

      {/* ─── Task Documents Section ─────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
            <Paperclip className="h-4 w-4" />
            Task Documents
          </h3>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="btn-secondary text-xs px-2 py-1 flex items-center gap-1.5"
            >
              {uploadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload File
            </button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-6 bg-surface-50 rounded-xl border border-dashed border-surface-200">
            <p className="text-xs text-surface-500">No documents attached to this task.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-2.5 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    {doc.mimeType.includes('image') ? (
                      <img src={doc.url} alt={doc.originalName} className="h-5 w-5 object-cover rounded" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary-500" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-surface-900 truncate" title={doc.originalName}>
                      {doc.originalName}
                    </p>
                    <p className="text-[10px] text-surface-500">
                      {(doc.size / 1024).toFixed(1)} KB • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1 text-surface-400 hover:text-primary-600 rounded-md hover:bg-white" title="View Document">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this document?')) {
                        deleteDocumentMutation.mutate(doc._id);
                      }
                    }}
                    className="p-1 text-surface-400 hover:text-red-600 rounded-md hover:bg-white"
                    title="Delete Document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked reason modal */}
      {showBlockedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowBlockedModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-900">Why is this task blocked?</h3>
                <p className="text-xs text-surface-500">Provide a reason to help your team resolve the blocker.</p>
              </div>
            </div>
            <textarea
              ref={blockedInputRef}
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="Waiting on design approval..."
              rows={3}
              className="input-field w-full resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (blockedReason.trim()) {
                    statusMutation.mutate({ status: 'Blocked', blockedReason: blockedReason.trim() });
                  }
                }
                if (e.key === 'Escape') setShowBlockedModal(false);
              }}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowBlockedModal(false)} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (blockedReason.trim()) {
                    statusMutation.mutate({ status: 'Blocked', blockedReason: blockedReason.trim() });
                  }
                }}
                disabled={!blockedReason.trim() || statusMutation.isPending}
                className="btn-primary flex-1 text-sm bg-red-500 hover:bg-red-600"
              >
                {statusMutation.isPending ? 'Updating...' : 'Mark Blocked'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
