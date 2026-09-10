/**
 * roleToolMap.js
 *
 * Maps each TMS role to the exact list of tool names it is permitted to call.
 * These are the ONLY tool schemas sent to Llama for that role — the LLM never
 * sees tool definitions for actions outside the role's permission matrix.
 *
 * Source of truth: §2 Permission Matrix in the agent specification.
 */

// ─── Read tools (scope is clamped server-side, not by removing the tool) ──────

const READ_TOOLS_ALL = [
  'getMyTasks',
  'getTaskDetails',
  'getUpcomingDeadlines',
  'getOverdueTasks',
  'getProjectStatus',
  'getWorkloadDashboard',
  'searchUsers',
  'searchProjects',
];

const READ_TOOLS_TEAM_LEAD = [
  ...READ_TOOLS_ALL,
  'getUserTasks',
  'getUnassignedMembers',
  'getOverloadedMembers',
  'getTeamDashboard',
  'getTaskCompletionReport',
];

const READ_TOOLS_HR = [
  ...READ_TOOLS_ALL,
  'getUserTasks',
  'getUnassignedMembers',
  'getOverloadedMembers',
  'getOrgDashboard',
  'getTaskCompletionReport',
  'getProjectProgressReport',
  'getThroughputReport',
];

const READ_TOOLS_MANAGER = [
  ...READ_TOOLS_ALL,
  'getUserTasks',
  'getUnassignedMembers',
  'getOverloadedMembers',
  'getTeamDashboard',
  'getDepartmentDashboard',
  'getTaskCompletionReport',
  'getProjectProgressReport',
  'getThroughputReport',
];

const READ_TOOLS_ADMIN_FOUNDER = [
  ...READ_TOOLS_ALL,
  'getUserTasks',
  'getUnassignedMembers',
  'getOverloadedMembers',
  'getTeamDashboard',
  'getDepartmentDashboard',
  'getOrgDashboard',
  'getTaskCompletionReport',
  'getProjectProgressReport',
  'getThroughputReport',
];

// ─── Write tools per role ──────────────────────────────────────────────────────

const WRITE_TOOLS_EMPLOYEE = [
  'updateTaskStatus', // scoped to own tasks at executor level
  'addComment',       // scoped to accessible tasks at executor level
];

const WRITE_TOOLS_TEAM_LEAD = [
  ...WRITE_TOOLS_EMPLOYEE,
  'createTask',       // restricted to assigned projects at executor level
  'assignTask',
];

const WRITE_TOOLS_HR = [
  ...WRITE_TOOLS_EMPLOYEE,
  'createTask',         // restricted to Employee assignees at executor level
  'assignTask',         // restricted to Employee targets at executor level
  'addRemoveTeamMember',
  'inviteUser',         // restricted to Employee role at executor level
  'bulkInviteUser',     // restricted to Employee role at executor level
];

const WRITE_TOOLS_MANAGER = [
  ...WRITE_TOOLS_EMPLOYEE,
  'createTask',
  'assignTask',
  'bulkUpdateTaskStatus',
  'deleteTask',
  'createProject',
  'updateProject',
  'deleteProject',
  'createMilestone',
  'addRemoveTeamMember',
  'inviteUser',
  'bulkInviteUser',
  'addComment',
];

const WRITE_TOOLS_ADMIN = [
  ...WRITE_TOOLS_MANAGER,
  'resetPassword',
  'deactivateUser',
  'reactivateUser',
  'deleteUser',
];

// Founder gets everything Admin has (deleteOrganization is EXCLUDED from agent — UI only)
const WRITE_TOOLS_FOUNDER = [...WRITE_TOOLS_ADMIN];

// ─── Final Role → Tool Map ─────────────────────────────────────────────────────

const toolsByRole = {
  Employee: [...new Set([...READ_TOOLS_ALL, ...WRITE_TOOLS_EMPLOYEE])],
  'Team Lead': [...new Set([...READ_TOOLS_TEAM_LEAD, ...WRITE_TOOLS_TEAM_LEAD])],
  HR: [...new Set([...READ_TOOLS_HR, ...WRITE_TOOLS_HR])],
  Manager: [...new Set([...READ_TOOLS_MANAGER, ...WRITE_TOOLS_MANAGER])],
  Admin: [...new Set([...READ_TOOLS_ADMIN_FOUNDER, ...WRITE_TOOLS_ADMIN])],
  Founder: [...new Set([...READ_TOOLS_ADMIN_FOUNDER, ...WRITE_TOOLS_FOUNDER])],
};

/**
 * Write tools — any tool in this set will trigger the confirmation flow
 * before execution. deleteTask, deleteProject, deleteUser additionally require
 * type-to-confirm.
 */
const WRITE_TOOLS = new Set([
  'assignTask',
  'createTask',
  'updateTaskStatus',
  'bulkUpdateTaskStatus',
  'deleteTask',
  'createProject',
  'updateProject',
  'deleteProject',
  'createMilestone',
  'addRemoveTeamMember',
  'inviteUser',
  'bulkInviteUser',
  'resetPassword',
  'deactivateUser',
  'reactivateUser',
  'deleteUser',
  'addComment',
]);

/**
 * Destructive tools — require type-to-confirm (entity name, not just a button click)
 */
const DESTRUCTIVE_TOOLS = new Set(['deleteTask', 'deleteProject', 'deleteUser']);

module.exports = { toolsByRole, WRITE_TOOLS, DESTRUCTIVE_TOOLS };
