import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

interface SignupPageProps {
  isFirstTimeSetup?: boolean
}

export default function Signup({ isFirstTimeSetup = false }: SignupPageProps) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const role: 'admin' | 'manager' | 'technician' | 'viewer' = isFirstTimeSetup
        ? 'admin'
        : 'viewer'

      // Sign up with Supabase Auth
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
        },
      })

      if (signupError) throw signupError

      if (authData.user) {
        // Create user profile in users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: data.email,
              full_name: data.fullName,
              role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])

        if (profileError) throw profileError

        setSuccessMessage(
          isFirstTimeSetup
            ? 'Admin account created successfully! You can now log in.'
            : 'Account created successfully! Please check your email to confirm.'
        )

        // Redirect after short delay
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 2000)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-gradient text-4xl font-bold mb-2">
            AmpedFieldOps
          </h1>
          <p className="text-text-muted">
            {isFirstTimeSetup ? 'Create your admin account' : 'Create an account'}
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-card-dark rounded-xl border border-border-dark p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <span className="material-symbols-outlined text-red-500 text-xl">
                  error
                </span>
                <p className="text-sm text-red-400 flex-1">{errorMessage}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-start gap-2">
                <span className="material-symbols-outlined text-green-500 text-xl">
                  check_circle
                </span>
                <p className="text-sm text-green-400 flex-1">{successMessage}</p>
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="your.email@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="text-xs text-text-muted bg-card-dark/50 p-3 rounded border border-border-dark">
              <p className="font-semibold mb-1">Password requirements:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one number</li>
              </ul>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
            >
              {isFirstTimeSetup ? 'Create Admin Account' : 'Create Account'}
            </Button>
          </form>

          {!isFirstTimeSetup && (
            <div className="mt-6 text-center">
              <p className="text-text-muted">
                Already have an account?{' '}
                <a
                  href="/login"
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Sign in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
