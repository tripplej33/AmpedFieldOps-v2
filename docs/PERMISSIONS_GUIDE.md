# AmpedFieldOps V2 - Granular Permissions & RBAC Guide

## 1. Overview & Architecture

AmpedFieldOps implements an enterprise-grade Role-Based Access Control (RBAC) model. Permissions are evaluated on both the client (via React hooks and UI authorization guards) and the backend database layer (via Supabase Row Level Security policies and SECURITY DEFINER stored procedures).

### Core Components:
- **`public.roles` Table**: Stores role presets and custom roles. Permissions are persisted as a JSON array (`jsonb`) of discrete permission key strings.
- **`usePermissions()` Hook**: Provides reactive permission checks in React components. If a user holds the `admin` role, `isAdmin` evaluates to `true` and bypasses individual checks for system operations.
- **`RoleModal.tsx`**: Intuitive visual permission matrix editor allowing managers and admins to toggle permissions across 11 functional operational categories.

---

## 2. Complete Permission Key Catalog

The platform defines **35+ granular permission keys** grouped into 11 operational modules:

### 📁 Projects & Cost Centers
| Permission Key | Display Label | Description |
|---|---|---|
| `projects.view` | View Projects | Base access to view project hubs and details |
| `projects.view_all` | View All Projects | Can view all company projects, including unassigned |
| `projects.view_assigned` | View Assigned Only | Restricts visibility strictly to projects where user is assigned |
| `projects.create` | Create Projects | Can create new project hubs and initial budgets |
| `projects.edit` | Edit Projects | Can modify project information, cost centers, and timelines |
| `projects.delete` | Delete Projects | Can archive or permanently delete projects |
| `projects.assign_members` | Assign Members | Can assign technicians and managers to project teams |

### ⏱️ Timesheets & Labor
| Permission Key | Display Label | Description |
|---|---|---|
| `timesheets.view_own` | View Own Timesheets | Can view personal daily/weekly timesheet entries |
| `timesheets.view_all` | View All Timesheets | Can view all technicians' timesheets and company timeline |
| `timesheets.create` | Log Work Hours | Can create timesheet records and track GPS travel |
| `timesheets.edit` | Edit Timesheets | Can modify unlocked draft timesheet entries |
| `timesheets.delete` | Delete Timesheet Entries | Can delete draft timesheet entries |
| `timesheets.approve` | Approve Timesheets | Can review, verify, and approve submitted technician hours |
| `timesheets.unapprove` | Reopen Approved Hours | Can unlock and unapprove previously approved timesheets |
| `timesheets.export` | Export Timesheets | Can export timesheet data to CSV, Excel, or payroll |

### 💰 Financials & Invoicing
| Permission Key | Display Label | Description |
|---|---|---|
| `financials.view` | View Financial Analytics | Can view project margins, labor cost rates, and budgets |
| `invoices.view` | View Invoices | Can view client sales invoices, progress claims, and billing history |
| `invoices.manage` | Manage Invoices | Can generate invoices, record payments, and trigger Xero sync |

### 📦 Master Inventory & Van Stock
| Permission Key | Display Label | Description |
|---|---|---|
| `inventory.view` | View Inventory & Stock | Can browse central warehouse catalog, depot stock, and van levels |
| `inventory.manage` | Manage Stock & Transfers | Can create items, edit pricing, adjust stock, and transfer stock |

### ⚡ Electrical Compliance (AS/NZS 3000)
| Permission Key | Display Label | Description |
|---|---|---|
| `compliance.view` | View Compliance Records | Can view verification test sheets, CoC/ESC certificates, and calibration registers |
| `compliance.manage` | Manage Electrical Certs | Can create/sign statutory CoC/ESC certificates and record test results |

### 🔌 Switchboard Schedules
| Permission Key | Display Label | Description |
|---|---|---|
| `switchboards.view` | View Switchboards | Can view switchboard circuit schedules and layouts |
| `switchboards.manage` | Manage Switchboards | Can build circuit schedules, calculate phase loads, and export directories |

### 🛡️ Health & Safety (SSSP / SWMS)
| Permission Key | Display Label | Description |
|---|---|---|
| `safety.view` | View Safety Documents | Can view site SWMS, risk assessments, and daily briefings |
| `safety.manage` | Manage Safety & Briefings | Can draft SWMS, conduct pre-starts, and sign off site hazards |

### 📅 Job Scheduling & Dispatch
| Permission Key | Display Label | Description |
|---|---|---|
| `schedule.view` | View Calendar & Schedule | Can view dispatched jobs, technician calendars, and site visits |
| `schedule.manage` | Dispatch & Manage Schedule | Can create bookings, reassign technicians, and adjust shifts |

### 🔍 Quality Control & Snags
| Permission Key | Display Label | Description |
|---|---|---|
| `snags.manage` | Manage QC Snag Lists | Can create, assign, inspect, and sign off defect snags |

### 🚚 Fleet Management
| Permission Key | Display Label | Description |
|---|---|---|
| `fleet.manage` | Manage Fleet & Inspections | Can track vehicle registrations, WOF/COF, and vehicle safety pre-starts |

### ⚙️ System Administration & User Lifecycle
| Permission Key | Display Label | Description |
|---|---|---|
| `users.manage` | Manage Team Members | Can invite users, edit profiles, and toggle Active/Deactivated status |
| `users.delete` | Permanent User Deletion | Can permanently delete user accounts and cascade historical references |
| `roles.manage` | Manage Custom Roles | Can configure role permissions and RBAC matrix |
| `settings.manage` | Manage Company Settings | Can edit company profile, billing defaults, and Xero OAuth integrations |

---

## 3. System Preset Roles Matrix

| Permission Module | Administrator | Project Manager | Field Technician | Apprentice | Office Admin |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Projects** | Full (`view_all`, `create`, `edit`, `delete`, `assign`) | Full (`view_all`, `create`, `edit`, `assign`) | Assigned Only (`view_assigned`) | Assigned Only (`view_assigned`) | View All (`view_all`) |
| **Timesheets** | Full (`view_all`, `approve`, `unapprove`, `delete`, `export`) | Manage (`view_all`, `create`, `approve`, `export`) | Own (`view_own`, `create`, `edit`) | Own (`view_own`, `create`, `edit`) | Payroll (`view_all`, `approve`, `export`) |
| **Invoicing & Finance** | Full (`financials.view`, `invoices.manage`) | View (`financials.view`, `invoices.view`) | - | - | Full (`financials.view`, `invoices.manage`) |
| **Inventory & Stock** | Full (`inventory.manage`) | Full (`inventory.manage`) | View / Transfer (`inventory.view`) | View (`inventory.view`) | Full (`inventory.manage`) |
| **Compliance CoC/ESC** | Full (`compliance.manage`) | Full (`compliance.manage`) | Sign / Test (`compliance.manage`) | View (`compliance.view`) | View (`compliance.view`) |
| **Switchboards** | Full (`switchboards.manage`) | Full (`switchboards.manage`) | Build / Edit (`switchboards.manage`) | View (`switchboards.view`) | View (`switchboards.view`) |
| **Safety Hub & SWMS** | Full (`safety.manage`) | Full (`safety.manage`) | Pre-Start / Sign (`safety.manage`) | View / Sign (`safety.view`) | View / Audit (`safety.view`) |
| **Scheduling** | Full (`schedule.manage`) | Full (`schedule.manage`) | View Assigned (`schedule.view`) | View Assigned (`schedule.view`) | Full (`schedule.manage`) |
| **QC Snags** | Full (`snags.manage`) | Full (`snags.manage`) | Full (`snags.manage`) | - | - |
| **Fleet Vans** | Full (`fleet.manage`) | Full (`fleet.manage`) | - | - | Full (`fleet.manage`) |
| **Admin & Deletion** | Full (`users.manage`, `users.delete`, `roles.manage`, `settings.manage`) | - | - | - | - |

---

## 4. User Lifecycle: Deactivation vs Permanent Deletion

### Soft Deactivation (Recommended)
- Triggered via **Settings > Team Management > Deactivate User**.
- Updates `public.users.is_active = false`, sets `disabled_at = NOW()`, and sets `auth.users.banned_until = '2099-01-01'`.
- Instantly revokes current active JWT tokens via `supabase.auth.admin.signOut`.
- **Integrity**: Preserves all historic payroll entries, signed safety assessments, statutory electrical certificates, and job notes.
- Accounts can be reactivated at any time with a single click.

### Permanent Deletion
- Triggered via **Settings > Team Management > Delete User** (requires typing `"DELETE"` to confirm).
- Executed via database RPC `public.admin_delete_user(target_user_id)`.
- Unlinks historical timesheets, snags, and schedules by setting `user_id = NULL` and recording `[Deleted User: Name]` in notes so historical project accounting remains intact without referential foreign key violation.
- Purges auth credentials from `auth.users` and profile record from `public.users`.
