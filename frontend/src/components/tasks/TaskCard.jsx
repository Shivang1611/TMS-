import { useNavigate } from 'react-router-dom';
import { formatDate, getInitials, priorityConfig, statusConfig } from '../../utils/helpers';
import { MessageSquare, Paperclip, GitBranch, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function TaskCard({ task }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const priority = priorityConfig(task.priority);
  const status = statusConfig(task.status);
  
  const isManager = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete task'),
  });

  return (
    <div
      onClick={() => navigate(`/tasks/${task._id}`)}
      className="group cursor-pointer rounded-xl border border-surface-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-primary-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${priority.color} bg-opacity-10`}>
              {priority.label}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-medium text-surface-900 group-hover:text-primary-700 transition-colors pr-6">
            {task.title}
          </h3>
          {task.project && (
            <p className="mt-0.5 text-xs text-surface-400">{task.project.name}</p>
          )}
        </div>
        {isManager && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this task?')) {
                deleteTaskMutation.mutate(task._id);
              }
            }}
            className="text-surface-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-2"
            title="Delete Task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex items-center -space-x-1.5" title={task.assignees.map(a => a.name).join(', ')}>
            {task.assignees.slice(0, 3).map((assignee, idx) => (
              <div 
                key={assignee._id}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 border border-white text-[10px] font-semibold text-primary-700"
                style={{ zIndex: 10 - idx }}
              >
                {getInitials(assignee.name)}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-100 border border-white text-[10px] font-semibold text-surface-600 z-0">
                +{task.assignees.length - 3}
              </div>
            )}
            <span className="ml-2 text-xs text-surface-500 truncate max-w-[80px]">
              {task.assignees.length === 1 ? task.assignees[0].name : `${task.assignees.length} assigned`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-surface-400 italic">Unassigned</span>
        )}

        {/* Due date */}
        {task.dueDate && (
          <span className={`ml-auto text-xs ${
            new Date(task.dueDate) < new Date() && task.status !== 'Done'
              ? 'text-red-500 font-medium'
              : 'text-surface-400'
          }`}>
            {formatDate(task.dueDate)}
          </span>
        )}

        {/* Subtask count */}
        {task.subtaskCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-surface-400">
            <GitBranch className="h-3 w-3" />
            {task.subtaskCount}
          </span>
        )}
      </div>
    </div>
  );
}
