# Product Requirements Document — Enterprise Task Management Platform v1

---

## 1. Product Vision

A centralized, role-aware task management platform that enables enterprise organizations to plan, track, and deliver work across departments and teams. The platform provides clear visibility into project progress, individual accountability, and organizational throughput — without AI, chat, or automation. It is the single source of truth for who is doing what, by when, and in what state.

---

## 2. Business Goals

1. **Operational Visibility:** Give every role — from Founder to Employee — a real-time view of work status relevant to their scope (org-wide, department, team, individual).
2. **Accountability:** Ensure every task has exactly one assignee and a clear status so responsibility is never ambiguous.
3. **Cross-Team Coordination:** Allow departments and teams to share documents, comments, and milestones without duplicating work.
4. **Scalable Onboarding:** Support invite-based employee onboarding with role assignment so organizations can grow from 5 to 5,000 employees without process breakdown.
5. **Audit Readiness:** Maintain a complete audit log of all state-changing actions for compliance and retrospectives.
6. **Reporting & Analytics:** Enable data-driven decisions through dashboards and exportable reports on progress, bottlenecks, and completion rates.

---

## 3. Target Customers

| Segment | Description |
|---------|-------------|
| **Small-to-Medium Enterprises (SMEs)** | 10–500 employees; need structured task tracking without the overhead of enterprise suites like Jira or ServiceNow |
| **Fast-Growing Startups** | 5–200 employees; need lightweight role management and project tracking as they scale |
| **Enterprise Departments** | Individual departments (Engineering, Marketing, Operations) within larger orgs that need their own project workspace |
| **Consulting Firms** | Need client-project separation, milestone tracking, and document sharing across engagement teams |

---

## 4. User Personas

### 4.1 Founder
- **Name:** Alex Chen
- **Role:** Founder / CEO
- **Goals:** See org-wide progress at a glance; identify bottlenecks; ensure strategic projects are on track; generate reports for investors.
- **Pain Points:** Currently uses spreadsheets and Slack — no single source of truth; can't easily see which departments are overcapacity.
- **Scope:** Full access to everything in the organization.

### 4.2 Admin
- **Name:** Jordan Taylor
- **Role:** System Administrator / COO
- **Goals:** Manage organizations, departments, teams; invite/remove employees; configure roles; oversee audit log.
- **Pain Points:** Spends hours manually reconciling team membership across tools; needs a single panel for user lifecycle management.
- **Scope:** All administrative functions except actions locked to the Founder role (e.g., deleting the org).

### 4.3 Manager
- **Name:** Sam Rivera
- **Role:** Department / Project Manager
- **Goals:** Create projects and milestones; assign tasks; track progress across multiple teams; generate department reports; approve/reject deliverables.
- **Pain Points:** Lacks visibility into what their teams are actually working on; status updates come through scattered Slack messages.
- **Scope:** Full CRUD within their department(s) and managed projects/teams.

### 4.4 Team Lead
- **Name:** Priya Patel
- **Role:** Team Lead / Tech Lead
- **Goals:** Break down milestones into tasks; assign work to team members; review comments and @mentions; update task progress; track team workload.
- **Pain Points:** No easy way to see if a team member is overloaded; status meetings waste time that could be spent on actual work.
- **Scope:** Create/assign tasks within their team; view reports for their team.

### 4.5 Employee
- **Name:** Marcus Williams
- **Role:** Individual Contributor / Employee
- **Goals:** See their assigned tasks; update status; comment on tasks; upload relevant files; receive notifications about assignments and @mentions.
- **Pain Points:** Loses track of tasks assigned across different projects; misses updates because they're buried in email threads.
- **Scope:** Self-service — manage own tasks, comments, files, and profile.

---

## 5. User Stories

### 5.1 Founder
- As a **Founder**, I want to **view an organization-wide dashboard**, so that **I can see the health of all projects at a glance**.
- As a **Founder**, I want to **generate reports on completion rates across departments**, so that **I can make strategic resource decisions**.
- As a **Founder**, I want to **view the audit log**, so that **I can verify compliance and review sensitive changes**.
- As a **Founder**, I want to **invite Admins**, so that **I can delegate operational management**.
- As a **Founder**, I want to **configure organization-wide settings**, so that **I can set naming conventions, default roles, and retention policies**.

### 5.2 Admin
- As an **Admin**, I want to **create and manage departments**, so that **the org structure is reflected in the platform**.
- As an **Admin**, I want to **create and manage teams within departments**, so that **employees can be grouped by function**.
- As an **Admin**, I want to **invite employees by email**, so that **new hires can access the platform**.
- As an **Admin**, I want to **assign roles to employees**, so that **permissions are enforced correctly**.
- As an **Admin**, I want to **manage all projects across the organization**, so that **nothing falls through the cracks**.
- As an **Admin**, I want to **view and export the audit log**, so that **I can investigate changes**.
- As an **Admin**, I want to **manage notification templates**, so that **alerts reach the right people**.
- As an **Admin**, I want to **upload organization-wide documents**, so that **policies and resources are accessible to all**.

### 5.3 Manager
- As a **Manager**, I want to **create projects**, so that **work can be organized into structured initiatives**.
- As a **Manager**, I want to **create milestones within a project**, so that **key delivery dates are tracked**.
- As a **Manager**, I want to **assign team leads to projects**, so that **each project has an accountable lead**.
- As a **Manager**, I want to **view progress across all my projects**, so that **I can identify at-risk deliverables**.
- As a **Manager**, I want to **assign tasks to employees in my department**, so that **work is distributed appropriately**.
- As a **Manager**, I want to **receive notifications when a task status changes**, so that **I stay informed of progress**.
- As a **Manager**, I want to **generate department reports**, so that **I can share status with leadership**.
- As a **Manager**, I want to **comment on tasks across my department**, so that **I can provide guidance**.
- As a **Manager**, I want to **view and manage documents for my projects**, so that **resources are organized**.

### 5.4 Team Lead
- As a **Team Lead**, I want to **break down milestones into tasks**, so that **work is well-defined and assignable**.
- As a **Team Lead**, I want to **assign tasks to team members**, so that **everyone knows their responsibilities**.
- As a **Team Lead**, I want to **reorder and prioritize tasks**, so that **the team works on the right things first**.
- As a **Team Lead**, I want to **update task progress and status**, so that **the team's work is accurately reflected**.
- As a **Team Lead**, I want to **@mention team members in comments**, so that **I can direct attention to specific updates**.
- As a **Team Lead**, I want to **view a team workload report**, so that **I can balance assignments**.
- As a **Team Lead**, I want to **get notified of task completions**, so that **I can review and approve work**.

### 5.5 Employee
- As an **Employee**, I want to **see my assigned tasks in a single view**, so that **I know what to work on**.
- As an **Employee**, I want to **update the status of my tasks**, so that **my progress is visible to the team**.
- As an **Employee**, I want to **comment on tasks**, so that **I can ask questions and share updates**.
- As an **Employee**, I want to **upload files to tasks**, so that **relevant materials are attached to the work**.
- As an **Employee**, I want to **receive notifications when I am assigned or @mentioned**, so that **I don't miss important updates**.
- As an **Employee**, I want to **update my profile**, so that **my contact information and preferences are current**.
- As an **Employee**, I want to **filter my tasks by project, status, and priority**, so that **I can focus on what matters**.

### 5.6 All Roles
- As any **User**, I want to **search across tasks, projects, and documents**, so that **I can find information quickly**.
- As any **User**, I want to **receive email notifications for relevant events**, so that **I stay informed even when not logged in**.
- As any **User**, I want to **view the activity timeline for a task or project**, so that **I can see what happened and when**.

---

## 6. Functional Requirements

| # | Capability Area | Requirement | Source |
|---|---|---|---|
| FR-01 | **Organizations** | The system shall support multiple organizations, each with its own isolated data, roles, and settings. | Fixed capability list |
| FR-02 | **Departments** | The system shall allow each organization to create and manage departments (e.g., Engineering, Marketing, Sales). | Fixed capability list |
| FR-03 | **Teams** | The system shall allow each department to contain multiple teams. Each team belongs to exactly one department. | Fixed capability list |
| FR-04 | **Employee Invites** | The system shall allow Admins/Founders to invite employees by email, assign a role, and assign them to one or more teams. | Fixed capability list |
| FR-05 | **Employee Management** | The system shall allow Admins/Founders to view, edit, deactivate, and change roles of employees. | Fixed capability list |
| FR-06 | **Projects** | The system shall allow Managers/Admins/Founders to create projects, assign a manager, and set a department scope. | Fixed capability list |
| FR-07 | **Milestones** | The system shall allow projects to contain milestones with a name, description, due date, and status. | Fixed capability list |
| FR-08 | **Tasks** | The system shall allow tasks to be created within projects or milestones, with fields for title, description, priority, status, assignee, due date, and estimated effort. | Fixed capability list |
| FR-09 | **Task Assignment** | The system shall allow authorized roles to assign tasks to employees, with a one-task-one-assignee rule (single assignee per task). The assignee must belong to the same organization. | Fixed capability list |
| FR-10 | **Progress Tracking** | The system shall track and display task status (To Do, In Progress, In Review, Done, Blocked) and compute project/milestone completion percentages from subtask statuses. | Fixed capability list |
| FR-11 | **Reports** | The system shall allow authorized roles to generate reports on task completion, workload, project progress, and department throughput, filterable by date range and status. | Fixed capability list |
| FR-12 | **Document Sharing** | The system shall allow file upload and sharing at the project and task level, with role-based access. | Fixed capability list |
| FR-13 | **Comments** | The system shall allow threaded comments on tasks, with support for @mentions. | Fixed capability list |
| FR-14 | **@Mentions** | The system shall detect @mention patterns in comments, parse them to user links, and trigger a notification for the mentioned user. | Fixed capability list |
| FR-15 | **File Uploads** | The system shall support file uploads (images, PDFs, documents) with size limits, type restrictions, and virus scanning [ASSUMPTION — confirm]. | Fixed capability list |
| FR-16 | **Notifications** | The system shall generate notifications for: task assignment, status changes, @mentions, comment replies, milestone approaching, and task overdue. Notifications delivered via in-app bell and email. | Fixed capability list |
| FR-17 | **Dashboards** | The system shall provide role-scoped dashboards: org-wide (Founder), department (Manager), team (Team Lead), personal (Employee). | Fixed capability list |
| FR-18 | **Analytics** | The system shall track and display aggregate metrics: tasks completed per week, average completion time, workload distribution, and project burndown. | Fixed capability list |
| FR-19 | **Search** | The system shall support full-text search across tasks, projects, comments, and documents. | Module list |
| FR-20 | **Filtering** | The system shall support filtering tasks by status, priority, assignee, project, milestone, due date range, and department. | Module list |
| FR-21 | **Sorting** | The system shall support sorting tasks by due date, priority, status, assignee, and created date in ascending or descending order. | Module list |
| FR-22 | **Pagination** | The system shall paginate all list endpoints with configurable page size (default 20, max 100). | Module list |
| FR-23 | **Profile** | The system shall allow users to view and edit their own profile (name, email, avatar, notification preferences). | Module list |
| FR-24 | **Settings** | The system shall provide organization-level settings (name, branding, default role for new invites) configurable by Founder/Admin. | Module list |
| FR-25 | **Activity Timeline** | The system shall maintain a chronological activity timeline per entity (task, project, milestone) showing all state changes. | Module list |
| FR-26 | **Audit Log** | The system shall maintain a separate, non-editable audit log of all administrative actions (role changes, invites, deactivations, permission changes). | Module list |
| FR-27 | **Email Notifications** | The system shall send email notifications for assignable events (task assignment, @mention, milestone due soon, task overdue) with unsubscribe per event type. | Module list |
| FR-28 | **Real-Time Updates** | The system shall use WebSocket/Socket.IO to push real-time updates for task status changes, new comments, and notifications to connected clients. | Module list |

---

## 7. Non-Functional Requirements

| # | Category | Requirement |
|---|---|---|
| NFR-01 | **Performance** | Page load times shall be under 2 seconds for dashboards and under 500ms for individual API responses (p95). [ASSUMPTION — confirm] |
| NFR-02 | **Availability** | The system shall target 99.5% uptime during business hours (8 AM – 8 PM local). Planned maintenance windows are excluded. [ASSUMPTION — confirm] |
| NFR-03 | **Scalability** | The architecture shall support up to 1,000 concurrent users per organization and up to 100,000 tasks without degradation. [ASSUMPTION — confirm] |
| NFR-04 | **Accessibility** | The frontend shall target WCAG 2.1 AA compliance for all core user flows (task management, dashboards, comments). |
| NFR-05 | **Data Retention** | Soft-deleted entities shall be retained for 90 days before permanent deletion. Audit log shall be retained for a minimum of 1 year. [ASSUMPTION — confirm] |
| NFR-06 | **Security** | All API traffic must be over HTTPS. Passwords (if any) must be hashed with bcrypt. JWT tokens must expire within 24 hours. |
| NFR-07 | **Backup** | Database backups shall be taken daily with a 30-day retention period. [ASSUMPTION — confirm] |
| NFR-08 | **Observability** | The system shall log all API requests with method, path, status code, response time, and authenticated user ID. |

---

## 8. Roles and Permissions (Narrative)

The platform defines five roles in a strict hierarchy of authority:

**Founder** — The top-level role within an organization. A Founder has unrestricted access to all data, settings, and administrative functions. There is at least one Founder per organization (the original creator). Founders can transfer ownership to another user.

**Admin** — An operational administrator beneath the Founder. Admins manage the organizational structure (departments, teams), employee lifecycle (invites, role assignments, deactivations), and have full CRUD access to all projects, tasks, and documents. Admins cannot delete the organization, cannot change the Founder's role, and cannot access certain Founder-only settings.

**Manager** — A department-level or project-level manager. Managers have full CRUD within their assigned departments and projects. They can create projects, milestones, and tasks; assign tasks to employees in their department; view and generate department reports. Managers cannot manage users (invite/deactivate employees), cannot modify org-level settings, and cannot access other departments' data unless explicitly assigned.

**Team Lead** — A team-level leader within a department. Team Leads can break down milestones into tasks, assign tasks to employees on their team, update task statuses, comment on tasks, and view team-level reports. Team Leads cannot create projects or milestones (they operate within projects assigned by a Manager), cannot access other teams' data, and cannot manage employees.

**Employee** — An individual contributor. Employees can view and update tasks assigned to them, comment on tasks they are involved in, upload files to their tasks, view their personal dashboard, update their own profile, and receive notifications. Employees cannot create projects, milestones, or tasks; cannot view other users' tasks unless explicitly shared; and cannot access admin/management screens.

---

## 9. Full Permission Matrix

| Action | Founder | Admin | Manager | Team Lead | Employee |
|--------|---------|-------|---------|-----------|----------|
| **Organization** | | | | | |
| Create organization | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edit organization settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete organization | ✓ | ✗ | ✗ | ✗ | ✗ |
| Transfer ownership | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Departments** | | | | | |
| Create department | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit department | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete department | ✓ | ✓ | ✗ | ✗ | ✗ |
| View all departments | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) |
| **Teams** | | | | | |
| Create team | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit team | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete team | ✓ | ✓ | ✗ | ✗ | ✗ |
| View all teams | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) |
| **Employees** | | | | | |
| Invite employee | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit employee role | ✓ | ✓ | ✗ | ✗ | ✗ |
| Deactivate employee | ✓ | ✓ | ✗ | ✗ | ✗ |
| Reactivate employee | ✓ | ✓ | ✗ | ✗ | ✗ |
| Remove employee from team | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| View employee list | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) |
| **Projects** | | | | | |
| Create project | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit project | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| Delete project | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| View project | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (assigned) |
| **Milestones** | | | | | |
| Create milestone | ✓ | ✓ | ✓ | ✗ | ✗ |
| Edit milestone | ✓ | ✓ | ✓ | ✓ (in own team tasks) | ✗ |
| Delete milestone | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Tasks** | | | | | |
| Create task | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit task (any field) | ✓ | ✓ | ✓ (own dept.) | ✓ (own team) | ✗ |
| Assign task | ✓ | ✓ | ✓ | ✓ (own team) | ✗ |
| Reassign task | ✓ | ✓ | ✓ | ✓ (own team) | ✗ |
| Update task status | ✓ | ✓ | ✓ | ✓ | ✓ (own tasks) |
| Delete task | ✓ | ✓ | ✓ (own dept.) | ✓ (own team) | ✗ |
| View task | ✓ | ✓ | ✓ (own dept.) | ✓ (own team) | ✓ (own) |
| **Comments** | | | | | |
| Create comment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own comment | ✓ | ✓ | ✓ | ✓ | ✓ |
| Delete any comment | ✓ | ✓ | ✗ | ✗ | ✗ |
| Use @mentions | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Documents / Files** | | | | | |
| Upload file | ✓ | ✓ | ✓ (own project) | ✓ (own task) | ✓ (own task) |
| Download file | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) |
| Delete file | ✓ | ✓ | ✓ (own project) | ✓ (own task) | ✗ |
| **Reports** | | | | | |
| View org-wide reports | ✓ | ✓ | ✗ | ✗ | ✗ |
| View department reports | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| View team reports | ✓ | ✓ | ✓ | ✓ (own) | ✗ |
| Export reports | ✓ | ✓ | ✓ (own) | ✓ (own) | ✗ |
| **Notifications** | | | | | |
| View notifications | ✓ | ✓ | ✓ | ✓ | ✓ |
| Manage notification preferences | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dashboards** | | | | | |
| View org dashboard | ✓ | ✓ | ✗ | ✗ | ✗ |
| View department dashboard | ✓ | ✓ | ✓ (own) | ✗ | ✗ |
| View team dashboard | ✓ | ✓ | ✓ | ✓ (own) | ✗ |
| View personal dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Audit Log** | | | | | |
| View audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| Export audit log | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Settings** | | | | | |
| View org settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit org settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| View own profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Search** | | | | | |
| Global search | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Activity Timeline** | | | | | |
| View activity timeline | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ (own) |

---

## 10. Complete Module Breakdown

### 10.1 Project Module
- CRUD for projects (name, description, department, manager, start date, end date, status)
- Project list with filtering & sorting (by status, department, manager, date range)
- Project detail view with milestones, tasks, and progress summary
- Project-level document repository

### 10.2 Task Module
- CRUD for tasks (title, description, priority, status, assignee, milestone, due date, estimated effort, actual effort)
- Task list with advanced filtering (by project, milestone, assignee, status, priority, due date range)
- Task detail view with activity timeline, comments, and attached files
- Bulk status updates
- Task dependencies (blocked-by relationships) [BLOCKING QUESTION]

### 10.3 Dashboard Module
- Org-wide dashboard: aggregate metrics across all departments
- Department dashboard: filtered to department scope
- Team dashboard: filtered to team scope
- Personal dashboard: filtered to current user's assigned tasks
- Widgets: tasks by status pie chart, overdue tasks list, upcoming deadlines
- Real-time refresh via Socket.IO

### 10.4 Reporting Module
- Task completion report (filterable by date range, department, project, assignee)
- Workload report (tasks per assignee, grouped by status)
- Project progress report (milestone completion %, task completion %)
- Department throughput report (tasks completed per week)
- Export to CSV

### 10.5 Notification Module
- In-app notification bell with unread count badge
- Notification types: task_assigned, status_changed, @mention, comment_reply, milestone_approaching, task_overdue
- Notification preferences per type (email on/off, in-app on/off)
- Mark as read / Mark all as read
- Click notification navigates to relevant entity

### 10.6 Document Module
- Upload files to projects and tasks
- File metadata (name, size, type, uploader, upload date)
- Download files (role-scoped permission check)
- Delete files (role-scoped)
- File type whitelist and size limit enforcement

### 10.7 Comments Module
- Threaded comments on tasks (top-level + replies)
- @mention parsing with auto-complete suggestions
- Rich text support (optional, can be plaintext with markdown) [BLOCKING QUESTION]
- Edit own comment (within time window) [BLOCKING QUESTION]
- Delete comment (role-scoped)
- Activity timeline integration

### 10.8 Activity Timeline Module
- Per-entity chronological log of state changes
- Entry format: "[User] [action] [field] on [entity]" e.g., "Sam Rivera changed status of 'Design login page' from 'To Do' to 'In Progress'"
- Visible on task detail, project detail, milestone detail pages

### 10.9 Audit Log Module
- Separate system-level log for administrative actions
- Logged actions: role changes, employee invites, deactivations, permission changes, org settings changes
- Immutable (no delete/edit of log entries)
- Filterable by action type, user, date range
- Exportable by Founder/Admin

### 10.10 Organization Module
- Org creation (name, domain, logo)
- Org settings (default role for new invites, branding, retention policy)
- Org-level user management
- Org deletion (Founder only, with confirmation)

### 10.11 Teams Module
- Teams nested under departments
- Team membership management (add/remove employees)
- Team lead assignment (one or more per team)

### 10.12 Departments Module
- Departments under organization
- Department head assignment
- Department-level permission boundaries

### 10.13 Profile Module
- View/edit own profile: name, email, avatar, job title, phone
- Change notification preferences
- View own role and team memberships

### 10.14 Settings Module
- Organization settings (Founder/Admin)
- Notification templates (Admin) [BLOCKING QUESTION]

### 10.15 Search Module
- Full-text search across tasks (title, description), projects (name, description), comments (body), and document names
- Results grouped by entity type
- Search suggestions / typeahead

### 10.16 Filtering Module
- Filter tasks by: status (multi-select), priority, assignee, project, milestone, department, due date range
- Filter projects by: status, department, manager, date range
- Filter reports by: date range, department, project, assignee

### 10.17 Sorting Module
- Sort tasks by: due date (asc/desc), priority (high→low), status (workflow order), assignee (alphabetical), created date (asc/desc)
- Sort projects by: name, created date, status, completion percentage

### 10.18 Pagination Module
- Paginate all list endpoints
- Default page size: 20, configurable per-request up to 100
- Response includes: items[], totalCount, page, pageSize, totalPages

### 10.19 File Upload Module
- Allowed file types: images (jpg, png, gif, svg, webp), documents (pdf, doc, docx, xls, xlsx, ppt, pptx), text (txt, csv, md) [ASSUMPTION — confirm]
- Max file size: 25MB per file [ASSUMPTION — confirm]
- Total storage per project: 5GB [ASSUMPTION — confirm]

### 10.20 Email Notifications Module
- Email delivery for: task assignment, @mention, milestone due within 7 days, task overdue
- Unsubscribe link per event type
- HTML email templates

### 10.21 Real-Time Updates Module
- Socket.IO connection for authenticated users
- Events: task.updated, comment.created, notification.new
- Connection scoped to user's permissions (only receive events for entities the user can see)

---

## 11. Error Handling & Validation Rules

### 11.1 Business Validation Errors
| # | Rule | Error Message |
|---|---|---|
| VAL-01 | Required fields (title, name, email) must not be empty | `{field} is required` |
| VAL-02 | Email must be valid format | `Invalid email format` |
| VAL-03 | Task due date must be in the future (or today) | `Due date must be today or later` |
| VAL-04 | Task due date must be within the milestone's date range | `Due date exceeds milestone date range` |
| VAL-05 | Milestone due date must be within the project's date range | `Milestone due date exceeds project date range` |
| VAL-06 | File size exceeds limit | `File size exceeds the 25MB limit` |
| VAL-07 | File type not allowed | `File type {type} is not allowed. Allowed types: {list}` |
| VAL-08 | Cannot assign task to a user outside the organization | `User is not a member of this organization` |
| VAL-09 | Cannot assign task to a user outside the department/project | `User is not a member of this project's department` |
| VAL-10 | Email already in use for invite | `An account with this email already exists` |
| VAL-11 | Cannot delete a department that contains teams | `Cannot delete department: it still contains teams` |
| VAL-12 | Cannot delete a project that contains tasks | `Cannot delete project: it still contains tasks` |
| VAL-13 | Cannot delete the last Founder | `Organization must have at least one Founder` |
| VAL-14 | Invalid role assignment | `Role {role} is not a valid role` |
| VAL-15 | Priority must be one of: Low, Medium, High, Critical | `Invalid priority value` |

### 11.2 Auth-Related Errors
| # | Scenario | Status | Error |
|---|---|---|---|
| AUTH-01 | No auth token provided | 401 | `Authentication required` |
| AUTH-02 | Invalid/expired token | 401 | `Invalid or expired token` |
| AUTH-03 | Valid token but insufficient role | 403 | `Insufficient permissions` |
| AUTH-04 | Valid token but entity not in user's scope (e.g., wrong department) | 403 | `Access denied to this resource` |
| AUTH-05 | Account deactivated | 403 | `Account is deactivated` |

### 11.3 System Errors
| # | Scenario | Status | Error |
|---|---|---|---|
| SYS-01 | Entity not found | 404 | `{Entity} not found` |
| SYS-02 | Duplicate entity (unique constraint violation) | 409 | `{Entity} with this {field} already exists` |
| SYS-03 | Rate limit exceeded | 429 | `Too many requests. Try again in {seconds} seconds` |
| SYS-04 | Internal server error | 500 | `An unexpected error occurred` |
| SYS-05 | Service unavailable (maintenance) | 503 | `Service temporarily unavailable` |

---

## 12. Business Rules

| # | Rule | Source |
|---|---|---|
| BR-01 | A task can have exactly one assignee at a time. | Requirement (Task assignment) |
| BR-02 | A task's status can only move forward in the workflow: To Do → In Progress → In Review → Done. Blocked is an exception state that can be entered from any active status (To Do, In Progress, In Review). A Blocked task can only move back to To Do or In Progress (not directly to In Review or Done). | Derived from workflow logic |
| BR-03 | A task cannot be set to Done if it has open subtasks (if subtasks are implemented). | [BLOCKING QUESTION — are subtasks in scope?] |
| BR-04 | A milestone is considered complete when all tasks within it are Done. | Derived from milestone tracking |
| BR-05 | A project is considered complete when all milestones within it are complete. | Derived from project tracking |
| BR-06 | An employee can belong to multiple teams but exactly one department. | Derived from org structure |
| BR-07 | An employee who is deactivated loses access immediately. Their assigned tasks remain in the system and are reassignable by a Manager. | Derived from employee lifecycle |
| BR-08 | Notification preferences default to all-on for new users (both in-app and email). | Derived from UX |
| BR-09 | An @mention must reference a user within the same organization. | Derived from security |
| BR-10 | The creator of an organization is automatically assigned the Founder role. | Derived from org creation |
| BR-11 | A department can only be deleted if it contains no teams. | Derived from data integrity |

---

## 13. Edge Cases & Failure Scenarios

| # | Scenario | Expected Behavior |
|---|---|---|
| EC-01 | User attempts to assign a task to a deactivated employee | Reject with error: `Cannot assign task to a deactivated user` |
| EC-02 | User attempts to upload a file larger than 25MB | Reject at upload with descriptive error; no partial upload |
| EC-03 | User attempts to create a task with a due date in the past | Reject with validation error; due date must be today or later |
| EC-04 | User attempts to delete the last department in an organization | Allow it, but org-wide reports will show gaps; confirm dialog required |
| EC-05 | Two employees with the same name in different teams | Display full name + department/team suffix in @mention suggestions |
| EC-06 | Email notification fails to deliver | Log the failure; do not block the triggering action; retry up to 3 times |
| EC-07 | User deactivates while they have assigned tasks | Tasks remain in the system; Manager/Admin can reassign them; the task shows "Unassigned" status for the deactivated user |
| EC-08 | Concurrent edit of the same task | Last writer wins; notify the overwritten user via real-time update of the new state |
| EC-09 | Network drops during file upload | The upload should fail atomically (no partial files stored); user can retry |
| EC-10 | User attempts to invite an email that already belongs to an active user in the org | Reject: `User is already a member of this organization` |
| EC-11 | Founder attempts to delete their own account without transferring ownership | Reject: `Transfer organization ownership before deleting your account` |
| EC-12 | Browser tab closes mid-comment | Comment not saved; draft recovery is a v2 feature |
| EC-13 | Search query exceeds max length (200 chars) | Truncate or reject with `Search query too long` |
| EC-14 | Bulk status update includes tasks the user does not have permission to edit | Process the permitted tasks; skip and report the unpermitted ones in the response |

---

## 14. Scalability Considerations

| # | Consideration | Design Approach |
|---|---|---|
| SC-01 | Database indexing | Index all fields used in filtering/sorting (status, priority, assignee, dueDate, project, milestone, createdAt) |
| SC-02 | Pagination | All list endpoints paginated; no unbounded result sets |
| SC-03 | File storage | Files stored externally (S3-compatible); database stores only metadata + URL |
| SC-04 | N+1 query prevention | Mongoose populate and aggregation pipeline optimization; eager-load relationships |
| SC-05 | Rate limiting | API rate limiting per authenticated user (e.g., 1000 req/min for most endpoints, 100 req/min for file uploads) [ASSUMPTION — confirm] |
| SC-06 | Caching | In-memory caching for read-heavy lookups (organization settings, user profile); cache invalidation on writes |
| SC-07 | Real-time scaling | Socket.IO with Redis adapter for horizontal scaling of WebSocket connections |
| SC-08 | Read replicas | MongoDB read replicas for dashboard and report queries that are read-intensive (future, not v1) |

---

## 15. Future AI Integration Points (v2)

These sections are clearly marked as v2/future. No design or implementation work should be done for them in v1. They are listed here solely so the architecture (module boundaries, extensibility points) does not preclude them.

| # | Extension Point | v1 Impact |
|---|---|---|
| AI-01 | **AI Operations Manager** — a new role that can auto-assign tasks, suggest priorities, and detect bottlenecks | v1 must have pluggable role system; v1 task assignment API must accept a configurable assignment engine |
| AI-02 | **Smart Suggestions** — AI-suggested task breakdown from milestone descriptions | v1 milestone model must include a "description" field that could serve as input |
| AI-03 | **Auto-Triage** — AI that reads incoming comments and re-routes tasks | v1 comment model must include entity linkage; v1 notification system must support routing rules |
| AI-04 | **Predictive Analytics** — AI predicts project completion dates from historical velocity | v1 must store task-level timestamps (createdAt, statusChangeAt) for each transition; v1 reporting must expose velocity data |
| AI-05 | **Natural Language Search** — semantic search across tasks and documents | v1 search API should be a separate module that can be updated to use a vector search backend |

---

## 16. Acceptance Criteria (per module)

| Module | # | Acceptance Criterion |
|--------|---|---------------------|
| **Organization** | AC-01 | Founder can create an organization and is automatically assigned as Founder |
| Organization | AC-02 | Admin can edit organization name and settings |
| Organization | AC-03 | Only the Founder can delete the organization (with confirmation dialog) |
| Organization | AC-04 | Each organization's data is fully isolated from other organizations |
| **Departments** | AC-05 | Admin can create, edit, and delete departments |
| Departments | AC-06 | Deleting a department with teams is rejected with an error message |
| Departments | AC-07 | Manager can view departments they belong to |
| **Teams** | AC-08 | Admin can create, edit, and delete teams within a department |
| Teams | AC-09 | Teams display their member count and department name |
| Teams | AC-10 | Employees can belong to multiple teams |
| **Employee Invites** | AC-11 | Admin can invite an employee by email with role and team assignment |
| Employee Invites | AC-12 | Invited user receives an email with a signup link |
| Employee Invites | AC-13 | Duplicate invite to an existing member is rejected |
| **Projects** | AC-14 | Manager can create a project with name, description, department, and date range |
| Projects | AC-15 | Milestones can be created within a project |
| Projects | AC-16 | Project progress % is calculated from milestone completion |
| Projects | AC-17 | Only authorized roles can delete projects (with non-empty check) |
| **Tasks** | AC-18 | Tasks can be created within projects or milestones with all required fields |
| Tasks | AC-19 | Tasks can be assigned to exactly one employee |
| Tasks | AC-20 | Task status follows workflow: To Do → In Progress → In Review → Done (with Blocked exception) |
| Tasks | AC-21 | Tasks can be filtered by status, priority, assignee, project, milestone, due date |
| Tasks | AC-22 | Tasks can be sorted by due date, priority, status, assignee, created date |
| Tasks | AC-23 | Task list is paginated (default 20, max 100) |
| **Comments** | AC-24 | Authenticated users can comment on tasks they have access to |
| Comments | AC-25 | @mentions in comments trigger notifications for mentioned users |
| Comments | AC-26 | Users can edit their own comments |
| Comments | AC-27 | Admin can delete any comment |
| **Documents / Files** | AC-28 | Authorized users can upload files to projects and tasks |
| Documents | AC-29 | File type and size validation is enforced |
| Documents | AC-30 | Authorized users can download and delete files |
| **Notifications** | AC-31 | Notifications are generated for: assignment, @mention, status change, comment reply, milestone approaching, task overdue |
| Notifications | AC-32 | In-app notification bell shows unread count |
| Notifications | AC-33 | Users can toggle notification preferences per type |
| Notifications | AC-34 | Clicking a notification navigates to the relevant entity |
| **Dashboards** | AC-35 | Each role sees the correct dashboard scope (org/department/team/personal) |
| Dashboards | AC-36 | Dashboard widgets show live data and update in real-time |
| **Reports** | AC-37 | Authorized roles can generate and export reports |
| Reports | AC-38 | Reports are filterable by date range, department, project, assignee |
| **Audit Log** | AC-39 | All administrative actions are logged in the audit log |
| Audit Log | AC-40 | Audit log entries cannot be deleted or edited |
| Audit Log | AC-41 | Audit log is filterable by action type, user, and date range |
| **Search** | AC-42 | Full-text search returns results from tasks, projects, comments, and documents |
| Search | AC-43 | Search results are grouped by entity type |
| **Profile** | AC-44 | Users can view and edit their own profile |
| Profile | AC-45 | Users can manage notification preferences |
| **Activity Timeline** | AC-46 | Task detail page shows chronological activity timeline |
| Activity Timeline | AC-47 | Activity entries include user, action, field, and timestamp |
| **Real-Time** | AC-48 | Task status changes are pushed to connected clients in real-time |
| Real-Time | AC-49 | New comments appear without page refresh |
| Real-Time | AC-50 | Notification count updates in real-time |

---

## 17. Future Roadmap (v2+)

| Version | Feature | Description |
|---------|---------|-------------|
| v2.0 | AI Operations Manager | AI role that auto-assigns tasks, suggests priorities, detects bottlenecks |
| v2.0 | Smart Notifications | AI-prioritized notification triage |
| v2.0 | Advanced Reporting | Custom report builder with drag-and-drop widgets |
| v2.1 | Natural Language Search | Semantic search across all content using embeddings |
| v2.1 | Subtasks | Nested task hierarchy (parent-child tasks) |
| v2.2 | Gantt Chart View | Visual project timeline with dependencies |
| v2.2 | Calendar Integration | Two-way sync with Google Calendar / Outlook |
| v2.3 | API Public Access | Public REST API for third-party integrations |
| v2.3 | Webhooks | Outgoing webhooks for workflow automation |
| v2.4 | Mobile Apps | Native iOS and Android applications |
| v2.5 | SSO / SAML | Single sign-on for enterprise customers |
| v2.5 | SCIM Provisioning | Automated user provisioning |
| v3.0 | AI Auto-Triage | AI that reads incoming comments and re-routes tasks |
| v3.0 | Predictive Analytics | AI predicts project completion dates from historical velocity |

---

## BLOCKING QUESTIONS

The following questions need answers before proceeding to Step 2 (Data Model). These are decisions that affect model design:

1. **Subtasks:** Are nested subtasks in scope for v1? (A task that can have child tasks, with the parent task's status derived from children.) This affects the task entity's self-referential relationship.

2. **Task Dependencies:** Should tasks support explicit "blocked-by" relationships to other tasks, or should the "Blocked" status be set manually? This affects the task entity and validation logic.

3. **Rich Text in Comments:** Should comments support rich text (bold, italic, links) or plain text with Markdown? This affects the comment body field storage format.

4. **Comment Edit Window:** Is there a time limit on editing comments (e.g., 15 minutes)? This affects comment edit validation.

5. **File Virus Scanning:** Is virus scanning required for uploaded files in v1? This affects the file upload pipeline.

6. **Notification Templates:** Are email notification templates configurable by Admins in v1, or are they fixed? This affects the notification module.

7. **Employee-Project vs Employee-Department Relationship:** Can an employee be assigned to a project outside their department? Or is all assignment scoped to their department?

8. **Rate Limits:** What rate limits should apply per endpoint tier (standard vs file upload)? (Current assumption: 1000 req/min standard, 100 req/min file uploads.)

9. **Data Retention Period:** Confirm the 90-day soft-delete retention and 1-year audit log retention.

---

## Consistency Check

- All entities (Organization, Department, Team, Employee/User, Project, Milestone, Task, Comment, Document/File, Notification, ActivityLog, AuditLog) trace to the fixed capability list.
- Permission matrix covers all 5 roles × all actions listed in the matrix.
- No code, schema, or API content has been written.
- 17 sections delivered as specified.
- BLOCKING QUESTIONS section exists and awaits human answers.
- All [ASSUMPTION] markers are clearly labeled for confirmation.
