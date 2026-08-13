import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function TaskFilters({ filters, onFilterChange, onClose }) {
  const [local, setLocal] = useState(filters);

  const update = (key, value) => {
    const next = { ...local, [key]: value || undefined };
    setLocal(next);
  };

  const apply = () => {
    onFilterChange(local);
  };

  const clear = () => {
    const empty = {};
    setLocal(empty);
    onFilterChange(empty);
  };

  const hasFilters = Object.keys(local).length > 0;

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-surface-500" />
          <span className="text-sm font-medium text-surface-700">Filters</span>
        </div>
        <button onClick={onClose} className="btn-ghost p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-500">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => update('status', local.status === s ? undefined : s)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  local.status === s
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-500">Priority</label>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => update('priority', local.priority === p ? undefined : p)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  local.priority === p
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-500">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={local.search || ''}
              onChange={(e) => update('search', e.target.value)}
              placeholder="Search tasks..."
              className="input-field h-9 pl-8 text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={apply} className="btn-primary flex-1 text-sm">
            Apply filters
          </button>
          {hasFilters && (
            <button onClick={clear} className="btn-ghost text-sm">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
