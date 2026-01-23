# AmpedFieldOps V2 🚀

> Complete rewrite of field operations management system built with React 18, TypeScript, Tailwind CSS, and Supabase.

## 🎯 Project Status

**Phase 1: Foundation** ✅ **COMPLETE**  
**Current Phase:** Ready for Phase 2 (Clients Module)  
**Version:** 2.0.0

---

## 🏗️ Tech Stack

### Frontend
- **Runtime:** Node.js 20+
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 3.4
- **State Management:** React Context + Hooks
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6
- **Database:** Supabase
- **Icons:** Material Symbols (web font)
- **Fonts:** Google Fonts (Space Grotesk)

### Backend (Phase 7+)
- Express.js + BullMQ + Redis (service-role operations only)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ installed
- Supabase account with project created
- Git

### Installation

```bash
# Clone the repository
cd /root/AmpedFieldOps-v2

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📦 Project Structure

```
AmpedFieldOps-v2/
├── src/
│   ├── components/
│   │   ├── layout/          # Layout components (Sidebar, Header, Layout)
│   │   ├── ui/              # Reusable UI components (Button, Input, Card, etc.)
│   │   ├── ProtectedRoute.tsx
│   │   └── ErrorBoundary.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication state management
│   │
│   ├── pages/
│   │   ├── Login.tsx        # Authentication page
│   │   └── Dashboard.tsx    # Main dashboard
│   │
│   ├── lib/
│   │   └── supabase.ts      # Supabase client configuration
│   │
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   │
│   ├── App.tsx              # Main app with routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles + Tailwind
│
├── .project/                # Project documentation
│   ├── manifest.json        # Feature specifications
│   └── memory/              # Phase briefs and progress tracking
│
├── tailwind.config.js       # Tailwind configuration with custom theme
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

---

## 🎨 Design System

### Color Palette
```
Primary:        #127da1 (Teal)
Background:     #121417 (Dark Gray)
Card:           #1c2426 (Card Dark)
Accent:         #f59e0b (Amber)
Border:         #3c4d53 (Border Dark)
Text Muted:     #9db2b8 (Gray Blue)
```

### Typography
- **Font Family:** Space Grotesk (300, 400, 500, 600, 700)
- **Display:** Text gradient effect available via `.text-gradient`

### Components Library

#### UI Components (8 core)
1. **Button** - 4 variants (primary, secondary, ghost, danger) + loading state
2. **Input** - Form input with label, error, and validation styles
3. **Card** - Content wrapper with header/content/footer sections
4. **Modal** - Dialog with backdrop blur and ESC key handler
5. **Badge** - Status indicators (5 color variants)
6. **Select** - Dropdown compatible with react-hook-form
7. **Spinner** - Loading indicator (3 sizes: sm, md, lg)
8. **StatCard** - Metric card with icon, value, and trend badge

#### Layout Components
- **Layout** - Main wrapper with responsive sidebar
- **Sidebar** - Collapsible navigation with role-based filtering
- **Header** - Fixed glass-morphism header with search

---

## 🔐 Authentication

### Features
- Email/password authentication via Supabase
- Session persistence (auto-refresh)
- Protected routes with role-based access control
- User profile loading from database

### User Roles
- **admin** - Full access to all modules
- **manager** - Client/project management + timesheet approval
- **technician** - Timesheet submission + view own projects
- **viewer** - Read-only dashboard access

### Usage

```tsx
import { useAuth } from '@/contexts/AuthContext'

function MyComponent() {
  const { user, loading, login, logout } = useAuth()
  
  // Access current user
  console.log(user?.role) // 'admin' | 'manager' | 'technician' | 'viewer'
  
  // Login
  await login({ email, password })
  
  // Logout
  await logout()
}
```

---

## 🛣️ Routing

### Public Routes
- `/login` - Authentication page

### Protected Routes (require authentication)
- `/dashboard` - Operations dashboard (all roles)
- `/clients` - Client management (admin, manager only)
- `/projects` - Project management (all roles)
- `/timesheets` - Timesheet tracking (all roles)
- `/financials` - Financial overview (admin, manager only)
- `/files` - File management (all roles)
- `/settings` - System settings (admin only)

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Login with valid Supabase credentials
- [ ] Session persistence after page refresh
- [ ] Protected route redirects for unauthenticated users
- [ ] Role-based navigation filtering
- [ ] Sidebar collapse/expand (desktop)
- [ ] Mobile drawer open/close
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] All UI components render correctly

### Before Testing
**IMPORTANT:** Set up Supabase database first:

```sql
-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'technician', 'viewer')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

---

## 📝 Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Backend API (Phase 7+)
# VITE_API_URL=http://localhost:3001

# Environment
VITE_ENV=development
```

---

## 🚦 Phase Roadmap

### ✅ Phase 1: Foundation (2 days) - COMPLETE
- React 18 + TypeScript + Vite setup
- Tailwind CSS with custom design tokens
- Supabase client configuration
- Authentication context & login flow
- Layout components (Sidebar, Header)
- 8 core UI components
- Protected route guards
- Error boundary

### 🔜 Phase 2: Clients Module (2 days)
- Full CRUD for clients
- Table with filters and search
- Form modal with validation
- Two-way sync with Xero Contacts

### 📅 Phase 3: Projects Module (2 days)
- Projects with Kanban + table views
- Multi-step wizard for project creation
- Status management (Pending, Active, On Hold, Completed, Invoiced, Archived)
- Cost Centers per project

### 📅 Phase 4: Timesheets Module (1 day)
- Timesheet tracking with states: Draft → Submitted → Approved → Invoiced
- Service type selector
- Submit/approve workflow

### 📅 Phase 5: Dashboard & Activity Types (1 day)
- Real-time metrics and stat cards
- Activity feed
- Activity Types management (CRUD)
- Map to Xero Products/Services

### 📅 Phase 6: Polish & Files (1 day)
- File management (Supabase Storage)
- Project-scoped file browser
- UX hardening

### 📅 Phase 7: Backend & Xero (1 day)
- Express endpoints for Xero sync
- Admin operations
- Invoice creation workflow

---

## 🛠️ Development Commands

```bash
# Development
npm run dev         # Start dev server (hot reload)

# Build
npm run build       # TypeScript compile + Vite build
npm run preview     # Preview production build

# Linting
npm run lint        # Run ESLint
```

---

## 📚 Code Examples

### Creating a Form with Validation

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short'),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    console.log(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input label="Email" error={errors.email?.message} {...register('email')} />
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

### Using Supabase Client

```tsx
import { supabase } from '@/lib/supabase'

// Fetch data
const { data, error } = await supabase
  .from('clients')
  .select('*')
  .eq('is_active', true)

// Insert data
const { data, error } = await supabase
  .from('clients')
  .insert({ name: 'Acme Corp', email: 'contact@acme.com' })

// Real-time subscription
const subscription = supabase
  .channel('clients-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, (payload) => {
    console.log('Change received!', payload)
  })
  .subscribe()
```

---

## 🐛 Known Issues

- **IDE Path Alias Warnings:** VSCode may show errors for `@/` imports until TypeScript server reloads. These are false positives - build succeeds.
- **Material Symbols:** Icons require internet connection (loaded from CDN). For offline, download font files.

---

## 📖 Documentation

- [Phase 1 Mission Brief](.project/memory/phase1_mission_brief.md)
- [Phase 1 Complete Report](.project/memory/phase1_complete.md)
- [Project Manifest](.project/manifest.json)
- [Implementation Plan](V2_Implementation_Plan.md)

---

## 🤝 Contributing

This is a managed project with phased implementation. Contact the PM agent before making changes.

---

## 📄 License

ISC

---

## 🙏 Acknowledgments

- **Design System:** Custom dark theme with teal accents
- **Icons:** Material Symbols by Google
- **Fonts:** Space Grotesk by Florian Karsten

---

**Built with ❤️ by the AmpedFieldOps Team**
