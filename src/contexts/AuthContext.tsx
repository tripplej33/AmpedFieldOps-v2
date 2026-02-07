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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let isMounted = true
    let currentUserId: string | null = null
    let profileFetchInProgress = false

    const debouncedLoadProfile = (userId: string) => {
      if (profileFetchInProgress || currentUserId === userId) return
      currentUserId = userId
      profileFetchInProgress = true

      setTimeout(() => {
        loadUserProfile(userId)
          .catch((err) => {
            console.error('Deferred profile load failed:', err)
          })
          .finally(() => {
            profileFetchInProgress = false
          })
      }, 100)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      console.log('Auth state change:', event, { hasSession: !!session?.user })

      // Only clear user if actually signed out
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing user state')
        setUser(null)
        setError(null)
        currentUserId = null
        setLoading(false) // No session, stop loading
      }

      setHydrated(true)

      // Load profile for signed-in users
      if (session?.user) {
        console.log('Session found, loading profile for user:', session.user.id)
        setLoading(true) // Ensure loading is true while profile fetches
        debouncedLoadProfile(session.user.id)
      } else if (event !== 'SIGNED_OUT') {
        setLoading(false)
      }
    })

    // Ensure hydration even if INITIAL_SESSION arrives before render
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!isMounted || hydrated) return
        const session = data.session
        console.log('Initial session fetched:', { hasSession: !!session?.user })
        setHydrated(true)

        if (session?.user) {
          console.log('Loading profile for initial session user:', session.user.id)
          setLoading(true)
          debouncedLoadProfile(session.user.id)
        } else {
          // Only clear user if no session
          setUser(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Error fetching session:', err)
        setHydrated(true)
        setLoading(false)
      })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (userId: string, attempt = 0): Promise<void> => {
    try {
      console.log(`Loading user profile for ${userId} (attempt ${attempt})`)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error('Error loading user profile:', error)
        await supabase.auth.signOut()
        setUser(null)
        setError('Profile not found. Please contact support.')
        throw new Error('Profile not found')
      }

      console.log('User profile loaded successfully:', data)
      setUser(data as User)
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Error loading user profile:', err)
      await supabase.auth.signOut()
      setUser(null)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      setLoading(false)
      throw err
    }
  }

  const login = async ({ email, password }: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Attempting login...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error:', error)
        throw error
      }

      console.log('Login successful, loading profile...')
      if (data.user) {
        await loadUserProfile(data.user.id)
      }
    } catch (err) {
      console.error('Login failed:', err)
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw new Error(message)
    } finally {
      console.log('Login process complete, setting loading to false')
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
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
