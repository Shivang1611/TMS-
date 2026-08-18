import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, projectApi, userApi, teamApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Flag, User, Calendar, Loader2, Plus,
  AlignLeft, Clock, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NotionEditor = lazy(() => import('../components/editor/NotionEditor'));

const PRIORITY_CONFIG = {
  Low: { color: 'bg-slate-100 text-slate-700 border-slate-300' },
  Medium: { color: 'bg-blue-50 text-blue-700 border-blue-300' },
  High: { color: 'bg-amber-50 text-amber-700 border-amber-300' },
  Critical: { color: 'bg-red-50 text-red-700 border-red-300' },
};

export default function TaskCreate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const canCreate = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const location = useLocation();
  const { assigneeId = '', teamId = '', projectId = '' } = location.state || {};

  const [form, setForm] = useState({
    projectId: projectId || '', teamId: teamId || '', title: '', description: '', priority: 'Medium',
    assigneeIds: assigneeId ? [assigneeId] : [], dueDate: '', estimatedEffort: '', allowAssigneeToEdit: false,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectApi.list({ status: 'Active' }),
  });
  const projects = projectsData?.data || [];

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list(),
  });
  const teams = teamsData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({}),
  });
  const allUsers = usersData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => taskApi.create(data.projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast.success('Task created!');
      navigate('/tasks');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  useEffect(() => {
    if (!canCreate) navigate('/tasks');
  }, [canCreate, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.projectId || !form.title) {
      toast.error('Project and title are required');
      return;
    }
    createMutation.mutate({
      projectId: form.projectId,
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      assigneeIds: form.assigneeIds.length > 0 ? form.assigneeIds : undefined,
      dueDate: form.dueDate || null,
      estimatedEffort: form.estimatedEffort ? parseFloat(form.estimatedEffort) : undefined,
      allowAssigneeToEdit: form.allowAssigneeToEdit,
    });
  };

  if (!canCreate) return null;

  const selectedProject = projects.find((p) => p._id === form.projectId);

  // Available Teams for selected project (or all teams if no project selected)
  const availableTeams = selectedProject && selectedProject.teams && selectedProject.teams.length > 0
    ? selectedProject.teams
    : teams;

  // Selected Team object
  const selectedTeam = teams.find((t) => t._id === form.teamId);

  // Filter assignees based on selected Team
  const availableUsers = selectedTeam
    ? allUsers.filter((u) => {
        const isInTeam = u.teams?.some(t => t._id === selectedTeam._id || t === selectedTeam._id);
        const isTeamLead = selectedTeam.teamLeads?.some((tl) => tl._id === u._id || tl === u._id);
        return isInTeam || isTeamLead;
      })
    : allUsers;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Subtle back button */}
      <button
        onClick={() => navigate('/tasks')}
        className="group mb-4 inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to tasks
      </button>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_280px]">
        {/* ─── Main Content ───────────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          {/* Project selector — top bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Project</span>
            <select
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, teamId: '', assigneeIds: [] }))}
              className="flex-1 border-0 bg-transparent text-sm font-medium text-surface-700 focus:ring-0 cursor-pointer"
              required
            >
              <option value="" disabled>Select a project...</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
            {selectedProject && (
              <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-medium text-primary-600">
                {selectedProject.status}
              </span>
            )}
          </div>

          {/* Title — large, Notion-style */}
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Task title..."
            className="w-full border-0 bg-transparent text-2xl font-bold text-surface-900 placeholder-surface-300 focus:outline-none focus:ring-0"
            required
            autoFocus
          />
          <div className="h-px bg-surface-100" />

          {/* Description — rich text editor */}
          <div className="pt-2">
            <Suspense fallback={
              <div className="flex h-40 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            }>
              <NotionEditor
                content={form.description}
                onChange={(html) => setForm((f) => ({ ...f, description: html }))}
                placeholder="Type / for commands, or start writing..."
              />
            </Suspense>
          </div>
        </div>

        {/* ─── Sidebar — Metadata ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-200 bg-white p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
              <span className="flex items-center gap-1.5">
                <AlignLeft className="h-3.5 w-3.5" />
                Details
              </span>
            </h3>

            {/* Team Selection Mapping */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-surface-500">
                <Users className="h-3 w-3 text-amber-600" />
                Assigned Team
              </label>
              <select
                value={form.teamId}
                onChange={(e) => {
                  const teamId = e.target.value;
                  let newAssigneeIds = [];
                  if (teamId) {
                    const selectedTeam = availableTeams.find((t) => t._id === teamId);
                    if (selectedTeam) {
                      newAssigneeIds = availableUsers.filter((u) => {
                        const isInTeam = u.teams?.some(t => t._id === selectedTeam._id || t === selectedTeam._id);
                        const isTeamLead = selectedTeam.teamLeads?.some((tl) => tl._id === u._id || tl === u._id);
                        return (isInTeam || isTeamLead) && u.isActive !== false;
                      }).map(u => u._id);
                    }
                  }
                  setForm((f) => ({ ...f, teamId, assigneeIds: newAssigneeIds }));
                }}
                className="input-field text-sm"
              >
                <option value="">All Project Teams</option>
                {availableTeams.map((t) => (
                  <option key={t._id} value={t._id}>👥 {t.name}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-surface-100" />

            {/* Priority */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-surface-500">
                <Flag className="h-3 w-3" />
                Priority
              </label>
              <div className="flex flex-wrap gap-1">
                {['Low', 'Medium', 'High', 'Critical'].map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        form.priority === p
                          ? `${cfg.color} ring-1 ring-offset-1`
                          : 'border-surface-200 text-surface-400 hover:border-surface-300 hover:text-surface-600'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-surface-100" />

            {/* Assignee */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-surface-500">
                <User className="h-3 w-3" />
                Assignee
              </label>
              <div className="input-field text-sm max-h-[160px] overflow-y-auto space-y-1 p-2">
                {availableUsers.filter((u) => u.isActive !== false).map((u) => (
                  <label key={u._id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-surface-50 rounded text-surface-700">
                    <input
                      type="checkbox"
                      checked={form.assigneeIds.includes(u._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm(f => ({ ...f, assigneeIds: [...f.assigneeIds, u._id] }));
                        } else {
                          setForm(f => ({ ...f, assigneeIds: f.assigneeIds.filter(id => id !== u._id) }));
                        }
                      }}
                      className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="truncate">👤 {u.name} (⭐ {u.score || 0} | {u.role})</span>
                  </label>
                ))}
              </div>
              {form.assigneeIds.length > 0 && (
                <label className="mt-2 flex items-center gap-2 text-xs text-surface-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowAssigneeToEdit}
                    onChange={(e) => setForm(f => ({ ...f, allowAssigneeToEdit: e.target.checked }))}
                    className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                  Allow assignee to edit task details
                </label>
              )}
            </div>

            <div className="h-px bg-surface-100" />

            {/* Deadline / Due date */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-surface-500">
                <Calendar className="h-3 w-3" />
                Deadline / Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="input-field text-sm"
              />
            </div>

            <div className="h-px bg-surface-100" />

            {/* Estimated Effort */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-surface-500">
                <Clock className="h-3 w-3" />
                Estimated effort (hours)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 4"
                value={form.estimatedEffort}
                onChange={(e) => setForm((f) => ({ ...f, estimatedEffort: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary w-full justify-center"
            >
              {createMutation.isPending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><Plus className="h-4 w-4" /> Create Task</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/tasks')}
              className="btn-secondary w-full justify-center text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
