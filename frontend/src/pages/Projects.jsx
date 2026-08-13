import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, userApi, deptApi, teamApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  FolderKanban, Plus, Clock, CheckCircle2, PauseCircle, XCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/helpers';

const STATUS_CONFIG = {
  Active: { icon: Clock, color: 'text-blue-600 bg-blue-100' },
  'On Hold': { icon: PauseCircle, color: 'text-amber-600 bg-amber-100' },
  Completed: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100' },
  Cancelled: { icon: XCircle, color: 'text-red-600 bg-red-100' },
};

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectApi.list({ status: statusFilter || undefined }),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete project'),
  });

  const projects = data?.data || [];

  const canCreate = ['Founder', 'Admin', 'Manager'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Projects</h1>
          <p className="mt-1 text-sm text-surface-500">{projects.length} project(s)</p>
        </div>
        {canCreate && (
          <button onClick={() => navigate('/projects/new')} className="btn-primary">
            <Plus className="h-4 w-4" />
            New Project
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {['', 'Active', 'On Hold', 'Completed', 'Cancelled'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}>{s || 'All'}</button>
        ))}
      </div>

      {/* Project grid */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-16">
          <FolderKanban className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-lg font-medium text-surface-500">No projects yet</p>
          <p className="mt-1 text-sm text-surface-400">
            {canCreate ? 'Click "New Project" to get started.' : 'Projects will appear here once created.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG['Active'];
            const Icon = cfg.icon;
            return (
              <div key={project._id} onClick={() => navigate(`/projects/${project._id}`)}
                className="card cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${cfg.color}`}><Icon className="h-5 w-5" /></div>
                    <div>
                      <h3 className="text-sm font-semibold text-surface-900 group-hover:text-primary-700 transition-colors">
                        {project.name}
                      </h3>
                      {project.department && <p className="text-xs text-surface-400">{project.department.name}</p>}
                    </div>
                  </div>
                  {canCreate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to delete this project?')) {
                          deleteProjectMutation.mutate(project._id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {project.description && (
                  <p className="mt-3 text-xs text-surface-500 line-clamp-2">{project.description.replace(/<[^>]*>?/gm, '')}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-surface-400">
                  <span>{project.manager?.name || 'No manager'}</span>
                  {project.endDate && <span>Due {formatDate(project.endDate)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
