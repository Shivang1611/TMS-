import { useState, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, User, CheckCircle2, ListTodo, Settings, X, Loader2, Building2, Edit2, FileText, Upload, Trash2, Paperclip, ExternalLink } from 'lucide-react';
import { formatDate, statusConfig } from '../utils/helpers';
import toast from 'react-hot-toast';
import { useRef } from 'react';

import { projectApi, milestoneApi, userApi, deptApi, documentApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

const NotionEditor = lazy(() => import('../components/editor/NotionEditor'));

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    hideMilestones: false,
    hideTaskStats: false,
    hideTeamMembers: false,
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', description: '', departmentId: '', managerId: '',
    startDate: '', endDate: '', status: 'Active',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectApi.get(id),
  });

  const { data: milestonesData } = useQuery({
    queryKey: ['milestones', id],
    queryFn: () => milestoneApi.listByProject(id),
  });

  const { data: userData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({}),
    enabled: showEdit,
  });
  const users = userData?.data || [];

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: deptApi.list,
    enabled: showEdit,
  });
  const departments = deptData?.data || [];

  const { data: docsData } = useQuery({
    queryKey: ['documents', 'project', id],
    queryFn: () => documentApi.list({ projectId: id }),
    enabled: !!id,
  });
  const documents = docsData?.data || [];

  const fileInputRef = useRef(null);

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', id);
      return documentApi.upload(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'project', id] });
      toast.success('File uploaded!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => documentApi.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'project', id] });
      toast.success('File deleted');
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error('File size exceeds 25MB limit');
        return;
      }
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => projectApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setShowSettings(false);
      setShowEdit(false);
      toast.success('Project updated successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update project'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: () => projectApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
      navigate('/projects');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete project'),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const project = data?.data;
  if (!project) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-lg font-medium text-surface-500">Project not found</p>
        <button onClick={() => navigate('/projects')} className="btn-ghost mt-4">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </button>
      </div>
    );
  }

  const milestones = milestonesData?.data || [];
  const vs = project.visibilitySettings || {};
  const isEmployee = user?.role === 'Employee';
  const canEdit = ['Founder', 'Admin', 'Manager', 'Team Lead'].includes(user?.role);

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    updateSettingsMutation.mutate({ visibilitySettings: settingsForm });
  };

  const openSettings = () => {
    setSettingsForm({
      hideMilestones: vs.hideMilestones || false,
      hideTaskStats: vs.hideTaskStats || false,
      hideTeamMembers: vs.hideTeamMembers || false,
    });
    setShowSettings(true);
  };

  const openEdit = () => {
    setEditForm({
      name: project.name,
      description: project.description || '',
      departmentId: project.department?._id || '',
      managerId: project.manager?._id || '',
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      status: project.status,
    });
    setShowEdit(true);
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/projects')} className="btn-ghost -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </button>
        {canEdit && (
          <div className="flex gap-2">
            <button onClick={openEdit} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Edit2 className="h-4 w-4" /> Edit Project
            </button>
            <button onClick={openSettings} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Settings className="h-4 w-4" /> Edit Visibility
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
                  deleteProjectMutation.mutate();
                }
              }}
              disabled={deleteProjectMutation.isPending}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
            >
              {deleteProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Project
            </button>
          </div>
        )}
      </div>

      {/* Project header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">{project.name}</h1>
            {project.description && (
              <div 
                className="mt-4 rich-text" 
                dangerouslySetInnerHTML={{ __html: project.description }}
              />
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            project.status === 'Active' ? 'bg-blue-100 text-blue-700' :
            project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
            project.status === 'On Hold' ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {project.status}
          </span>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {!(isEmployee && vs.hideTeamMembers) && (
            <div className="rounded-xl border border-surface-200 p-4 bg-surface-50 flex flex-col gap-1.5 transition-colors hover:bg-surface-100/50">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Manager</span>
              <div className="flex items-center gap-2 font-semibold text-surface-900">
                <div className="p-1.5 rounded-md bg-primary-100 text-primary-600"><User className="h-4 w-4" /></div>
                {project.manager?.name || 'No manager'}
              </div>
            </div>
          )}
          {project.department && (
            <div className="rounded-xl border border-surface-200 p-4 bg-surface-50 flex flex-col gap-1.5 transition-colors hover:bg-surface-100/50">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Department</span>
              <div className="flex items-center gap-2 font-semibold text-surface-900">
                <div className="p-1.5 rounded-md bg-primary-100 text-primary-600"><Building2 className="h-4 w-4" /></div>
                {project.department.name}
              </div>
            </div>
          )}
          {project.startDate && (
            <div className="rounded-xl border border-surface-200 p-4 bg-surface-50 flex flex-col gap-1.5 transition-colors hover:bg-surface-100/50">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Timeline</span>
              <div className="flex items-center gap-2 font-semibold text-surface-900">
                <div className="p-1.5 rounded-md bg-primary-100 text-primary-600"><Calendar className="h-4 w-4" /></div>
                <span className="truncate">{formatDate(project.startDate)} — {formatDate(project.endDate)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Milestones */}
      {!(isEmployee && vs.hideMilestones) && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-surface-400" />
          <h2 className="text-lg font-semibold text-surface-900">Milestones ({milestones.length})</h2>
        </div>
        {milestones.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-8">No milestones defined yet</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-surface-200">
            <table className="w-full text-left text-sm text-surface-600">
              <thead className="bg-surface-50 text-surface-500 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 border-b border-surface-200">Milestone Name</th>
                  <th className="px-4 py-3 border-b border-surface-200">Due Date</th>
                  <th className="px-4 py-3 border-b border-surface-200">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 bg-white">
                {milestones.map((ms) => (
                  <tr key={ms._id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-surface-900 flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        ms.status === 'Completed' ? 'bg-emerald-100' : 'bg-surface-100'
                      }`}>
                        <CheckCircle2 className={`h-4 w-4 ${
                          ms.status === 'Completed' ? 'text-emerald-600' : 'text-surface-400'
                        }`} />
                      </div>
                      {ms.name}
                    </td>
                    <td className="px-4 py-3 font-medium">{ms.dueDate ? formatDate(ms.dueDate) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                        ms.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        ms.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        ms.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {ms.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Project Documents Section */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-900 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary-500" />
            Project Documents
          </h2>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-2"
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload File
            </button>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 bg-surface-50 rounded-xl border border-dashed border-surface-200">
            <p className="text-sm text-surface-500">No documents attached to this project.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div key={doc._id} className="flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    {doc.mimeType.includes('image') ? (
                      <img src={doc.url?.startsWith('http') ? doc.url : `https://del1.vultrobjects.com/caderainfotech-tms/${doc.url}`} alt={doc.originalName} className="h-6 w-6 object-cover rounded" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary-500" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-surface-900 truncate" title={doc.originalName}>
                      {doc.originalName}
                    </p>
                    <p className="text-xs text-surface-500">
                      {(doc.size / 1024).toFixed(1)} KB • {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={doc.url?.startsWith('http') ? doc.url : `https://del1.vultrobjects.com/caderainfotech-tms/${doc.url}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-surface-400 hover:text-primary-600 rounded-md hover:bg-white" title="View Document">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this document?')) {
                        deleteDocumentMutation.mutate(doc._id);
                      }
                    }}
                    className="p-1.5 text-surface-400 hover:text-red-600 rounded-md hover:bg-white"
                    title="Delete Document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task summary */}
      {project.taskStats && project.taskStats.length > 0 && !(isEmployee && vs.hideTaskStats) && (
        <div className="card">
          <h2 className="text-lg font-semibold text-surface-900 mb-4">Task Summary</h2>
          <div className="space-y-3">
            {project.taskStats.map((s) => {
              const cfg = statusConfig(s._id);
              return (
                <div key={s._id} className="flex items-center gap-3">
                  <span className={`w-24 text-sm ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-surface-100">
                      <div
                        className={`h-2 rounded-full ${cfg.color.replace('text-', 'bg-').replace('text-', 'bg-')}`}
                        style={{ width: `${(s.count / project.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-surface-600">{s.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visibility Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Visibility Settings</h2>
                <p className="text-sm text-surface-500">Employee view controls</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleUpdateSettings} className="space-y-4">
              {[
                { key: 'hideMilestones', label: 'Hide Milestones' },
                { key: 'hideTaskStats', label: 'Hide Task Statistics' },
                { key: 'hideTeamMembers', label: 'Hide Team Members' },
              ].map((setting) => (
                <label key={setting.key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-surface-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={settingsForm[setting.key]}
                    onChange={(e) => setSettingsForm(f => ({ ...f, [setting.key]: e.target.checked }))}
                    className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-surface-700">{setting.label}</span>
                </label>
              ))}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={updateSettingsMutation.isPending} className="btn-primary flex-1">
                  {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-10">
          <div className="w-full max-w-3xl rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in my-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Edit Project</h2>
                <p className="text-sm text-surface-500">Update project details and assignment.</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editForm.name || !editForm.managerId) {
                toast.error('Project name and manager are required');
                return;
              }
              updateSettingsMutation.mutate({
                name: editForm.name,
                description: editForm.description || undefined,
                departmentId: editForm.departmentId || null,
                managerId: editForm.managerId,
                startDate: editForm.startDate || null,
                endDate: editForm.endDate || null,
                status: editForm.status,
              });
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-surface-700">Project name *</label>
                <div className="relative mt-1">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input type="text" value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Q3 Product Launch" className="input-field pl-10" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                <Suspense fallback={<div className="h-64 flex items-center justify-center bg-surface-50 rounded-xl border border-surface-200"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>}>
                  <NotionEditor
                    content={editForm.description}
                    onChange={(content) => setEditForm(prev => ({ ...prev, description: content }))}
                  />
                </Suspense>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700">Start date</label>
                  <div className="relative mt-1">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <input type="date" value={editForm.startDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                      className="input-field pl-10" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700">End date</label>
                  <div className="relative mt-1">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <input type="date" value={editForm.endDate}
                      onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="input-field pl-10" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700">Manager *</label>
                  <div className="relative mt-1">
                    <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <select value={editForm.managerId}
                      onChange={(e) => setEditForm((f) => ({ ...f, managerId: e.target.value }))}
                      className="input-field pl-10 appearance-none" required>
                      <option value="">Select a manager...</option>
                      {users.filter((u) => ['Founder', 'Admin', 'Manager'].includes(u.role) && u.isActive)
                        .map((u) => (
                          <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700">Department</label>
                  <div className="relative mt-1">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <select value={editForm.departmentId}
                      onChange={(e) => setEditForm((f) => ({ ...f, departmentId: e.target.value }))}
                      className="input-field pl-10 appearance-none">
                      <option value="">No department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-surface-700">Status</label>
                  <select value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="input-field appearance-none mt-1">
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-surface-100">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={updateSettingsMutation.isPending} className="btn-primary flex-1">
                  {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
