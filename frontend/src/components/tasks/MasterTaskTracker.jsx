import { useState } from 'react';
import { Calendar, User, FileText, CheckCircle2, Clock, AlertCircle, Filter } from 'lucide-react';
import { formatDate, getInitials } from '../../utils/helpers';
import TaskDetailModal from './TaskDetailModal';
import ScoreBadge from '../common/ScoreBadge';

export default function MasterTaskTracker({ tasks = [], users = [], selectedUser, onSelectUser }) {
  const [trackerTab, setTrackerTab] = useState('daywise'); // 'monthly' | 'daywise'
  const [activeTaskId, setActiveTaskId] = useState(null);

  // Filter tasks by selected user if set
  const filteredTasks = selectedUser
    ? tasks.filter((t) => t.assignees?.some(a => a._id === selectedUser) || t.assignees?.includes(selectedUser))
    : tasks;


  // Day-wise sorting
  const daywiseTasks = [...filteredTasks].sort((a, b) => {
    const da = new Date(a.dueDate || a.createdAt);
    const db = new Date(b.dueDate || b.createdAt);
    return db - da;
  });

  return (
    <div className="space-y-8 bg-white p-6 rounded-2xl border border-surface-200 shadow-sm font-sans">
      {/* ─── Header & Assignee Filters ───────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600" />
            <h2 className="text-xl font-bold text-surface-900">
              {selectedUser ? users.find((u) => u._id === selectedUser)?.name || 'Member Tasks' : 'Master Task Tracker'}
            </h2>
          </div>
          <p className="text-xs text-surface-500 mt-1">
            Track daily work updates, assignees, and progress logs
          </p>
        </div>

        {/* Member Selector Tags */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-50 p-1.5 rounded-xl border border-surface-200">
          <button
            onClick={() => onSelectUser(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !selectedUser
                ? 'bg-white text-surface-900 shadow-sm ring-1 ring-surface-200'
                : 'text-surface-600 hover:text-surface-900'
            }`}
          >
            All Team
          </button>
          {users.map((u) => (
            <button
              key={u._id}
              onClick={() => onSelectUser(selectedUser === u._id ? null : u._id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedUser === u._id
                  ? 'bg-amber-100 text-amber-900 font-semibold ring-1 ring-amber-300'
                  : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100/80'
              }`}
            >
              <span className="flex h-4 w-4 items-center justify-center shrink-0 rounded-full bg-amber-200 text-[9px] font-bold text-amber-900">
                {getInitials(u.name)}
              </span>
              <span className="truncate">{u.name}</span>
              <ScoreBadge score={u.score || 0} />
            </button>
          ))}
        </div>
      </div>



      {/* ─── Master Task Tracker Table ────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-surface-200 pb-3">
          <div className="flex items-center gap-2 text-base font-bold text-surface-900">
            <Calendar className="h-4 w-4 text-red-500" />
            Master Task Tracker
          </div>

          {/* Toggle Tabs */}
          <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg">
            <button
              onClick={() => setTrackerTab('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                trackerTab === 'monthly'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              📅 Monthly Tasks
            </button>
            <button
              onClick={() => setTrackerTab('daywise')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                trackerTab === 'daywise'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500 hover:text-surface-800'
              }`}
            >
              📅 Day-wise
            </button>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto rounded-xl border border-surface-200 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-50 font-semibold text-surface-500 border-b border-surface-200">
              <tr>
                <th className="px-4 py-3 min-w-[240px]">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-surface-400" />
                    tasks
                  </span>
                </th>
                <th className="px-4 py-3 w-36">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-surface-400" />
                    Date
                  </span>
                </th>
                <th className="px-4 py-3 w-36">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-surface-400" />
                    Status
                  </span>
                </th>
                <th className="px-4 py-3 min-w-[160px]">Remarks</th>
                <th className="px-4 py-3 w-36">
                  <span className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-surface-400" />
                    Employee
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 bg-white">
              {daywiseTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-surface-400 italic">
                    No tasks recorded for this filter.
                  </td>
                </tr>
              ) : (
                daywiseTasks.map((t) => {
                  const dateStr = t.dueDate || t.createdAt;
                  const isDone = t.status === 'Done';
                  const isBlocked = t.status === 'Blocked';
                  const isInProgress = t.status === 'In Progress';

                  return (
                    <tr
                      key={t._id}
                      onClick={() => setActiveTaskId(t._id)}
                      className="group cursor-pointer hover:bg-surface-50/80 transition-colors"
                    >
                      {/* Task Title */}
                      <td className="px-4 py-3 font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-surface-400 shrink-0 group-hover:text-primary-500" />
                          <span className="truncate max-w-md font-semibold">{t.title}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                        {dateStr ? formatDate(dateStr) : '—'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Completed
                          </span>
                        ) : isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            Blocked
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            To Do
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="px-4 py-3 text-surface-500 truncate max-w-[200px]">
                        {t.blockedReason || (t.estimatedEffort ? `${t.estimatedEffort}h est.` : '—')}
                      </td>

                      {/* Employee Tag */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.assignees && t.assignees.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.assignees.map(a => (
                              <span key={a._id || a} className="inline-flex items-center gap-1 rounded-md bg-amber-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 border border-amber-200/60">
                                {a.name || 'Assigned'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-surface-400 italic">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notion Slide-over Drawer Modal */}
      {activeTaskId && (
        <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
      )}
    </div>
  );
}
