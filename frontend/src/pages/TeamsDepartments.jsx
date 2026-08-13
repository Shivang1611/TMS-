import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deptApi, teamApi, userApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Users, ChevronDown, ChevronRight, Plus, X,
  UserPlus, UserMinus, Shield, Loader2, Trash2, Edit3
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function TeamsDepartments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedDept, setExpandedDept] = useState(null);
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [teamForm, setTeamForm] = useState({ name: '', description: '', departmentId: '', teamLeads: [] });
  const [showAddMember, setShowAddMember] = useState(null);

  const isAdmin = ['Founder', 'Admin'].includes(user?.role);

  const { data: deptData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: deptApi.list,
  });
  const departments = deptData?.data || [];

  const { data: teamData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamApi.list(),
  });
  const allTeams = teamData?.data || [];

  const { data: userData } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list({}),
  });
  const allUsers = userData?.data || [];

  const createDeptMutation = useMutation({
    mutationFn: (data) => deptApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowCreateDept(false);
      setDeptForm({ name: '', description: '' });
      toast.success('Department created');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const createTeamMutation = useMutation({
    mutationFn: (data) => teamApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateTeam(null);
      setTeamForm({ name: '', description: '', departmentId: '', teamLeads: [] });
      toast.success('Team created successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create team'),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id) => deptApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Department deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete department'),
  });

  const handleCreateDept = (e) => {
    e.preventDefault();
    if (!deptForm.name) { toast.error('Department name is required'); return; }
    createDeptMutation.mutate(deptForm);
  };

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!teamForm.name) { toast.error('Team name is required'); return; }
    const targetDeptId = teamForm.departmentId || showCreateTeam;
    if (!targetDeptId) { toast.error('Department is required'); return; }
    createTeamMutation.mutate({
      name: teamForm.name,
      description: teamForm.description || undefined,
      departmentId: targetDeptId,
      teamLeads: teamForm.teamLeads,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Organization Structure</h1>
          <p className="mt-1 text-sm text-surface-500">{departments.length} department(s) • {allTeams.length} team(s)</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreateDept(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add Department
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-surface-300 bg-white py-16">
          <Building2 className="mb-3 h-12 w-12 text-surface-300" />
          <p className="text-lg font-medium text-surface-500">No departments yet</p>
          <p className="mt-1 text-sm text-surface-400">Create your first department to organize your teams.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {departments.map((dept) => {
            const isOpen = expandedDept === dept._id;
            const deptUsers = allUsers.filter((u) => u.department?._id === dept._id || u.department === dept._id);
            const deptTeams = allTeams.filter((t) => (t.department?._id || t.department) === dept._id) || dept.teams || [];

            return (
              <div key={dept._id} className="rounded-xl border border-surface-200 bg-white overflow-hidden shadow-2xs">
                {/* Department header */}
                <button onClick={() => setExpandedDept(isOpen ? null : dept._id)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-surface-50 transition-colors">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100">
                    <Building2 className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <p className="text-sm font-bold text-surface-900">{dept.name}</p>
                    <p className="text-xs text-surface-400 font-medium">
                      {deptTeams.length} team(s) · {deptUsers.length} department member(s)
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete the ${dept.name} department? This will delete all its teams.`)) {
                          deleteDeptMutation.mutate(dept._id);
                        }
                      }}
                      disabled={deleteDeptMutation.isPending}
                      className="p-2 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete department"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-surface-100 px-4 py-3 space-y-3">
                    {/* Team list */}
                    {deptTeams.length === 0 ? (
                      <p className="text-sm text-surface-400 text-center py-4 italic">No teams created in this department yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {deptTeams.map((team) => (
                          <TeamRow key={team._id || team} teamId={team._id || team} initialTeam={typeof team === 'object' ? team : null} allUsers={allUsers} isAdmin={isAdmin} queryClient={queryClient} />
                        ))}
                      </div>
                    )}

                    {/* Add Team button */}
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setTeamForm({ name: '', description: '', departmentId: dept._id, teamLeads: [] });
                          setShowCreateTeam(dept._id);
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-surface-300 px-4 py-3 text-sm text-surface-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-colors font-semibold"
                      >
                        <Plus className="h-4 w-4" />
                        Create Team in {dept.name}
                      </button>
                    )}

                    {/* Members in department */}
                    {deptUsers.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">Department Members</p>
                        <div className="flex flex-wrap gap-2">
                          {deptUsers.map((u) => (
                            <div key={u._id} className="flex items-center gap-2 rounded-full bg-surface-100 px-3 py-1.5 border border-surface-200">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[8px] font-bold text-primary-700">
                                {getInitials(u.name)}
                              </div>
                              <span className="text-xs font-medium text-surface-700">{u.name}</span>
                              <span className="text-[10px] font-semibold text-surface-400">{u.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateDept(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900">New Department</h2>
              <button onClick={() => setShowCreateDept(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateDept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700">Name</label>
                <input type="text" value={deptForm.name}
                  onChange={(e) => setDeptForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Engineering" className="input-field mt-1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700">Description</label>
                <textarea value={deptForm.description}
                  onChange={(e) => setDeptForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description" rows={2} className="input-field mt-1 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateDept(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowCreateTeam(null); setTeamForm({ name: '', description: '', departmentId: '', teamLeads: [] }); }}>
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-lg font-extrabold text-surface-900">New Team</h2>
              <button onClick={() => { setShowCreateTeam(null); setTeamForm({ name: '', description: '', departmentId: '', teamLeads: [] }); }} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1">Team Name *</label>
                <input type="text" value={teamForm.name}
                  onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Frontend team" className="input-field text-xs font-semibold" required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1">Description</label>
                <textarea value={teamForm.description}
                  onChange={(e) => setTeamForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..." rows={2} className="input-field text-xs resize-none" />
              </div>

              {/* Team Leads Selection List */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                  Select Team Leads
                </label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-200 p-2 space-y-1.5 bg-surface-50/50">
                  {allUsers.filter((u) => u.isActive !== false).map((u) => {
                    const isSelected = teamForm.teamLeads.includes(u._id);
                    return (
                      <label
                        key={u._id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                          isSelected ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeamForm((f) => ({ ...f, teamLeads: [...f.teamLeads, u._id] }));
                              } else {
                                setTeamForm((f) => ({ ...f, teamLeads: f.teamLeads.filter((id) => id !== u._id) }));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>{u.name} ({u.role})</span>
                        </div>
                        {isSelected && <Shield className="h-3.5 w-3.5 text-amber-700" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateTeam(null); setTeamForm({ name: '', description: '', departmentId: '', teamLeads: [] }); }} className="btn-secondary flex-1 text-xs">Cancel</button>
                <button type="submit" disabled={createTeamMutation.isPending} className="btn-primary flex-1 text-xs justify-center">
                  {createTeamMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating...</span>
                  ) : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Row Sub-Component ────────────────────────────────────────────────

function TeamRow({ teamId, initialTeam, allUsers, isAdmin, queryClient }) {
  const { data: teamData } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamApi.get(teamId),
    initialData: initialTeam ? { success: true, data: initialTeam } : undefined,
  });
  const team = teamData?.data || initialTeam;
  const [showAdd, setShowAdd] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', teamLeads: [] });

  if (!team) return null;

  const members = (team.members || []).filter((m) => m._id);
  const nonMembers = allUsers.filter(
    (u) => !members.some((m) => m._id === u._id) && u.isActive
  );

  const addMemberMutation = useMutation({
    mutationFn: (userId) => {
      return import('../api/client').then((mod) =>
        mod.default.post(`/teams/${teamId}/members`, { userIds: [userId] })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false);
      setSelectedUser('');
      toast.success('Member added');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => teamApi.removeMember(teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove member'),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: () => teamApi.delete(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Team deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete team'),
  });

  const updateTeamMutation = useMutation({
    mutationFn: (data) => teamApi.update(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setShowEdit(false);
      toast.success('Team updated successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update team'),
  });

  const handleUpdateTeam = (e) => {
    e.preventDefault();
    if (!editForm.name) { toast.error('Team name is required'); return; }
    updateTeamMutation.mutate({
      name: editForm.name,
      description: editForm.description || undefined,
      teamLeads: editForm.teamLeads,
    });
  };

  return (
    <div className="rounded-lg border border-surface-200 bg-white overflow-hidden">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-surface-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown className="h-4 w-4 text-surface-400" /> : <ChevronRight className="h-4 w-4 text-surface-400" />}
          <Users className="h-4 w-4 text-surface-400" />
          <span className="text-sm font-bold text-surface-900">{team.name}</span>
          <span className="text-xs text-surface-400 font-medium">({members.length} member(s))</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAdd(!showAdd);
                setIsExpanded(true);
              }} 
              className="btn-ghost p-1.5 text-xs text-surface-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Add member"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditForm({
                  name: team.name,
                  description: team.description || '',
                  teamLeads: team.teamLeads?.map(tl => tl._id || tl) || []
                });
                setShowEdit(true);
              }} 
              className="btn-ghost p-1.5 text-xs text-surface-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Edit team"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete the team '${team.name}'?`)) {
                  deleteTeamMutation.mutate();
                }
              }}
              disabled={deleteTeamMutation.isPending}
              className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete team"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-surface-100">
          {/* Members List (Vertical) */}
          <div className="mt-3 flex flex-col gap-2">
            {members.map((m) => {
              const isLead = team.teamLeads?.some((tl) => (tl._id || tl) === m._id);
              return (
                <div key={m._id} className="flex items-center justify-between rounded-lg bg-surface-50 border border-surface-100 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[9px] font-semibold text-primary-700">
                      {getInitials(m.name)}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-medium text-surface-700">
                        {m.name}
                      </span>
                      <span className="text-[10px] font-medium text-surface-400">
                        {m.role} {isLead && ' • Team Lead'}
                      </span>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove ${m.name} from this team?`)) {
                          removeMemberMutation.mutate(m._id);
                        }
                      }}
                      disabled={removeMemberMutation.isPending}
                      className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-md disabled:opacity-30 transition-colors"
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member dropdown */}
          {showAdd && (
            <div className="mt-2 flex gap-2">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}
                className="input-field h-8 text-xs flex-1">
                <option value="">Select user...</option>
                {nonMembers.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                ))}
              </select>
              <button onClick={() => { if (selectedUser) addMemberMutation.mutate(selectedUser); }}
                disabled={!selectedUser} className="btn-primary h-8 text-xs px-3">Add</button>
            </div>
          )}
        </div>
      )}

      {/* Edit Team Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-lg font-extrabold text-surface-900">Edit Team</h2>
              <button onClick={() => setShowEdit(false)} className="btn-ghost p-1"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1">Team Name *</label>
                <input type="text" value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Frontend team" className="input-field text-xs font-semibold" required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1">Description</label>
                <textarea value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description..." rows={2} className="input-field text-xs resize-none" />
              </div>

              {/* Team Leads Selection List */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-surface-600 mb-1.5">
                  Select Team Leads
                </label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-surface-200 p-2 space-y-1.5 bg-surface-50/50">
                  {members.map((m) => {
                    const isSelected = editForm.teamLeads.includes(m._id);
                    return (
                      <label
                        key={m._id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all border ${
                          isSelected ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-white border-surface-200 text-surface-700 hover:bg-surface-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm((f) => ({ ...f, teamLeads: [...f.teamLeads, m._id] }));
                              } else {
                                setEditForm((f) => ({ ...f, teamLeads: f.teamLeads.filter((id) => id !== m._id) }));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>{m.name} ({m.role})</span>
                        </div>
                        {isSelected && <Shield className="h-3.5 w-3.5 text-amber-700" />}
                      </label>
                    );
                  })}
                  {members.length === 0 && (
                    <p className="text-xs text-surface-400 italic text-center py-2">Add members to this team first to assign them as leads.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary flex-1 text-xs">Cancel</button>
                <button type="submit" disabled={updateTeamMutation.isPending} className="btn-primary flex-1 text-xs justify-center">
                  {updateTeamMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
