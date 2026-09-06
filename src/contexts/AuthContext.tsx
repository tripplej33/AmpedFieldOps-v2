import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { safeLocalStorage } from '@/lib/storage'
import { syncPreferencesFromServer } from '@/lib/theme'
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
    const cached = safeLocalStorage.getItem('amped_user_profile')
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
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
          return loadUserProfile(userId, attempt + 1)
        }
        console.error('Error loading user profile after retries:', fetchErr)
        const existing = getInitialCachedUser()
        if (existing && existing.id === userId) {
          setUser(existing)
          setError(null)
          return existing
        }
        await supabase.auth.signOut()
        setUser(null)
        safeLocalStorage.removeItem('amped_user_profile')
        setError('Profile not found. Please contact support.')
        return null
      }

      const loadedUser = data as User
      setUser(loadedUser)
      safeLocalStorage.setItem('amped_user_profile', JSON.stringify(loadedUser))
      setError(null)
      return loadedUser
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
        return loadUserProfile(userId, attempt + 1)
      }
      console.error('Error loading user profile:', err)
      const existing = getInitialCachedUser()
      if (existing && existing.id === userId) {
        setUser(existing)
        return existing
      }
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      return null
    } finally {
      if (attempt === 0 || attempt >= 2) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    let isMounted = true

    // Safety guard: Ensure loading state is never stuck true
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 2500)

    // 1. Initial background session validation
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!isMounted) return
        if (session?.user) {
          // Sync server preferences from user_metadata if available
          if (session.user.user_metadata?.preferences) {
            syncPreferencesFromServer(session.user.user_metadata.preferences)
          }
          await loadUserProfile(session.user.id)
        } else {
          setUser(null)
          safeLocalStorage.removeItem('amped_user_profile')
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
        safeLocalStorage.removeItem('amped_user_profile')
        setError(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || (event as string) === 'INITIAL_SESSION') {
        if (session?.user) {
          if (session.user.user_metadata?.preferences) {
            syncPreferencesFromServer(session.user.user_metadata.preferences)
          }
          await loadUserProfile(session.user.id)
        } else {
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (signInErr) throw signInErr

      if (data.user) {
        if (data.user.user_metadata?.preferences) {
          syncPreferencesFromServer(data.user.user_metadata.preferences)
        }
        await loadUserProfile(data.user.id)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      safeLocalStorage.removeItem('amped_user_profile')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed')
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    if (user?.id) {
      await loadUserProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
