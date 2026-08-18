import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, commentApi, userApi } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import {
  X, Calendar, User, MessageSquare, Clock, Edit3, Check,
  AlertCircle, ChevronRight, Send, Trash2, ArrowLeft,
} from 'lucide-react';
import { formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ScoreBadge from '../common/ScoreBadge';

const NotionEditor = lazy(() => import('../editor/NotionEditor'));

const VALID_TRANSITIONS = {
  'To Do': ['In Progress', 'Blocked'],
  'In Progress': ['In Review', 'Blocked', 'To Do'],
  'In Review': ['Done', 'Blocked', 'In Progress'],
  'Done': [],
  'Blocked': ['To Do', 'In Progress'],
};

export default function TaskDetailModal({ taskId, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [comment, setComment] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [isDescDirty, setIsDescDirty] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedReason, setBlockedReason] = useState('');

  const titleInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => taskApi.get(taskId),
    enabled: !!taskId,
  });

  const task = data?.data;

  const isManager = user?.role === 'Founder' || user?.role === 'Manager' || user?.role === 'Team Leader';
  const canEdit = isManager || (task?.assignees?.some(a => a._id === user?._id) && task?.allowAssigneeToEdit);

  useEffect(() => {
    if (task) {
      setDescDraft(task.description || '');
      setIsDescDirty(false);
    }
  }, [task?.description]);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'active'],
    queryFn: () => userApi.list({}),
    enabled: showAssigneePicker,
  });
  const allUsers = usersData?.data || [];

  const statusMutation = useMutation({
    mutationFn: (statusData) => taskApi.updateStatus(taskId, statusData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowBlockedModal(false);
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update status'),
  });

  const updateTitleMutation = useMutation({
    mutationFn: (newTitle) => taskApi.update(taskId, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Title updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update title'),
  });

  const updateDescriptionMutation = useMutation({
    mutationFn: (newDesc) => taskApi.update(taskId, { description: newDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsDescDirty(false);
    }
  });

  const toggleEditAccessMutation = useMutation({
    mutationFn: (allowEdit) => taskApi.update(taskId, { allowAssigneeToEdit: allowEdit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast.success('Assignee edit access updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update access'),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: () => taskApi.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete task'),
  });

  useEffect(() => {
    if (isDescDirty && task && descDraft !== task.description) {
      const timer = setTimeout(() => {
        updateDescriptionMutation.mutate(descDraft);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [descDraft, isDescDirty]);

  const assignMutation = useMutation({
    mutationFn: (assigneeIds) => taskApi.assign(taskId, { assigneeIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Keep picker open to allow multiple selections
      toast.success('Assignees updated');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body) => commentApi.create(taskId, { body, mentions: [] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setComment('');
      toast.success('Comment added');
    },
  });

  const handleTitleBlur = (e) => {
    const trimmed = e.target.value.trim();
    if (trimmed && trimmed !== task?.title) {
      updateTitleMutation.mutate(trimmed);
    }
  };

  if (!taskId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 animate-slide-left border-l border-surface-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Close bar */}
        <div className="flex items-center justify-between border-b border-surface-100 pb-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-surface-500 hover:text-surface-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tracker
          </button>

          <div className="flex items-center gap-2">
            {isManager && (
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this task? This cannot be undone.')) {
                    deleteTaskMutation.mutate();
                  }
                }}
                disabled={deleteTaskMutation.isPending}
                className="p-1 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-2"
                title="Delete Task"
              >
                {deleteTaskMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : !task ? (
          <div className="py-16 text-center text-surface-400">Task details unavailable.</div>
        ) : (
          <>
            {/* Notion Header Title */}
            <div>
              {canEdit ? (
                <input
                  type="text"
                  defaultValue={task.title}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                  className="w-full border-0 bg-transparent text-2xl font-extrabold text-surface-900 focus:outline-none focus:ring-0 leading-snug p-0"
                />
              ) : (
                <h1 className="text-2xl font-extrabold text-surface-900 leading-snug flex-1">
                  {task.title}
                </h1>
              )}
            </div>

            {/* Notion Property Metadata Table */}
            <div className="space-y-3 text-xs border-y border-surface-100 py-4">
              {/* Date */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28 text-surface-400 font-medium">
                  <Calendar className="h-4 w-4" />
                  Date
                </div>
                <div className="text-surface-800 font-semibold">
                  {task.dueDate ? formatDate(task.dueDate) : formatDate(task.createdAt)}
                </div>
              </div>

              {/* Employee */}
              <div className="flex items-center gap-4 relative">
                <div className="flex items-center gap-2 w-28 text-surface-400 font-medium">
                  <User className="h-4 w-4" />
                  Employee
                </div>
                <button
                  onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-100/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
                >
                  {task.assignees && task.assignees.length > 0 
                    ? task.assignees.map(a => a.name).join(', ') 
                    : 'Unassigned'}
                </button>

                {showAssigneePicker && (
                  <div className="absolute left-32 top-full z-30 mt-1 w-64 rounded-xl border border-surface-200 bg-white shadow-xl animate-fade-in flex flex-col">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-surface-100">
                      <p className="text-[10px] font-bold text-surface-400 uppercase">Select Assignees</p>
                      <button 
                        onClick={() => setShowAssigneePicker(false)}
                        className="text-surface-400 hover:text-surface-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                      {allUsers.filter((u) => u.isActive).map((u) => {
                        const isAssigned = task.assignees?.some(a => a._id === u._id);
                        return (
                          <label
                            key={u._id}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                              isAssigned ? 'bg-amber-50' : 'hover:bg-surface-50'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              checked={isAssigned}
                              onChange={(e) => {
                                const currentIds = task.assignees?.map(a => a._id) || [];
                                const newIds = e.target.checked 
                                  ? [...currentIds, u._id]
                                  : currentIds.filter(id => id !== u._id);
                                assignMutation.mutate(newIds);
                              }}
                              className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                            />
                            <span className="flex h-5 w-5 items-center justify-center shrink-0 rounded-full bg-amber-200 text-[9px] font-bold text-amber-900">
                              {getInitials(u.name)}
                            </span>
                            <span className="truncate flex-1 text-surface-700 font-medium">{u.name}</span>
                            <ScoreBadge score={u.score || 0} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {isManager && task.assignees && task.assignees.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-28" />
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

              {/* Remarks */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28 text-surface-400 font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Remarks
                </div>
                <div className="text-surface-600">
                  {task.blockedReason || (task.estimatedEffort ? `${task.estimatedEffort}h estimated` : 'Empty')}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-28 text-surface-400 font-medium">
                  <Clock className="h-4 w-4" />
                  Status
                </div>
                <div>
                  <select
                    value={task.status}
                    onChange={(e) => {
                      const s = e.target.value;
                      if (s === 'Blocked') {
                        setShowBlockedModal(true);
                        setBlockedReason('');
                      } else {
                        statusMutation.mutate({ status: s });
                      }
                    }}
                    disabled={statusMutation.isPending}
                    className={`appearance-none rounded-full px-3 py-1 text-xs font-bold focus:outline-none cursor-pointer border ${
                      task.status === 'Done' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                      task.status === 'Blocked' ? 'bg-red-100 text-red-800 border-red-200' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      task.status === 'In Review' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <option value="To Do" disabled={!isManager && task.status !== 'To Do' && !VALID_TRANSITIONS[task.status]?.includes('To Do')}>To Do</option>
                    <option value="In Progress" disabled={!isManager && task.status !== 'In Progress' && !VALID_TRANSITIONS[task.status]?.includes('In Progress')}>In Progress</option>
                    <option value="In Review" disabled={!isManager && task.status !== 'In Review' && !VALID_TRANSITIONS[task.status]?.includes('In Review')}>In Review</option>
                    <option value="Done" disabled={!isManager && task.status !== 'Done' && !VALID_TRANSITIONS[task.status]?.includes('Done')}>Done</option>
                    <option value="Blocked" disabled={!isManager && task.status !== 'Blocked' && !VALID_TRANSITIONS[task.status]?.includes('Blocked')}>Blocked</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-surface-500 uppercase tracking-wider">Comments</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && comment.trim()) commentMutation.mutate(comment);
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-xl border border-surface-200 px-3 py-2 text-xs text-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {comment.trim() && (
                  <button
                    onClick={() => commentMutation.mutate(comment)}
                    disabled={commentMutation.isPending}
                    className="btn-primary text-xs px-3 py-2"
                  >
                    Send
                  </button>
                )}
              </div>

              {task.comments?.length > 0 && (
                <div className="space-y-2 bg-surface-50 p-3 rounded-xl">
                  {task.comments.map((c) => (
                    <div key={c._id} className="text-xs flex gap-2">
                      <span className="font-semibold text-surface-900">{c.author?.name}:</span>
                      <span className="text-surface-700" dangerouslySetInnerHTML={{ __html: c.body }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Body */}
            <div className="space-y-3 pt-4 border-t border-surface-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Description</p>
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
                <div className="prose dark:prose-invert prose-sm max-w-none text-surface-800 leading-relaxed bg-surface-50/60 p-5 rounded-xl border border-surface-100">
                  <div dangerouslySetInnerHTML={{ __html: task.description }} />
                </div>
              ) : (
                <p className="text-xs italic text-surface-400 py-4">No detailed description attached.</p>
              )}
            </div>
          </>
        )}
      </div>

      {showBlockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-surface-900">Block Task</h3>
            </div>
            
            <p className="text-sm text-surface-600 mb-4">
              Please provide a reason why this task is blocked. This helps the team understand the blocker.
            </p>
            
            <textarea
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="e.g., Waiting on design assets from team..."
              className="w-full min-h-[100px] rounded-xl border border-surface-200 p-3 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none mb-6"
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBlockedModal(false);
                  setBlockedReason('');
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!blockedReason.trim()) {
                    toast.error('Please provide a reason');
                    return;
                  }
                  statusMutation.mutate({ status: 'Blocked', blockedReason });
                }}
                disabled={statusMutation.isPending || !blockedReason.trim()}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {statusMutation.isPending ? 'Saving...' : 'Mark as Blocked'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
