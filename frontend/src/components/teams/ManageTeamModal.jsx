import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamApi, userApi } from '../../api/api';
import { X, UserPlus, Trash2, Shield, Loader2, Search, Check, User } from 'lucide-react';
import { getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function ManageTeamModal({ team, onClose }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => userApi.list({}),
  });
  const allUsers = usersData?.data || [];

  // Active members in team
  const existingMemberIds = team?.members?.map((m) => m._id || m) || [];

  // Users not currently in team
  const availableUsers = allUsers.filter(
    (u) => !existingMemberIds.includes(u._id) && u.isActive !== false
  );

  const filteredAvailableUsers = availableUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Add Members Mutation
  const addMembersMutation = useMutation({
    mutationFn: (userIds) => teamApi.addMembers(team._id, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setSelectedUserIds([]);
      toast.success('Member(s) added to team!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add members'),
  });

  // Remove Member Mutation
  const removeMemberMutation = useMutation({
    mutationFn: (memberId) => teamApi.removeMember(team._id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member removed from team');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove member'),
  });

  const handleAddSelected = () => {
    if (selectedUserIds.length === 0) return;
    addMembersMutation.mutate(selectedUserIds);
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl space-y-5 animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-surface-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900 font-bold">
              👥
            </div>
            <div>
              <h2 className="text-base font-extrabold text-surface-900">
                Manage Team Members — {team?.name}
              </h2>
              <p className="text-xs text-surface-500">{team?.department?.name || 'Department Team Workspace'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-surface-400 hover:text-surface-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Existing Team Members */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-500 flex items-center justify-between">
            <span>Current Team Members ({team?.members?.length || 0})</span>
          </h3>

          <div className="max-h-40 overflow-y-auto space-y-2 rounded-xl border border-surface-200 p-2.5 bg-surface-50/50">
            {!team?.members || team.members.length === 0 ? (
              <p className="text-xs text-surface-400 italic py-2 text-center">No members assigned to this team yet.</p>
            ) : (
              team.members.map((m) => (
                <div key={m._id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2.5 shadow-2xs border border-surface-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 flex items-center justify-center">
                      {getInitials(m.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-surface-900 truncate">{m.name}</p>
                      <p className="text-[10px] text-surface-400 truncate">{m.email} • {m.role}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeMemberMutation.mutate(m._id)}
                    disabled={removeMemberMutation.isPending}
                    className="p-1.5 text-surface-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                    title="Remove member from team"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Members Section */}
        <div className="space-y-3 border-t border-surface-100 pt-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-500">
            Add Members to Team
          </h3>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee by name or email..."
              className="input-field pl-9 h-9 text-xs"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-surface-200 p-2.5 bg-surface-50/50">
            {filteredAvailableUsers.length === 0 ? (
              <p className="text-xs text-surface-400 italic py-2 text-center">
                {search ? 'No matching users found.' : 'All active organization members are already in this team.'}
              </p>
            ) : (
              filteredAvailableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u._id);
                return (
                  <div
                    key={u._id}
                    onClick={() => toggleUserSelection(u._id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' : 'bg-white border-surface-100 text-surface-700 hover:bg-surface-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'bg-indigo-600 text-white' : 'border border-surface-300 bg-white'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="text-xs truncate">{u.name} ({u.role}) — {u.email}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedUserIds.length > 0 && (
            <button
              onClick={handleAddSelected}
              disabled={addMembersMutation.isPending}
              className="btn-primary w-full text-xs justify-center py-2"
            >
              {addMembersMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Adding...</span>
              ) : (
                <span className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Add {selectedUserIds.length} Selected Member(s)</span>
              )}
            </button>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-secondary text-xs px-4">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
