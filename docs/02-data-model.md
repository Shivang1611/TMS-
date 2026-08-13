# Data Model Design — Enterprise Task Management Platform v1

**Date:** 2026-07-22
**Version:** 1.0
**Status:** Draft for review

---

## 1. Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | MongoDB | Document-oriented storage for flexible schemas |
| ODM | Mongoose 8.x | Schema validation, relationships, middleware |
| Driver | mongodb 6.x | Native driver (via Mongoose) |
| File Storage | S3-compatible (DigitalOcean Spaces / AWS S3) | External file storage with metadata in DB |

---

## 2. Entity Relationship Diagram (Conceptual)

```
Organization
  ├── Department (1 to many)
  │     └── Team (1 to many)
  │           └── User/Employee (many to many via teams[])
  └── User/Employee (many, belongs to 1 org)
        └── belongs to 1 Department (optional)
        └── belongs to many Teams (via teams[])

Project (belongs to 1 Organization)
  ├── belongs to 1 Department (optional — cross-dept allowed)
  ├── has 1 Manager (User)
  └── Milestone (1 to many)
        └── Task (1 to many)
              ├── has 1 Assignee (User)
              ├── has 0 or more Subtasks (self-referencing via parentTask)
              ├── has 0 or more Comments (1 to many)
              └── has 0 or more Documents (1 to many)

Comment
  ├── belongs to 1 Task
  ├── has 1 Author (User)
  └── has 0 or more Replies (self-referencing via parentComment)

Notification
  ├── belongs to 1 Recipient (User)
  └── references entity (Task / Project / Milestone / Comment)

ActivityLog
  └── references entity (polymorphic via entityType + entityId)

AuditLog
  └── immutable log of administrative actions
```

---

## 3. Entity Definitions

### 3.1 Organization

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | max 200 chars, trimmed |
| `domain` | String | ❌ | — | lowercase, unique (sparse), max 100 |
| `logo` | String (URL) | ❌ | — | S3 URL |
| `settings.defaultRole` | Enum | ❌ | `Employee` | `Employee` / `Team Lead` / `Manager` |
| `settings.retentionDays` | Number | ❌ | `90` | 30–365 days |
| `settings.auditLogRetentionYears` | Number | ❌ | `1` | 1–7 years |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | Set on soft delete |
| `createdAt` | Date | auto | — | Mongoose timestamp |
| `updatedAt` | Date | auto | — | Mongoose timestamp |

**Indexes:**
- `{ isDeleted: 1 }`

---

### 3.2 Department

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | max 100 chars, trimmed |
| `description` | String | ❌ | — | max 500 chars |
| `organization` | ObjectId (ref Organization) | ✅ | — | Foreign key |
| `head` | ObjectId (ref User) | ❌ | — | Department head |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | Set on soft delete |

**Indexes:**
- `{ organization: 1, name: 1, isDeleted: 1 }`

**Virtuals:** `teams` — all non-deleted teams in this department

**Business Rules:**
- BR-11: Department cannot be deleted if it contains active teams
- Department name is unique within an organization (enforced via partial unique index where isDeleted is false)

---

### 3.3 Team

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | max 100 chars, trimmed |
| `description` | String | ❌ | — | max 500 chars |
| `department` | ObjectId (ref Department) | ✅ | — | Foreign key |
| `teamLeads` | [ObjectId (ref User)] | ❌ | `[]` | One or more team leads |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | Set on soft delete |

**Indexes:**
- `{ department: 1, name: 1, isDeleted: 1 }`

**Virtuals:** `members` — all active, non-deleted users in this team

---

### 3.4 User / Employee

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `email` | String | ✅ | — | lowercase, trimmed, max 255 |
| `password` | String | ✅ | — | bcrypt hashed, min 8 chars, excluded from queries by default |
| `name` | String | ✅ | — | trimmed, max 100 |
| `role` | Enum | ✅ | — | `Founder` / `Admin` / `Manager` / `Team Lead` / `Employee` |
| `organization` | ObjectId (ref Organization) | ✅ | — | Foreign key |
| `department` | ObjectId (ref Department) | ❌ | — | Employee belongs to exactly 1 department (BR-06) |
| `teams` | [ObjectId (ref Team)] | ❌ | `[]` | Employee can belong to multiple teams (BR-06) |
| `profile.jobTitle` | String | ❌ | — | max 100 |
| `profile.phone` | String | ❌ | — | |
| `profile.avatar` | String (URL) | ❌ | — | S3 URL |
| `notificationPreferences.email.*` | Boolean | ❌ | `true` | Per-type toggle (6 types) |
| `notificationPreferences.inApp.*` | Boolean | ❌ | `true` | Per-type toggle (6 types) |
| `isActive` | Boolean | ❌ | `true` | Deactivated users lose access immediately (BR-07) |
| `lastLoginAt` | Date | ❌ | — | |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ email: 1, organization: 1 }` — **unique** (email unique per org)
- `{ organization: 1, role: 1 }`
- `{ organization: 1, department: 1 }`
- `{ organization: 1, isActive: 1 }`

**Pre-save:** Automatically hashes password with bcrypt (salt rounds: 12) when modified

**Methods:**
- `comparePassword(candidatePassword)` — returns Promise<boolean>

**Virtuals:** `assignedTasks` — all non-deleted tasks assigned to this user

---

### 3.5 Project

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | max 200 chars, trimmed |
| `description` | String | ❌ | — | max 2000 chars |
| `organization` | ObjectId (ref Organization) | ✅ | — | Foreign key |
| `department` | ObjectId (ref Department) | ❌ | — | Optional — cross-dept projects allowed |
| `manager` | ObjectId (ref User) | ✅ | — | Project manager |
| `startDate` | Date | ❌ | — | |
| `endDate` | Date | ❌ | — | Must be ≥ startDate |
| `status` | Enum | ❌ | `Active` | `Active` / `On Hold` / `Completed` / `Cancelled` |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ organization: 1, status: 1 }`
- `{ manager: 1, status: 1 }`
- Full-text index on `name` and `description`

**Virtuals:** `milestones`, `tasks`

---

### 3.6 Milestone

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | max 200 chars, trimmed |
| `description` | String | ❌ | — | max 1000 chars |
| `project` | ObjectId (ref Project) | ✅ | — | Foreign key |
| `dueDate` | Date | ❌ | — | |
| `status` | Enum | ❌ | `Pending` | `Pending` / `In Progress` / `Completed` / `Cancelled` |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ project: 1, status: 1 }`
- `{ dueDate: 1 }`

**Virtuals:** `tasks`

**Business Rules:**
- BR-04: Milestone is completed when all its tasks are Done
- Milestone due date must be within the project's date range (VAL-05)

---

### 3.7 Task

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `title` | String | ✅ | — | max 300 chars, trimmed |
| `description` | String | ❌ | — | max 5000 chars |
| `priority` | Enum | ❌ | `Medium` | `Low` / `Medium` / `High` / `Critical` |
| `status` | Enum | ❌ | `To Do` | `To Do` / `In Progress` / `In Review` / `Done` / `Blocked` |
| `project` | ObjectId (ref Project) | ✅ | — | Foreign key |
| `milestone` | ObjectId (ref Milestone) | ❌ | — | Optional milestone association |
| `assignee` | ObjectId (ref User) | ❌ | — | Exactly 1 assignee (BR-01) |
| `dueDate` | Date | ❌ | — | Must be today or later (VAL-03) |
| `estimatedEffort` | Number | ❌ | — | Hours, min 0 |
| `actualEffort` | Number | ❌ | — | Hours, min 0 |
| `parentTask` | ObjectId (ref Task) | ❌ | — | Self-reference for subtasks |
| `blockedReason` | String | ❌ | — | Required when status = Blocked (max 500) |
| `statusChangedAt` | Date | ❌ | — | Set automatically on status change |
| `completedAt` | Date | ❌ | — | Set when status = Done |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ project: 1, status: 1 }`
- `{ project: 1, milestone: 1 }`
- `{ assignee: 1, status: 1 }`
- `{ assignee: 1, dueDate: 1 }`
- `{ priority: 1, status: 1 }`
- `{ dueDate: 1 }`
- `{ parentTask: 1 }` — for subtask queries
- Full-text index on `title` and `description`

**Virtuals:** `subtasks`, `comments`

**Status Workflow (BR-02):**
```
To Do ──────► In Progress ──────► In Review ──────► Done
  │                │                   │
  └──────► Blocked ◄───────────────────┘
                │
                ├────► To Do
                └────► In Progress
```

**Valid Transitions:**
| From \ To | To Do | In Progress | In Review | Done | Blocked |
|-----------|-------|-------------|-----------|------|---------|
| To Do | — | ✅ | ❌ | ❌ | ✅ |
| In Progress | ✅ | — | ✅ | ❌ | ✅ |
| In Review | ❌ | ✅ | — | ✅ | ✅ |
| Done | ❌ | ❌ | ❌ | — | ❌ |
| Blocked | ✅ | ✅ | ❌ | ❌ | — |

**Pre-save:** Automatically sets `statusChangedAt` on status change, `completedAt` when set to Done.

**Static:** `VALID_TRANSITIONS` — map of valid transitions

**Methods:**
- `canTransitionTo(newStatus)` — validates the transition

**Business Rules:**
- BR-01: Task has exactly one assignee
- BR-02: Status workflow enforced
- BR-03: Task cannot be Done with open subtasks (checked at application layer)

---

### 3.8 Comment

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `body` | String | ✅ | — | Rich text (HTML) content |
| `bodyText` | String | ❌ | — | Plain text version for search |
| `task` | ObjectId (ref Task) | ✅ | — | Foreign key |
| `author` | ObjectId (ref User) | ✅ | — | Comment author |
| `parentComment` | ObjectId (ref Comment) | ❌ | — | Self-reference for threading |
| `mentions` | [ObjectId (ref User)] | ❌ | `[]` | Parsed @mentions |
| `editedAt` | Date | ❌ | — | Set when edited |
| `editHistory` | [Subdocument] | ❌ | `[]` | Tracks `{ body, bodyText, editedAt }` |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ task: 1, createdAt: 1 }`
- `{ author: 1, createdAt: -1 }`
- `{ parentComment: 1 }`

**Virtuals:** `replies`

**Pre-save:** Tracks edit history when `body` is modified on existing documents

---

### 3.9 Document / File

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `name` | String | ✅ | — | Sanitized filename, max 255 |
| `originalName` | String | ✅ | — | Original uploaded filename |
| `mimeType` | String | ✅ | — | MIME type of the file |
| `size` | Number | ✅ | — | In bytes, max 25MB |
| `url` | String | ✅ | — | S3 URL |
| `project` | ObjectId (ref Project) | ❌ | — | Project-level file |
| `task` | ObjectId (ref Task) | ❌ | — | Task-level file |
| `uploader` | ObjectId (ref User) | ✅ | — | Who uploaded |
| `scanStatus` | Enum | ❌ | `Pending` | `Pending` / `Scanning` / `Clean` / `Infected` / `Error` |
| `scanResult` | String | ❌ | — | Details from virus scanner |
| `isDeleted` | Boolean | ❌ | `false` | Soft-delete flag |
| `deletedAt` | Date | ❌ | — | |

**Indexes:**
- `{ project: 1, createdAt: -1 }`
- `{ task: 1, createdAt: -1 }`
- `{ uploader: 1 }`
- `{ scanStatus: 1 }`

**Business Rules:**
- VAL-06: File size must not exceed 25MB
- VAL-07: File type must be in allowed list (validated at application layer)

---

### 3.10 Notification

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `type` | Enum | ✅ | — | `task_assigned` / `status_changed` / `mention` / `comment_reply` / `milestone_approaching` / `task_overdue` |
| `recipient` | ObjectId (ref User) | ✅ | — | Who receives the notification |
| `actor` | ObjectId (ref User) | ❌ | — | Who triggered the notification |
| `entityType` | Enum | ❌ | — | `Task` / `Project` / `Milestone` / `Comment` |
| `entityId` | ObjectId | ❌ | — | Links to the relevant entity |
| `title` | String | ❌ | — | max 200 |
| `message` | String | ❌ | — | max 500 |
| `isRead` | Boolean | ❌ | `false` | Read/unread state |
| `emailSent` | Boolean | ❌ | `false` | Whether email was sent |
| `emailSentAt` | Date | ❌ | — | When email was sent |

**Indexes:**
- `{ recipient: 1, isRead: 1, createdAt: -1 }`
- `{ recipient: 1, type: 1, createdAt: -1 }`
- `{ entityType: 1, entityId: 1 }`

---

### 3.11 ActivityLog

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `entityType` | Enum | ✅ | — | `Task` / `Project` / `Milestone` / `Comment` / `Department` / `Team` |
| `entityId` | ObjectId | ✅ | — | Polymorphic reference |
| `action` | String | ✅ | — | e.g., `status_changed`, `field_updated`, `created` |
| `field` | String | ❌ | — | Which field changed |
| `oldValue` | Mixed | ❌ | — | Previous value |
| `newValue` | Mixed | ❌ | — | New value |
| `actor` | ObjectId (ref User) | ✅ | — | Who performed the action |
| `organization` | ObjectId (ref Organization) | ✅ | — | For scoping queries |
| `metadata` | Mixed | ❌ | — | Additional context |

**Indexes:**
- `{ entityType: 1, entityId: 1, createdAt: -1 }`
- `{ actor: 1, createdAt: -1 }`
- `{ organization: 1, createdAt: -1 }`
- `{ action: 1, organization: 1 }`

---

### 3.12 AuditLog

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | auto | — | Primary key |
| `actionType` | Enum | ✅ | — | `role_changed` / `user_invited` / `user_deactivated` / `user_reactivated` / `permission_changed` / `org_settings_changed` / `department_created` / `department_deleted` / `team_created` / `team_deleted` / `ownership_transferred` |
| `actor` | ObjectId (ref User) | ✅ | — | Who performed the action |
| `targetType` | Enum | ✅ | — | `User` / `Department` / `Team` / `Organization` |
| `targetId` | ObjectId | ❌ | — | Polymorphic reference |
| `details` | Mixed | ❌ | — | Action-specific JSON data |
| `ip` | String | ❌ | — | Request IP address |
| `userAgent` | String | ❌ | — | Browser/device user agent |
| `organization` | ObjectId (ref Organization) | ✅ | — | For scoping |

**Immutability:** This schema has **no `updatedAt` field**. Mongoose pre-hooks prevent `findOneAndUpdate`, `updateOne`, and `deleteOne` operations.

**Indexes:**
- `{ organization: 1, createdAt: -1 }`
- `{ actionType: 1, organization: 1, createdAt: -1 }`
- `{ actor: 1, createdAt: -1 }`
- `{ targetType: 1, targetId: 1 }`

---

## 4. Index Strategy

| Purpose | Indexes |
|---------|---------|
| **Organization isolation** | `organization` field indexed on most entities |
| **Task filtering** | `{ project, status }`, `{ assignee, status }`, `{ priority, status }` |
| **Name uniqueness** | Partial unique index on `{ organization, name }` where `isDeleted: false` (Department, Team) |
| **Task sorting** | `{ dueDate }`, `{ createdAt }` (default) |
| **Assignee queries** | `{ assignee, status }`, `{ assignee, dueDate }` |
| **Full-text search** | Text index on `Task.title + Task.description`, `Project.name + Project.description` |
| **Timeline queries** | `{ entityType, entityId, createdAt }` on ActivityLog |
| **Notification queries** | `{ recipient, isRead, createdAt }` |
| **Audit queries** | `{ organization, createdAt }`, `{ actionType, organization }` |
| **Soft-delete filtering** | `{ isDeleted }` frequently combined with other fields |
| **Subtask queries** | `{ parentTask }` |
| **Comment threading** | `{ parentComment }` |
| **Unique constraints** | `{ email, organization }` on User, `{ domain }` sparse on Organization |

---

## 5. Data Relationships Summary

| Relationship | Type | Storage | Example |
|-------------|------|---------|---------|
| Org → Department | One-to-many | Foreign key in Department | `Department.organization` |
| Department → Team | One-to-many | Foreign key in Team | `Team.department` |
| User → Department | Many-to-one | Foreign key in User | `User.department` |
| User → Team | Many-to-many | Array of refs in User | `User.teams: [ObjectId]` |
| Project → Department | Many-to-one (optional) | Foreign key in Project | `Project.department` |
| Project → Milestone | One-to-many | Foreign key in Milestone | `Milestone.project` |
| Milestone → Task | One-to-many | Foreign key in Task | `Task.milestone` |
| Task → Subtask | Self-referential | Foreign key in Task | `Task.parentTask` |
| Task → Comment | One-to-many | Foreign key in Comment | `Comment.task` |
| Comment → Reply | Self-referential | Foreign key in Comment | `Comment.parentComment` |
| Task → User (assignee) | Many-to-one | Foreign key in Task | `Task.assignee` |
| ActivityLog → Entity | Polymorphic | `entityType` + `entityId` | `{ entityType: 'Task', entityId: ObjectId }` |

---

## 6. Soft-Delete Pattern

All core entities use a consistent soft-delete pattern:

```javascript
isDeleted: { type: Boolean, default: false },
deletedAt: { type: Date }
```

**Rules:**
- Queries should filter `isDeleted: false` by default
- The `deletedAt` timestamp is set when the entity is soft-deleted
- A scheduled job (cron) permanently deletes soft-deleted records older than the retention period (90 days by default)
- AuditLog entries are never soft-deleted — they are immutable and retained for 1 year minimum

---

## 7. Audit Log Immutability

The AuditLog is the only fully immutable entity:

1. No `updatedAt` field in the schema
2. Mongoose pre-hooks on `findOneAndUpdate`, `updateOne`, and `deleteOne` throw errors
3. Only `insertMany` / `create` operations are permitted
4. A scheduled job purges audit log entries older than the configured retention period (1 year by default)

---

## 8. Indexing Notes

### 8.1 Compound Indexes for Common Query Patterns

| Query Pattern | Index | Covered? |
|---------------|-------|----------|
| Tasks by project + status | `{ project: 1, status: 1 }` | Partial |
| Tasks by assignee + due date | `{ assignee: 1, dueDate: 1 }` | Partial |
| Notifications by recipient + unread | `{ recipient: 1, isRead: 1, createdAt: -1 }` | Sort covered |

### 8.2 Text Indexes

```javascript
// Task
{ title: 'text', description: 'text' }

// Project
{ name: 'text', description: 'text' }
```

MongoDB text indexes support `$text` queries for full-text search across these fields.

---

## 9. Validation Rules Summary

| Rule | Entity | Enforcement |
|------|--------|-------------|
| Required fields not empty | All entities | Mongoose `required` validator |
| Valid email format | User | Application layer + Mongoose match |
| Task due date ≥ today | Task | Application layer (VAL-03) |
| End date ≥ start date | Project, Milestone | Mongoose `validate` (VAL-04, VAL-05) |
| File size ≤ 25MB | Document | Mongoose `max` validator (VAL-06) |
| Orphan prevention | Document | Mongoose pre-validate hook requires project or task |
| Valid file type | Document | Application layer (VAL-07) |
| Unique email per org | User | MongoDB compound unique index |
| Unique name per scope | Department, Team | MongoDB partial unique index (isDeleted: false) |
| Status transition valid | Task | Instance method + application layer (BR-02) |
| No Done with open subtasks | Task | Application layer (BR-03) |
| Immutable audit log | AuditLog | Mongoose pre-hooks (no updatedAt, blocked update/delete) |
| Blocked reason required | Task | Conditional Mongoose validate: required when status = Blocked |
| No Done with open subtasks | Task | Mongoose pre-save async hook queries for open subtasks (BR-03) |

---

## 10. Future Considerations (Schema Evolution)

| Future Feature | Schema Impact |
|----------------|---------------|
| AI Operations Manager | New `AssignmentEngine` abstraction; configurable via settings |
| Natural Language Search | Vector index on text fields |
| Gantt Chart View | No schema change — query restructuring only |
| Calendar Integration | No schema change — external sync |
| Public API / Webhooks | New `Webhook` entity + `ApiKey` entity |
| SSO / SAML | New `SsoConfig` embedded in Organization settings |
| SCIM Provisioning | New `ScimEndpoint` entity |
