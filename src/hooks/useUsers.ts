import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

let cachedUsers: User[] | null = null

export function useUsers() {
  const [data, setData] = useState<User[]>(() => cachedUsers || [])
  const [isLoading, setIsLoading] = useState(!cachedUsers)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchUsers = async () => {
      try {
        if (!cachedUsers) {
          setIsLoading(true)
        }
        const { data: users, error: err } = await supabase
          .from('users')
          .select('id, email, full_name, role')
          .order('full_name')

        if (err) throw err
        if (isMounted) {
          const freshUsers = users || []
          cachedUsers = freshUsers
          setData(freshUsers)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error)
          console.error('Error fetching users:', err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchUsers()

    return () => {
      isMounted = false
    }
  }, [])

  return { data, isLoading, error }
}
