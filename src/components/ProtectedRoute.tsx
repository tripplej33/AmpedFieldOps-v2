import { Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Spinner from './ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (user) {
    if (roles && !roles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
              block
            </span>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-text-muted mb-6">You don't have permission to access this page.</p>
            <Link
              to="/app/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-xs font-medium text-text-muted animate-pulse">Loading AmpedFieldOps...</p>
      </div>
    )
  }

  return <Navigate to="/login" state={{ from: location }} replace />
}
