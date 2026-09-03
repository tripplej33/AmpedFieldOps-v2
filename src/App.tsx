import { BrowserRouter, Routes, Route, Navigate, Link, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TimesheetsPage from './pages/TimesheetsPage'
import FinancialsPage from './pages/FinancialsPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import VanStockPage from './pages/VanStockPage'
import FleetPage from './pages/FleetPage'
import SiteKioskPage from './pages/SiteKioskPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import FilesPage from './pages/FilesPage'
import SettingsPage from './pages/SettingsPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SafetyHubPage from './pages/SafetyHubPage'
import PublicCrewSignPage from './pages/PublicCrewSignPage'
import { useMobileInit } from './hooks/useMobileInit'

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
          <MobileInitializer />
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
            <Route path="/timesheets" element={<Navigate to="/app/timesheets" replace />} />
            <Route path="/clients" element={<Navigate to="/app/clients" replace />} />
            <Route path="/clients/:id" element={<ClientRedirect />} />
            <Route path="/purchase-orders" element={<Navigate to="/app/purchase-orders" replace />} />
            <Route path="/van-stock" element={<Navigate to="/app/van-stock" replace />} />
            <Route path="/fleet" element={<Navigate to="/app/fleet" replace />} />
            <Route path="/files" element={<Navigate to="/app/files" replace />} />
            <Route path="/safety" element={<Navigate to="/app/safety" replace />} />
            <Route path="/financials" element={<Navigate to="/app/financials" replace />} />
            <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
            <Route path="/profile" element={<Navigate to="/app/profile" replace />} />

            {/* Protected Routes */}
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
              
              {/* Clients Hub & 360 Profile */}
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
              {/* Safety & Compliance Hub */}
              <Route
                path="safety"
                element={
                  <ProtectedRoute>
                    <SafetyHubPage />
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
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
