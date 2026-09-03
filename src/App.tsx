import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TerminologyProvider } from './contexts/TerminologyContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import { useMobileInit } from './hooks/useMobileInit'

// Lazy-Loaded Page Components for optimized mobile bundle size
const Welcome = lazy(() => import('./pages/Welcome'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const TimesheetsPage = lazy(() => import('./pages/TimesheetsPage'))
const FinancialsPage = lazy(() => import('./pages/FinancialsPage'))
const PurchaseOrdersPage = lazy(() => import('./pages/PurchaseOrdersPage'))
const VanStockPage = lazy(() => import('./pages/VanStockPage'))
const FleetPage = lazy(() => import('./pages/FleetPage'))
const SiteKioskPage = lazy(() => import('./pages/SiteKioskPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const FilesPage = lazy(() => import('./pages/FilesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfileSettingsPage = lazy(() => import('./pages/ProfileSettingsPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const SafetyHubPage = lazy(() => import('./pages/SafetyHubPage'))
const PublicCrewSignPage = lazy(() => import('./pages/PublicCrewSignPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const ComplianceHubPage = lazy(() => import('./pages/ComplianceHubPage'))

const ProjectRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/app/projects/${id}`} replace />
}

const ClientRedirect = () => {
  const { id } = useParams()
  return <Navigate to={`/app/clients/${id}`} replace />
}

function MobileInitializer() {
  useMobileInit()
  return null
}

const PageLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-text-muted">Loading FieldOps...</span>
    </div>
  </div>
)

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
    <div className="text-center">
      <span className="material-symbols-outlined text-8xl text-text-muted mb-4">search_off</span>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-text-muted mb-6">Page not found</p>
      <Link
        to="/app/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined">home</span>
        Go to Dashboard
      </Link>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TerminologyProvider>
            <MobileInitializer />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Welcome />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/site-kiosk/:projectId" element={<SiteKioskPage />} />
                <Route path="/safety-sign/:documentId" element={<PublicCrewSignPage />} />

                {/* Direct top-level shortcuts & non-prefixed route aliases */}
                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
                <Route path="/projects/:id" element={<ProjectRedirect />} />
                <Route path="/schedule" element={<Navigate to="/app/schedule" replace />} />
                <Route path="/timesheets" element={<Navigate to="/app/timesheets" replace />} />
                <Route path="/clients" element={<Navigate to="/app/clients" replace />} />
                <Route path="/clients/:id" element={<ClientRedirect />} />
                <Route path="/purchase-orders" element={<Navigate to="/app/purchase-orders" replace />} />
                <Route path="/van-stock" element={<Navigate to="/app/van-stock" replace />} />
                <Route path="/fleet" element={<Navigate to="/app/fleet" replace />} />
                <Route path="/safety" element={<Navigate to="/app/safety" replace />} />
                <Route path="/compliance" element={<Navigate to="/app/compliance" replace />} />
                <Route path="/files" element={<Navigate to="/app/files" replace />} />
                <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

                {/* Authenticated Application Layout */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/app/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />

                  {/* Clients */}
                  <Route
                    path="clients"
                    element={
                      <ProtectedRoute roles={['admin', 'manager']}>
                        <ClientsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="clients/:id"
                    element={
                      <ProtectedRoute roles={['admin', 'manager']}>
                        <ClientDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Projects Hub & 360 Detail */}
                  <Route path="projects" element={<ProjectsPage />} />
                  <Route path="projects/:id" element={<ProjectDetailPage />} />

                  {/* Job Scheduling & Resource Dispatch */}
                  <Route path="schedule" element={<SchedulePage />} />

                  {/* Purchase Orders & Procurement */}
                  <Route
                    path="purchase-orders"
                    element={
                      <ProtectedRoute roles={['admin', 'manager']}>
                        <PurchaseOrdersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Van Stock & Inventory */}
                  <Route
                    path="van-stock"
                    element={
                      <ProtectedRoute>
                        <VanStockPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fleet & Vehicles */}
                  <Route
                    path="fleet"
                    element={
                      <ProtectedRoute>
                        <FleetPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Files Hub */}
                  <Route
                    path="files"
                    element={
                      <ProtectedRoute>
                        <FilesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Safety & Pre-Starts */}
                  <Route
                    path="safety"
                    element={
                      <ProtectedRoute>
                        <SafetyHubPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Compliance, Test Sheets & Certificates Hub */}
                  <Route
                    path="compliance"
                    element={
                      <ProtectedRoute>
                        <ComplianceHubPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Timesheets */}
                  <Route path="timesheets" element={<TimesheetsPage />} />

                  {/* Financials & Billing */}
                  <Route
                    path="financials"
                    element={
                      <ProtectedRoute roles={['admin', 'manager']}>
                        <FinancialsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* User Profile & Preferences */}
                  <Route
                    path="profile"
                    element={
                      <ProtectedRoute>
                        <ProfileSettingsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Settings & Administration Hub */}
                  <Route path="settings/activity-types" element={<Navigate to="/app/settings" replace />} />
                  <Route path="settings/xero" element={<Navigate to="/app/settings" replace />} />
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TerminologyProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
