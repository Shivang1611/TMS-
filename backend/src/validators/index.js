const Joi = require('joi');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format');

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
};

// ─── Auth ────────────────────────────────────────────────────────────────────

const register = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().trim().max(100).required(),
  organizationName: Joi.string().trim().max(200).required(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const updateProfile = Joi.object({
  name: Joi.string().trim().max(100),
  profile: Joi.object({
    jobTitle: Joi.string().max(100).allow(''),
    phone: Joi.string().allow(''),
    avatar: Joi.string().uri().allow(''),
  }),
  notificationPreferences: Joi.object({
    email: Joi.object({
      taskAssigned: Joi.boolean(),
      mention: Joi.boolean(),
      statusChanged: Joi.boolean(),
      commentReply: Joi.boolean(),
      milestoneApproaching: Joi.boolean(),
      taskOverdue: Joi.boolean(),
    }),
    inApp: Joi.object({
      taskAssigned: Joi.boolean(),
      mention: Joi.boolean(),
      statusChanged: Joi.boolean(),
      commentReply: Joi.boolean(),
      milestoneApproaching: Joi.boolean(),
      taskOverdue: Joi.boolean(),
    }),
  }),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required(),
});

// ─── Organization ────────────────────────────────────────────────────────────

const createOrganization = Joi.object({
  name: Joi.string().trim().max(200).required(),
  domain: Joi.string().domain().allow(''),
});

const updateOrganization = Joi.object({
  name: Joi.string().trim().max(200),
  domain: Joi.string().domain().allow(''),
  logo: Joi.string().uri().allow(''),
  settings: Joi.object({
    defaultRole: Joi.string().valid('Employee', 'Team Lead', 'Manager'),
    retentionDays: Joi.number().integer().min(30).max(365),
    auditLogRetentionYears: Joi.number().integer().min(1).max(7),
  }),
});

// ─── Department ──────────────────────────────────────────────────────────────

const createDepartment = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().max(500).allow(''),
  head: objectId.allow(null),
});

const updateDepartment = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().max(500).allow(''),
  head: objectId.allow(null),
});

// ─── Team ────────────────────────────────────────────────────────────────────

const createTeam = Joi.object({
  name: Joi.string().trim().max(100).required(),
  description: Joi.string().max(500).allow(''),
  departmentId: objectId.required(),
  teamLeads: Joi.array().items(objectId).default([]),
});

const updateTeam = Joi.object({
  name: Joi.string().trim().max(100),
  description: Joi.string().max(500).allow(''),
  teamLeads: Joi.array().items(objectId),
});

// ─── User / Employee ─────────────────────────────────────────────────────────

const inviteUser = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().trim().max(100).required(),
  role: Joi.string().valid('Admin', 'Manager', 'Team Lead', 'Employee').required(),
  password: Joi.string().min(8).max(128).required(),
  departmentId: objectId.allow(null),
  teamIds: Joi.array().items(objectId).default([]),
});

const bulkInvite = Joi.object({
  emails: Joi.array().items(Joi.string().email().trim().max(255)).min(1).max(100).required(),
  role: Joi.string().valid('Admin', 'Manager', 'Team Lead', 'Employee').required(),
  password: Joi.string().min(8).max(128).required(),
  departmentId: objectId.allow(null),
  teamIds: Joi.array().items(objectId).default([]),
});

const updateUser = Joi.object({
  role: Joi.string().valid('Admin', 'Manager', 'Team Lead', 'Employee'),
  departmentId: objectId.allow(null, ''),
});

const resetPasswordAdmin = Joi.object({
  newPassword: Joi.string().min(8).max(128).required(),
});

const addTeamMembers = Joi.object({
  userIds: Joi.array().items(objectId).min(1).required(),
});

// ─── Project ─────────────────────────────────────────────────────────────────

const createProject = Joi.object({
  name: Joi.string().trim().max(200).required(),
  description: Joi.string().max(2000).allow(''),
  departmentId: objectId.allow(null),
  managerId: objectId.required(),
  startDate: Joi.date().iso().allow(null),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).allow(null),
  teams: Joi.array().items(objectId).default([]),
  members: Joi.array().items(objectId).default([]),
  visibilitySettings: Joi.object({
    hideMilestones: Joi.boolean().default(false),
    hideTaskStats: Joi.boolean().default(false),
    hideTeamMembers: Joi.boolean().default(false),
  }).default({ hideMilestones: false, hideTaskStats: false, hideTeamMembers: false }),
});

const updateProject = Joi.object({
  name: Joi.string().trim().max(200),
  description: Joi.string().max(2000).allow(''),
  departmentId: objectId.allow(null, ''),
  managerId: objectId,
  startDate: Joi.date().iso().allow(null, ''),
  endDate: Joi.date().iso().allow(null, ''),
  status: Joi.string().valid('Active', 'On Hold', 'Completed', 'Cancelled'),
  visibilitySettings: Joi.object({
    hideMilestones: Joi.boolean(),
    hideTaskStats: Joi.boolean(),
    hideTeamMembers: Joi.boolean(),
  }),
});

// ─── Milestone ───────────────────────────────────────────────────────────────

const createMilestone = Joi.object({
  name: Joi.string().trim().max(200).required(),
  description: Joi.string().max(1000).allow(''),
  dueDate: Joi.date().iso().allow(null),
});

const updateMilestone = Joi.object({
  name: Joi.string().trim().max(200),
  description: Joi.string().max(1000).allow(''),
  dueDate: Joi.date().iso().allow(null),
  status: Joi.string().valid('Pending', 'In Progress', 'Completed', 'Cancelled'),
});

// ─── Task ────────────────────────────────────────────────────────────────────

const createTask = Joi.object({
  title: Joi.string().trim().max(300).required(),
  description: Joi.string().max(5000).allow(''),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical').default('Medium'),
  milestoneId: objectId.allow(null),
  assigneeId: objectId.allow(null),
  dueDate: Joi.date().iso().allow(null),
  estimatedEffort: Joi.number().min(0).allow(null),
  parentTaskId: objectId.allow(null),
  allowAssigneeToEdit: Joi.boolean().default(false),
});

const updateTask = Joi.object({
  title: Joi.string().trim().max(300),
  description: Joi.string().max(5000).allow(''),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
  milestoneId: objectId.allow(null),
  assigneeId: objectId.allow(null),
  dueDate: Joi.date().iso().allow(null),
  estimatedEffort: Joi.number().min(0).allow(null),
  actualEffort: Joi.number().min(0).allow(null),
  allowAssigneeToEdit: Joi.boolean(),
});

const updateTaskStatus = Joi.object({
  status: Joi.string().valid('To Do', 'In Progress', 'In Review', 'Done', 'Blocked').required(),
  blockedReason: Joi.string().max(500).when('status', {
    is: 'Blocked',
    then: Joi.required(),
    otherwise: Joi.allow(null, ''),
  }),
});

// ─── Comment ─────────────────────────────────────────────────────────────────

const createComment = Joi.object({
  body: Joi.string().required(),
  parentCommentId: objectId.allow(null),
  mentions: Joi.array().items(objectId).default([]),
});

const updateComment = Joi.object({
  body: Joi.string().required(),
  mentions: Joi.array().items(objectId),
});

// ─── Document ────────────────────────────────────────────────────────────────

const createDocument = Joi.object({
  projectId: objectId.allow(null),
  taskId: objectId.allow(null),
}).custom((value, helpers) => {
  if (!value.projectId && !value.taskId) {
    return helpers.error('any.custom', { message: 'Document must be attached to either a project or a task' });
  }
  return value;
});

// ─── Notification ────────────────────────────────────────────────────────────

const markAsRead = Joi.object({
  notificationIds: Joi.array().items(objectId).min(1),
});

// ─── Report Filters ──────────────────────────────────────────────────────────

const reportFilters = Joi.object({
  departmentId: objectId,
  projectId: objectId,
  assigneeId: objectId,
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  ...pagination,
});

// ─── Search ──────────────────────────────────────────────────────────────────

const searchQuery = Joi.object({
  q: Joi.string().trim().max(200).required(),
  type: Joi.string().valid('tasks', 'projects', 'comments', 'documents'),
  ...pagination,
});

// ─── Activity / Audit Filters ────────────────────────────────────────────────

const activityFilters = Joi.object({
  entityType: Joi.string().valid('Task', 'Project', 'Milestone', 'Comment', 'Department', 'Team'),
  entityId: objectId,
  action: Joi.string(),
  ...pagination,
});

const auditLogFilters = Joi.object({
  actionType: Joi.string(),
  actorId: objectId,
  targetType: Joi.string().valid('User', 'Department', 'Team', 'Organization'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  ...pagination,
});

// ─── Task List Filters ───────────────────────────────────────────────────────

const taskListFilters = Joi.object({
  projectId: objectId,
  milestoneId: objectId,
  assigneeId: objectId,
  status: Joi.string().valid('To Do', 'In Progress', 'In Review', 'Done', 'Blocked'),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Critical'),
  dueDateFrom: Joi.date().iso(),
  dueDateTo: Joi.date().iso(),
  ...pagination,
});

module.exports = {
  register,
  login,
  updateProfile,
  changePassword,
  createOrganization,
  updateOrganization,
  createDepartment,
  updateDepartment,
  createTeam,
  updateTeam,
  inviteUser,
  bulkInvite,
  updateUser,
  resetPasswordAdmin,
  addTeamMembers,
  createProject,
  updateProject,
  createMilestone,
  updateMilestone,
  createTask,
  updateTask,
  updateTaskStatus,
  createComment,
  updateComment,
  createDocument,
  markAsRead,
  reportFilters,
  searchQuery,
  activityFilters,
  auditLogFilters,
  taskListFilters,
};
