# AmpedFieldOps V2 - Complete Implementation Plan

## Design System Analysis (from Example Screens)

### Color Palette
```
Primary: #127da1 (Teal/Cyan - main brand color)
Backgrounds:
  - Light: #fafafa
  - Dark: #121417 (main background)
  - Card: #1c2426 (elevated surfaces)
  - Nav Hover: #293438
Borders:
  - Primary: #3c4d53 (card borders, dividers)
  - Dark: #293438 (sidebar borders)
Accents:
  - Amber: #f59e0b (alerts, warnings)
  - Green: #10b981 (success, trending up)
Text:
  - Primary: #ffffff (white)
  - Muted: #9db2b8 (secondary text, labels)
  - Disabled: #64748b
```

### Typography
- **Primary Font:** Space Grotesk (sans-serif)
- **Weights:** 300, 400, 500, 600, 700
- **Patterns:**
  - Headers: Bold, tight tracking
  - Labels: Uppercase, wide tracking (tracking-widest), 10-12px, bold
  - Body: 14px, medium weight
  - Stats: 24-36px, bold

### Component Patterns

#### 1. Sidebar Navigation (Collapsible Drawer Pattern)
- **Expanded State (256px):** Logo + full text nav items, profile card at bottom
- **Collapsed State (64px):** Icon-only mini sidebar, tooltip on hover
- **Mobile (<768px):** Drawer overlay, slides in from left, auto-closes on route change
- **Desktop (≥1024px):** Pushes content area (content expands to fill space)
- **Logo area:** Primary color icon in rounded square with glow effect
- **Nav items:** Icon + text (expanded), icon only (collapsed), hover state, active state with left border
- **Active state:** `bg-nav-hover border-l-4 border-primary`
- **Collapsed animation:** Smooth width transition (300ms)
- **Toggle button:** In header (hamburger icon), shows on mobile/tablet
- **Local storage:** Remember user's collapsed preference (key: `sidebar-collapsed`)

#### 2. Header Bar (Fixed, 64px height)
- Glass morphism effect: `backdrop-filter: blur(12px)`, semi-transparent background
- Search bar: Icon prefix, focus state changes icon color to primary
- Status indicators: Live feed badge with pulsing dot
- Icon buttons: Notifications (with badge), Settings

#### 3. Stat Cards
- Glass/card background: `bg-card-dark`
- Icon overlay: Large, low opacity (5-10%), positioned bottom-right
- Metric display: Large number + small label
- Trend indicator: Badge with icon (trending_up/down) + percentage
- Border: 1px solid `#3c4d53`
- Border radius: `rounded-xl` (12px)

#### 4. Content Cards
- Same glass background as stats
- Header section: Icon + title + action button
- Border separator between header and content
- Hover states on interactive elements

#### 5. Modal/Dialog
- Dark overlay: `bg-black/70 backdrop-blur-sm`
- Modal background: `#161c1e` (navy-modal)
- Header with icon and close button
- Form sections with labels in uppercase, tracking-widest

#### 6. Form Elements
- Background: `#1c2426` (slightly elevated)
- Border: `#3c4d53`
- Focus ring: Primary color with low opacity
- Labels: Uppercase, small, bold, muted color
- Inputs: Same height (40-44px), consistent padding

#### 7. Buttons
- Primary: `bg-primary hover:bg-primary/90`, bold text, rounded-lg
- Secondary: Border with primary color, transparent background
- Icon buttons: Square, rounded-lg, hover bg change
- Service cards: Grid layout, icon + text, selected state with glow

### Icons
- **Library:** Material Symbols Outlined
- **Settings:** `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
- **Common icons:** bolt, dashboard, assignment, badge, engineering, notifications, settings, search

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  [Sidebar - Fixed 256px]   │  [Main Content]    │
│                            │  ┌──────────────┐  │
│    Logo                    │  │ Header (64px)│  │
|    Business Name           |  └──────────────┘  |
|                            |                    |
│  Nav Items                 │                    │
│  - Operations Hub          │  ┌──────────────┐  │
│  - Job Queue               │  │              │  │
│  - Technicians             │  │  Content     │  │
│  - Fleet Analytics         │  │  Area        │  │
│  - Insights                │  │  (scrollable)│  │
│                            │  │              │  │
│                            │  │              │  │
│  [Action Button]           │  └──────────────┘  │
│  [User Profile]            │                    │
│  [Settings]                │                    │
│  [Xero Connection Status]  │                    │
└─────────────────────────────────────────────────┘
```

---

## Application Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS 3.4 + custom theme
- **State:** React Context + Hooks
- **Forms:** react-hook-form + zod validation
- **Routing:** react-router-dom v6
- **Data:** @supabase/supabase-js (direct queries)
- **Icons:** Material Symbols (web font)
- **Fonts:** Google Fonts (Space Grotesk)

### Backend (Minimal)
- **Runtime:** Node.js 20+
- **Framework:** Express (only for service-role operations)
- **Endpoints:** 
  - POST `/admin/xero/sync-items` (import Xero items)
  - GET `/admin/xero/status` (sync status)
- **Queue:** BullMQ + Redis (for background jobs)

---

## File Structure

```
AmpedFieldOps-v2/
├── public/
│   └── vite.svg
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Routes + providers
│   ├── index.css                   # Global styles + Tailwind
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── queries.ts              # Typed CRUD helpers
│   │   └── validators.ts           # Zod schemas
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state + user profile
│   │
│   ├── hooks/
│   │   ├── useClients.ts           # Client CRUD operations
│   │   ├── useProjects.ts          # Project CRUD operations
│   │   ├── useTimesheets.ts        # Timesheet CRUD operations
│   │   └── useActivityTypes.ts     # Activity type operations
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx          # Sidebar + Header wrapper
│   │   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   │   └── Header.tsx          # Top bar with search
│   │   │
│   │   ├── ui/
│   │   │   ├── Button.tsx          # Reusable button
│   │   │   ├── Input.tsx           # Form input
│   │   │   ├── Select.tsx          # Dropdown select
│   │   │   ├── Modal.tsx           # Dialog/modal wrapper
│   │   │   ├── Card.tsx            # Content card
│   │   │   ├── StatCard.tsx        # Dashboard metric card
│   │   │   ├── Badge.tsx           # Status badge
│   │   │   ├── Table.tsx           # Data table
│   │   │   └── Spinner.tsx         # Loading spinner
│   │   │
│   │   ├── ProtectedRoute.tsx      # Auth guard
│   │   └── ErrorBoundary.tsx       # Error handler
│   │
│   ├── pages/
│   │   ├── Login.tsx               # Auth page
│   │   ├── Dashboard.tsx           # Operations Hub
│   │   ├── Clients.tsx             # Client list + CRUD
│   │   ├── Projects.tsx            # Project list + CRUD
│   │   ├── Timesheets.tsx          # Timesheet list + CRUD
│   │   ├── ProductsAndServices.tsx # Product sAnd Services management (Xero)
│   │   └── Files.tsx               # File browser (Supabase Storage)
│   │
│   └── types/
│       └── index.ts                # TypeScript interfaces
│
├── backend/                        # Minimal service-role API
│   ├── src/
│   │   ├── server.ts               # Express app
│   │   ├── routes/
│   │   │   └── xero.ts             # Xero sync endpoints
│   │   └── jobs/
│   │       └── xeroSync.ts         # Background job
│   ├── package.json
│   └── tsconfig.json
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── postcss.config.js
├── .env.example
└── README.md
```

---

## Component Specifications

### Layout Components

#### `<Layout />`
- Props: `children` (React.ReactNode)
- Structure: Flex container, fixed sidebar + flex-1 main
- Renders: `<Sidebar />` + `<Header />` + `<Outlet />`

#### `<Sidebar />`
- **State Management:**
  - `isCollapsed`: boolean (from localStorage key `sidebar-collapsed`, default: false)
  - `isDrawerOpen`: boolean (mobile drawer state)
  - `activeRoute`: detected via `useLocation()`
  - `userRole`: from AuthContext (admin, manager, technician, viewer)

- **Responsive Behavior:**
  - **Desktop (≥1024px):** Always visible, collapse toggle in header, smooth width transition
  - **Tablet (768-1023px):** Drawer pattern by default, swipe to open/close
  - **Mobile (<768px):** Drawer pattern, auto-close on route change, tap overlay to close

- **Role-Based Navigation:**
  ```ts
  const navigationByRole = {
    admin: [
      { icon: 'dashboard', label: 'Command Center', path: '/dashboard' },
      { icon: 'assignment', label: 'Projects', path: '/projects' },
      { icon: 'group', label: 'Clients', path: '/clients' },
      { icon: 'timer', label: 'Timesheets', path: '/timesheets' },
      { icon: 'inventory_2', label: 'Activity Types', path: '/activity-types' },
      { icon: 'description', label: 'Files', path: '/files' },
      { icon: 'analytics', label: 'Reports', path: '/reports' },
      { icon: 'settings', label: 'Settings', path: '/settings' },
    ],
    manager: [
      { icon: 'dashboard', label: 'Command Center', path: '/dashboard' },
      { icon: 'assignment', label: 'Projects', path: '/projects' },
      { icon: 'group', label: 'Clients', path: '/clients' },
      { icon: 'timer', label: 'Timesheets', path: '/timesheets' },
      { icon: 'analytics', label: 'Reports', path: '/reports' },
    ],
    technician: [
      { icon: 'dashboard', label: 'My Dashboard', path: '/dashboard' },
      { icon: 'assignment', label: 'My Projects', path: '/projects' },
      { icon: 'timer', label: 'My Timesheets', path: '/timesheets' },
      { icon: 'description', label: 'My Files', path: '/files' },
    ],
    viewer: [
      { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      { icon: 'analytics', label: 'Reports', path: '/reports' },
    ],
  }
  ```

- **Expanded (256px) Layout:**
  - Logo section (60px height)
  - Scrollable nav items list (flex-1)
  - Divider
  - Collapsible primary action button (full width)
  - User profile card (bottom, sticky)

- **Collapsed (64px) Layout:**
  - Logo (icon only, centered)
  - Icon-only nav items (vertical stack, centered)
  - User avatar (bottom, centered)

- **Animations:**
  - Width transition: `transition-all duration-300`
  - Item fade: Staggered animation on expand/collapse
  - Tooltip: On hover over collapsed nav item (show label)

- **Toggle Button (in Header):**
  - Hamburger icon on mobile/tablet
  - Chevron icon on desktop (expands/collapses sidebar)
  - Click or ESC to close drawer on mobile

#### `<Header />`
- **Props:** `title?: string`, `showSearch?: boolean`, `onToggleSidebar?: () => void`
- **Fixed 64px height, glass-panel effect**
- **Left section:** Hamburger/chevron toggle button
- **Center section:** Search input (debounced, auto-focus on desktop)
- **Right section:** Live status badge, Notifications (with badge count), Settings icon
- **Responsive:** Hide search on mobile, show only icons
- **Mobile:** Full width, hamburger menu prominent

### UI Components

#### `<StatCard />`
```tsx
interface StatCardProps {
  label: string
  value: string | number
  icon: string
  trend?: { value: number; direction: 'up' | 'down' }
  subtitle?: string
}
```
- Design: Card-dark background, border, icon overlay
- Icon: Large (text-8xl), positioned absolute bottom-right, opacity-5
- Trend: Badge with color (green/red), icon (trending_up/down)

#### `<Modal />`
```tsx
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: string
  children: React.ReactNode
  footer?: React.ReactNode
}
```
- Backdrop: Fixed overlay, blur + darkening
- Dialog: Max width 600px, centered, navy-modal background
- Animation: Fade in + scale (animate-in)
- Close: X button + ESC key + backdrop click

#### `<Button />`
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}
```
- Primary: bg-primary, white text, hover:bg-primary/90
- Secondary: border-primary, transparent bg, hover:bg-primary/5
- Ghost: transparent, hover:bg-nav-hover
- Loading: Replace content with spinner

#### `<Table />`
```tsx
interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
}
```
- Header: Sticky, uppercase labels, border-bottom
- Rows: Hover state, cursor pointer if clickable
- Loading: Skeleton rows or spinner overlay
- Empty: Centered message with icon

---

## State Management & Context

### `SidebarContext` (new)
```tsx
interface SidebarContextType {
  isCollapsed: boolean
  isDrawerOpen: boolean
  toggleCollapsed: () => void
  toggleDrawer: () => void
  closeDrawer: () => void
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved ? JSON.parse(saved) : false
  })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { pathname } = useLocation()

  // Auto-close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const toggleCollapsed = () => setIsCollapsed(!isCollapsed)
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen)
  const closeDrawer = () => setIsDrawerOpen(false)

  return (
    <SidebarContext.Provider value={{ isCollapsed, isDrawerOpen, toggleCollapsed, toggleDrawer, closeDrawer }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (!context) throw new Error('useSidebar must be used within SidebarProvider')
  return context
}
```

### `Layout.tsx` Structure
```tsx
export default function Layout() {
  const { isCollapsed, isDrawerOpen } = useSidebar()
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isTablet = useMediaQuery('(min-width: 768px)')

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      {/* Sidebar: Always visible on desktop, drawer on mobile/tablet */}
      {isDesktop ? (
        <aside className={cn(
          'transition-all duration-300 border-r border-border-dark bg-background-dark',
          isCollapsed ? 'w-16' : 'w-64'
        )}>
          <Sidebar />
        </aside>
      ) : (
        <SidebarDrawer isOpen={isDrawerOpen}>
          <Sidebar />
        </SidebarDrawer>
      )}

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

---

## Page Specifications

### Dashboard (Command Center)
**Layout (from current V1 Dashboard):**
- 4-column stat grid: Active Projects, Total Hours, Revenue (YTD), Team Active
- 2-column grid below:
  - Left (8 cols): Hours This Week (bar chart sparkline)
  - Right (4 cols): Quick Stats (Budget Utilization, Projects On Track, Overdue Projects)
- 2-column grid bottom:
  - Left: Recent Timesheet Entries (with project, user, hours, date)
  - Right: Active Projects (with progress bar)

**Stat Cards (from Dashboard):**
- Active Projects → navigate to /projects
- Total Hours → navigate to /timesheets
- Revenue (YTD) → navigate to /financials
- Team Active → navigate to /users

**Features:**
- Welcome notification on first visit per session
- Clickable metrics for navigation
- Hover effects on cards
- Empty states when no data
- Role-based access (all roles see dashboard, but data filtered by role)

### Projects Page
**Features:**
- Table: Name, Client, Status, Budget, Progress, Actions
- Filters: Status toggle (Pending, Active, On Hold, Completed), search by project name
- Kanban board view (toggle to table)
- Columns: Pending, Active, On Hold, Completed
- Actions: Create, Edit, View Details, Change Status, Delete (with confirmation)
- Modal: Multi-step wizard (basics, cost centers, resources)

**Form Steps:**
1. Basics: name, client_id, description, start/end dates, budget
2. Cost Centers: Allocate budget across departments (optional)
3. Review: Summary + submit

**Validation Schema:**
```ts
const projectSchema = z.object({
  name: z.string().min(3, 'Project name required'),
  client_id: z.string().uuid('Must select a client'),
  description: z.string().optional(),
  budget: z.coerce.number().min(0, 'Budget must be positive').optional(),
  hourly_rate: z.coerce.number().min(0, 'Rate must be positive').optional(),
  status: z.enum(['pending', 'active', 'on_hold', 'completed']).default('pending'),
  company_name: z.string().default('Default'),
})
```

### Clients Page
**Features:**
- Table: Name, Contact, Email, Phone, Status, Actions
- Filters: Active/Inactive toggle, search by name/email
- Actions: Create, Edit, Delete (with confirmation)
- Modal: Client form (name, company_name, contact_name, email, phone, address, etc.)

**Validation Schema:**
```ts
const clientSchema = z.object({
  name: z.string().min(2, 'Name required'),
  company_name: z.string().min(2, 'Company name required'),
  contact_name: z.string().optional(),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})
```

### Timesheets Page
**Features:**
- Kanban board OR table view (toggle)
- Columns: Pending, Active, On Hold, Completed
- Card: Project name, client, status, budget, assigned users
- Actions: Create, Edit, View Details, Change Status
- Modal: Multi-step wizard (basics, cost centers, resources)

**Form Steps:**
1. Basics: name, client_id, description, start/end dates, budget
2. Cost Centers: Allocate budget across departments (optional)
3. Review: Summary + submit

### Timesheets Page
**Features:**
- Table: Date, Project, Activity Type, Hours, Status (Submitted/Approved)
- Filters: Date range, project, user (role-based), status
- Actions: Create, Edit, Submit, Approve (admin/manager only)
- Modal: Timesheet form with service type selector

**Service Type Selector:**
- Grid of icon cards (3 columns, responsive to 2 on tablet, 1 on mobile)
- Selected state: bg-primary, border-primary, glow effect
- Icons: engineering (Labor), directions_car (Travel), timer (Overtime), e911_emergency (Emergency), forum (Consultation)

**Validation Schema:**
```ts
const timesheetSchema = z.object({
  project_id: z.string().uuid('Must select a project'),
  entry_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  hours: z.coerce.number().min(0.1, 'Hours must be at least 0.1').max(24, 'Cannot exceed 24 hours'),
  activity_type_id: z.string().uuid('Must select an activity type').optional(),
  notes: z.string().optional(),
  is_submitted: z.boolean().default(false),
  is_approved: z.boolean().default(false),
})
```

### Activity Types Page (for Xero mapping)
**Features:**
- Table: Name, Default Rate, Xero Status (Linked/Unlinked), Actions
- Admin-only: "Sync from Xero" button
- Modal: Activity type form + Xero item mapping dropdown
- Indicator: Badge showing if managed_by_xero
- Xero columns: xero_item_id, xero_item_code, xero_tax_type, managed_by_xero

### Files Page
**Features:**
- File browser by project
- Upload files to Supabase Storage (project-files/{projectId}/)
- Download files with signed URLs
- Delete files (with confirmation)
- File preview/metadata display

### Reports Page
**Features (future, MVP: read-only dashboard summaries)**
- Project summaries (status, budget vs actual, timeline)
- Team utilization (hours by technician)
- Revenue tracking (by client, by project)
- Export to CSV/PDF (future)

### Settings Page (Admin only)
**Features:**
- Company profile
- User management (list, edit, disable)
- Integration settings (Xero, if applicable)
- Advanced settings (archived projects visibility, etc.)

---

## Data Layer

### Supabase Query Helpers (`lib/queries.ts`)

```ts
// Clients
export async function getClients(filters?: ClientFilters) {
  let query = supabase.from('clients').select('*')
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
  }
  const { data, error } = await query.order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function createClient(client: CreateClientPayload) {
  const user = await getCurrentUser()
  const payload = {
    ...client,
    company_name: client.company_name || 'Default',
    created_by: user.id,
  }
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

// Similar patterns for updateClient, deleteClient, getProjects, createProject, etc.
```

### Validation Schemas (`lib/validators.ts`)

```ts
import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  company_name: z.string().min(2, 'Company name required'),
  contact_name: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})

export const projectSchema = z.object({
  name: z.string().min(3, 'Project name required'),
  client_id: z.string().uuid('Must select a client'),
  description: z.string().optional(),
  budget: z.coerce.number().min(0, 'Budget must be positive').optional(),
  hourly_rate: z.coerce.number().min(0, 'Rate must be positive').optional(),
  status: z.enum(['pending', 'active', 'on_hold', 'completed']).default('pending'),
  company_name: z.string().default('Default'),
})

export const timesheetSchema = z.object({
  project_id: z.string().uuid('Must select a project'),
  entry_date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  hours: z.coerce.number().min(0.1, 'Hours must be at least 0.1').max(24, 'Cannot exceed 24 hours'),
  activity_type_id: z.string().uuid('Must select an activity type').optional(),
  notes: z.string().optional(),
  is_submitted: z.boolean().default(false),
  is_approved: z.boolean().default(false),
})
```

---

## Custom Hooks

### `useClients.ts`
```ts
export function useClients(filters?: ClientFilters) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClients(filters)
      setClients(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const create = async (payload: CreateClientPayload) => {
    const newClient = await createClient(payload)
    setClients((prev) => [...prev, newClient])
    return newClient
  }

  const update = async (id: string, payload: UpdateClientPayload) => {
    const updated = await updateClient(id, payload)
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  const remove = async (id: string) => {
    await deleteClient(id)
    setClients((prev) => prev.filter((c) => c.id !== id))
  }

  return { clients, loading, error, create, update, remove, reload: load }
}
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
**Goal:** Auth + basic shell + design system

**Tasks:**
- [ ] Setup Vite project with Tailwind + Space Grotesk font
- [ ] Configure Supabase client
- [ ] Create AuthContext (login, logout, session management)
- [ ] Build Layout components (Sidebar, Header)
- [ ] Build base UI components (Button, Input, Card, Modal, Spinner)
- [ ] Create Login page with Supabase Auth
- [ ] Add protected route wrapper
- [ ] Test: Login, logout, session persistence

**Deliverable:** Working auth flow + empty dashboard with navigation

---

### Phase 2: Clients Module (Days 3-4)
**Goal:** Full CRUD for clients with design-matched UI

**Tasks:**
- [ ] Create `lib/queries.ts` with client helpers
- [ ] Create `lib/validators.ts` with client schema
- [ ] Build Clients page with table
- [ ] Build ClientModal with react-hook-form + zod
- [ ] Implement filters (search, active/inactive toggle)
- [ ] Add loading states, error handling, empty state
- [ ] Test: Create, read, update, delete clients

**Deliverable:** Fully functional Clients page

---

### Phase 3: Projects Module (Days 5-6)
**Goal:** Projects with Kanban view + wizard modal

**Tasks:**
- [ ] Create project queries and validators
- [ ] Build Projects page (table/kanban toggle)
- [ ] Build ProjectModal with multi-step wizard
- [ ] Implement status change (drag-and-drop or dropdown)
- [ ] Link projects to clients (dropdown in form)
- [ ] Test: Create projects, change status, edit, delete

**Deliverable:** Fully functional Projects page with kanban

---

### Phase 4: Timesheets Module (Day 7)
**Goal:** Timesheet tracking with service type selector

**Tasks:**
- [ ] Create timesheet queries and validators
- [ ] Build Timesheets page with table
- [ ] Build TimesheetModal with service type cards
- [ ] Implement date range filter
- [ ] Add submit/approve actions (role-based)
- [ ] Test: Create timesheets, submit, approve (as admin)

**Deliverable:** Fully functional Timesheets page

---

### Phase 5: Dashboard + Activity Types (Day 8)
**Goal:** Real metrics + activity type management

**Tasks:**
- [ ] Build StatCard component
- [ ] Implement dashboard queries (aggregates)
- [ ] Build activity feed/table for recent activity
- [ ] Create ActivityTypes page with Xero linkage UI
- [ ] Add "Sync from Xero" button (calls backend stub)
- [ ] Test: Dashboard loads real data, activity types CRUD

**Deliverable:** Dashboard with live stats + Activity Types page

---

### Phase 6: Polish + Files (Day 9)
**Goal:** Hardening, files, and UX polish

**Tasks:**
- [ ] Implement Supabase Storage file upload/download
- [ ] Build Files page (project file browser)
- [ ] Add optimistic updates for better UX
- [ ] Error boundary component
- [ ] Toast notifications for success/error
- [ ] Loading skeletons for tables
- [ ] Test all flows end-to-end

**Deliverable:** Production-ready UI with file management

---

### Phase 7: Backend + Xero Stub (Day 10)
**Goal:** Minimal backend for admin tasks

**Tasks:**
- [ ] Setup Express server with service-role Supabase client
- [ ] Create POST `/admin/xero/sync-items` endpoint (stub)
- [ ] Create GET `/admin/xero/status` endpoint
- [ ] Add BullMQ job queue setup (optional, for later)
- [ ] Test: Frontend calls backend, gets stub response

**Deliverable:** Backend ready for Xero integration implementation

---

## Migration Strategy from V1

### Data Migration (No changes needed)
- Reuse existing Supabase schema
- RLS policies already in place
- Auth users already in `auth.users` and `public.users`

### Cutover Approach
1. **Parallel Deployment:** Run V2 on a subdomain (e.g., `app-v2.ampedlogix.com`)
2. **User Testing:** 2-3 days with select users
3. **Feedback Loop:** Fix critical bugs, gather UX feedback
4. **Swap:** Point main domain to V2, keep V1 as fallback for 1 week
5. **Retire V1:** After stability confirmed

### Risk Mitigation
- Feature flag system (localStorage toggle for power users)
- Gradual rollout per user role (admins first, then all users)
- Quick rollback plan (DNS + docker-compose down/up)

---

## Testing Plan

### Manual Testing Checklist
**Auth:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (show error)
- [ ] Logout clears session
- [ ] Refresh maintains session
- [ ] Unauthorized access redirects to login

**Clients:**
- [ ] Create client with all fields
- [ ] Create client with minimal fields
- [ ] Edit client
- [ ] Delete client (with confirmation)
- [ ] Search clients
- [ ] Toggle active/inactive filter

**Projects:**
- [ ] Create project with client selected
- [ ] Change project status
- [ ] Edit project
- [ ] Delete project
- [ ] View project details

**Timesheets:**
- [ ] Create timesheet entry
- [ ] Select service type (visual indicator works)
- [ ] Submit timesheet
- [ ] Approve timesheet (as admin)
- [ ] Filter by date range
- [ ] Filter by project

**Dashboard:**
- [ ] Stats show accurate counts
- [ ] Trend indicators display correctly
- [ ] Activity feed loads recent timesheets
- [ ] Page loads in < 2 seconds

### Automated Testing (Future)
- Playwright E2E tests for critical paths
- Jest unit tests for query helpers
- Lighthouse performance audits

---

## Success Criteria

### Performance
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 2.5s
- [ ] Lighthouse Performance score > 85

### Functionality
- [ ] All CRUD operations work without errors
- [ ] Forms validate inputs with clear error messages
- [ ] Loading states show during async operations
- [ ] Error states display user-friendly messages

### UX
- [ ] Design matches example screens (color, typography, spacing)
- [ ] Responsive layout works on tablet and desktop
- [ ] Keyboard navigation works for forms
- [ ] Empty states provide helpful guidance

### Security
- [ ] RLS policies enforced on all queries
- [ ] JWT tokens validated on every request
- [ ] Service-role endpoints require admin role check

---

## Open Questions for User

1. **Xero Integration Priority:** Should we implement the full Xero sync in Phase 7, or stub it and implement later?
2. **Cost Centers:** Are cost centers critical for MVP, or can they be deferred?
3. **User Roles:** Confirm role hierarchy (admin, manager, technician, viewer) and permissions per role.
4. **Files:** Which file types are most critical (project files, safety docs, timesheet images)?
5. **Deployment:** Should V2 run alongside V1, or do a hard cutover after testing?
6. **Notifications:** Are real-time notifications (via Supabase Realtime) needed, or can we defer?

---

## Next Steps

1. **Review this plan** with user to confirm scope and priorities
2. **Adjust timeline** if needed based on available resources
3. **Get approval** on design system extraction (colors, components)
4. **Clarify open questions** before starting implementation
5. **Begin Phase 1** once plan is approved

---

## Appendix: Design Token Reference

```js
// tailwind.config.js theme extension
colors: {
  primary: "#127da1",
  "background-light": "#fafafa",
  "background-dark": "#121417",
  "card-dark": "#1c2426",
  "accent-amber": "#f59e0b",
  "nav-hover": "#293438",
  "border-dark": "#3c4d53",
  "text-muted": "#9db2b8",
}

fontFamily: {
  display: ["Space Grotesk", "sans-serif"],
}

borderRadius: {
  DEFAULT: "0.25rem", // 4px
  lg: "0.5rem",       // 8px
  xl: "0.75rem",      // 12px
}
```

---

**Document Version:** 1.0  
**Last Updated:** January 21, 2026  
**Author:** GitHub Copilot (Senior Web App Developer mode)  
**Status:** Ready for Review
