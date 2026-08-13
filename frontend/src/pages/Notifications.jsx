import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notificationApi } from '../api/api';
import {
  Bell,
  CheckCheck,
  Check,
  UserPlus,
  ArrowRightLeft,
  AtSign,
  MessageSquareReply,
  Milestone,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Inbox,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  task_assigned: {
    icon: UserPlus,
    label: 'Task Assigned',
    color: 'text-blue-600 bg-blue-100',
  },
  status_changed: {
    icon: ArrowRightLeft,
    label: 'Status Changed',
    color: 'text-amber-600 bg-amber-100',
  },
  mention: {
    icon: AtSign,
    label: 'Mention',
    color: 'text-purple-600 bg-purple-100',
  },
  comment_reply: {
    icon: MessageSquareReply,
    label: 'Comment Reply',
    color: 'text-green-600 bg-green-100',
  },
  milestone_approaching: {
    icon: Milestone,
    label: 'Milestone Approaching',
    color: 'text-cyan-600 bg-cyan-100',
  },
  task_overdue: {
    icon: AlertTriangle,
    label: 'Task Overdue',
    color: 'text-red-600 bg-red-100',
  },
};

function entityRoute(entityType, entityId) {
  switch (entityType) {
    case 'Task':
      return `/tasks/${entityId}`;
    case 'Project':
      return `/projects/${entityId}`;
    case 'Milestone':
      return `/projects/${entityId}`;
    case 'Comment':
      return `/tasks/${entityId}`;
    default:
      return null;
  }
}

function parseISO(str) {
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatRelativeTime(date) {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [typeFilter, setTypeFilter] = useState('all');
  const pageSize = 30;

  const params = {
    page,
    pageSize,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };
  if (readFilter === 'unread') params.isRead = false;
  if (readFilter === 'read') params.isRead = true;
  if (typeFilter !== 'all') params.type = typeFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationApi.list(params),
  });

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unreadCount || 0;
  const pagination = data?.pagination;

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to mark as read'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(res.message || 'All marked as read');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to mark all as read'),
  });

  const handleMarkRead = (id) => {
    markReadMutation.mutate(id);
  };

  const clearFilters = () => {
    setReadFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const hasFilters = readFilter !== 'all' || typeFilter !== 'all';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Notifications</h1>
          <p className="mt-1 text-sm text-surface-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="btn-secondary text-sm"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3">
        <Filter className="h-4 w-4 text-surface-400" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-500">Status:</span>
          <div className="flex gap-1">
            {['all', 'unread', 'read'].map((val) => (
              <button
                key={val}
                onClick={() => { setReadFilter(val); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  readFilter === val
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {val === 'all' ? 'All' : val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="h-5 w-px bg-surface-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-500">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="h-8 rounded-lg border border-surface-200 bg-white px-2 text-xs font-medium text-surface-700 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="all">All types</option>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost ml-auto p-1.5 text-surface-400 hover:text-surface-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-100">
            {hasFilters ? <Filter className="h-8 w-8 text-surface-300" /> : <Inbox className="h-8 w-8 text-surface-300" />}
          </div>
          <p className="text-lg font-medium text-surface-500">
            {hasFilters ? 'No matching notifications' : 'No notifications yet'}
          </p>
          <p className="mt-1 text-sm text-surface-400">
            {hasFilters
              ? 'Try adjusting your filters.'
              : 'Notifications from your team activity will appear here.'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-secondary mt-4 text-sm">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Notification list */}
          <div className="space-y-1 rounded-xl border border-surface-200 bg-white divide-y divide-surface-100 overflow-hidden">
            {notifications.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || { icon: Bell, label: notif.type, color: 'text-gray-600 bg-gray-100' };
              const Icon = cfg.icon;
              const route = entityRoute(notif.entityType, notif.entityId);
              const timeAgo = parseISO(notif.createdAt);
              const relativeTime = timeAgo ? formatRelativeTime(timeAgo) : '';

              const content = (
                <div
                  className={`group flex items-start gap-4 px-5 py-4 transition-all duration-200 ${
                    !notif.isRead
                      ? 'bg-primary-50/40 hover:bg-primary-50'
                      : 'hover:bg-surface-50'
                  } ${!notif.isRead ? 'border-l-2 border-l-primary-500' : ''}`}
                >
                  {/* Icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${!notif.isRead ? 'font-semibold text-surface-900' : 'font-medium text-surface-700'}`}>
                          {notif.title || cfg.label}
                        </p>
                        {notif.message && (
                          <p className="mt-0.5 text-sm text-surface-500 line-clamp-2">{notif.message}</p>
                        )}
                        {notif.actor && (
                          <p className="mt-1 text-xs text-surface-400">
                            by <span className="font-medium text-surface-500">{notif.actor.name}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!notif.isRead && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkRead(notif._id); }}
                            className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4 text-surface-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    {relativeTime && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-surface-400">
                        <Clock className="h-3 w-3" />
                        {relativeTime}
                      </div>
                    )}
                  </div>
                </div>
              );

              if (route && notif.entityType === 'Task') {
                return (
                  <Link
                    key={notif._id}
                    to={route}
                    className="block"
                    onClick={() => { if (!notif.isRead) handleMarkRead(notif._id); }}
                  >
                    {content}
                  </Link>
                );
              }
              return <div key={notif._id}>{content}</div>;
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-4 py-3">
              <p className="text-sm text-surface-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-ghost p-2 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= pagination.totalPages}
                  className="btn-ghost p-2 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
