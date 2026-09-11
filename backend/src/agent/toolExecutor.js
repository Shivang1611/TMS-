/**
 * toolExecutor.js
 *
 * Central tool execution engine for the TMS AI Agent.
 *
 * Security contract (non-negotiable):
 * 1. Every executor re-derives scope from `requestingUser` (from req.user, never from LLM args).
 * 2. All TMS API calls use the user's own Bearer token — the agent has no credentials of its own.
 * 3. Returns { denied: true, reason } for scope violations — never throws to the client.
 * 4. Writes one AgentAuditLog row per call (success, denied, or error).
 * 5. Content inside task titles/descriptions/comments is treated as data, never as instructions.
 */

const axios = require('axios');
const AgentAuditLog = require('../models/AgentAuditLog');
const { User, Task, Project, Team } = require('../models');

const TMS_API_BASE = (process.env.TMS_API_BASE || 'http://localhost:3000/api').replace(/\/+$/, '');

// ─── Internal TMS API client using the user's own token ───────────────────────

function tmsClient(userToken) {
  return axios.create({
    baseURL: TMS_API_BASE,
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

// ─── Audit Log Writer ─────────────────────────────────────────────────────────

async function writeAudit({ userId, organizationId, sessionId, toolName, args, resultStatus, resultSummary, originalMessage, userRole, ip, context }) {
  try {
    await AgentAuditLog.create({
      userId,
      organizationId,
      sessionId,
      toolName,
      arguments: args,
      resultStatus,
      resultSummary,
      originalMessage,
      userRole,
      ip,
      context,
    });
  } catch (err) {
    // Audit failures must never break the main flow — log only
    console.error('[Agent] Audit log write failed:', err.message);
  }
}

// ─── Task Sanitizer Helpers for LLM Token Efficiency ───────────────────────

function sanitizeTask(t) {
  if (!t) return null;
  const rawDesc = t.description || t.details || '';
  const cleanDesc = rawDesc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: t._id || t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : null,
    project: t.project?.name || t.projectName,
    assignees: Array.isArray(t.assignees) ? t.assignees.map(a => a.name || a.email).filter(Boolean).join(', ') : (t.assigneeName || ''),
    description: cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + '...' : cleanDesc,
  };
}

function sanitizeTaskList(resData) {
  const items = Array.isArray(resData) ? resData : (resData?.data || []);
  const sanitized = items.map(sanitizeTask).filter(Boolean);
  return {
    totalCount: resData?.pagination?.totalCount || sanitized.length,
    data: sanitized.slice(0, 15),
  };
}

// ─── Scope denial helper ──────────────────────────────────────────────────────

function denied(reason) {
  return { denied: true, reason };
}

// ─── Scope helpers ────────────────────────────────────────────────────────────

async function isUserInScope(requestingUser, targetUserId) {
  const role = requestingUser.role;
  const targetId = String(targetUserId);
  const selfId = String(requestingUser._id);

  if (role === 'Founder' || role === 'Admin') return true;
  if (targetId === selfId) return true;

  // Manager/HR/Team Lead: check if target is in same org (org-scoped reads are fine;
  // for tighter checks like team membership, specific executors do more)
  if (['Manager', 'HR', 'Team Lead'].includes(role)) {
    const target = await User.findById(targetUserId).select('organization').lean();
    if (!target) return false;
    return String(target.organization) === String(requestingUser.organization);
  }

  return false;
}

async function isUserRoleEmployee(userId) {
  const u = await User.findById(userId).select('role').lean();
  return u && u.role === 'Employee';
}

async function isTeamLead_onProject(requestingUser, projectId) {
  const project = await Project.findById(projectId).select('members teams manager').lean();
  if (!project) return false;
  const uid = String(requestingUser._id);
  // Check direct members or manager
  if (String(project.manager) === uid) return true;
  if (project.members && project.members.some((m) => String(m) === uid)) return true;
  // Check teams
  if (project.teams && project.teams.length > 0) {
    const teams = await Team.find({ _id: { $in: project.teams } }).select('teamLeads members').lean();
    for (const t of teams) {
      if (t.teamLeads && t.teamLeads.some((tl) => String(tl) === uid)) return true;
      if (t.members && t.members.some((m) => String(m) === uid)) return true;
    }
  }
  return false;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

/**
 * executeToolCall
 *
 * @param {string} toolName
 * @param {object} args - Arguments from Llama (untrusted — always re-validated)
 * @param {object} requestingUser - From req.user (trusted — derived from JWT)
 * @param {string} userToken - The user's own Bearer JWT
 * @param {string} sessionId
 * @param {string} originalMessage
 * @param {string} ip
 * @returns {{ result, confirmRequired, denied, reason }}
 */
async function executeToolCall(toolName, args, requestingUser, userToken, sessionId, originalMessage, ip, context) {
  const auditBase = {
    userId: requestingUser._id,
    organizationId: requestingUser.organization,
    sessionId,
    toolName,
    args,
    originalMessage,
    userRole: requestingUser.role,
    ip,
    context,
  };

  try {
    const api = tmsClient(userToken);
    let result;

    switch (toolName) {

      // ── READ TOOLS ──────────────────────────────────────────────────────────

      case 'getMyTasks': {
        const params = {};
        if (args.status) params.status = args.status;
        const res = await api.get('/tasks', { params: { ...params, assigneeId: requestingUser._id } });
        result = sanitizeTaskList(res.data);
        break;
      }

      case 'getTaskDetails': {
        const res = await api.get(`/tasks/${args.taskId}`);
        result = sanitizeTask(res.data?.data || res.data);
        break;
      }

      case 'searchProjects': {
        const res = await api.get('/projects', { params: { search: args.searchQuery } });
        result = (res.data?.data || []).map(p => ({ id: p._id, name: p.name, status: p.status, managerName: p.manager?.name }));
        break;
      }

      case 'searchUsers': {
        const res = await api.get('/users', { params: { search: args.searchQuery } });
        // Return a condensed list to save tokens
        result = (res.data?.data || []).map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, score: u.score, tier: u.tier }));
        break;
      }

      case 'getUserTasks': {
        // Employee may only see their own tasks
        if (requestingUser.role === 'Employee' && String(args.targetUserId) !== String(requestingUser._id)) {
          await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'Employee attempted to view another user\'s tasks' });
          return denied('You can only view your own tasks.');
        }
        const inScope = await isUserInScope(requestingUser, args.targetUserId);
        if (!inScope) {
          await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'Target user out of scope' });
          return denied('You don\'t have permission to view that user\'s tasks.');
        }
        const params = { assigneeId: args.targetUserId };
        if (args.status) params.status = args.status;
        const res = await api.get('/tasks', { params });
        result = sanitizeTaskList(res.data);
        break;
      }

      case 'getUnassignedMembers': {
        const params = {};
        if (args.teamId) {
          if (require('mongoose').Types.ObjectId.isValid(args.teamId)) {
            params.teamId = args.teamId;
          } else {
            const team = await Team.findOne({ name: { $regex: new RegExp(args.teamId, 'i') }, organization: requestingUser.organization });
            if (team) params.teamId = team._id;
          }
        }
        if (args.departmentId) {
          if (require('mongoose').Types.ObjectId.isValid(args.departmentId)) {
            params.departmentId = args.departmentId;
          } else {
            const dept = await require('../models/Department').findOne({ name: { $regex: new RegExp(args.departmentId, 'i') }, organization: requestingUser.organization });
            if (dept) params.departmentId = dept._id;
          }
        }
        const res = await api.get('/users', { params: { ...params, noActiveTasks: true } });
        result = res.data;
        break;
      }

      case 'getOverloadedMembers': {
        const params = { threshold: args.threshold || 5 };
        if (args.teamId) {
          if (require('mongoose').Types.ObjectId.isValid(args.teamId)) {
            params.teamId = args.teamId;
          } else {
            const team = await Team.findOne({ name: { $regex: new RegExp(args.teamId, 'i') }, organization: requestingUser.organization });
            if (team) params.teamId = team._id;
          }
        }
        if (args.departmentId) {
          if (require('mongoose').Types.ObjectId.isValid(args.departmentId)) {
            params.departmentId = args.departmentId;
          } else {
            const dept = await require('../models/Department').findOne({ name: { $regex: new RegExp(args.departmentId, 'i') }, organization: requestingUser.organization });
            if (dept) params.departmentId = dept._id;
          }
        }
        const res = await api.get('/users', { params });
        result = res.data;
        break;
      }

      case 'getUpcomingDeadlines': {
        // Clamp scope server-side
        const allowedScopes = {
          Employee: ['self'],
          'Team Lead': ['self', 'team'],
          HR: ['self', 'org'],
          Manager: ['self', 'team', 'department'],
          Admin: ['self', 'team', 'department', 'org'],
          Founder: ['self', 'team', 'department', 'org'],
        };
        const allowed = allowedScopes[requestingUser.role] || ['self'];
        const scope = allowed.includes(args.scope) ? args.scope : 'self';
        const days = Math.min(args.days || 7, 90);
        const res = await api.get('/tasks', { params: { upcomingDays: days, scope } });
        result = sanitizeTaskList(res.data);
        break;
      }

      case 'getOverdueTasks': {
        const allowedScopes = {
          Employee: ['self'],
          'Team Lead': ['self', 'team'],
          HR: ['self', 'org'],
          Manager: ['self', 'team', 'department'],
          Admin: ['self', 'team', 'department', 'org'],
          Founder: ['self', 'team', 'department', 'org'],
        };
        const allowed = allowedScopes[requestingUser.role] || ['self'];
        const scope = allowed.includes(args.scope) ? args.scope : 'self';
        const res = await api.get('/tasks', { params: { overdue: true, scope } });
        result = sanitizeTaskList(res.data);
        break;
      }

      case 'getProjectStatus': {
        const res = await api.get(`/projects/${args.projectId}`);
        result = res.data;
        break;
      }

      case 'getTeamDashboard': {
        const res = await api.get('/dashboards/team', { params: args.teamId ? { teamId: args.teamId } : {} });
        result = res.data;
        break;
      }

      case 'getDepartmentDashboard': {
        const res = await api.get('/dashboards/department', { params: args.departmentId ? { departmentId: args.departmentId } : {} });
        result = res.data;
        break;
      }

      case 'getOrgDashboard': {
        const res = await api.get('/dashboards/org');
        result = res.data;
        break;
      }

      case 'getWorkloadDashboard': {
        const res = await api.get('/dashboards/workload');
        result = res.data;
        break;
      }

      case 'getTaskCompletionReport': {
        const res = await api.get('/reports/tasks', { params: args });
        result = res.data;
        break;
      }

      case 'getProjectProgressReport': {
        const res = await api.get('/reports/projects', { params: args });
        result = res.data;
        break;
      }

      case 'getThroughputReport': {
        const res = await api.get('/reports/department-throughput', { params: args });
        result = res.data;
        break;
      }

      // ── WRITE TOOLS ─────────────────────────────────────────────────────────
      // These return confirmRequired=true; actual execution happens in confirmAndExecute()

      case 'assignTask': {
        // HR can only assign to Employees
        if (requestingUser.role === 'HR') {
          const isEmp = await isUserRoleEmployee(args.assigneeId);
          if (!isEmp) {
            await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'HR attempted to assign task to non-Employee' });
            return denied('As HR, you can only assign tasks to Employees — not to Managers, Team Leads, or Founders.');
          }
        }
        const task = await Task.findById(args.taskId).select('title assignees').lean();
        const assignee = await User.findById(args.assigneeId).select('name').lean();
        if (!task) return denied('Task not found.');
        if (!assignee) return denied('Assignee not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Assign task "${task.title}" to ${assignee.name}` });
        return {
          confirmRequired: true,
          summary: `Assign task **"${task.title}"** to **${assignee.name}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'createTask': {
        // Team Lead can only create tasks in projects they're assigned to
        if (requestingUser.role === 'Team Lead') {
          const onProject = await isTeamLead_onProject(requestingUser, args.projectId);
          if (!onProject) {
            await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'Team Lead attempted to create task in unassigned project' });
            return denied('You can only create tasks in projects you are assigned to.');
          }
        }
        // HR can only assign to Employees
        if (requestingUser.role === 'HR' && args.assigneeId) {
          const isEmp = await isUserRoleEmployee(args.assigneeId);
          if (!isEmp) {
            await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'HR attempted to create task with non-Employee assignee' });
            return denied('As HR, you can only assign tasks to Employees.');
          }
        }
        const project = await Project.findById(args.projectId).select('name').lean();
        if (!project) return denied('Project not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Create task "${args.title}" in project "${project.name}"` });
        return {
          confirmRequired: true,
          summary: `Create task **"${args.title}"** in project **"${project.name}"**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'updateTaskStatus': {
        // Employee can only update tasks assigned to them
        if (requestingUser.role === 'Employee') {
          const task = await Task.findById(args.taskId).select('assignees title').lean();
          if (!task) return denied('Task not found.');
          const isAssigned = task.assignees && task.assignees.some((a) => String(a) === String(requestingUser._id));
          if (!isAssigned) {
            await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'Employee attempted to update status of unassigned task' });
            return denied('You can only update the status of tasks assigned to you.');
          }
        }
        const task = await Task.findById(args.taskId).select('title').lean();
        if (!task) return denied('Task not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Update task "${task.title}" status to ${args.status}` });
        return {
          confirmRequired: true,
          summary: `Update task **"${task.title}"** status to **${args.status}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'bulkUpdateTaskStatus': {
        if (!Array.isArray(args.taskIds) || args.taskIds.length === 0) {
          return denied('Please provide at least one task ID.');
        }
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Bulk update ${args.taskIds.length} tasks to status ${args.status}` });
        return {
          confirmRequired: true,
          summary: `Update **${args.taskIds.length} task(s)** status to **${args.status}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'deleteTask': {
        const task = await Task.findById(args.taskId).select('title').lean();
        if (!task) return denied('Task not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Delete task "${task.title}"` });
        return {
          confirmRequired: true,
          summary: `Permanently delete task **"${task.title}"**?`,
          requiresTypeConfirm: true,
          confirmTarget: task.title,
        };
      }

      case 'createProject': {
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Create project "${args.name}"` });
        return {
          confirmRequired: true,
          summary: `Create new project **"${args.name}"**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'updateProject': {
        const project = await Project.findById(args.projectId).select('name').lean();
        if (!project) return denied('Project not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Update project "${project.name}"` });
        return {
          confirmRequired: true,
          summary: `Update project **"${project.name}"**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'deleteProject': {
        const project = await Project.findById(args.projectId).select('name').lean();
        if (!project) return denied('Project not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Delete project "${project.name}"` });
        return {
          confirmRequired: true,
          summary: `Permanently delete project **"${project.name}"**?`,
          requiresTypeConfirm: true,
          confirmTarget: project.name,
        };
      }

      case 'createMilestone': {
        const project = await Project.findById(args.projectId).select('name').lean();
        if (!project) return denied('Project not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Create milestone "${args.name}" in project "${project.name}"` });
        return {
          confirmRequired: true,
          summary: `Create milestone **"${args.name}"** in project **"${project.name}"**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'addRemoveTeamMember': {
        const team = await Team.findById(args.teamId).select('name').lean();
        const targetUser = await User.findById(args.userId).select('name').lean();
        if (!team) return denied('Team not found.');
        if (!targetUser) return denied('User not found.');
        const action = args.action === 'add' ? 'Add' : 'Remove';
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `${action} ${targetUser.name} ${args.action === 'add' ? 'to' : 'from'} team "${team.name}"` });
        return {
          confirmRequired: true,
          summary: `**${action} ${targetUser.name}** ${args.action === 'add' ? 'to' : 'from'} team **"${team.name}"**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'inviteUser': {
        // HR can only invite Employees
        if (requestingUser.role === 'HR' && args.role !== 'Employee') {
          await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'HR attempted to invite user with non-Employee role' });
          return denied('As HR, you can only invite users with the Employee role.');
        }
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Invite ${args.email} as ${args.role}` });
        return {
          confirmRequired: true,
          summary: `Invite **${args.email}** (${args.name}) as **${args.role}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'bulkInviteUser': {
        if (requestingUser.role === 'HR' && args.role !== 'Employee') {
          await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: 'HR attempted to bulk invite users with non-Employee role' });
          return denied('As HR, you can only invite users with the Employee role.');
        }
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Bulk invite ${args.emails.length} users as ${args.role}` });
        return {
          confirmRequired: true,
          summary: `Invite **${args.emails.length} user(s)** as **${args.role}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'resetPassword': {
        const target = await User.findById(args.userId).select('name').lean();
        if (!target) return denied('User not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Reset password for ${target.name}` });
        return {
          confirmRequired: true,
          summary: `Reset password for **${target.name}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'deactivateUser': {
        const target = await User.findById(args.userId).select('name').lean();
        if (!target) return denied('User not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Deactivate user ${target.name}` });
        return {
          confirmRequired: true,
          summary: `Deactivate account for **${target.name}**? They will not be able to log in.`,
          requiresTypeConfirm: false,
        };
      }

      case 'reactivateUser': {
        const target = await User.findById(args.userId).select('name').lean();
        if (!target) return denied('User not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Reactivate user ${target.name}` });
        return {
          confirmRequired: true,
          summary: `Reactivate account for **${target.name}**?`,
          requiresTypeConfirm: false,
        };
      }

      case 'deleteUser': {
        const target = await User.findById(args.userId).select('name').lean();
        if (!target) return denied('User not found.');
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Delete user ${target.name}` });
        return {
          confirmRequired: true,
          summary: `Permanently delete user **"${target.name}"** from the organisation?`,
          requiresTypeConfirm: true,
          confirmTarget: target.name,
        };
      }

      case 'addComment': {
        await writeAudit({ ...auditBase, resultStatus: 'pending_confirm', resultSummary: `Add comment to task ${args.taskId}` });
        return {
          confirmRequired: true,
          summary: `Add comment: *"${args.text.substring(0, 80)}${args.text.length > 80 ? '…' : ''}"*?`,
          requiresTypeConfirm: false,
        };
      }

      default:
        await writeAudit({ ...auditBase, resultStatus: 'error', resultSummary: `Unknown tool: ${toolName}` });
        return denied(`I don't know how to run the action "${toolName}". Please try rephrasing your request.`);
    }

    // Success for read tools
    await writeAudit({ ...auditBase, resultStatus: 'success', resultSummary: `Tool ${toolName} returned ${result?.data ? 'data' : 'result'}` });
    return { result };

  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'Unknown error';
    // If the TMS API returned 403, translate to denial
    if (err.response?.status === 403 || err.response?.status === 401) {
      await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: errMsg });
      return denied(`You don't have permission to do that: ${errMsg}`);
    }
    await writeAudit({ ...auditBase, resultStatus: 'error', resultSummary: errMsg });
    return { error: true, message: `Something went wrong while running that action. Please try again.` };
  }
}

/**
 * confirmAndExecute — called after the user clicks Confirm in the widget.
 * Performs the actual TMS API write using the user's token.
 */
async function confirmAndExecute(toolName, args, requestingUser, userToken, sessionId, ip, context) {
  const auditBase = {
    userId: requestingUser._id,
    organizationId: requestingUser.organization,
    sessionId,
    toolName,
    args,
    originalMessage: '[CONFIRMED]',
    userRole: requestingUser.role,
    ip,
    context,
  };

  try {
    const api = tmsClient(userToken);
    let result;

    switch (toolName) {
      case 'assignTask':
        result = await api.patch(`/tasks/${args.taskId}/assign`, { assigneeIds: [args.assigneeId] });
        break;
      case 'createTask':
        result = await api.post(`/projects/${args.projectId}/tasks`, {
          title: args.title,
          assigneeIds: args.assigneeId ? [args.assigneeId] : undefined,
          dueDate: args.dueDate || undefined,
          priority: args.priority || 'Medium',
        });
        break;
      case 'updateTaskStatus':
        result = await api.patch(`/tasks/${args.taskId}/status`, { status: args.status, blockedReason: args.blockedReason });
        break;
      case 'bulkUpdateTaskStatus':
        result = await api.patch('/tasks/bulk/status', { taskIds: args.taskIds, status: args.status });
        break;
      case 'deleteTask':
        result = await api.delete(`/tasks/${args.taskId}`);
        break;
      case 'createProject':
        result = await api.post('/projects', { name: args.name, description: args.description, managerId: args.managerId });
        break;
      case 'updateProject':
        result = await api.patch(`/projects/${args.projectId}`, { name: args.name, description: args.description, status: args.status });
        break;
      case 'deleteProject':
        result = await api.delete(`/projects/${args.projectId}`);
        break;
      case 'createMilestone':
        result = await api.post(`/projects/${args.projectId}/milestones`, { name: args.name, dueDate: args.dueDate });
        break;
      case 'addRemoveTeamMember':
        if (args.action === 'add') {
          result = await api.post(`/teams/${args.teamId}/members`, { userIds: [args.userId] });
        } else {
          result = await api.delete(`/teams/${args.teamId}/members/${args.userId}`);
        }
        break;
      case 'inviteUser':
        result = await api.post('/users/invite', { email: args.email, name: args.name, role: args.role, password: args.password });
        break;
      case 'bulkInviteUser':
        result = await api.post('/users/bulk-invite', { emails: args.emails, role: args.role, password: args.password });
        break;
      case 'resetPassword':
        result = await api.patch(`/users/${args.userId}/reset-password`, { newPassword: args.newPassword });
        break;
      case 'deactivateUser':
        result = await api.patch(`/users/${args.userId}/deactivate`);
        break;
      case 'reactivateUser':
        result = await api.patch(`/users/${args.userId}/reactivate`);
        break;
      case 'deleteUser':
        result = await api.delete(`/users/${args.userId}`);
        break;
      case 'addComment':
        result = await api.post('/comments', { taskId: args.taskId, body: args.text });
        break;
      default:
        await writeAudit({ ...auditBase, resultStatus: 'error', resultSummary: `Unknown confirmed tool: ${toolName}` });
        return { error: true, message: 'Unknown action.' };
    }

    await writeAudit({ ...auditBase, resultStatus: 'success', resultSummary: `Confirmed write for ${toolName} succeeded` });
    return { result: result?.data || { success: true } };

  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'Unknown error';
    if (err.response?.status === 403 || err.response?.status === 401) {
      await writeAudit({ ...auditBase, resultStatus: 'denied', resultSummary: errMsg });
      return { denied: true, reason: `You don't have permission to do that.` };
    }
    await writeAudit({ ...auditBase, resultStatus: 'error', resultSummary: errMsg });
    return { error: true, message: `The action failed: ${errMsg}` };
  }
}

module.exports = { executeToolCall, confirmAndExecute };
