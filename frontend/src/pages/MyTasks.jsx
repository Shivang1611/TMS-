import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, CheckSquare, Calendar, FolderKanban, FileText, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import TaskBoard from '../components/tasks/TaskBoard';
import TaskCalendar from '../components/tasks/TaskCalendar';
import TaskFiles from '../components/tasks/TaskFiles';

export default function MyTasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('List');
  const [activeTaskId, setActiveTaskId] = useState(null);
  
  const isManager = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);
  const [viewMode, setViewMode] = useState('assignedToMe'); // 'assignedToMe' or 'assignedByMe'

  const queryClient = useQueryClient();

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete task'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks', user?._id, viewMode],
    queryFn: () => taskApi.list({ 
      ...(viewMode === 'assignedToMe' ? { assigneeId: user?._id } : { createdBy: user?._id }),
      pageSize: 500 
    }),
    enabled: !!user?._id,
  });

  const tasks = data?.data || [];

  // Metrics Calculations
  const metrics = useMemo(() => {
    let completed = 0;
    let incomplete = 0;
    let overdue = 0;

    const now = new Date();
    // Reset time for fair date comparison
    now.setHours(0, 0, 0, 0);

    tasks.forEach(t => {
      if (t.status === 'Done') {
        completed++;
      } else {
        incomplete++;
        if (t.dueDate) {
          const dueDate = new Date(t.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < now) {
            overdue++;
          }
        }
      }
    });

    return {
      total: tasks.length,
      completed,
      incomplete,
      overdue
    };
  }, [tasks]);

  // Chart Data Calculations
  const statusData = useMemo(() => {
    return [
      { name: 'Completed', value: metrics.completed, color: '#10b981' },
      { name: 'Incomplete', value: metrics.incomplete, color: '#3b82f6' }
    ].filter(d => d.value > 0);
  }, [metrics]);

  const sectionData = useMemo(() => {
    const sections = {
      'Recently assigned': 0,
      'Do today': 0,
      'Do next week': 0,
      'Do later': 0
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    tasks.forEach(t => {
      if (!t.dueDate) {
        sections['Recently assigned']++;
        return;
      }
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === now.getTime()) {
        sections['Do today']++;
      } else if (dueDate > now && dueDate <= nextWeek) {
        sections['Do next week']++;
      } else if (dueDate > nextWeek) {
        sections['Do later']++;
      } else {
        sections['Recently assigned']++; // Overdue or past
      }
    });

    return Object.entries(sections).map(([name, count]) => ({
      name,
      count
    }));
  }, [tasks]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
            {user?.name?.[0] || 'M'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">My tasks</h1>
            <p className="text-sm text-surface-500">
              {viewMode === 'assignedToMe' 
                ? 'Your prioritized work assigned by your manager' 
                : 'Tasks you have delegated and assigned to others'}
            </p>
          </div>
        </div>

        {isManager && (
          <div className="flex bg-surface-100 p-1 rounded-lg shrink-0">
            <button 
              onClick={() => setViewMode('assignedToMe')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'assignedToMe' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
            >
              Assigned to Me
            </button>
            <button 
              onClick={() => setViewMode('assignedByMe')}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'assignedByMe' ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'}`}
            >
              Assigned by Me
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-surface-200 text-sm font-semibold">
        {['List', 'Board', 'Calendar', 'Dashboard', 'Files'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-900 text-primary-900'
                : 'border-transparent text-surface-500 hover:text-surface-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : activeTab === 'Dashboard' ? (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-600 mb-4">Total completed tasks</h3>
              <p className="text-4xl font-light text-surface-900">{metrics.completed}</p>
            </div>
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-600 mb-4">Total incomplete tasks</h3>
              <p className="text-4xl font-light text-surface-900">{metrics.incomplete}</p>
            </div>
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-600 mb-4">Total overdue tasks</h3>
              <p className="text-4xl font-light text-red-500">{metrics.overdue}</p>
            </div>
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-surface-600 mb-4">Total tasks</h3>
              <p className="text-4xl font-light text-surface-900">{metrics.total}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Bar Chart */}
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-surface-900 mb-6">Total tasks by section</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-surface-900 mb-6">Tasks by completion status</h3>
              <div className="h-64 flex items-center justify-center">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-surface-400 italic text-sm">No tasks assigned yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'List' ? (
        <div className="rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-50 font-semibold text-surface-500 border-b border-surface-200">
                <tr>
                  <th className="px-6 py-4">Task Name</th>
                  {viewMode === 'assignedByMe' && (
                    <th className="px-6 py-4 w-40">Assignee</th>
                  )}
                  <th className="px-6 py-4 w-40">Due Date</th>
                  <th className="px-6 py-4 w-40">Status</th>
                  <th className="px-6 py-4 w-48">Project</th>
                  <th className="px-6 py-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 bg-white">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={viewMode === 'assignedByMe' ? 5 : 4} className="px-6 py-12 text-center text-surface-400 italic">
                      {viewMode === 'assignedToMe' 
                        ? 'You have no assigned tasks. Enjoy your day!' 
                        : "You haven't assigned any tasks to others yet."}
                    </td>
                  </tr>
                ) : (
                  tasks.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => setActiveTaskId(t._id)}
                      className="group cursor-pointer hover:bg-surface-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-surface-900 group-hover:text-primary-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${t.status === 'Done' ? 'text-emerald-500' : 'text-surface-300'}`} />
                          <span className="truncate max-w-md">{t.title}</span>
                        </div>
                      </td>
                      {viewMode === 'assignedByMe' && (
                        <td className="px-6 py-4 text-surface-700 font-medium whitespace-nowrap">
                          {t.assignee?.name || 'Unassigned'}
                        </td>
                      )}
                      <td className="px-6 py-4 text-surface-600 whitespace-nowrap">
                        {t.dueDate ? (
                          <span className={new Date(t.dueDate) < new Date() && t.status !== 'Done' ? 'text-red-500 font-semibold' : ''}>
                            {formatDate(t.dueDate)}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.status === 'Done' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Completed
                          </span>
                        ) : t.status === 'Blocked' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                            Blocked
                          </span>
                        ) : t.status === 'In Progress' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-100 px-2.5 py-0.5 text-xs font-semibold text-surface-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-surface-500" />
                            To Do
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-surface-500 truncate max-w-[200px]">
                        {t.project?.name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {isManager && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this task?')) {
                                deleteTaskMutation.mutate(t._id);
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'Board' ? (
        <TaskBoard tasks={tasks} onTaskClick={setActiveTaskId} />
      ) : activeTab === 'Calendar' ? (
        <TaskCalendar tasks={tasks} onTaskClick={setActiveTaskId} />
      ) : activeTab === 'Files' ? (
        <TaskFiles tasks={tasks} onTaskClick={setActiveTaskId} />
      ) : null}

      {activeTaskId && (
        <TaskDetailModal taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
      )}
    </div>
  );
}
