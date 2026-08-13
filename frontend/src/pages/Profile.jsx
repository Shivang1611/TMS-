import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authApi, userApi, notificationApi } from '../api/api';
import {
  User, Mail, Shield, Bell, Phone, Briefcase, Save, Loader2,
  Camera, Key, Lock, Eye, EyeOff, Check, X, Plus, Trash2, RotateCcw,
  Sparkles, Award, Edit3, CheckCircle2,
} from 'lucide-react';
import { getInitials } from '../utils/helpers';
import { getResponsibilitiesForUser, DEFAULT_ROLE_RESPONSIBILITIES } from '../utils/roleResponsibilities';
import toast from 'react-hot-toast';

const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:3000';
  return `${baseUrl}${path}`;
};

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  // Fetch Score Data
  const { data: scoreData } = useQuery({
    queryKey: ['user', 'score', user?._id],
    queryFn: () => userApi.getScore(user?._id),
    enabled: !!user?._id,
  });
  const scoreDetails = scoreData?.data;

  // ─── Admin Global Settings ─────────────────────────────────────────
  const isAdmin = ['Founder', 'Admin'].includes(user?.role);
  const { data: adminSettingsData, refetch: refetchAdminSettings } = useQuery({
    queryKey: ['admin', 'notificationSettings'],
    queryFn: () => notificationApi.getSettings(),
    enabled: isAdmin,
  });
  const adminSettings = adminSettingsData?.data || [];
  
  const adminSettingsMutation = useMutation({
    mutationFn: (data) => notificationApi.updateSettings(data),
    onSuccess: () => {
      toast.success('System notification settings updated!');
      refetchAdminSettings();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update system settings'),
  });

  const updateAdminSetting = (notificationType, updates) => {
    adminSettingsMutation.mutate({
      notificationType,
      ...updates,
    });
  };

  // ─── Profile & Responsibilities edit state ─────────────────────────
  const [editing, setEditing] = useState(false);
  const [responsibilities, setResponsibilities] = useState(() => getResponsibilitiesForUser(user));
  const [newRespInput, setNewRespInput] = useState('');

  const [form, setForm] = useState({
    name: user?.name || '',
    profile: {
      jobTitle: user?.profile?.jobTitle || '',
      phone: user?.profile?.phone || '',
    },
    notificationPreferences: {
      email: { ...user?.notificationPreferences?.email },
      inApp: { ...user?.notificationPreferences?.inApp },
    },
  });

  // ─── Password change state ─────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ─── Avatar upload state ────────────────────────────────────────────
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // ─── Profile update mutation ────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => authApi.updateMe(data),
    onSuccess: (res) => {
      updateUser(res.data);
      setEditing(false);
      toast.success('Profile and responsibilities updated!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update profile'),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name,
      profile: {
        ...form.profile,
        responsibilities,
      },
      notificationPreferences: form.notificationPreferences,
    });
  };

  const handleAddResponsibility = () => {
    if (!newRespInput.trim()) return;
    setResponsibilities((prev) => [...prev, newRespInput.trim()]);
    setNewRespInput('');
    toast.success('Responsibility added');
  };

  const handleRemoveResponsibility = (index) => {
    setResponsibilities((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetResponsibilities = () => {
    const defaultResp = DEFAULT_ROLE_RESPONSIBILITIES[user?.role] || DEFAULT_ROLE_RESPONSIBILITIES.Member;
    setResponsibilities(defaultResp);
    toast.success('Reset to default role responsibilities');
  };

  const togglePref = (channel, key) => {
    setForm((f) => ({
      ...f,
      notificationPreferences: {
        ...f.notificationPreferences,
        [channel]: {
          ...f.notificationPreferences[channel],
          [key]: !f.notificationPreferences[channel][key],
        },
      },
    }));
  };

  // ─── Avatar upload ──────────────────────────────────────────────────
  const avatarMutation = useMutation({
    mutationFn: (formData) => authApi.uploadAvatar(formData),
    onSuccess: (res) => {
      updateUser(res.data);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Avatar updated!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to upload avatar'),
  });

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = () => {
    if (!avatarFile) return;
    const fd = new FormData();
    fd.append('avatar', avatarFile);
    avatarMutation.mutate(fd);
  };

  const cancelAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Password change ────────────────────────────────────────────────
  const passwordMutation = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      setShowPasswordForm(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    passwordMutation.mutate({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
  };

  const NOTIF_LABELS = {
    taskAssigned: 'Task assigned',
    mention: '@Mention',
    statusChanged: 'Status changed',
    commentReply: 'Comment reply',
    milestoneApproaching: 'Milestone approaching',
    taskOverdue: 'Task overdue',
  };

  const avatarSrc = avatarPreview || getImageUrl(user?.profile?.avatar);

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900 tracking-tight">Account Profile</h1>
          <p className="mt-1 text-xs text-surface-500">Manage your profile, role responsibilities, and preferences.</p>
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button onClick={handleSave} disabled={updateMutation.isPending} className="btn-primary text-xs">
              {updateMutation.isPending ? (
                <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>
              ) : (
                <span className="flex items-center gap-1.5"><Save className="h-3.5 w-3.5" /> Save Changes</span>
              )}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-secondary text-xs flex items-center gap-1.5">
            <Edit3 className="h-3.5 w-3.5" /> Edit Profile
          </button>
        )}
      </div>

      {/* ─── Profile Card ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-6 flex-wrap sm:flex-nowrap">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={user?.name}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-primary-50 shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 text-3xl font-extrabold text-white shadow-md">
                {getInitials(user?.name)}
              </div>
            )}

            {/* Change avatar overlay button */}
            <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-surface-900 text-white shadow-md transition-transform hover:scale-105">
              <Camera className="h-4 w-4" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarSelect}
              />
            </label>

            {/* Upload actions */}
            {avatarFile && (
              <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 gap-1 z-10">
                <button
                  onClick={handleUploadAvatar}
                  disabled={avatarMutation.isPending}
                  className="flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md hover:bg-primary-700 transition-colors"
                >
                  {avatarMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Save
                </button>
                <button
                  onClick={cancelAvatar}
                  className="flex items-center gap-1 rounded-full bg-surface-200 px-2.5 py-1 text-[10px] font-bold text-surface-600 hover:bg-surface-300 transition-colors"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-600">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field mt-1 h-9 text-sm font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-surface-600">Job Title</label>
                    <div className="relative mt-1">
                      <Briefcase className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                      <input
                        type="text"
                        value={form.profile.jobTitle}
                        onChange={(e) => setForm((f) => ({ ...f, profile: { ...f.profile, jobTitle: e.target.value } }))}
                        placeholder="Software Engineer"
                        className="input-field h-9 pl-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-surface-600">Phone</label>
                    <div className="relative mt-1">
                      <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
                      <input
                        type="tel"
                        value={form.profile.phone}
                        onChange={(e) => setForm((f) => ({ ...f, profile: { ...f.profile, phone: e.target.value } }))}
                        placeholder="+1-555-0123"
                        className="input-field h-9 pl-8 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-surface-900">{user?.name}</h2>
                  <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-extrabold text-indigo-800 border border-indigo-200">
                    {user?.role}
                  </span>
                </div>
                <p className="text-xs text-surface-500 mt-0.5">{user?.profile?.jobTitle || 'Team Professional'}</p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-lg bg-surface-50 p-2.5 text-surface-700">
                    <Mail className="h-4 w-4 text-surface-400 shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-50 p-2.5 text-surface-700">
                    <Phone className="h-4 w-4 text-surface-400 shrink-0" />
                    <span>{user?.profile?.phone || 'No phone added'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Performance Achievements (LeetCode Style) ───────────────── */}
      {scoreDetails && (
        <div 
          className="rounded-2xl border bg-white p-6 transition-all relative overflow-hidden"
          style={{ borderColor: `${scoreDetails.color}80`, boxShadow: `0 8px 30px -10px ${scoreDetails.color}40` }}
        >
          <div className="absolute -right-10 -top-10 opacity-10 blur-2xl">
            <div className="h-64 w-64 rounded-full" style={{ backgroundColor: scoreDetails.color }} />
          </div>
          
          <div className="flex items-center gap-4 border-b border-surface-100 pb-4 relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner text-2xl" style={{ backgroundColor: scoreDetails.color }}>
              🏆
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-surface-900 tracking-tight">Achievements & Rank</h2>
              <p className="text-xs font-semibold" style={{ color: scoreDetails.color, filter: 'brightness(0.6)' }}>
                Your performance track record across the organization
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
            <div className="flex flex-col gap-1 items-center justify-center p-4 rounded-xl border border-surface-100 bg-surface-50 text-center">
              <span className="text-3xl font-black text-surface-900">{scoreDetails.score}</span>
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Total Points</span>
            </div>
            <div className="flex flex-col gap-1 items-center justify-center p-4 rounded-xl border-2 shadow-sm text-center" style={{ borderColor: scoreDetails.color, backgroundColor: `${scoreDetails.color}20` }}>
              <span className="text-2xl font-black" style={{ color: scoreDetails.color, filter: 'brightness(0.5)' }}>{scoreDetails.tier}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: scoreDetails.color, filter: 'brightness(0.6)' }}>Current Tier</span>
            </div>
            <div className="flex flex-col gap-2 items-center justify-center p-4 rounded-xl border border-surface-100 bg-surface-50 text-center">
              {scoreDetails.nextTier ? (
                <>
                  <span className="text-lg font-bold text-surface-700">{scoreDetails.nextTier.pointsNeeded} pts left</span>
                  <div className="w-full bg-surface-200 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 rounded-full" style={{ width: '70%', backgroundColor: scoreDetails.color }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">To {scoreDetails.nextTier.name}</span>
                </>
              ) : (
                <>
                  <span className="text-xl font-black text-amber-500">MAX RANK</span>
                  <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Top Performer</span>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <div className="rounded-xl bg-surface-50 p-4 border border-surface-100 flex flex-col">
              <h3 className="text-sm font-bold text-surface-900 mb-3 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-indigo-600" /> How Scoring Works
              </h3>
              <ul className="text-xs text-surface-600 space-y-2.5 flex-1">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-100 text-[9px] font-bold text-green-700 mt-0.5">+15</span>
                  <span><strong className="text-surface-800">Perfect Execution:</strong> Task completed on or before due date with no rework.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[9px] font-bold text-amber-700 mt-0.5">+5</span>
                  <span><strong className="text-surface-800">Needed Rework:</strong> Task completed on time, but was reopened at least once.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-700 mt-0.5">0</span>
                  <span><strong className="text-surface-800">Late:</strong> Task completed after the official due date has passed.</span>
                </li>
              </ul>
              <p className="mt-4 text-[10px] font-medium text-surface-500 italic">
                * Note: Reopened tasks temporarily reverse your points until finished again.
              </p>
            </div>

            <div className="rounded-xl bg-surface-50 p-4 border border-surface-100 flex flex-col">
              <h3 className="text-sm font-bold text-surface-900 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" /> Tier Progression
              </h3>
              <div className="grid grid-cols-1 gap-2 text-xs flex-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-surface-200 shadow-sm transition-colors hover:border-surface-300">
                  <span className="font-bold text-surface-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: '#E8D9F0'}}></span> Elite</span>
                  <span className="font-bold text-surface-600 bg-surface-100 px-2 py-0.5 rounded-md">500+ pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-surface-200 shadow-sm transition-colors hover:border-surface-300">
                  <span className="font-bold text-surface-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: '#FAF6CF'}}></span> Excellent</span>
                  <span className="font-bold text-surface-600 bg-surface-100 px-2 py-0.5 rounded-md">301 - 499 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-surface-200 shadow-sm transition-colors hover:border-surface-300">
                  <span className="font-bold text-surface-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: '#C9F1E2'}}></span> Great</span>
                  <span className="font-bold text-surface-600 bg-surface-100 px-2 py-0.5 rounded-md">151 - 300 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-surface-200 shadow-sm transition-colors hover:border-surface-300">
                  <span className="font-bold text-surface-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: '#D6E4F0'}}></span> Good</span>
                  <span className="font-bold text-surface-600 bg-surface-100 px-2 py-0.5 rounded-md">51 - 150 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-surface-200 shadow-sm transition-colors hover:border-surface-300">
                  <span className="font-bold text-surface-900 flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full shadow-inner border border-black/10" style={{backgroundColor: '#E4E4E4'}}></span> Beginner</span>
                  <span className="font-bold text-surface-600 bg-surface-100 px-2 py-0.5 rounded-md">0 - 50 pts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Premium Key Roles & Responsibilities Section ─────────────── */}
      <div className="rounded-2xl border border-indigo-200/90 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-surface-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Key Roles & Responsibilities</h2>
              <p className="text-xs text-surface-500">Edit or customize tasks and duties assigned to your {user?.role} role</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Responsibilities
            </button>
            <button
              onClick={handleResetResponsibilities}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors"
              title="Reset to default role responsibilities"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Default
            </button>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Interactive Inline Editable Responsibilities List */}
        <div className="space-y-2.5">
          {responsibilities.map((resp, i) => (
            <div
              key={i}
              className="group flex items-center gap-3 rounded-xl border border-surface-200 bg-surface-50/50 p-2.5 text-xs text-surface-800 font-medium transition-all hover:bg-white hover:border-indigo-300 hover:shadow-xs focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-800">
                {i + 1}
              </span>
              <input
                type="text"
                value={resp}
                onChange={(e) => {
                  const updated = [...responsibilities];
                  updated[i] = e.target.value;
                  setResponsibilities(updated);
                }}
                className="flex-1 bg-transparent border-none p-0 text-xs font-medium text-surface-800 focus:outline-none focus:ring-0"
              />
              <button
                onClick={() => handleRemoveResponsibility(i)}
                className="text-surface-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Remove responsibility item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add custom responsibility input */}
        <div className="pt-2 border-t border-surface-100">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRespInput}
              onChange={(e) => setNewRespInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddResponsibility(); }}
              placeholder="Add custom role responsibility..."
              className="flex-1 rounded-xl border border-surface-200 px-3 py-2 text-xs text-surface-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddResponsibility}
              disabled={!newRespInput.trim()}
              className="btn-primary text-xs px-3 py-2 flex items-center gap-1 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>
        </div>
      </div>

      {/* ─── Change Password Card ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-100 text-surface-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">Security Password</h2>
              <p className="text-xs text-surface-500">Update your account password</p>
            </div>
          </div>
          {!showPasswordForm && (
            <button onClick={() => setShowPasswordForm(true)} className="btn-secondary text-xs flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" /> Change Password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="mt-5 space-y-4 border-t border-surface-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-surface-600">Current Password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  className="input-field h-9 w-full pl-9 pr-9 text-sm"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600">New Password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  className="input-field h-9 w-full pl-9 pr-9 text-sm"
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-600">Confirm New Password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-surface-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="input-field h-9 w-full pl-9 pr-9 text-sm"
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setShowPasswordForm(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                className="btn-secondary flex-1 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword.length < 8 || pwForm.newPassword !== pwForm.confirmPassword}
                className="btn-primary flex-1 text-xs"
              >
                {passwordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Notification Preferences Card ────────────────────────────── */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-100 text-surface-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-surface-900">Notification Preferences</h2>
            <p className="text-xs text-surface-500">Configure email and in-app alerts</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2">Email Notifications</h3>
            <div className="space-y-1.5">
              {Object.entries(NOTIF_LABELS).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg border border-surface-200 px-3.5 py-2 hover:bg-surface-50 transition-colors">
                  <span className="text-xs font-semibold text-surface-700">{label}</span>
                  <input
                    type="checkbox"
                    checked={form.notificationPreferences.email[key] ?? true}
                    onChange={() => togglePref('email', key)}
                    className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Admin System Settings (Only for Admins/Founders) ────────── */}
      {isAdmin && (
        <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-surface-100 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-surface-900">System Notification Settings</h2>
              <p className="text-xs text-surface-500">Global configurations for your organization</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2">Task Assignment Emails</h3>
              <p className="text-xs text-surface-500 mb-3">Configure how soon an email is sent to an employee when they are assigned a new task. (A delay allows assigning the task and making quick edits before the email fires).</p>
              
              {(() => {
                const setting = adminSettings.find(s => s.notificationType === 'task_created') || { delayMode: 'instant', delayMinutes: 15 };
                
                return (
                  <div className="flex flex-col gap-3 rounded-lg border border-surface-200 p-4 bg-surface-50">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="delayMode" 
                          value="instant"
                          checked={setting.delayMode === 'instant'}
                          onChange={() => updateAdminSetting('task_created', { delayMode: 'instant', delayMinutes: setting.delayMinutes })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        Send Instantly
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold text-surface-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="delayMode" 
                          value="delayed"
                          checked={setting.delayMode === 'delayed'}
                          onChange={() => updateAdminSetting('task_created', { delayMode: 'delayed', delayMinutes: setting.delayMinutes })}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                        Send with Delay
                      </label>
                    </div>
                    
                    {setting.delayMode === 'delayed' && (
                      <div className="flex items-center gap-3 mt-2 pl-6 border-l-2 border-surface-200">
                        <span className="text-xs font-semibold text-surface-600">Delay Duration:</span>
                        <select
                          value={setting.delayMinutes}
                          onChange={(e) => updateAdminSetting('task_created', { delayMode: 'delayed', delayMinutes: parseInt(e.target.value) })}
                          className="rounded-lg border-surface-300 text-sm focus:border-primary-500 focus:ring-primary-500 py-1.5 px-3"
                          disabled={adminSettingsMutation.isPending}
                        >
                          <option value={1}>1 Minute (Testing)</option>
                          <option value={5}>5 Minutes</option>
                          <option value={10}>10 Minutes</option>
                          <option value={15}>15 Minutes</option>
                          <option value={30}>30 Minutes</option>
                          <option value={60}>1 Hour</option>
                        </select>
                        {adminSettingsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-surface-400" />}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
