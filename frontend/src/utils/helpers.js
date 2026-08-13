export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateRelative(date) {
  if (!date) return '—';
  const now = new Date();
  const d = new Date(date);
  const diff = d - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)} day(s) overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 7) return `Due in ${days} days`;
  return formatDate(date);
}

export function statusConfig(status) {
  const map = {
    'To Do': { label: 'To Do', className: 'badge-todo', color: 'bg-gray-100 text-gray-700' },
    'In Progress': { label: 'In Progress', className: 'badge-in-progress', color: 'bg-blue-100 text-blue-700' },
    'In Review': { label: 'In Review', className: 'badge-in-review', color: 'bg-amber-100 text-amber-700' },
    'Done': { label: 'Done', className: 'badge-done', color: 'bg-emerald-100 text-emerald-700' },
    'Blocked': { label: 'Blocked', className: 'badge-blocked', color: 'bg-red-100 text-red-700' },
  };
  return map[status] || { label: status, className: 'badge', color: 'bg-gray-100 text-gray-700' };
}

export function priorityConfig(priority) {
  const map = {
    Low: { label: 'Low', color: 'text-gray-500', icon: '↓' },
    Medium: { label: 'Medium', color: 'text-blue-600', icon: '→' },
    High: { label: 'High', color: 'text-amber-600', icon: '↑' },
    Critical: { label: 'Critical', color: 'text-red-600', icon: '!!' },
  };
  return map[priority] || { label: priority, color: 'text-gray-500', icon: '—' };
}

export function truncate(str, len = 50) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
