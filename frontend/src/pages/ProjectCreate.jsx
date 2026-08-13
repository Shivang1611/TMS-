import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi, userApi, deptApi, teamApi, documentApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { Loader2, Calendar, Building2, User, FileText, ArrowLeft, Upload, X as XIcon, File as FileIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const NotionEditor = lazy(() => import('../components/editor/NotionEditor'));

export default function ProjectCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '', description: '', departmentId: '', managerId: '',
    startDate: '', endDate: '', selectedTeams: [], selectedMembers: [],
    visibilitySettings: {
      hideMilestones: false,
      hideTaskStats: false,
      hideTeamMembers: false,
    },
  });
  const [files, setFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({}),
  });
  const users = userData?.data || [];

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: deptApi.list,
  });
  const departments = deptData?.data || [];

  const { data: teamData } = useQuery({
    queryKey: ['teams'],
    queryFn: teamApi.list,
  });
  const teamsList = teamData?.data || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.managerId) {
      toast.error('Project name and manager are required');
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await projectApi.create({
        name: form.name,
        description: form.description || undefined,
        departmentId: form.departmentId || undefined,
        managerId: form.managerId,
        teams: form.selectedTeams,
        members: form.selectedMembers,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        visibilitySettings: form.visibilitySettings,
      });

      const newProjectId = res.data._id;

      if (files.length > 0) {
        toast.loading('Uploading files...', { id: 'project-upload' });
        await Promise.all(
          files.map(file => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', newProjectId);
            return documentApi.upload(formData);
          })
        );
        toast.dismiss('project-upload');
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      navigate('/projects');
    } catch (err) {
      toast.dismiss('project-upload');
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = ['Founder', 'Admin', 'Manager'].includes(user?.role);

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h2 className="text-xl font-bold text-surface-900">Access Denied</h2>
        <p className="mt-2 text-surface-500">You do not have permission to create projects.</p>
        <button onClick={() => navigate('/projects')} className="btn-primary mt-4">Go Back</button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Create New Project</h1>
          <p className="text-sm text-surface-500">Set up a new workspace and assign teams.</p>
        </div>
      </div>

      <div className="bg-transparent mt-8">
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-surface-700">Project name *</label>
            <div className="relative mt-1">
              <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input type="text" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Q3 Product Launch" className="input-field pl-10" required />
            </div>
          </div>

          <div className="pt-4 border-t border-surface-100">
            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>}>
              <NotionEditor
                content={form.description}
                onChange={(content) => setForm((f) => ({ ...f, description: content }))}
                placeholder="Write project description... Use '/' for commands"
              />
            </Suspense>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Start date</label>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700">End date</label>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input type="date" value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="input-field pl-10" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700">Manager *</label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <select value={form.managerId}
                  onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
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
                <select value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="input-field pl-10 appearance-none">
                  <option value="">No department (cross-org)</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assign Teams to Project */}
          <div className="pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">
              Assign Dedicated Teams
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto rounded-xl border border-surface-200 p-3 bg-surface-50/50">
              {teamsList.length === 0 ? (
                <p className="text-xs text-surface-400 italic col-span-2">No teams created yet.</p>
              ) : (
                teamsList.map((t) => {
                  const isSelected = form.selectedTeams.includes(t._id);
                  return (
                    <label
                      key={t._id}
                      className={`flex items-center gap-2 cursor-pointer rounded-lg p-2.5 text-sm font-semibold transition-all border ${
                        isSelected ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((f) => ({ ...f, selectedTeams: [...f.selectedTeams, t._id] }));
                          } else {
                            setForm((f) => ({ ...f, selectedTeams: f.selectedTeams.filter((id) => id !== t._id) }));
                          }
                        }}
                        className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="truncate">👥 {t.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Assign Individual Members to Project */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">
              Assign Direct Members
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto rounded-xl border border-surface-200 p-3 bg-surface-50/50">
              {users.length === 0 ? (
                <p className="text-xs text-surface-400 italic col-span-2">No active members.</p>
              ) : (
                users.map((u) => {
                  const isSelected = form.selectedMembers.includes(u._id);
                  return (
                    <label
                      key={u._id}
                      className={`flex items-center gap-2 cursor-pointer rounded-lg p-2.5 text-sm font-semibold transition-all border ${
                        isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((f) => ({ ...f, selectedMembers: [...f.selectedMembers, u._id] }));
                          } else {
                            setForm((f) => ({ ...f, selectedMembers: f.selectedMembers.filter((id) => id !== u._id) }));
                          }
                        }}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">👤 {u.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Project References (Files) */}
          <div className="pt-4 border-t border-surface-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">
              Project References (Images / PDFs)
            </label>
            <div className="rounded-xl border border-dashed border-surface-300 p-6 bg-surface-50/50 text-center relative hover:bg-surface-100 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
                  }
                  e.target.value = ''; // reset
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Upload reference files"
              />
              <Upload className="mx-auto h-8 w-8 text-surface-400 mb-2" />
              <p className="text-sm font-medium text-surface-700">Click or drag files here to upload</p>
              <p className="text-xs text-surface-500 mt-1">Supports Images and PDFs</p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-surface-200 bg-white">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileIcon className="h-4 w-4 text-primary-500 shrink-0" />
                      <span className="text-xs text-surface-700 truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="text-surface-400 hover:text-red-500 p-1 shrink-0"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Employee Visibility Settings */}
          <div className="pt-4 border-t border-surface-100">
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-500 mb-3">
              Employee Visibility Settings
            </label>
            <div className="space-y-3 rounded-xl border border-surface-200 p-4 bg-surface-50/50">
              {[
                { key: 'hideMilestones', label: 'Hide Milestones from Employees' },
                { key: 'hideTaskStats', label: 'Hide Task Statistics from Employees' },
                { key: 'hideTeamMembers', label: 'Hide Team Members from Employees' },
              ].map((setting) => (
                <label key={setting.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.visibilitySettings[setting.key]}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      visibilitySettings: { ...f.visibilitySettings, [setting.key]: e.target.checked }
                    }))}
                    className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-surface-700">{setting.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-surface-100">
            <button type="button" onClick={() => navigate('/projects')} className="btn-secondary flex-1 py-2.5" disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="btn-primary flex-1 py-2.5">
              {isCreating ? (
                <span className="flex items-center gap-2 justify-center"><Loader2 className="h-5 w-5 animate-spin" /> Creating & Uploading...</span>
              ) : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
