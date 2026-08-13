import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  ScrollText, Search, Download, ChevronLeft, ChevronRight,
  Filter, Calendar,
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

const ACTION_TYPES = [
  'role_changed', 'user_invited', 'user_deactivated', 'user_reactivated',
  'org_settings_changed', 'department_created', 'department_deleted',
  'team_created', 'team_deleted', 'ownership_transferred',
];

export default function AuditLog() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ actionType: '', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 50;

  const params = {
    page, pageSize,
    ...(filters.actionType && { actionType: filters.actionType }),
    ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
    ...(filters.dateTo && { dateTo: filters.dateTo }),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => auditLogApi.list(params),
    enabled: ['Founder', 'Admin'].includes(user?.role),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Audit Log</h1>
          <p className="mt-1 text-sm text-surface-500">
            {pagination ? `${pagination.totalCount} entries` : 'Track administrative actions'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'border-primary-500 text-primary-700 bg-primary-50' : ''}`}>
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button onClick={async () => {
            try {
              const { default: client } = await import('../api/client');
              const res = await client.get('/audit-logs/export', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([res.data]));
              const a = document.createElement('a');
              a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click();
              window.URL.revokeObjectURL(url);
            } catch { /* ignore */ }
          }} className="btn-secondary">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-surface-200 bg-white p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-surface-500 mb-1">Action Type</label>
              <select value={filters.actionType} onChange={(e) => setFilters((f) => ({ ...f, actionType: e.target.value }))}
                className="input-field h-9 text-sm">
                <option value="">All actions</option>
                {ACTION_TYPES.map((at) => (
                  <option key={at} value={at}>{at.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-surface-500 mb-1">From</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                <input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="input-field h-9 pl-8 text-sm" />
              </div>
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-surface-500 mb-1">To</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                <input type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="input-field h-9 pl-8 text-sm" />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => { setFilters({ actionType: '', dateFrom: '', dateTo: '' }); setPage(1); }}
                className="btn-ghost h-9 text-sm">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-16">
          <ScrollText className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-lg font-medium text-surface-500">No audit log entries</p>
          <p className="mt-1 text-sm text-surface-400">Administrative actions will appear here.</p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 bg-surface-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Actor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Target</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-surface-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-700">
                          {log.actionType?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-surface-900">{log.actor?.name || 'Unknown'}</p>
                        <p className="text-xs text-surface-400">{log.actor?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-600">
                        {log.targetType}: {log.targetId?.toString().slice(-8) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.details && (
                          <div className="text-xs text-surface-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                            {JSON.stringify(log.details)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-white px-4 py-3">
              <span className="text-sm text-surface-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages}
                  className="btn-ghost p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
