import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Spinner from './ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: Array<'admin' | 'manager' | 'technician' | 'viewer'>
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  console.log('ProtectedRoute render', { loading, userPresent: !!user, path: location.pathname })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/welcome" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
            block
          </span>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-text-muted">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
