import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Welcome from './pages/Welcome'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ClientsPage from './pages/ClientsPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import TimesheetsPage from './pages/TimesheetsPage'
import ActivityTypesPage from './pages/ActivityTypesPage'
import FinancialsPage from './pages/FinancialsPage'
import FilesPage from './pages/FilesPage'

// Placeholder pages (will be implemented in later phases)

const Settings = () => (
  <div className="bg-card-dark rounded-xl border border-border-dark p-8 text-center">
    <span className="material-symbols-outlined text-6xl text-primary mb-4">settings</span>
    <h2 className="text-xl font-semibold text-white mb-2">Settings Module</h2>
    <p className="text-text-muted">Admin configuration</p>
  </div>
)

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
    <div className="text-center">
      <span className="material-symbols-outlined text-8xl text-text-muted mb-4">search_off</span>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-text-muted mb-6">Page not found</p>
      <a
        href="/app/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined">home</span>
        Go to Dashboard
      </a>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Welcome />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

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
              <Route path="clients" element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <ClientsPage />
                </ProtectedRoute>
              } />
              <Route path="projects" element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <ProjectsPage />
                </ProtectedRoute>
              } />
              <Route path="projects/:id" element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <ProjectDetailPage />
                </ProtectedRoute>
              } />
              <Route path="files" element={
                <ProtectedRoute>
                  <FilesPage />
                </ProtectedRoute>
              } />
              <Route path="projects/:id/files" element={<Navigate to="/app/files" replace />} />
              <Route path="timesheets" element={<TimesheetsPage />} />
              <Route path="financials" element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <FinancialsPage />
                </ProtectedRoute>
              } />
              <Route path="settings/activity-types" element={
                <ProtectedRoute roles={['admin', 'manager']}>
                  <ActivityTypesPage />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute roles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
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
