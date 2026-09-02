import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User, AuthState, LoginCredentials } from '@/types'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const getInitialCachedUser = (): User | null => {
  try {
    const cached = localStorage.getItem('amped_user_profile')
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(getInitialCachedUser)
  // If we already have a cached profile, we don't block render on initial load
  const [loading, setLoading] = useState<boolean>(!getInitialCachedUser())
  const [error, setError] = useState<string | null>(null)

  const loadUserProfile = async (userId: string, attempt = 0): Promise<User | null> => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (fetchErr || !data) {
        // Retry with backoff if network transient failure
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
          return loadUserProfile(userId, attempt + 1)
        }
        console.error('Error loading user profile after retries:', fetchErr)
        await supabase.auth.signOut()
        setUser(null)
        localStorage.removeItem('amped_user_profile')
        setError('Profile not found. Please contact support.')
        setLoading(false)
        return null
      }

      const loadedUser = data as User
      setUser(loadedUser)
      localStorage.setItem('amped_user_profile', JSON.stringify(loadedUser))
      setError(null)
      setLoading(false)
      return loadedUser
    } catch (err) {
      if (attempt >= 2) {
        console.error('Error loading user profile:', err)
        await supabase.auth.signOut()
        setUser(null)
        localStorage.removeItem('amped_user_profile')
        setError(err instanceof Error ? err.message : 'Failed to load profile')
        setLoading(false)
      }
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    // 1. Initial background session validation
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          setUser(null)
          localStorage.removeItem('amped_user_profile')
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Session check failed:', err)
        setLoading(false)
      })

    // 2. Realtime listener for Auth changes (tokens, signout, signin)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        localStorage.removeItem('amped_user_profile')
        setError(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          await loadUserProfile(session.user.id)
        }
      } else if (event === 'TOKEN_REFRESHED') {
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async ({ email, password }: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        console.error('Login error:', signInErr)
        throw signInErr
      }

      if (data.user) {
        await loadUserProfile(data.user.id)
      }
    } catch (err) {
      console.error('Login failed:', err)
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      localStorage.removeItem('amped_user_profile')
      setUser(null)
      setError(null)
      const { error: signOutErr } = await supabase.auth.signOut()
      if (signOutErr) throw signOutErr
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) {
      await loadUserProfile(session.user.id)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
