# **Branch • Branch • Safety Documents Module Planning**

[https://gemini.google.com/app/f546bfe22ee1ed3a](https://gemini.google.com/app/f546bfe22ee1ed3a)

*User prompt: Please help me plan a prompt for my antigravity agent: https://github.com/tripplej33/AmpedFieldOps-v2, I want to add a safety document tab where a user can create a safety doc such as a jsa, swms, confined space etc and it will save to the project folder or the cost center folder in a saftey documents folder I want these to have form filling function and options for signatures, I also want to have templates and a way to add or make new templates. Also the ability to send it to other app users to sign their section of the document or can be filled out on one device on the spot for multiple people. Please research and suggest any other useful ideas*

Response: To build a robust Safety Documents engine for **AmpedFieldOps-v2**, the feature should function not just as static forms, but as an auditable compliance system tailored for field operations.

### **High-Impact Additions & Field-Ready Ideas**

> 1. **Crew QR Code Sign-On (Touchless Signatures):**  
   * Instead of passing a dusty phone or tablet around site, the lead technician taps **"Crew Sign-On"**, which renders a dynamic QR code on screen.  
   * Other team members scan it on their own devices to view the JSA/SWMS and add their digital signature and worker ID instantly.  
> 2. **Dynamic 5×5 Risk Matrix:**  
   * An interactive risk score calculator comparing **Inherent Risk** (before controls) vs. **Residual Risk** (after controls) using standard Likelihood × Consequence ratings.  
> 3. **Electrical & High-Risk Pre-Sets:**  
   * Tailored checklists for high-risk work: **Test Before Touch / Isolation (LOTO)**, Working at Heights, Confined Space atmospheric test readings (*O*2​, *LEL*, *CO*, *H*2​*S*), and Live Work permits.  
> 4. **Site Metadata & Geostamp:**  
   * Auto-pull project address, current GPS coordinates, supervisor name, and site emergency contacts directly from the active project record into the header.  
> 5. **Offline Queue (Crucial for Basements & Rural Sites):**  
   * Allow forms and signature captures to save to local IndexedDB/cache if offline, automatically syncing to Supabase Storage and database once back in coverage.  
> 6. **Audit-Ready PDF Watermarking:**  
   * When exported or closed, burn an unalterable timestamp, device ID/IP, and signed status into a PDF saved in \<Project/CostCenter\>/Safety Documents/.

### **Copy-Paste Antigravity Agent Prompt**

Copy and paste the specification below directly into your Antigravity agent:

`# TASK: Implement Safety Documents Tab & Multi-Sign Compliance Engine`

`## 1. Objective`  
`Add a comprehensive "Safety Documents" module to AmpedFieldOps-v2. Users must be able to create, fill, dynamically customize, sign, and archive safety documents (JSA, SWMS, Confined Space Entry Permits, Take 5, Hot Work, etc.).` 

``Documents must belong to either a **Project** or a **Cost Center**, save into a standardized `Safety Documents` folder structure in Supabase Storage, support custom dynamic templates, and accommodate both on-the-spot multi-person sign-off and remote signature dispatch.``

`---`

`## 2. Database Schema & Storage (Supabase)`

`Generate and run a migration with the following tables and RLS policies:`

``1. `safety_templates`:``  
   ``- `id` (uuid, primary key)``  
   ``- `title` (text, e.g., "Standard Electrical SWMS", "Confined Space Entry Permit")``  
   ``- `category` (enum: 'jsa', 'swms', 'confined_space', 'take5', 'hot_work', 'custom')``  
   ``- `description` (text)``  
   ``- `schema` (jsonb - defines sections, fields, hazard checklists, risk matrix flags, PPE requirements)``  
   ``- `is_system_default` (boolean, default false)``  
   ``- `created_by` (uuid references auth.users)``  
   ``- `created_at`, `updated_at` (timestamps)``

``2. `safety_documents`:``  
   ``- `id` (uuid, primary key)``  
   ``- `template_id` (uuid references safety_templates, nullable)``  
   ``- `project_id` (uuid references projects, nullable)``  
   ``- `cost_center_id` (uuid references cost_centers, nullable)``  
   ``- `title` (text)``  
   ``- `category` (text)``  
   ``- `status` (enum: 'draft', 'pending_signatures', 'completed', 'expired')``  
   ``- `form_data` (jsonb - values filled into the form)``  
   ``- `storage_path` (text - path to the generated signed PDF in Supabase Storage)``  
   ``- `created_by` (uuid references auth.users)``  
   ``- `created_at`, `updated_at` (timestamps)``  
   `` - *Constraint:* `CHECK ((project_id IS NOT NULL AND cost_center_id IS NULL) OR (project_id IS NULL AND cost_center_id IS NOT NULL))` ``

``3. `safety_signatures`:``  
   ``- `id` (uuid, primary key)``  
   ``- `document_id` (uuid references safety_documents on delete cascade)``  
   ``- `user_id` (uuid references auth.users, nullable if external/guest crew)``  
   ``- `signer_name` (text)``  
   ``- `signer_role` (text, e.g., 'Lead Electrician', 'Apprentice', 'Permit Issuer', 'Observer')``  
   ``- `signature_svg_or_png` (text - base64 or storage URL)``  
   ``- `sign_type` (enum: 'on_the_spot', 'remote')``  
   ``- `status` (enum: 'signed', 'pending')``  
   ``- `signed_at` (timestamp, nullable)``  
   ``- `geo_location` (jsonb, nullable: { lat, lng, accuracy })``

`4. **Storage Bucket & Routing:**`  
   `` - Supabase Storage Bucket: `documents` ``  
   `- Path convention:`  
     `` - For projects: `projects/{project_id}/safety-documents/{doc_title}_{date}_{doc_id}.pdf` ``  
     `` - For cost centers: `cost-centers/{cost_center_id}/safety-documents/{doc_title}_{date}_{doc_id}.pdf` ``

`---`

`## 3. UI & Feature Requirements`

`### A. Safety Document Tab & Navigation`  
`- Add a dedicated "Safety" tab inside both Project view and Cost Center view, plus a global "Safety Hub" in the main navigation showing:`  
  `- Active docs, docs awaiting my signature, and template management.`  
``- Quick Filters: Status (`Draft`, `Awaiting Signatures`, `Signed & Archived`), Category, and Date.``

`### B. Dynamic Form Engine & Pre-built Templates`  
`- Provide pre-seeded templates for:`  
  `1. **Job Safety Analysis (JSA)**`  
  `2. **Safe Work Method Statement (SWMS)** with High-Risk Construction Work (HRCW) flags and mandatory PPE selector`  
  `3. **Confined Space Entry Permit** with gas monitoring log ($O_2$, $LEL$, $CO$, $H_2S$) and standby person verification`  
  `4. **Take 5 / Daily Hazard Assessment**`  
`- Implement a **Template Builder / Editor** allowing admins to add custom form sections:`  
  `- Text, Textarea, Checkbox groups, Hazard tables (Hazard -> Initial Risk -> Control -> Residual Risk), Date/Time, and Multi-Signer blocks.`

`### C. Multi-Sign Engine (Dual Mode)`  
`1. **On-the-Spot Mode (Crew Sign-On / Tool-Box Talk):**`  
   `- Modal or full-screen view where team members pass the device around.`  
   ``- Crew members enter their name/role, review the hazards, sign via touch/mouse canvas (`react-signature-canvas`), and submit.``  
   `- Shows a live checklist of who has signed vs. who is remaining.`  
`2. **Remote Request-to-Sign:**`  
   `- Dropdown to select registered app users.`  
   `- Dispatches a signature request. The assigned user sees an alert banner/task in their app with one-tap access to review and sign.`

`### D. Automated PDF Generation & Folder Filing`  
``- Integrate client-side or edge-function PDF generation (`@react-pdf/renderer` or `jspdf` / `html2canvas`):``  
  `- Standardized company header (Amped Field Ops / Amped Logix styling).`  
  `- Clear hazard & control matrices.`  
  `- Signature block section containing all signatures, names, timestamps, and geolocation tags.`  
``- On final completion/signing, generate the PDF and upload it into the correct Supabase storage folder (`projects/{project_id}/safety-documents/` or `cost-centers/{cost_center_id}/safety-documents/`).``  
`- Show the PDF preview inline with download and share actions.`

`---`

`## 4. Implementation Steps`  
``1. Create Supabase migrations for `safety_templates`, `safety_documents`, and `safety_signatures`, including RLS policies.``  
`2. Build TypeScript interfaces and Supabase client hooks for fetching, saving, and signing docs.`  
`3. Build the Form Renderer and Signature Canvas component.`  
`4. Implement the dual-mode signing workflow (On-the-spot kiosk sign-on + remote assigned requests).`  
`5. Build the PDF generation pipeline that stores the compiled document directly in the correct folder hierarchy.`  
`6. Verify offline safety (auto-save form progress to localStorage/cache until submission).`

---

*User prompt: Can you look at the app and suggest any additional features to improve the app*

Response: To turn AmpedFieldOps-v2 into an all-in-one trade operating system, the most valuable upgrades focus on automating field compliance, tightening job-cost tracking, and removing repetitive admin work.

**Electrical Compliance & Test Results Logging**

> * **AS/NZS 3000 Verification Forms:** Standardized test sheet capturing earth continuity (*Rpe*​), insulation resistance (*Rins*​), polarity, fault loop impedance (*Zs*​), and RCD trip times/currents.  
> * **Instant CoC / ESC Generator:** Auto-populate Certificates of Compliance and Electrical Safety Certificates from project data and test logs, allowing one-tap client sign-off and immediate PDF export.  
> * **High-Risk Notification Triggers:** Automated alerts or mandatory supervisor sign-off prompts whenever test readings fall outside compliant thresholds (e.g., low insulation resistance under 1 MΩ).

**Site Photo Bundles & Visual Markups**

> * **Structured Photo Folders:** Dedicated slots for *Before*, *In-Progress*, and *As-Built* photos saved automatically to projects/{id}/photos/.  
> * **In-App Image Annotations:** Allow technicians to draw arrows, highlight conduit runs, circle switchboard defects, and add text notes directly over captured photos before uploading.  
> * **Metadata Watermarking:** Stamp timestamp, GPS coordinates, and project reference directly onto the photo image buffer for ironclad audit defense.

**Instrument & Asset Calibration Register**

> * **Test Equipment Compliance Tracker:** Track multi-function testers, insulation testers, and clamp meters with serial numbers, model info, and calibration expiry dates.  
> * **Lockout on Expired Gear:** Warn or prevent technicians from attaching test results to compliance certificates if the selected tester's calibration certificate has lapsed.  
> * **PAT / Test & Tag Sub-Module:** Barcode/QR scan interface to log appliance testing with re-test frequency intervals (3, 6, 12, 24 months).

**Switchboard Directory & Cable Schedule Generator**

> * **Digital Circuit Directory:** Drag-and-drop circuit breaker mapping tool (Circuit \#, Phase, Breaker Rating, Cable Size, Description, RCD Group).  
> * **Printable Label Export:** One-tap formatting to export cleanly formatted switchboard schedules sized to fit standard label printers or switchboard door sleeves.  
> * **Voltage Drop & De-rating Quick Calc:** Built-in calculation utility checking run length, installation method, and conductor cross-section against maximum allowable volt drop.

**Field Purchasing & Cost-Center Receipts**

> * **Receipt Camera Capture & OCR:** Technicians photograph packing slips or trade counter receipts on site; an OCR parser extracts total, date, merchant, and line items.  
> * **Cost Center Reconciliation:** Assign POs and expenses directly to project cost codes so gross margin updates in real time rather than waiting for supplier end-of-month statements.

**Offline-First Sync Engine**

> * **Service Worker \+ IndexedDB State:** Cache active project forms, documents, and site notes locally so field workers in basements, plant rooms, or remote rural properties don't lose input when connectivity drops.  
> * **Background Sync Queue:** Auto-replay pending mutation requests and file uploads sequentially as soon as network ping succeeds, with conflict detection flags.

---

*User prompt: I would also like this app to be tailored to all sorts of trades and businesses how would we add more customizability?*

Response: To make the platform adaptable across plumbing, HVAC, civil, automotive, and general construction without rewriting core code, decouple your business logic into a configuration-driven architecture: keep base records generic and layer on organization-level terminology, dynamic fields, and modular feature toggles.

**1\. Dynamic Terminology & Alias Engine** Different industries use different language for the exact same underlying concepts. Avoid hardcoding terms like "Project" or "Cost Center" across your UI.

> * **Alias Mapping:** Store an industry\_dictionary JSON object in your organization settings. The UI references translation keys rather than static strings:  
  * *Electrical / Commercial:* Project, Work Order, Technician, Switchboard.  
  * *Auto / Mobile Diesel:* Job Card, Repair Order, Mechanic, Fleet Asset / VIN.  
  * *Plumbing / Gas:* Site, Maintenance Task, Plumber, Gas Certificate.  
  * *Landscaping / Civil:* Site, Cost Center, Crew Lead, Plant / Equipment.  
> * **Implementation:** A React hook like useTerminology('project') that checks organization.settings.aliases?.project ?? 'Project'.

**2\. Universal Form & Checklist Builder (JSON Schema Engine)** Trade compliance relies on specialized forms (gas certs, drainage layouts, crane lift studies, pre-start checks).

> * **Schema-Driven Rendering:** Instead of hardcoded forms, use a schema-driven form renderer (leveraging libraries like @rjsf/core or custom form blocks).  
> * **Custom Field Types:** Support standard inputs (text, number, date), trade-specific controls (risk matrices, multi-signature blocks, fluid/gas reading gauges, GPS stamps, photo attachments with annotations).  
> * **Export Templates:** Pair each form template with a printable HTML/CSS template to generate branded, trade-specific PDF certificates upon sign-off.

**3\. Entity-Level Custom Fields (JSONB Extensibility)** Allow businesses to attach bespoke metadata to core entities (projects, tasks, assets, users) without running database migrations.

> * **Field Definitions:** Store custom field definitions in a dedicated metadata table (field name, input type, options, validation rules, targeted entity).  
> * **Storage:** Store the user-entered values in a generic custom\_fields jsonb column on the targeted table.  
> * **Filterable & Searchable:** PostgreSQL supports indexing JSONB keys directly via GIN indexes, allowing instant search and filtering on arbitrary custom trade data.

**4\. Modular Feature Flags** Not every trade needs every tool. A residential painter does not need electrical test sheets, and an automotive mobile repairer does not need architectural plan viewers.

> * **Toggleable Modules:** Create a modular registry where organization admins toggle features on or off:  
  * Safety & Permitting Hub (JSA/SWMS)  
  * Plan / Drawing Markup Viewer  
  * Asset & Fleet Register  
  * Material Tracking & Trade PO Reconciler  
  * Test & Calibration Compliance Sheets  
  * Crew Scheduling & Dispatch Map  
> * **Dynamic Navigation:** The sidebar and action drawers render solely based on organization.enabled\_modules.

**5\. Configurable Job Lifecycles & Pipelines** Trades manage operations with distinct pipeline phases.

> * **Custom Status Workflows:** Allow businesses to define custom status pipelines (e.g., Draft \-\> Quoted \-\> Approved \-\> In Progress \-\> Quality Audit \-\> Ready to Invoice).  
> * **Automated Stage Triggers:** Enable basic triggers when status changes (e.g., transitioning a job to "Completed" requires all attached safety documents to be in a "Signed" state).

**6\. Trade Starter Packs (One-Click Setup)** To prevent decision fatigue during onboarding, provide pre-packaged presets:

> * Selecting **"Automotive / Heavy Diesel"** pre-loads VIN tracking custom fields, standard pre-start checklists, hazard templates for hot work, and sets terminology to "Job Card / Fleet".  
> * Selecting **"Plumbing & Gas"** pre-loads pressure testing logs, gas compliance certificates, and confined space safety templates.  
> * Selecting **"Commercial Electrical"** pre-loads AS/NZS 3000 test sheets, LOTO safety forms, switchboard schedules, and asset calibration trackers.

**Core Schema Foundation**

`-- Organization settings holding terminology & module switches`  
`create table organizations (`  
  `id uuid primary key default gen_random_uuid(),`  
  `name text not null,`  
  `trade_type text default 'general', -- 'electrical', 'plumbing', 'automotive', etc.`  
  `terminology jsonb default '{`  
    `"project": "Project",`  
    `"cost_center": "Cost Center",`  
    `"technician": "Technician",`  
    `"task": "Work Order"`  
  `}'::jsonb,`  
  `active_modules text[] default array['safety', 'scheduling', 'time_tracking', 'documents'],`  
  `created_at timestamptz default now()`  
`);`

`-- Admin-defined custom fields per organization`  
`create table custom_field_definitions (`  
  `id uuid primary key default gen_random_uuid(),`  
  `organization_id uuid references organizations(id) on delete cascade,`  
  `entity_type text not null, -- 'project', 'asset', 'task', 'user'`  
  `field_name text not null,`  
  `field_key text not null, -- e.g., 'vin_number', 'gas_pressure_kpa'`  
  `field_type text not null, -- 'text', 'number', 'select', 'date', 'boolean'`  
  `options jsonb, -- array of options for select dropdowns`  
  `is_required boolean default false,`  
  `created_at timestamptz default now(),`  
  `unique (organization_id, entity_type, field_key)`  
`);`

---

*User prompt: https://github.com/tripplej33/AmpedFieldOps-v2, what would be the best way to add job scheduling for technicians for jobs e.g on a calender view working in with all other features of the app*

Response: To build a job scheduling engine that feels native to **AmpedFieldOps-v2** and rivals dedicated trade dispatch software (like ServiceM8, Simpro, or Fergus), the system needs two primary viewpoints:

> 1. **The Office/Dispatcher View:** A horizontal **Resource Timeline** (rows \= technicians/vehicles, columns \= time slots) with an unassigned job drawer and drag-and-drop assignment.  
> 2. **The Technician/Field View:** A mobile-first **Day Agenda / Map Route** focusing on "My Jobs Today," one-tap GPS navigation, safety sign-on, and clock-in.

Here is the architectural blueprint, data model, and integration plan.

### **1\. Supabase Database Schema**

A proper scheduling module links technicians to projects/cost centers, records scheduled vs. actual times, and tracks operational dispatch statuses.

`-- Job / Schedule assignments`  
`create type schedule_status as enum (`  
  `'scheduled',`   
  `'dispatched',`   
  `'en_route',`   
  `'on_site',`   
  `'completed',`   
  `'rescheduled',`   
  `'cancelled'`  
`);`

`create table job_schedules (`  
  `id uuid primary key default gen_random_uuid(),`  
  `organization_id uuid references organizations(id) on delete cascade,`  
  `project_id uuid references projects(id) on delete set null,`  
  `cost_center_id uuid references cost_centers(id) on delete set null,`  
    
  `-- Assigned personnel (can support single tech or multi-crew)`  
  `technician_id uuid references auth.users(id) on delete set null,`  
  `assigned_crew_ids uuid[] default '{}',`  
    
  `title text not null,`  
  `description text,`  
  `status schedule_status default 'scheduled',`  
    
  `-- Time tracking & scheduling`  
  `start_time timestamptz not null,`  
  `end_time timestamptz not null,`  
  `all_day boolean default false,`  
    
  `-- Actual times (for variance analysis: scheduled vs. actual)`  
  `actual_start_time timestamptz,`  
  `actual_end_time timestamptz,`  
    
  `-- Location & dispatch metadata`  
  `site_address text,`  
  `latitude double precision,`  
  `longitude double precision,`  
  `estimated_travel_minutes integer default 0,`  
    
  `-- Safety & Compliance gate`  
  `requires_safety_doc boolean default true,`  
  `completed_safety_doc_id uuid references safety_documents(id),`  
    
  `created_by uuid references auth.users(id),`  
  `created_at timestamptz default now(),`  
  `updated_at timestamptz default now()`  
`);`

`-- Index for rapid calendar date-range queries`  
`create index idx_job_schedules_range on job_schedules (organization_id, start_time, end_time);`  
`create index idx_job_schedules_tech on job_schedules (technician_id, start_time);`

### **2\. Deep Integration with Other App Features**

A standalone calendar is just a diary; a field ops calendar drives the job lifecycle:

| App Feature | Scheduling Integration Point |
| :---- | :---- |
| **Safety Hub (JSA/SWMS)** | **Compliance Gate:** When a tech taps "Start Work" or changes status to on\_site, the app checks requires\_safety\_doc. If incomplete, it immediately opens the assigned JSA/Take 5 template for signatures before unlocking the work order. |
| **Time Tracking & Cost Centers** | **One-Tap Timesheets:** Allow technicians to convert scheduled hours directly into logged timesheet entries (labor cost allocated to the project or cost center) with a simple *“Confirm Actual Hours”* prompt upon job completion. |
| **Project Documents & Photos** | **Direct Context Access:** From the calendar event popup, technicians can access the project's site drawings, switchboard photos, permits, and customer contacts without navigating through the project tree. |
| **Realtime Dispatch Alerts** | **Supabase Realtime:** When a dispatcher drags an unassigned job onto a technician's column, the field worker's app receives an instant push/banner notification: *"New job scheduled: 10:30 AM at \[Site Address\]"*. |
| **Map & Route Optimization** | **Route Preview:** The calendar view includes a toggleable mini-map plotting the technician's scheduled stops for the day in chronological order to minimize windshield time. |

### **3\. Frontend Architecture & Recommended Libraries**

For trade dispatch, a standard month grid is insufficient. You need a **Resource Timeline**:

> * **Library Option A: Custom Tailwind \+ @dnd-kit (Recommended for full control):**  
  * Build a horizontal CSS grid where rows are technicians (users with role technician) and columns are 30-minute increments.  
  * Use @dnd-kit/core to drag jobs from an **"Unscheduled Work Orders"** sidebar directly into an empty slot on a technician’s timeline.  
  * Free, completely responsive, and avoids heavy third-party CSS overrides.  
> * **Library Option B: FullCalendar (React Wrapper):**  
  * Provides standard Day/Week/Month/List views out of the box.  
  * *Note:* FullCalendar's dedicated "Resource Timeline" view requires their commercial Premium license.  
> * **Library Option C: Schedule-X (@schedule-x/react):**  
  * Modern, lightweight, fast, and supports resource scheduling with clean Material/Tailwind-friendly styling.

### **4\. Copy-Paste Antigravity Agent Prompt**

Provide this prompt to your Antigravity agent to generate the scheduling system:

`# TASK: Implement Job Scheduling & Resource Dispatch Calendar`

`## 1. Overview`  
`Build an interactive Scheduling & Dispatch system for AmpedFieldOps-v2. The system must support:`  
`1. An Office/Dispatcher **Resource Timeline View** (rows = technicians, columns = time slots) with drag-and-drop assignment from an unassigned jobs drawer.`  
`2. A Field/Technician **Mobile Agenda View** ("My Day") featuring one-tap status updates ('En Route', 'On Site', 'Completed'), GPS directions link, and direct integration with Safety Docs.`  
`3. Supabase database tables, RLS policies, and Realtime subscriptions for instant dispatch updates.`

`---`

``## 2. Database Migration (`supabase/migrations/xxxx_create_job_schedules.sql`)``  
``1. Create `schedule_status` enum: `('scheduled', 'dispatched', 'en_route', 'on_site', 'completed', 'rescheduled', 'cancelled')`.``  
``2. Create table `job_schedules` with:``  
   ``- `id` (uuid, pk)``  
   ``- `organization_id` (uuid, fk organizations)``  
   ``- `project_id` (uuid, fk projects, nullable)``  
   ``- `cost_center_id` (uuid, fk cost_centers, nullable)``  
   ``- `technician_id` (uuid, fk auth.users, nullable)``  
   ``- `title` (text)``  
   ``- `description` (text)``  
   ``- `status` (schedule_status, default 'scheduled')``  
   ``- `start_time` (timestamptz)``  
   ``- `end_time` (timestamptz)``  
   ``- `all_day` (boolean, default false)``  
   ``- `actual_start_time` (timestamptz, nullable)``  
   ``- `actual_end_time` (timestamptz, nullable)``  
   ``- `site_address` (text)``  
   ``- `requires_safety_doc` (boolean, default true)``  
   ``- `completed_safety_doc_id` (uuid, fk safety_documents, nullable)``  
   ``- `created_at`, `updated_at` (timestamptz)``  
`3. Add RLS policies allowing authenticated users within the same organization to select and manage schedules.`  
``4. Enable Supabase Realtime replication on `job_schedules`.``

`---`

`## 3. Core UI Components to Build`

``### A. Dispatcher View (`/schedule`)``  
``- **Top Controls:** Date navigator (Previous, Today, Next), View Switcher (`Resource Timeline`, `Day`, `Week`, `Map Route`), and "New Schedule" button.``  
`- **Resource Timeline Grid:**`  
  `- Left column: List of technicians with avatar, name, and total scheduled hours for the selected date.`  
  `- Horizontal timeline: 30-minute intervals from 06:00 to 18:00 (configurable).`  
  `- Schedule blocks rendered inside cells with status colors (e.g., Scheduled = Blue, En Route = Yellow, On Site = Orange, Completed = Green).`  
`- **Unassigned Jobs Drawer (Collapsible Sidebar):**`  
  `- Displays unassigned projects or tasks.`  
  ``- Dragging an unassigned card onto a technician's row creates/updates a `job_schedules` record with that technician's ID and drop timestamp.``

``### B. Field Technician View (`/my-schedule` or Mobile Toggle)``  
`- Clean card list grouped by date:`  
  `- Job title, Project reference, Cost Center badge, and Scheduled window (e.g., 08:30 - 11:30).`  
  `- **Action Bar:**`  
    ``- "Navigate" button (opens `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site_address)}`).``  
    ``- Status stepper buttons: `[Start Travel]` -> `[Arrive On Site]` -> `[Complete Job]`.``  
  ``- **Safety Gate Modal:** If `requires_safety_doc` is true and `completed_safety_doc_id` is null, clicking `[Arrive On Site]` opens a prompt: *"Safety Document Required: Complete JSA / Take 5 before starting"*, linking directly to the safety document creation screen for that project.``

`### C. Schedule Edit / Create Modal`  
`- Form to select Project or Cost Center.`  
`- Assignee dropdown (filtered by technicians in the active organization).`  
`- Date, Start Time, and End Time pickers.`  
`- Site address auto-filled from the selected project.`  
``- Toggle for `Requires Safety Sign-Off`.``

`---`

``## 4. State & Realtime Hook (`useSchedule.ts`)``  
`- Implement a custom hook using TanStack Query / Supabase client:`  
  `- Fetches schedules filtered by active date range and organization.`  
  ``- Subscribes to Supabase Realtime channel `job_schedules` to automatically update the calendar when jobs are modified or reassigned by other users.``  
  ``- Mutation handlers for `createSchedule`, `updateScheduleTime`, `updateStatus`, and `assignTechnician`.``

`---`

`## 5. Deliverables`  
`1. SQL migration file for tables, indexes, and RLS.`  
``2. TypeScript types for `JobSchedule`, `ScheduleStatus`, and payload structures.``  
`3. React components:`  
   ``- `ScheduleCalendarView.tsx` (Main dispatcher & resource view)``  
   ``- `TechnicianDailyAgenda.tsx` (Mobile field agenda)``  
   ``- `ScheduleModal.tsx` (Add/Edit event modal)``  
   ``- `UnassignedJobsDrawer.tsx` (Draggable pool of pending jobs)``

---

