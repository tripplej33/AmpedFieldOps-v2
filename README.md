# AmpedFieldOps V2 ⚡

> Comprehensive Field Operations, Timesheets, Job Management & Fleet System built for electrical contractors, trade teams, and field service operations. Powered by React 18, TypeScript, Tailwind CSS, Node.js, and Supabase.

---

## 🎯 System Capabilities

- **📅 Interactive Timesheets & Day Timeline**:
  - Full Day Timeline with technician vs. hour matrix and drag-and-drop time editing.
  - Weekly matrix overview with bulk submission, unapproving, and batch deletion workflows.
  - Start & Stop time tracking with automatic break deduction.
- **📍 GPS Pinning & Travel Billing Engine**:
  - Automatic technician geolocation capture with road-factor adjusted Haversine distance calculations.
  - Automated travel time and client mileage reimbursement calculator.
- **📁 Document & Photo Management**:
  - Project File Explorer with custom folder hierarchy and cost-center partitioning.
  - Device camera photo capture with pre-upload preview and customizable "Save File As" labeling.
  - In-place renaming for files, drawings, compliance certificates, and site photos.
  - Built-in PDF and image previewers with signed URL generation.
- **🏗️ Projects & Cost Centers**:
  - Full project lifecycle management (Pending, Active, On Hold, Completed, Invoiced, Archived).
  - Cost Center budget allocation, spend tracking, and labor burn analytics.
  - Interactive Kanban and tabular list views with global search integration.
- **👥 Role-Based Access Control (RBAC) & Invitations**:
  - Configurable system and custom roles (Administrator, Project Manager, Field Technician, Apprentice, Office Admin, Subcontractor).
  - Granular permissions (including `files.rename`, `timesheets.delete`, `projects.assign_members`, `safety.manage`, etc.).
  - Secure email user invitations and profile credential management.
- **📋 Procurement, Van Stock & Snags**:
  - Purchase Orders with multi-item receipt tracking and direct cost-center allocation.
  - Van stock inventory management and direct material logging to jobs.
  - Visual snag list tracking with status progression and photo attachments.
- **🚨 Site Safety, Check Sheets & Emergency Evacuation**:
  - Digital Site Attendance kiosk with QR sign-in/out and real-time roll-call evacuation lists.
  - Vehicle pre-start safety check sheets with defect escalation workflows.
- **🔄 Xero Cloud Synchronization**:
  - Bi-directional sync for Contacts, Inventory Items, and Invoices.
  - Background queue processing with BullMQ and Redis.

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite 7
- **Styling:** Tailwind CSS 3.4 (custom dark theme tokens) + Material Symbols
- **State & Context:** React Context + custom domain hooks (`useProjects`, `useTimesheets`, `useFiles`, `useGeolocation`, `usePermissions`, etc.)
- **Forms & Validation:** `react-hook-form` + `zod`
- **Routing:** `react-router-dom` v6 with client-side hydration & protected guards

### Backend & Infrastructure
- **Database & Storage:** Supabase PostgreSQL with Row Level Security (RLS) + Supabase Storage (`project-files`)
- **API Server:** Node.js + Express + TypeScript
- **Cache & Queues:** Redis + BullMQ
- **Reverse Proxy:** Nginx with SPA history fallback & gzip compression
- **Deployment:** Docker & Docker Compose on Proxmox LXC VPS

---

## 📱 Mobile Applications (Android & iOS)

AmpedFieldOps is built to run as a native mobile app via **Capacitor**, sharing 100% of the web UI while utilizing native device hardware (High-Res Camera, Background GPS, Biometrics, and Push Notifications).

### Mobile Setup with Capacitor

```bash
# 1. Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm install @capacitor/camera @capacitor/geolocation @capacitor/push-notifications @capacitor/preferences

# 2. Initialize Capacitor project
npx cap init AmpedFieldOps com.amped.fieldops --web-dir dist

# 3. Build web assets and generate native projects
npm run build
npx cap add android
npx cap add ios

# 4. Open native IDEs
npx cap open android   # Launches Android Studio to build APK / AAB
npx cap open ios       # Launches Xcode on macOS to build IPA / TestFlight
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Supabase project or local Supabase instance
- Git

### Installation & Local Development

```bash
# 1. Clone the repository
git clone https://github.com/tripplej33/AmpedFieldOps-v2.git
cd AmpedFieldOps-v2

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run database migrations (if using local Supabase CLI)
node run-migrations.js

# 5. Start development server
npm run dev
```

The web app will run locally at `http://localhost:5173`.

---

## 📦 Project Structure

```
AmpedFieldOps-v2/
├── src/
│   ├── components/
│   │   ├── files/           # FileUploader, FileList, ProjectFilesView, TimesheetFileUploader
│   │   ├── timesheets/      # DayTimesheetTimeline, WeeklyTimesheetGrid, TimesheetModal
│   │   ├── snags/           # ProjectSnagsList
│   │   ├── fleet/           # VehicleCheckSheets, FleetManagement
│   │   ├── safety/          # SiteAttendanceKiosk, EvacuationModal
│   │   ├── procurement/     # PurchaseOrderModal, GoodsReceipt
│   │   ├── settings/        # RoleModal, UserInviteModal, ProfileSettings
│   │   ├── search/          # GlobalSearchModal
│   │   ├── layout/          # Sidebar, Header, NotificationDropdown, Layout
│   │   └── ui/              # Button, Input, Modal, ConfirmDialog, Toast, Spinner, Badge
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication & cached profile hydration
│   ├── hooks/               # Domain hooks (useFiles, useGeolocation, usePermissions, etc.)
│   ├── lib/                 # Supabase client, OCR service, crypto, validators
│   ├── pages/               # Main application pages
│   └── types/               # TypeScript interfaces & permission definitions
├── backend/                 # Node/Express API & Xero sync workers
├── supabase/
│   └── migrations/          # Version-controlled PostgreSQL migrations & RLS policies
├── Dockerfile.frontend      # Multi-stage production Nginx container
├── docker-compose.yml       # Production stack orchestration
├── nginx.conf               # Nginx reverse proxy configuration
└── package.json
```

---

## 🔐 Roles & Permission Matrix

| Role | Timesheets | Projects & Cost Centers | Purchase Orders & Materials | Snags & Safety | File Explorer |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Administrator** | Full / Delete | Full / Assign | Full / Approve | Full | View, Upload, Rename, Delete |
| **Project Manager** | View All / Approve | Create & Edit | Create & Approve | Full | View, Upload, Rename |
| **Field Technician**| Log & Submit Own | View Assigned | Log Van Materials | Manage Snags & Sign-in | View & Upload Photos |
| **Apprentice** | Log & Submit Own | View Assigned | View Materials | Site Sign-in | View |
| **Office Admin** | View All / Payroll | View All | POs & Financials | View Reports | View & Upload |
| **Subcontractor** | - | Assigned Snags | - | Site Sign-in | View Documents |

---

## 🛠️ Build & Verification

```bash
# Type check and build bundle
npm run build

# Preview build locally
npm run preview
```

---

## 📄 License
Private repository. All rights reserved by Amped Field Operations.
