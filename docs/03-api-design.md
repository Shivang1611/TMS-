# API Design — Enterprise Task Management Platform v1

**Date:** 2026-07-22
**Version:** 1.0
**Status:** Draft for review

---

## 1. Base URL & Conventions

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:3000/api` (dev) |
| Protocol | HTTPS (production) |
| Content-Type | `application/json` |
| Auth | Bearer JWT token in `Authorization` header |
| Pagination | `?page=1&pageSize=20` (default 20, max 100) |
| Sorting | `?sortBy=createdAt&sortOrder=desc` |
| Filtering | Query parameters matching field names |

---

## 2. Authentication

### POST /api/auth/register
Creates a new organization and assigns the creator as Founder.

**Request:**
```json
{
  "email": "alex@example.com",
  "password": "securePassword123!",
  "name": "Alex Chen",
  "organizationName": "Acme Corp"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "665f...",
      "email": "alex@example.com",
      "name": "Alex Chen",
      "role": "Founder",
      "organization": "665f...",
      "organizationName": "Acme Corp"
    }
  }
}
```

### POST /api/auth/login
Authenticates a user and returns a JWT (expires 24h).

**Request:**
```json
{
  "email": "alex@example.com",
  "password": "securePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "...", "email": "...", "name": "...", "role": "Founder", "organization": "..." }
  }
}
```

**Error (401):** `{ "success": false, "statusCode": 401, "message": "Invalid email or password" }`

### GET /api/auth/me
Returns the currently authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Full user document with populated organization, department, and teams.

### PATCH /api/auth/me
Updates the current user's profile and notification preferences.

**Request:**
```json
{
  "name": "Alex Chen Updated",
  "profile": { "jobTitle": "CEO", "phone": "+1-555-0123" },
  "notificationPreferences": {
    "email": { "taskAssigned": true, "mention": true, "statusChanged": false }
  }
}
```

---

## 3. Organization

### GET /api/organizations/:id
Get organization details. User can only view their own org.

**Roles:** All authenticated

### PATCH /api/organizations/:id
Update organization settings.

**Roles:** Founder, Admin

### DELETE /api/organizations/:id
Soft-delete organization.

**Roles:** Founder only

---

## 4. Departments

### POST /api/departments
Create a department.

**Roles:** Founder, Admin

**Request:**
```json
{
  "name": "Engineering",
  "description": "Software engineering department",
  "head": "665f..." // optional User ID
}
```

### GET /api/departments
List departments in the organization.

**Response:** Array of departments with populated head.

### GET /api/departments/:id
Get department details.

### PATCH /api/departments/:id
Update department.

**Roles:** Founder, Admin

### DELETE /api/departments/:id
Delete department (BR-11: fails if teams exist).

**Roles:** Founder, Admin

**Error (400):** `"Cannot delete department: it still contains N team(s)."`

---

## 5. Teams

### POST /api/teams
Create a team.

**Roles:** Founder, Admin

**Request:**
```json
{
  "name": "Backend Team",
  "description": "API and services",
  "departmentId": "665f...",
  "teamLeads": ["665f..."] // optional User IDs
}
```

### GET /api/teams
List teams (filterable by `departmentId`).

### GET /api/teams/:id
Get team details including populated members.

### PATCH /api/teams/:id
Update team.

**Roles:** Founder, Admin

### DELETE /api/teams/:id
Soft-delete team.

**Roles:** Founder, Admin

### POST /api/teams/:id/members
Add members to team.

**Roles:** Founder, Admin, Manager

**Request:** `{ "userIds": ["665f...", "665f..."] }`

### DELETE /api/teams/:id/members/:userId
Remove member from team.

**Roles:** Founder, Admin, Manager

---

## 6. Users / Employees

### POST /api/users/invite
Invite a new employee.

**Roles:** Founder, Admin

**Request:**
```json
{
  "email": "marcus@acme.com",
  "name": "Marcus Williams",
  "role": "Employee",
  "departmentId": "665f...",
  "teamIds": ["665f..."]
}
```

### GET /api/users
List users (filterable by `role`, `departmentId`, `isActive`, `search`).

### GET /api/users/:id
Get user details.

### PATCH /api/users/:id/role
Update user role (cannot change Founder).

**Roles:** Founder, Admin

### PATCH /api/users/:id/deactivate
Deactivate user (BR-07: immediate access loss).

**Roles:** Founder, Admin

### PATCH /api/users/:id/reactivate
Reactivate user.

**Roles:** Founder, Admin

---

## 7. Projects

### POST /api/projects
Create a project.

**Roles:** Founder, Admin, Manager

**Request:**
```json
{
  "name": "Q3 Product Launch",
  "description": "Major product launch initiative",
  "departmentId": "665f...",
  "managerId": "665f...",
  "startDate": "2026-08-01",
  "endDate": "2026-10-31"
}
```

### GET /api/projects
List projects (role-scoped: Employee sees assigned, Manager sees managed).

**Filters:** `status`, `departmentId`, `managerId`

### GET /api/projects/:id
Get project details with milestones and task status summary.

### PATCH /api/projects/:id
Update project.

**Roles:** Founder, Admin, Manager

### DELETE /api/projects/:id
Delete project (fails if tasks exist).

**Roles:** Founder, Admin, Manager

---

## 8. Milestones

### POST /api/projects/:projectId/milestones
Create a milestone within a project.

**Roles:** Founder, Admin, Manager

### GET /api/projects/:projectId/milestones
List milestones for a project.

### GET /api/milestones/:id
Get milestone details with task summary and completion percentage.

### PATCH /api/milestones/:id
Update milestone.

**Roles:** Founder, Admin, Manager

### DELETE /api/milestones/:id
Soft-delete milestone.

**Roles:** Founder, Admin, Manager

---

## 9. Tasks

### POST /api/projects/:projectId/tasks
Create a task within a project.

**Roles:** Founder, Admin, Manager, Team Lead

**Request:**
```json
{
  "title": "Design login page",
  "description": "Create wireframes and prototypes",
  "priority": "High",
  "milestoneId": "665f...",
  "assigneeId": "665f...",
  "dueDate": "2026-08-15",
  "estimatedEffort": 8,
  "parentTaskId": "665f..." // optional, for subtasks
}
```

### GET /api/tasks
List tasks (role-scoped, filterable, sortable, paginated).

**Filters:** `projectId`, `milestoneId`, `assigneeId`, `status`, `priority`, `dueDateFrom`, `dueDateTo`

**Sorting:** `sortBy` (default: createdAt), `sortOrder` (asc/desc)

**Pagination Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 142,
    "totalPages": 8
  }
}
```

### GET /api/tasks/:id
Get task details with subtasks, comments, and activity timeline.

### PATCH /api/tasks/:id
Update task fields (role-scoped).

### DELETE /api/tasks/:id
Soft-delete task (role-scoped).

### PATCH /api/tasks/:id/status
Update task status with BR-02 and BR-03 validation.

**Roles:** All (Employee: own tasks only)

**Request:**
```json
{
  "status": "In Progress",
  "blockedReason": null
}
```

**Status Workflow:**
```
To Do → In Progress → In Review → Done (terminal)
All statuses can go to Blocked (requires blockedReason)
Blocked → To Do or In Progress
```

**Error (400) — Invalid transition:**
```json
{
  "success": false,
  "message": "Cannot transition task from 'Done' to 'In Progress'. Allowed transitions: none (terminal state)"
}
```

**Error (400) — BR-03 (open subtasks):**
```json
{
  "success": false,
  "message": "Cannot set task to Done: 2 open subtask(s) remain. Complete all subtasks first."
}
```

### PATCH /api/tasks/:id/assign
Assign or reassign a task. Pass `null` to unassign.

**Request:** `{ "assigneeId": "665f..." }`

### GET /api/tasks/:id/subtasks
Get all subtasks of a task.

---

## 10. Comments

### POST /api/comments?taskId=...
Create a comment on a task.

**Request:**
```json
{
  "body": "<p>This is a <strong>rich text</strong> comment with @alex mention</p>",
  "parentCommentId": "665f...", // optional, for replies
  "mentions": ["665f..."]
}
```

### GET /api/comments?taskId=...
List comments for a task (top-level only, with reply counts).

### PATCH /api/comments/:id
Edit own comment (no time limit). Tracks edit history.

### DELETE /api/comments/:id
Delete comment. Own or Admin/Founder can delete any. Also soft-deletes all replies.

---

## 11. Documents

### POST /api/documents/upload
Upload a file (multipart/form-data).

**Fields:**
| Field | Type | Required |
|-------|------|----------|
| file | File | ✅ |
| projectId | String | If taskId not set |
| taskId | String | If projectId not set |

**File restrictions:**
- Max size: 25MB
- Allowed types: jpg, png, gif, svg, webp, pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, md

### GET /api/documents
List documents (filterable by `projectId`, `taskId`).

### GET /api/documents/:id
Get document metadata.

### GET /api/documents/:id/download
Get download URL/meta for file.

### DELETE /api/documents/:id
Delete document (owner or Admin/Founder).

---

## 12. Notifications

### GET /api/notifications
List user's notifications (paginated). Returns `unreadCount` separately.

**Filters:** `isRead`

### PATCH /api/notifications/:id/read
Mark single notification as read.

### PATCH /api/notifications/read-all
Mark all notifications as read. Returns count modified.

---

## 13. Dashboards

### GET /api/dashboards/org
Org-wide dashboard.

**Roles:** Founder, Admin
**Data:** totalProjects, activeProjects, totalTasks, tasksByStatus, overdueTasks, upcomingMilestones

### GET /api/dashboards/department
Department dashboard.

**Roles:** Founder, Admin, Manager
**Data:** projectCount, teamMembers, taskStats

### GET /api/dashboards/team
Team dashboard.

**Roles:** Founder, Admin, Manager, Team Lead
**Data:** teamSize, taskStats, recentTasks

### GET /api/dashboards/personal
Personal dashboard (all roles).

**Data:** taskStats (by status, overdue count, completed this week), upcomingTasks

---

## 14. Reports

### GET /api/reports/tasks
Task completion report.

**Roles:** Founder, Admin, Manager, Team Lead
**Data:** tasksByStatus[], totalTasks, completionPercentage

### GET /api/reports/workload
Workload per assignee.

**Roles:** Founder, Admin, Manager, Team Lead
**Data:** assignee details + tasksByStatus[] per assignee

### GET /api/reports/projects
Project progress report.

**Roles:** Founder, Admin, Manager
**Data:** per-project milestone/task completion percentages

### GET /api/reports/department-throughput
Weekly throughput by department.

**Roles:** Founder, Admin, Manager
**Data:** weekly completed task counts (last 52 weeks)

---

## 15. Search

### GET /api/search?q=...
Full-text search across entities.

**Parameters:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| q | String | ✅ | — |
| type | Enum | ❌ | all |
| page | Number | ❌ | 1 |
| pageSize | Number | ❌ | 20 |

**type values:** `tasks`, `projects`, `comments`, `documents`

---

## 16. Activity Timeline

### GET /api/activities
Get activity timeline entries.

**Filters:** `entityType`, `entityId`, `action`

---

## 17. Audit Log

### GET /api/audit-logs
List audit log entries.

**Roles:** Founder, Admin

**Filters:** `actionType`, `actorId`, `targetType`, `dateFrom`, `dateTo`

### GET /api/audit-logs/export
Export audit log as CSV file download.

**Roles:** Founder, Admin

---

## 18. Pagination Standard

All list endpoints follow this pagination standard:

**Request:** `?page=1&pageSize=20`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 142,
    "totalPages": 8
  }
}
```

Default page size: 20. Max: 100.

---

## 19. Error Response Format

### Validation Error (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "\"name\" is required" },
    { "field": "email", "message": "\"email\" must be a valid email" }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

### Authorization Error (403)
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### Not Found (404)
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Task not found"
}
```

### Conflict (409)
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Email already exists"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "statusCode": 429,
  "message": "Too many requests. Try again later."
}
```

### Server Error (500)
```json
{
  "success": false,
  "statusCode": 500,
  "message": "An unexpected error occurred"
}
```

---

## 20. Standard Response Envelope

### Success
```json
{
  "success": true,
  "data": { ... }  // or [...]
}
```

### List with Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 142,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error message",
  "errors": [...] // optional, for validation details
}
```

---

## 21. Complete Endpoint Summary

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | /api/auth/register | ❌ | — | Register new org + Founder |
| POST | /api/auth/login | ❌ | — | Login |
| GET | /api/auth/me | ✅ | All | Get my profile |
| PATCH | /api/auth/me | ✅ | All | Update my profile |
| GET | /api/organizations/:id | ✅ | All | Get org |
| PATCH | /api/organizations/:id | ✅ | Founder, Admin | Update org settings |
| DELETE | /api/organizations/:id | ✅ | Founder | Delete org |
| POST | /api/departments | ✅ | Founder, Admin | Create department |
| GET | /api/departments | ✅ | All | List departments |
| GET | /api/departments/:id | ✅ | All | Get department |
| PATCH | /api/departments/:id | ✅ | Founder, Admin | Update department |
| DELETE | /api/departments/:id | ✅ | Founder, Admin | Delete department |
| POST | /api/teams | ✅ | Founder, Admin | Create team |
| GET | /api/teams | ✅ | All | List teams |
| GET | /api/teams/:id | ✅ | All | Get team |
| PATCH | /api/teams/:id | ✅ | Founder, Admin | Update team |
| DELETE | /api/teams/:id | ✅ | Founder, Admin | Delete team |
| POST | /api/teams/:id/members | ✅ | Founder, Admin, Manager | Add members |
| DELETE | /api/teams/:id/members/:userId | ✅ | Founder, Admin, Manager | Remove member |
| POST | /api/users/invite | ✅ | Founder, Admin | Invite user |
| GET | /api/users | ✅ | All | List users |
| GET | /api/users/:id | ✅ | All | Get user |
| PATCH | /api/users/:id/role | ✅ | Founder, Admin | Change role |
| PATCH | /api/users/:id/deactivate | ✅ | Founder, Admin | Deactivate user |
| PATCH | /api/users/:id/reactivate | ✅ | Founder, Admin | Reactivate user |
| POST | /api/projects | ✅ | Founder, Admin, Manager | Create project |
| GET | /api/projects | ✅ | All | List projects (role-scoped) |
| GET | /api/projects/:id | ✅ | All | Get project |
| PATCH | /api/projects/:id | ✅ | Founder, Admin, Manager | Update project |
| DELETE | /api/projects/:id | ✅ | Founder, Admin, Manager | Delete project |
| POST | /api/projects/:pid/milestones | ✅ | Founder, Admin, Manager | Create milestone |
| GET | /api/projects/:pid/milestones | ✅ | All | List milestones |
| POST | /api/projects/:pid/tasks | ✅ | Founder, Admin, Mgr, TL | Create task |
| GET | /api/projects/:pid/tasks | ✅ | All | List project tasks |
| GET | /api/milestones/:id | ✅ | All | Get milestone |
| PATCH | /api/milestones/:id | ✅ | Founder, Admin, Manager | Update milestone |
| DELETE | /api/milestones/:id | ✅ | Founder, Admin, Manager | Delete milestone |
| GET | /api/tasks | ✅ | All | List tasks (filtered) |
| GET | /api/tasks/:id | ✅ | All | Get task |
| PATCH | /api/tasks/:id | ✅ | Various | Update task |
| DELETE | /api/tasks/:id | ✅ | Various | Delete task |
| PATCH | /api/tasks/:id/status | ✅ | Various | Update status |
| PATCH | /api/tasks/:id/assign | ✅ | Various | Assign/reassign |
| GET | /api/tasks/:id/subtasks | ✅ | All | Get subtasks |
| POST | /api/comments?taskId=... | ✅ | All | Create comment |
| GET | /api/comments?taskId=... | ✅ | All | List comments |
| PATCH | /api/comments/:id | ✅ | Author | Edit comment |
| DELETE | /api/comments/:id | ✅ | Author or Admin | Delete comment |
| POST | /api/documents/upload | ✅ | Various | Upload file |
| GET | /api/documents | ✅ | All | List documents |
| GET | /api/documents/:id | ✅ | All | Get document |
| GET | /api/documents/:id/download | ✅ | All | Download |
| DELETE | /api/documents/:id | ✅ | Owner or Admin | Delete |
| GET | /api/notifications | ✅ | All | List notifications |
| PATCH | /api/notifications/:id/read | ✅ | All | Mark read |
| PATCH | /api/notifications/read-all | ✅ | All | Mark all read |
| GET | /api/dashboards/org | ✅ | Founder, Admin | Org dashboard |
| GET | /api/dashboards/department | ✅ | Founder, Admin, Mgr | Dept dashboard |
| GET | /api/dashboards/team | ✅ | Founder, Admin, Mgr, TL | Team dashboard |
| GET | /api/dashboards/personal | ✅ | All | Personal dashboard |
| GET | /api/reports/tasks | ✅ | Founder, Admin, Mgr, TL | Task report |
| GET | /api/reports/workload | ✅ | Founder, Admin, Mgr, TL | Workload report |
| GET | /api/reports/projects | ✅ | Founder, Admin, Mgr | Project report |
| GET | /api/reports/department-throughput | ✅ | Founder, Admin, Mgr | Throughput report |
| GET | /api/search | ✅ | All | Full-text search |
| GET | /api/activities | ✅ | All | Activity timeline |
| GET | /api/audit-logs | ✅ | Founder, Admin | Audit logs |
| GET | /api/audit-logs/export | ✅ | Founder, Admin | Export audit logs |
| GET | /health | ❌ | — | Health check |

---

## 22. Rate Limiting

| Tier | Limit | Scope | Endpoints |
|------|-------|-------|-----------|
| Standard | 1,000 req/min | Global per IP/user | All `/api/*` endpoints |
| Upload | 100 req/min | Global per IP/user | `/api/documents/upload` |

Rate limit headers (standard): `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (via express-rate-limit standard headers).

---

## 23. Authorization Matrix (API-Level)

| Action | Founder | Admin | Manager | Team Lead | Employee |
|--------|---------|-------|---------|-----------|----------|
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| CRUD Org | All but delete=Founder | R+U | — | — | — |
| CRUD Departments | ✅ | ✅ | R (own) | R (own) | R (own) |
| CRUD Teams | ✅ | ✅ | R+Add members | R (own) | R (own) |
| Invite/Manage users | ✅ | ✅ | — | — | — |
| CRUD Projects | ✅ | ✅ | CRUD (own) | R (own team) | R (assigned) |
| CRUD Milestones | ✅ | ✅ | CRUD | R (own team) | — |
| Create Tasks | ✅ | ✅ | ✅ | ✅ | — |
| Edit/Delete Tasks | ✅ | ✅ | ✅ (own dept) | ✅ (own team) | — |
| Update Task Status | ✅ | ✅ | ✅ | ✅ | ✅ (own) |
| Assign Tasks | ✅ | ✅ | ✅ | ✅ (own team) | — |
| CRUD Comments | All | All+delete any | All | All | Create own, edit own |
| Upload Documents | ✅ | ✅ | ✅ (own project) | ✅ (own task) | ✅ (own task) |
| View Dashboards | Org | Org | Dept | Team | Personal |
| View Reports | ✅ | ✅ | Dept | Team | — |
| View Audit Log | ✅ | ✅ | — | — | — |
| Full-text Search | ✅ | ✅ | ✅ | ✅ | ✅ |
