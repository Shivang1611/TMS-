import client from './client';

export const authApi = {
  register: (data) => client.post('/auth/register', data).then((r) => r.data),
  login: (data) => client.post('/auth/login', data).then((r) => r.data),
  getMe: () => client.get('/auth/me').then((r) => r.data),
  updateMe: (data) => client.patch('/auth/me', data).then((r) => r.data),
  changePassword: (data) => client.post('/auth/change-password', data).then((r) => r.data),
  uploadAvatar: (formData) =>
    client.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
};

export const taskApi = {
  list: (params) => client.get('/tasks', { params }).then((r) => r.data),
  get: (id) => client.get(`/tasks/${id}`).then((r) => r.data),
  update: (id, data) => client.patch(`/tasks/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/tasks/${id}`).then((r) => r.data),
  updateStatus: (id, data) => client.patch(`/tasks/${id}/status`, data).then((r) => r.data),
  assign: (id, data) => client.patch(`/tasks/${id}/assign`, data).then((r) => r.data),
  getSubtasks: (id) => client.get(`/tasks/${id}/subtasks`).then((r) => r.data),
  bulkUpdateStatus: (data) => client.patch('/tasks/bulk/status', data).then((r) => r.data),
  create: (projectId, data) => client.post(`/projects/${projectId}/tasks`, data).then((r) => r.data),
};

export const projectApi = {
  list: (params) => client.get('/projects', { params }).then((r) => r.data),
  get: (id) => client.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => client.post('/projects', data).then((r) => r.data),
  update: (id, data) => client.patch(`/projects/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/projects/${id}`).then((r) => r.data),
};

export const commentApi = {
  list: (taskId) => client.get('/comments', { params: { taskId } }).then((r) => r.data),
  create: (taskId, data) => client.post('/comments', data, { params: { taskId } }).then((r) => r.data),
  update: (id, data) => client.patch(`/comments/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/comments/${id}`).then((r) => r.data),
};

export const dashboardApi = {
  personal: () => client.get('/dashboards/personal').then((r) => r.data),
  org: () => client.get('/dashboards/org').then((r) => r.data),
  department: () => client.get('/dashboards/department').then((r) => r.data),
  team: () => client.get('/dashboards/team').then((r) => r.data),
  workload: () => client.get('/dashboards/workload').then((r) => r.data),
};

export const userApi = {
  list: (params) => client.get('/users', { params }).then((r) => r.data),
  get: (id) => client.get(`/users/${id}`).then((r) => r.data),
  getScore: (id) => client.get(`/users/${id}/score`).then((r) => r.data),
  invite: (data) => client.post('/users/invite', data).then((r) => r.data),
  bulkInvite: (data) => client.post('/users/bulk-invite', data).then((r) => r.data),
  updateUser: (id, data) => client.patch(`/users/${id}`, data).then((r) => r.data),
  resetPassword: (id, newPassword) => client.patch(`/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
  deactivate: (id) => client.patch(`/users/${id}/deactivate`).then((r) => r.data),
  reactivate: (id) => client.patch(`/users/${id}/reactivate`).then((r) => r.data),
  delete: (id) => client.delete(`/users/${id}`).then((r) => r.data),
};

export const notificationApi = {
  list: (params) => client.get('/notifications', { params }).then((r) => r.data),
  markRead: (id) => client.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => client.patch('/notifications/read-all').then((r) => r.data),
  getSettings: () => client.get('/notifications/settings').then((r) => r.data),
  updateSettings: (data) => client.patch('/notifications/settings', data).then((r) => r.data),
};

export const noteApi = {
  list: (params) => client.get('/notes', { params }).then((r) => r.data),
  sharedWithMe: () => client.get('/notes/shared-with-me').then((r) => r.data),
  get: (id) => client.get(`/notes/${id}`).then((r) => r.data),
  create: (data) => client.post('/notes', data).then((r) => r.data),
  update: (id, data) => client.patch(`/notes/${id}`, data).then((r) => r.data),
  link: (id, taskId) => client.patch(`/notes/${id}/link`, { taskId }).then((r) => r.data),
  delete: (id) => client.delete(`/notes/${id}`).then((r) => r.data),
};

export const searchApi = {
  search: (params) => client.get('/search', { params }).then((r) => r.data),
};

export const milestoneApi = {
  listByProject: (projectId) => client.get(`/projects/${projectId}/milestones`).then((r) => r.data),
  get: (id) => client.get(`/milestones/${id}`).then((r) => r.data),
};

export const teamApi = {
  list: (params) => client.get('/teams', { params }).then((r) => r.data),
  get: (id) => client.get(`/teams/${id}`).then((r) => r.data),
  create: (data) => client.post('/teams', data).then((r) => r.data),
  update: (id, data) => client.patch(`/teams/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/teams/${id}`).then((r) => r.data),
  removeMember: (teamId, userId) => client.delete(`/teams/${teamId}/members/${userId}`).then((r) => r.data),
};

export const deptApi = {
  list: () => client.get('/departments').then((r) => r.data),
  create: (data) => client.post('/departments', data).then((r) => r.data),
  delete: (id) => client.delete(`/departments/${id}`).then((r) => r.data),
};

export const reportApi = {
  tasks: (params) => client.get('/reports/tasks', { params }).then((r) => r.data),
  workload: (params) => client.get('/reports/workload', { params }).then((r) => r.data),
  projects: (params) => client.get('/reports/projects', { params }).then((r) => r.data),
  departmentThroughput: (params) => client.get('/reports/department-throughput', { params }).then((r) => r.data),
};

export const auditLogApi = {
  list: (params) => client.get('/audit-logs', { params }).then((r) => r.data),
  export: () => client.get('/audit-logs/export', { responseType: 'blob' }).then((r) => r.data),
};

export const uploadApi = {
  image: (formData) =>
    client.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  deleteImage: (url) =>
    client.delete('/upload/image', { data: { url } }).then((r) => r.data),
};

export const reminderApi = {
  list: () => client.get('/reminders').then((r) => r.data),
  create: (data) => client.post('/reminders', data).then((r) => r.data),
  update: (id, data) => client.patch(`/reminders/${id}`, data).then((r) => r.data),
  delete: (id) => client.delete(`/reminders/${id}`).then((r) => r.data),
};

export const documentApi = {
  list: (params) => client.get('/documents', { params }).then((r) => r.data),
  get: (id) => client.get(`/documents/${id}`).then((r) => r.data),
  upload: (formData) =>
    client.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data),
  delete: (id) => client.delete(`/documents/${id}`).then((r) => r.data),
};
