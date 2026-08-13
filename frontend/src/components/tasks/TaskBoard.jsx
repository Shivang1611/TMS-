import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, GripVertical, Trash2 } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'];

const STATUS_COLORS = {
  'To Do': 'bg-surface-100 text-surface-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-amber-100 text-amber-700',
  'Done': 'bg-emerald-100 text-emerald-700',
  'Blocked': 'bg-red-100 text-red-700',
};

export default function TaskBoard({ tasks, onTaskClick }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localTasks, setLocalTasks] = useState(tasks);
  
  const isManager = user?.role === 'Founder' || user?.role === 'Manager' || user?.role === 'Team Leader';

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taskApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update task status');
      // Revert optimistic update
      setLocalTasks(tasks);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => taskApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete task'),
  });

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-surface-100');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-surface-100');
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-surface-100');
    
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    if (targetStatus === 'Done' && !isManager) {
      toast.error('Only Managers or Team Leaders can mark a task as Done.');
      return;
    }

    const task = localTasks.find(t => t._id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic UI update
    setLocalTasks(prev => 
      prev.map(t => t._id === taskId ? { ...t, status: targetStatus } : t)
    );

    // If moving to Blocked, we need a reason (based on BR-02), but for drag and drop, 
    // we might just pass a default reason or prompt. Let's just pass a default reason for now.
    const updateData = { status: targetStatus };
    if (targetStatus === 'Blocked') {
      updateData.blockedReason = 'Moved to blocked via board';
    }

    updateMutation.mutate({ id: taskId, data: updateData });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {COLUMNS.map(col => {
        const columnTasks = localTasks.filter(t => t.status === col);
        
        return (
          <div 
            key={col} 
            className="flex-shrink-0 w-80 flex flex-col bg-surface-50/50 rounded-2xl border border-surface-200"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${STATUS_COLORS[col]}`}>
                  {col}
                </span>
                <span className="text-surface-500 text-sm font-medium">{columnTasks.length}</span>
              </div>
            </div>
            
            <div className="p-3 flex flex-col gap-3 flex-1 overflow-y-auto">
              {columnTasks.map(task => (
                <div 
                  key={task._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task._id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onTaskClick(task._id)}
                  className="bg-white p-4 rounded-xl border border-surface-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-2 pr-2">
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2 -mt-2 bg-white rounded-lg shadow-sm border border-surface-100 absolute top-2 right-2">
                      {isManager && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this task?')) {
                              deleteTaskMutation.mutate(task._id);
                            }
                          }}
                          className="text-surface-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="cursor-grab active:cursor-grabbing text-surface-300 hover:text-surface-500 p-1">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                  
                  {task.project?.name && (
                    <p className="text-xs text-surface-500 mb-3 truncate">
                      {task.project.name}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-surface-100">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      task.priority === 'High' || task.priority === 'Critical' ? 'bg-red-50 text-red-600' :
                      task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-surface-100 text-surface-600'
                    }`}>
                      {task.priority}
                    </span>
                    
                    {task.dueDate && (
                      <div className={`flex items-center gap-1.5 text-xs ${
                        new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'text-red-500 font-semibold' : 'text-surface-500'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(task.dueDate)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {columnTasks.length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-surface-200 rounded-xl p-6 text-surface-400 text-sm text-center">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
