import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import Login from './Login'
import Signup from './Signup'

type WelcomeMode = 'checking' | 'login' | 'signup'

export default function Welcome() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<WelcomeMode>('checking')
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)

  // Use AuthContext instead of direct Supabase calls
  // This prevents multiple redirects and respects global auth state
  useEffect(() => {
    // Still loading auth state - show loading screen
    if (loading) {
      setMode('checking')
      return
    }

    // User is authenticated - redirect to dashboard immediately
    if (user) {
      console.log('User authenticated, redirecting to dashboard')
      navigate('/app/dashboard', { replace: true })
      return
    }

    // User is not authenticated - show login screen
    console.log('User not authenticated, showing login')
    setIsFirstTimeSetup(false)
    setMode('login')
  }, [user, loading, navigate])

  if (mode === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark">
        <div className="text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="animate-spin">
              <span className="material-symbols-outlined text-6xl text-primary">
                settings
              </span>
            </div>
            <p className="text-text-muted">Initializing AmpedFieldOps...</p>
          </div>
        </div>
      </div>
    )
  }

  return mode === 'signup' ? (
    <Signup isFirstTimeSetup={isFirstTimeSetup} />
  ) : (
    <Login />
  )
}
