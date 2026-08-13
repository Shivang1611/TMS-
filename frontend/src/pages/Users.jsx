import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, deptApi, dashboardApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus, Ban, CheckCircle, Search,
  X, Mail, User, Shield, Building2, Loader2, Key, Eye, EyeOff, Trash2, Upload, KeyRound, Edit2,
  BarChart3, ChevronDown, ChevronRight,
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Users() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', password: '', role: 'Employee', departmentId: '' });

  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [showBulkPassword, setShowBulkPassword] = useState(false);
  const [bulkForm, setBulkForm] = useState({ emailsText: '', role: 'Employee', password: '', departmentId: '' });
  const [bulkResults, setBulkResults] = useState(null);

  const [editUser, setEditUser] = useState(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editForm, setEditForm] = useState({ role: 'Employee', departmentId: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => userApi.list({ search: search || undefined, role: roleFilter || undefined }),
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: deptApi.list,
    enabled: showInvite || showBulkInvite || showEditUser,
  });
  const departments = deptData?.data || [];

  const deactivateMutation = useMutation({
    mutationFn: (id) => userApi.deactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User deactivated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id) => userApi.reactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('User reactivated'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User permanently removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete user'),
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordInput, setShowResetPasswordInput] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }) => userApi.resetPassword(id, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowResetPassword(false);
      setResetPasswordUser(null);
      setResetPasswordValue('');
      toast.success('Password reset successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to reset password'),
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => userApi.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowInvite(false);
      setInviteForm({ email: '', name: '', password: '', role: 'Employee', departmentId: '' });
      toast.success('User created!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create user'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => userApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowEditUser(false);
      setEditUser(null);
      toast.success('User updated successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update user'),
  });

  const bulkInviteMutation = useMutation({
    mutationFn: (data) => userApi.bulkInvite(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setBulkResults(res.data);
      if (res.data.created > 0) toast.success(`${res.data.created} user(s) created`);
      if (res.data.failed > 0) toast.error(`${res.data.failed} invite(s) failed`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to bulk invite'),
  });

  const users = data?.data || [];

  /* ── Workload Overview ─────────────────────────────────────────── */
  const [showWorkload, setShowWorkload] = useState(false);
  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['workload'],
    queryFn: () => dashboardApi.workload(),
    enabled: showWorkload,
  });
  const workload = workloadData?.data || [];

  const STATUS_COLORS = {
    'To Do': 'bg-slate-400',
    'In Progress': 'bg-blue-400',
    'In Review': 'bg-amber-400',
    'Done': 'bg-emerald-400',
    'Blocked': 'bg-red-400',
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Email and name are required');
      return;
    }
    if (inviteForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    inviteMutation.mutate({
      email: inviteForm.email,
      name: inviteForm.name,
      password: inviteForm.password,
      role: inviteForm.role,
      departmentId: inviteForm.departmentId || undefined,
      teamIds: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Users</h1>
          <p className="mt-1 text-sm text-surface-500">{users.length} user(s) in your organization</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkInvite(true)} className="btn-secondary">
            <Upload className="h-4 w-4" />
            Bulk Invite
          </button>
          <button onClick={() => setShowInvite(true)} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..." className="input-field h-9 pl-9 text-sm" />
        </div>
        <div className="flex gap-1.5">
          {['', 'Admin', 'Manager', 'Team Lead', 'Employee'].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r === roleFilter ? '' : r)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                roleFilter === r ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}>{r || 'All'}</button>
          ))}
        </div>
      </div>

      {/* Users table */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-surface-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-surface-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-surface-900">{u.name}</p>
                        <p className="text-xs text-surface-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.role === 'Founder' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'Admin' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'Manager' ? 'bg-amber-100 text-amber-700' :
                      u.role === 'Team Lead' ? 'bg-cyan-100 text-cyan-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-surface-600">{u.department?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs ${u.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {u.isActive ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'Founder' && u._id !== currentUser?._id && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({ role: u.role, departmentId: u.department?._id || '' });
                            setShowEditUser(true);
                          }}
                          className="btn-ghost p-1 text-surface-400 hover:text-primary-500"
                          title="Edit user"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => u.isActive ? deactivateMutation.mutate(u._id) : reactivateMutation.mutate(u._id)}
                          className={`btn-ghost text-xs ${u.isActive ? 'text-red-500 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-600'}`}
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => {
                            setResetPasswordUser(u);
                            setResetPasswordValue('');
                            setShowResetPassword(true);
                          }}
                          className="btn-ghost p-1 text-amber-500 hover:text-amber-600"
                          title="Reset password"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(u)}
                          className="btn-ghost p-1 text-surface-400 hover:text-red-500"
                          title="Delete user"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {u._id === currentUser?._id && <span className="text-xs text-surface-400 italic">You</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-900">Delete user</h3>
                <p className="text-xs text-surface-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-4">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email})?
              All access will be revoked immediately and the email will be freed for re-use.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1 text-sm">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteConfirm._id);
                  setDeleteConfirm(null);
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Invite Modal */}
      {showBulkInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { if (!bulkResults) setShowBulkInvite(false); }}>
          <div className="w-full max-w-lg rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">
                  {bulkResults ? 'Invite Results' : 'Bulk Invite Users'}
                </h2>
                <p className="mt-0.5 text-sm text-surface-500">
                  {bulkResults ? `${bulkResults.created} created, ${bulkResults.failed} failed` : 'Invite multiple users at once'}
                </p>
              </div>
              <button onClick={() => { setShowBulkInvite(false); setBulkResults(null); setBulkForm({ emailsText: '', role: 'Employee', password: '', departmentId: '' }); }} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            {bulkResults ? (
              /* Results Summary */
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{bulkResults.created}</p>
                    <p className="text-xs font-medium text-emerald-700">Created</p>
                  </div>
                  <div className={`rounded-xl border p-4 text-center ${bulkResults.failed > 0 ? 'border-red-200 bg-red-50' : 'border-surface-200 bg-surface-50'}`}>
                    <p className={`text-2xl font-bold ${bulkResults.failed > 0 ? 'text-red-600' : 'text-surface-500'}`}>{bulkResults.failed}</p>
                    <p className={`text-xs font-medium ${bulkResults.failed > 0 ? 'text-red-700' : 'text-surface-500'}`}>Failed</p>
                  </div>
                </div>

                {/* Created users list */}
                {bulkResults.users?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-500">Created Users</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {bulkResults.users.map((u) => (
                        <div key={u.id} className="flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                          <span className="text-sm text-surface-700">{u.name}</span>
                          <span className="text-xs text-surface-400">{u.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors list */}
                {bulkResults.errors?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Errors</p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {bulkResults.errors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                          <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
                          <div>
                            <p className="text-sm font-medium text-red-700">{err.email}</p>
                            <p className="text-xs text-red-500">{err.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => { setShowBulkInvite(false); setBulkResults(null); setBulkForm({ emailsText: '', role: 'Employee', password: '', departmentId: '' }); }}
                  className="btn-primary w-full"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Bulk Invite Form */
              <form onSubmit={(e) => {
                e.preventDefault();
                // Parse emails from textarea: split by newline, comma, or semicolon
                const rawEmails = bulkForm.emailsText
                  .split(/[\n,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);

                if (rawEmails.length === 0) {
                  toast.error('Please enter at least one email address');
                  return;
                }

                if (rawEmails.length > 100) {
                  toast.error('Maximum 100 users per batch');
                  return;
                }

                if (bulkForm.password.length < 8) {
                  toast.error('Password must be at least 8 characters');
                  return;
                }

                bulkInviteMutation.mutate({
                  emails: rawEmails,
                  role: bulkForm.role,
                  password: bulkForm.password,
                  departmentId: bulkForm.departmentId || undefined,
                  teamIds: [],
                });
              }} className="space-y-4">
                {/* Emails textarea */}
                <div>
                  <label className="block text-sm font-medium text-surface-700">
                    Email addresses
                    <span className="ml-1 text-xs font-normal text-surface-400">(one per line or comma-separated)</span>
                  </label>
                  <textarea
                    value={bulkForm.emailsText}
                    onChange={(e) => setBulkForm((f) => ({ ...f, emailsText: e.target.value }))}
                    placeholder={`user1@company.com\nuser2@company.com\nuser3@company.com`}
                    rows={6}
                    className="input-field mt-1 resize-none font-mono text-sm"
                    required
                  />
                  {bulkForm.emailsText && (
                    <p className="mt-1 text-xs text-surface-400">
                      {bulkForm.emailsText.split(/[\n,;]+/).filter(Boolean).length} email(s) detected
                    </p>
                  )}
                </div>

                {/* Common password */}
                <div>
                  <label className="block text-sm font-medium text-surface-700">
                    Common password
                    <span className="ml-1 text-xs font-normal text-surface-400">(all users will share this)</span>
                  </label>
                  <div className="relative mt-1">
                    <Key className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <input
                      type={showBulkPassword ? 'text' : 'password'}
                      value={bulkForm.password}
                      onChange={(e) => setBulkForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="input-field pl-10 pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowBulkPassword(!showBulkPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                    >
                      {showBulkPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {bulkForm.password && bulkForm.password.length < 8 && (
                    <p className="mt-1 text-xs text-red-500">Must be at least 8 characters</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-surface-700">Role</label>
                  <div className="relative mt-1">
                    <Shield className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <select value={bulkForm.role}
                      onChange={(e) => setBulkForm((f) => ({ ...f, role: e.target.value }))}
                      className="input-field pl-10 appearance-none">
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Team Lead">Team Lead</option>
                      <option value="Employee">Employee</option>
                    </select>
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-surface-700">Department</label>
                  <div className="relative mt-1">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                    <select value={bulkForm.departmentId}
                      onChange={(e) => setBulkForm((f) => ({ ...f, departmentId: e.target.value }))}
                      className="input-field pl-10 appearance-none">
                      <option value="">No department</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowBulkInvite(false); setBulkForm({ emailsText: '', role: 'Employee', password: '', departmentId: '' }); }} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={bulkInviteMutation.isPending || bulkForm.password.length < 8} className="btn-primary flex-1">
                    {bulkInviteMutation.isPending ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Upload className="h-4 w-4" /> Invite All</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPassword && resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => { setShowResetPassword(false); setResetPasswordUser(null); setResetPasswordValue(''); }}>
          <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-surface-900">Reset Password</h3>
                  <p className="text-xs text-surface-500">{resetPasswordUser.name}</p>
                </div>
              </div>
              <button onClick={() => { setShowResetPassword(false); setResetPasswordUser(null); setResetPasswordValue(''); }} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-surface-600">
              Set a new password for <strong>{resetPasswordUser.name}</strong> ({resetPasswordUser.email}).
              They will need to use this password on their next login.
            </p>

            <div>
              <label className="block text-sm font-medium text-surface-700">New password</label>
              <div className="relative mt-1">
                <Key className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type={showResetPasswordInput ? 'text' : 'password'}
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="input-field pl-10 pr-9"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowResetPasswordInput(!showResetPasswordInput)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showResetPasswordInput ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {resetPasswordValue && resetPasswordValue.length < 8 && (
                <p className="mt-1 text-xs text-red-500">Must be at least 8 characters</p>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => { setShowResetPassword(false); setResetPasswordUser(null); setResetPasswordValue(''); }}
                className="btn-secondary flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!resetPasswordValue || resetPasswordValue.length < 8) {
                    toast.error('Password must be at least 8 characters');
                    return;
                  }
                  resetPasswordMutation.mutate({
                    id: resetPasswordUser._id,
                    newPassword: resetPasswordValue,
                  });
                }}
                disabled={resetPasswordMutation.isPending || resetPasswordValue.length < 8}
                className="flex-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {resetPasswordMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</span>
                ) : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-surface-900">Edit User</h2>
                <p className="text-sm text-surface-500">{editUser.name}</p>
              </div>
              <button onClick={() => setShowEditUser(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateUserMutation.mutate({
                id: editUser._id,
                data: {
                  role: editForm.role,
                  departmentId: editForm.departmentId || null,
                }
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700">Role</label>
                <div className="relative mt-1">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <select value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="input-field pl-10 appearance-none">
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Employee">Employee</option>
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

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditUser(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={updateUserMutation.isPending} className="btn-primary flex-1">
                  {updateUserMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Workload Overview ─────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
        <button
          onClick={() => setShowWorkload(!showWorkload)}
          className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface-50 transition-colors"
        >
          {showWorkload ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
          <BarChart3 className="h-5 w-5 text-primary-500" />
          <div className="text-left min-w-0 flex-1">
            <p className="text-sm font-medium text-surface-900">Workload Overview</p>
            <p className="text-xs text-surface-400">Task counts per member</p>
          </div>
          {workload.length > 0 && (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600">
              {workload.filter((w) => w.totalTasks > 0).length} busy
            </span>
          )}
        </button>

        {showWorkload && (
          <div className="border-t border-surface-100 px-4 py-4">
            {workloadLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : workload.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">No tasks found across the organization</p>
            ) : (
              <div className="space-y-3">
                {workload.map((w) => {
                  const maxTasks = Math.max(...workload.map((x) => x.totalTasks), 1);
                  const barWidth = (w.totalTasks / maxTasks) * 100;
                  const doneCount = w.tasksByStatus.find((s) => s.status === 'Done')?.count || 0;
                  const overdueCount = 0; // Could fetch separately
                  return (
                    <div key={w.user._id} className="group flex items-center gap-3">
                      {/* Avatar + Name */}
                      <div className="flex w-44 items-center gap-2 shrink-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-[9px] font-semibold text-primary-700">
                          {getInitials(w.user.name)}
                        </div>
                        <span className="truncate text-sm text-surface-700 group-hover:text-surface-900 transition-colors">
                          {w.user.name}
                        </span>
                      </div>

                      {/* Bar chart */}
                      <div className="flex-1 min-w-0">
                        <div className="flex h-5 items-center gap-1.5">
                          <div className="flex-1 h-3 rounded-full bg-surface-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs font-semibold text-surface-600">
                            {w.totalTasks}
                          </span>
                        </div>
                        {/* Status breakdown dots */}
                        {w.tasksByStatus.length > 0 && (
                          <div className="flex items-center gap-2 mt-0.5">
                            {['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map((s) => {
                              const count = w.tasksByStatus.find((x) => x.status === s)?.count || 0;
                              if (count === 0) return null;
                              return (
                                <span key={s} className="inline-flex items-center gap-1 text-[10px] text-surface-400">
                                  <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s]}`} />
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Done count badge */}
                      {doneCount > 0 && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                          {doneCount} done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-xl animate-slide-in">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900">Invite User</h2>
              <button onClick={() => setShowInvite(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700">Email</label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input type="email" value={inviteForm.email}
                    onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="newuser@company.com" className="input-field pl-10" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700">Full name</label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input type="text" value={inviteForm.name}
                    onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Smith" className="input-field pl-10" required />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-surface-700">Password</label>
                <div className="relative mt-1">
                  <Key className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <input
                    type={showInvitePassword ? 'text' : 'password'}
                    value={inviteForm.password}
                    onChange={(e) => setInviteForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="input-field pl-10 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowInvitePassword(!showInvitePassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                  >
                    {showInvitePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {inviteForm.password && inviteForm.password.length < 8 && (
                  <p className="mt-1 text-xs text-red-500">Must be at least 8 characters</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700">Role</label>
                <div className="relative mt-1">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <select value={inviteForm.role}
                    onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                    className="input-field pl-10 appearance-none">
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Employee">Employee</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700">Department</label>
                <div className="relative mt-1">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <select value={inviteForm.departmentId}
                    onChange={(e) => setInviteForm((f) => ({ ...f, departmentId: e.target.value }))}
                    className="input-field pl-10 appearance-none">
                    <option value="">No department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={inviteMutation.isPending || inviteForm.password.length < 8} className="btn-primary flex-1">
                  {inviteMutation.isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                  ) : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
