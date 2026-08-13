# SOURCE OF TRUTH LEDGER
Do not edit or delete previous entries. Append only, per step, with a timestamp and step number.

## Step 0 — Bootstrap
- Repo skeleton created: /docs, /backend, /frontend, /tests
- No product decisions made yet.

---

## Step 1 — Product Requirements Document

**Date:** 2026-07-22

### Entities Defined
- Organization, Department, Team, Employee (User), Project, Milestone, Task, Comment, Document/File, Notification, ActivityLog, AuditLog

### Roles Defined
- Founder, Admin, Manager, Team Lead, Employee

### Core Capabilities
- Organizations, Departments, Teams, Employee invites, Projects, Milestones, Tasks, Task assignment, Progress tracking, Reports, Document sharing, Comments, @Mentions, File uploads, Notifications, Dashboards, Analytics

### Permission Matrix
- 5 roles × ~40 actions — exhaustive grid in Section 9 of 01-prd.md

### Business Rules Established
- BR-01: Task has exactly one assignee
- BR-02: Task status workflow: To Do → In Progress → In Review → Done (Blocked exception)
- BR-03: Task cannot be Done with open subtasks [BLOCKING QUESTION]
- BR-04: Milestone complete when all tasks Done
- BR-05: Project complete when all milestones complete
- BR-06: Employee belongs to one department, multiple teams
- BR-07: Deactivated employee loses access immediately
- BR-08: Notifications default to all-on
- BR-09: @Mention must reference same-org user
- BR-10: Org creator auto-assigned Founder role
- BR-11: Department delete blocked if it contains teams

### Modules Defined
- Project, Task, Dashboard, Reporting, Notification, Document, Comments, Activity Timeline, Audit Log, Organization, Teams, Departments, Profile, Settings, Search, Filtering, Sorting, Pagination, File Upload, Email Notifications, Real-Time Updates

### Future AI Extension Points (v2)
- AI Operations Manager, Smart Suggestions, Auto-Triage, Predictive Analytics, Natural Language Search

### BLOCKING QUESTIONS RECORDED
1. Subtasks in scope for v1?
2. Task dependencies (blocked-by relationships)?
3. Rich text or Markdown in comments?
4. Comment edit time window?
5. File virus scanning in v1?
6. Configurable notification templates?
7. Cross-department project assignment?
8. Rate limit values?
9. Data retention period confirmation?

All details in /docs/01-prd.md.

STEP 1 COMPLETE — awaiting review and explicit approval before Step 2.

---

## Step 1.5 — Blocking Questions Resolved

**Date:** 2026-07-22

All 9 blocking questions from the PRD have been answered by the stakeholder:

| # | Question | Decision |
|---|----------|----------|
| 1 | Subtasks in scope for v1? | ✅ Yes — nested subtask hierarchy included |
| 2 | Task dependencies (blocked-by relationships)? | ✅ Manual — no explicit blocked-by; Blocked status set manually |
| 3 | Rich text or Markdown in comments? | ✅ Rich text — full rich text editing |
| 4 | Comment edit time window? | ✅ No time limit — users can edit comments anytime |
| 5 | File virus scanning in v1? | ✅ Yes — virus scanning required for uploaded files |
| 6 | Configurable notification templates? | ✅ Fixed — templates are system-defined, not configurable |
| 7 | Cross-department project assignment? | ✅ Allowed — employees can be assigned to projects outside their department |
| 8 | Rate limit values? | ✅ 1000 req/min standard, 100 req/min file uploads |
| 9 | Data retention period? | ✅ 90-day soft-delete retention, 1-year audit log retention |

### Business Rule Updates
- BR-03 updated: Task cannot be Done with open subtasks — **ACTIVE** (subtasks confirmed in scope)

Modules can now proceed to Step 2: Data Model Design.

---

## Step 2 — Data Model Design

**Date:** 2026-07-22

### Completed
- Created full backend project skeleton with Node.js/Express/MongoDB
- Designed and implemented **13 Mongoose schemas** with full validation, indexes, and middleware

### Entities Modeled

| Entity | File | Key Design Decisions |
|--------|------|---------------------|
| Organization | `Organization.js` | Settings embedded, soft-delete pattern |
| Department | `Department.js` | Partial unique index on name per org (isDeleted: false), virtual teams |
| Team | `Team.js` | Partial unique index on name per dept, virtual members |
| User/Employee | `User.js` | bcrypt hashing (12 rounds), compound unique email+org, notification prefs embedded |
| Project | `Project.js` | Optional department (cross-dept allowed), full-text search index |
| Milestone | `Milestone.js` | Virtual tasks for completion tracking |
| Task | `Task.js` | Self-referencing subtasks via parentTask, STATUS_WORKFLOW transitions map, canTransitionTo() method, BR-03 validation (no Done with open subtasks), conditional blockedReason validation |
| Comment | `Comment.js` | Rich text body, threaded via parentComment, edit history tracking, mentions parsing |
| Document | `Document.js` | S3 URL storage, scan status lifecycle (Pending→Clean/Infected), orphan prevention validation |
| Notification | `Notification.js` | 6 notification types, email delivery tracking, read/unread state |
| ActivityLog | `ActivityLog.js` | Polymorphic entity references, organization-scoped |
| AuditLog | `AuditLog.js` | Immutable design (no updatedAt, pre-hooks block update/delete), IP + userAgent tracking |

### Index Strategy
- 25+ MongoDB indexes for query performance
- Compound indexes for common filter/sort patterns (assignee+status, project+status, etc.)
- Partial unique indexes for Department and Team name uniqueness
- Full-text indexes on Task and Project for search

### Data Model Document
- Full design document created at `/docs/02-data-model.md`
- Covers: ER diagram, entity definitions, field-by-field specs, index strategy, relationships, validation rules

### Code Review Applied
- Initial code review feedback incorporated:
  1. Department/Team partial unique indexes (was compound non-unique)
  2. BR-03 pre-save hook added (no Done with open subtasks)
  3. Conditional blockedReason required when status=Blocked
  4. Orphan document prevention (pre-validate hook)

Awaiting review and approval before Step 3: API Design / Backend Implementation.

---

## Step 3 — API Design & Backend Implementation

**Date:** 2026-07-22

### Completed
- Created Express server entry point with all middleware (helmet, cors, morgan, rate limiting)
- Created JWT authentication and role-based authorization middleware
- Created centralized error handler with Mongoose error mapping
- Created Joi-based validation schemas for all 50+ API endpoints
- Created async handler wrapper and ApiError utility class
- Built **16 route files** with permission-scoped endpoints
- Built **16 controller files** with full business logic

### API Endpoints Created (~60 total)

| Category | Endpoints |
|----------|-----------|
| Auth | register, login, me, update profile |
| Organization | get, update, delete |
| Departments | CRUD + BR-11 validation |
| Teams | CRUD + add/remove members |
| Users | invite, list, role change, deactivate, reactivate |
| Projects | CRUD + role-scoped listing + nested tasks/milestones |
| Milestones | CRUD + completion tracking |
| Tasks | CRUD + status workflow (BR-02) + subtask validation (BR-03) + assign + list (filter/sort/paginate) |
| Comments | create (rich text), list (threaded), edit, delete |
| Documents | upload (multer + size/type validation), list, download, delete |
| Notifications | list (paginated + unread count), mark read, mark all read |
| Dashboards | org-wide, department, team, personal (role-scoped) |
| Reports | task completion, workload, project progress, department throughput |
| Search | full-text across tasks, projects, comments, documents |
| Activity | timeline listing (role-scoped) |
| Audit Log | list + CSV export (immutable, Admin+) |

### Key Design Decisions
- Standard response envelope: `{ success, data, pagination?, message? }`
- Error format: `{ success, statusCode, message, errors? }`
- Pagination: `?page=1&pageSize=20` — response includes `{ page, pageSize, totalCount, totalPages }`
- Sorting: `?sortBy=createdAt&sortOrder=desc`
- Status workflow enforced at controller level + Mongoose pre-save hook
- Role-based scoping for task listing (Employee sees own, Team Lead sees team)
- Audit log export as CSV download
- Rate limiting: 1,000 req/min standard, 100 req/min file uploads

### API Design Document
- Full document created at `/docs/03-api-design.md`
- Covers: 60+ endpoints with request/response formats, auth requirements, status codes, error formats

### Code Review Applied
- Critical fixes from initial code review:
  1. Added missing `joi` dependency to package.json
  2. Fixed `canEditTask`/`canDeleteTask` helpers (was accessing ObjectId as populated document)
  3. Whitelisted allowed fields in `updateTask` (no more `Object.assign`)
  4. Removed unnecessary `select('+password')` from auth middleware
  5. Added role scoping to activity controller
  6. Added text index on Comment.bodyText for search

Awaiting review and approval before Step 4: Frontend Implementation.

---

## Step 4 — Frontend Implementation

**Date:** 2026-07-22

### Completed
- Scaffolded Vite + React project with Tailwind CSS v3
- Installed: react-router-dom, axios, @tanstack/react-query, recharts, lucide-react, socket.io-client, react-hot-toast

### Pages Built (8 total)

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Email/password login with show/hide toggle |
| Register | `/register` | Org creation with name, email, password |
| Dashboard | `/` | Personal dashboard with stats cards, status breakdown, upcoming tasks |
| Tasks | `/tasks` | Filterable, paginated task list with search |
| Task Detail | `/tasks/:id` | Full detail with status transitions, comments, subtasks, activity timeline |
| Projects | `/projects` | Project grid with status filter tabs |
| Project Detail | `/projects/:id` | Project view with milestones and task summary |
| Users | `/users` | User management table with search, role filters, deactivate/reactivate (Admin) |

### Components Built
- **AppLayout** — Sidebar + Header + Outlet with mobile responsiveness
- **Sidebar** — Role-based nav with collapse toggle, user info footer
- **Header** — Search bar, notification bell (unread count), user menu dropdown
- **TaskCard** — Card with priority/status badges, assignee avatar, due date
- **TaskFilters** — Status, priority, search filters with apply/clear

### Infrastructure
- Axios client with auth interceptor (auto-attach JWT, 401 redirect)
- Auth context (login, register, logout, token persistence)
- React Query for server state (caching, invalidation, mutations)
- Tailwind CSS utility classes with custom theme (primary, surface colors)
- Base component classes: btn-primary, btn-secondary, btn-ghost, input-field, card, badge

### Feature Highlights
- **Status workflow** — Visual buttons for all 5 statuses, Blocked requires reason prompt
- **Comments** — Rich text display, add/delete, author avatars
- **Subtasks** — Checkbox-style list with completion indicators
- **Activity timeline** — Per-task chronological change history
- **Pagination** — Prev/next controls with page info
- **Mobile responsive** — Collapsible sidebar, overlay menu
- **Role-based UI** — Admin section in sidebar, Admin-only user management

Awaiting review and approval before next steps.

### Known Gaps (identified in code review)
- **Real-time updates**: Socket.IO installed but not integrated (FR-28, AC-48/49/50)
- **User invite UI**: Backend endpoint exists, no frontend form yet (FR-04)
- **File upload UI**: Document model built, no upload UI on TaskDetail (FR-15)
- **Project creation UI**: No create/edit forms yet (FR-06)
- **Status transition UX**: All status buttons shown; invalid transitions get rejected by backend
- **`api.js`**: Created as copy of `auth.js` — components still import from `../api/auth`

Awaiting review and prioritization for next development session.
