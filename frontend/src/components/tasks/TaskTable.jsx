import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { getInitials, formatDate, priorityConfig, statusConfig } from '../../utils/helpers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SORTABLE_COLUMNS = [
  { key: 'title', label: 'Task' },
  { key: null, label: 'Project' },
  { key: 'priority', label: 'Priority' },
  { key: 'status', label: 'Status' },
  { key: null, label: 'Assignee' },
  { key: 'dueDate', label: 'Due date' },
  { key: null, label: '' },
];

const BULK_STATUSES = ['Done', 'To Do', 'In Progress', 'In Review', 'Blocked'];

export default function TaskTable({ tasks, sortBy, sortOrder, onSort, selectedIds, onSelectionChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const isManager = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete task'),
  });

  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t._id));
  const someSelected = tasks.some((t) => selectedIds.has(t._id));

  const handleSort = (key) => {
    if (!key) return;
    if (sortBy === key) {
      if (sortOrder === 'asc') onSort(key, 'desc');
      else if (sortOrder === 'desc') onSort(null, null);
      else onSort(key, 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(tasks.map((t) => t._id)));
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const SortIcon = ({ column }) => {
    if (sortBy !== column.key) return null;
    return sortOrder === 'asc'
      ? <ArrowUp className="ml-0.5 inline h-3 w-3" />
      : <ArrowDown className="ml-0.5 inline h-3 w-3" />;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-200 bg-surface-50">
            <th className="w-10 px-2 py-3 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
              />
            </th>
            {SORTABLE_COLUMNS.map((col) => (
              <th
                key={col.label}
                onClick={() => handleSort(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                  col.key
                    ? 'cursor-pointer select-none hover:text-surface-700 transition-colors'
                    : 'text-surface-500'
                } ${sortBy === col.key ? 'text-primary-700' : 'text-surface-500'}`}
              >
                {col.label}
                {col.key && <SortIcon column={col} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {tasks.map((task) => {
            const priority = priorityConfig(task.priority);
            const status = statusConfig(task.status);
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
            const isSelected = selectedIds.has(task._id);
            return (
              <tr
                key={task._id}
                onClick={() => navigate(`/tasks/${task._id}`)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary-50/60 hover:bg-primary-50' : 'hover:bg-surface-50'
                }`}
              >
                <td className="w-10 px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelect(task._id, e)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-surface-900 truncate max-w-[200px]">{task.title}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-surface-500">{task.project?.name || '\u2014'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priority.color}`}>
                    {priority.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[9px] font-semibold text-primary-700">
                      {getInitials(task.assignee?.name)}
                    </div>
                    <span className="text-sm text-surface-600">{task.assignee?.name || 'Unassigned'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm ${isOverdue ? 'text-red-500 font-medium' : 'text-surface-500'}`}>
                    {task.dueDate ? formatDate(task.dueDate) : '\u2014'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isManager && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this task?')) {
                          deleteTaskMutation.mutate(task._id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Floating bulk action bar */}
      {someSelected && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onBulkStatus={(status) => onSelectionChange({ action: 'bulkStatus', status, ids: selectedIds })}
        />
      )}
    </div>
  );
}

function BulkActionBar({ selectedCount, onBulkStatus }) {
  const [bulkStatus, setBulkStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleApply = () => {
    if (!bulkStatus) return;
    setUpdating(true);
    // The parent will handle the mutation and reset
    onBulkStatus(bulkStatus);
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t border-primary-200 bg-primary-50/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between animate-slide-in">
      <div className="flex items-center gap-2 text-sm font-medium text-primary-800">
        <CheckCheck className="h-4 w-4" />
        {selectedCount} task(s) selected
      </div>
      <div className="flex items-center gap-2">
        <select
          value={bulkStatus}
          onChange={(e) => setBulkStatus(e.target.value)}
          className="input-field h-8 text-xs"
          disabled={updating}
        >
          <option value="">Change status to...</option>
          {BULK_STATUSES.map((s) => {
            const cfg = statusConfig(s);
            return (
              <option key={s} value={s}>{cfg.label}</option>
            );
          })}
        </select>
        <button
          onClick={handleApply}
          disabled={!bulkStatus || updating}
          className="btn-primary h-8 text-xs px-3 disabled:opacity-50"
        >
          {updating ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Updating...</span>
          ) : 'Apply'}
        </button>
      </div>
    </div>
  );
}
