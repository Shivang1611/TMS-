import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteApi, userApi } from '../../api/api';
import { X, Search, Eye, Pencil, Trash2, UserPlus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ShareNoteModal
 * Opens when the note owner clicks the Share button.
 *
 * Props:
 *   isOpen    – boolean
 *   onClose   – () => void
 *   note      – the full note object (including sharedWith populated by backend)
 */
export default function ShareNoteModal({ isOpen, onClose, note }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermission, setSelectedPermission] = useState('viewer');

  // Fetch all org users to pick from
  const { data: usersData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => userApi.list({ pageSize: 200 }),
    enabled: isOpen,
  });

  const allUsers = usersData?.data || [];

  // Already shared user IDs (for filtering the picker)
  const sharedUserIds = (note?.sharedWith || []).map((s) =>
    s.userId?._id || s.userId
  );

  // Filtered picker list: exclude owner + already shared
  const filteredUsers = allUsers.filter((u) => {
    if (u._id === note?.ownerId?._id || u._id === note?.ownerId) return false;
    if (sharedUserIds.includes(u._id)) return false;
    if (!search) return true;
    return (
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const shareMutation = useMutation({
    mutationFn: ({ userId, permission }) =>
      noteApi.share(note._id, [{ userId, permission }]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedUserId('');
      setSearch('');
      toast.success('Note shared successfully');
    },
    onError: () => toast.error('Failed to share note'),
  });

  const updatePermMutation = useMutation({
    mutationFn: ({ userId, permission }) =>
      noteApi.updateSharePermission(note._id, userId, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Permission updated');
    },
    onError: () => toast.error('Failed to update permission'),
  });

  const unshareMutation = useMutation({
    mutationFn: (userId) => noteApi.unshare(note._id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('User removed');
    },
    onError: () => toast.error('Failed to remove user'),
  });

  if (!isOpen || !note) return null;

  const handleAddShare = () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    shareMutation.mutate({ userId: selectedUserId, permission: selectedPermission });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-surface-200 flex items-center justify-between bg-surface-50">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <h3 className="font-bold text-surface-900 text-base">Share Note</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-800 hover:bg-surface-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* ── Add new share ─────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-2 uppercase tracking-wide">
              Add People
            </label>
            <div className="flex gap-2">
              {/* User search/select */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedUserId('');
                  }}
                  className="input-field pl-9 h-9 text-sm w-full"
                />
                {/* Dropdown */}
                {search && filteredUsers.length > 0 && !selectedUserId && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {filteredUsers.slice(0, 8).map((u) => (
                      <button
                        key={u._id}
                        onClick={() => {
                          setSelectedUserId(u._id);
                          setSearch(u.name || u.email);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary-50 text-left transition-colors"
                      >
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="h-7 w-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-surface-900 truncate">{u.name}</div>
                          <div className="text-xs text-surface-500 truncate">{u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Permission toggle */}
              <div className="flex rounded-lg border border-surface-200 overflow-hidden shrink-0">
                <button
                  onClick={() => setSelectedPermission('viewer')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                    selectedPermission === 'viewer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Viewer
                </button>
                <button
                  onClick={() => setSelectedPermission('editor')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-l border-surface-200 transition-colors ${
                    selectedPermission === 'editor'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-surface-600 hover:bg-surface-50'
                  }`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editor
                </button>
              </div>

              {/* Add button */}
              <button
                onClick={handleAddShare}
                disabled={!selectedUserId || shareMutation.isPending}
                className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>

            {/* Permission hints */}
            <div className="mt-2 flex gap-4 text-xs text-surface-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-blue-500" />
                <strong>Viewer</strong> — can read &amp; copy only
              </span>
              <span className="flex items-center gap-1">
                <Pencil className="h-3 w-3 text-emerald-500" />
                <strong>Editor</strong> — can read &amp; edit
              </span>
            </div>
          </div>

          {/* ── Currently shared with ─────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold text-surface-600 mb-2 uppercase tracking-wide">
              Shared With ({note.sharedWith?.length || 0})
            </label>

            {!note.sharedWith || note.sharedWith.length === 0 ? (
              <div className="text-center py-6 text-sm text-surface-400 border border-dashed border-surface-200 rounded-lg">
                Not shared with anyone yet
              </div>
            ) : (
              <div className="space-y-2">
                {note.sharedWith.map((entry) => {
                  const u = entry.userId; // populated object from backend
                  const uid = u?._id || u;
                  const name = u?.name || 'Unknown';
                  const email = u?.email || '';
                  const perm = entry.permission || 'viewer';

                  return (
                    <div
                      key={uid}
                      className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl border border-surface-100"
                    >
                      {/* Avatar */}
                      {u?.avatar ? (
                        <img
                          src={u.avatar}
                          alt={name}
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-surface-900 truncate">{name}</div>
                        <div className="text-xs text-surface-500 truncate">{email}</div>
                      </div>

                      {/* Permission toggle */}
                      <div className="flex rounded-lg border border-surface-200 overflow-hidden shrink-0">
                        <button
                          onClick={() =>
                            perm !== 'viewer' &&
                            updatePermMutation.mutate({ userId: uid, permission: 'viewer' })
                          }
                          disabled={updatePermMutation.isPending}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                            perm === 'viewer'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-surface-500 hover:bg-surface-100'
                          }`}
                          title="Set as Viewer"
                        >
                          <Eye className="h-3 w-3" />
                          Viewer
                        </button>
                        <button
                          onClick={() =>
                            perm !== 'editor' &&
                            updatePermMutation.mutate({ userId: uid, permission: 'editor' })
                          }
                          disabled={updatePermMutation.isPending}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border-l border-surface-200 transition-colors ${
                            perm === 'editor'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-surface-500 hover:bg-surface-100'
                          }`}
                          title="Set as Editor"
                        >
                          <Pencil className="h-3 w-3" />
                          Editor
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => unshareMutation.mutate(uid)}
                        disabled={unshareMutation.isPending}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Remove access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-100 bg-surface-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
