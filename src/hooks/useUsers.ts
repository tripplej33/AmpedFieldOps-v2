import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export interface User {
  id: string
  email: string
  full_name: string
  role: string
}

export function useUsers() {
  const [data, setData] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const { data: users, error: err } = await supabase
          .from('users')
          .select('id, email, full_name, role')
          .order('full_name')

        if (err) throw err
        setData(users || [])
        setError(null)
      } catch (err) {
        setError(err as Error)
        console.error('Error fetching users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { data, isLoading, error }
}
