import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, projectApi } from '../../api/api';
import { X, Plus, Calendar, Clock, Flag, FolderKanban, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuickAssignTaskModal({ assigneeUser, team, onClose }) {
  const queryClient = useQueryClient();

  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState('');

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'active'],
    queryFn: () => projectApi.list({ status: 'Active' }),
  });
  const projects = projectsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data) => taskApi.create(data.projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Task assigned to ${assigneeUser?.name || 'team member'}!`);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetProject = projectId || (projects.length > 0 ? projects[0]._id : null);
    if (!targetProject) {
      toast.error('Please select an active project workspace');
      return;
    }
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    createMutation.mutate({
      projectId: targetProject,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeIds: assigneeUser?._id ? [assigneeUser._id] : undefined,
      dueDate: dueDate || null,
      estimatedEffort: estimatedEffort ? parseFloat(estimatedEffort) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl space-y-5 animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-surface-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold">
              👤
            </div>
            <div>
              <h2 className="text-base font-extrabold text-surface-900">
                Assign Task to {assigneeUser?.name}
              </h2>
              <p className="text-xs text-surface-500">
                {team?.name ? `Team: ${team.name}` : `${assigneeUser?.role || 'Member'} Workload`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Workspace */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1">
              Project Workspace *
            </label>
            <div className="relative">
              <FolderKanban className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input-field pl-9 text-xs"
                required
              >
                <option value="">Select Project Workspace...</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement API endpoint for user authentication"
              className="input-field text-xs font-semibold"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1">
              Task Remarks / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed instructions or work log requirements..."
              rows={3}
              className="input-field text-xs resize-none"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input-field text-xs"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-1">
                Deadline / Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field text-xs"
              />
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex gap-2 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary flex-1 text-xs justify-center"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Assigning...</span>
              ) : (
                <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Assign Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
