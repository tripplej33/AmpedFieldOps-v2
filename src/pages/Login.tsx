import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Remember email state
  const [rememberEmail, setRememberEmail] = useState(true)

  // Organization URL state
  const [orgUrl, setOrgUrl] = useState<string>('')
  const [inputOrgUrl, setInputOrgUrl] = useState<string>('')
  const [orgError, setOrgError] = useState<string | null>(null)
  const [isConnectingOrg, setIsConnectingOrg] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    // 1. Determine active Organization URL
    const savedOrg = typeof window !== 'undefined' ? localStorage.getItem('amped_org_url') : null

    if (savedOrg) {
      setOrgUrl(savedOrg)
      setInputOrgUrl(savedOrg)
    } else if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !Capacitor.isNativePlatform()) {
      // In web browser on a live domain
      setOrgUrl(window.location.origin)
      setInputOrgUrl(window.location.origin)
    }

    // 2. Load remembered email
    const savedEmail = typeof window !== 'undefined' ? localStorage.getItem('amped_remembered_email') : null
    if (savedEmail) {
      setValue('email', savedEmail)
    }
  }, [setValue])

  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/app/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, location.state])

  const handleConnectOrg = (e: React.FormEvent) => {
    e.preventDefault()
    setOrgError(null)

    let formatted = inputOrgUrl.trim()
    if (!formatted) {
      setOrgError('Please enter your Organization URL')
      return
    }

    // Add https:// prefix if user entered just domain like admin.ampedlogix.com
    if (!/^https?:\/\//i.test(formatted)) {
      formatted = `https://${formatted}`
    }

    // Basic URL validation
    try {
      const parsed = new URL(formatted)
      if (!parsed.hostname || parsed.hostname.length < 3) {
        throw new Error('Invalid domain')
      }
    } catch {
      setOrgError('Please enter a valid URL (e.g. https://admin.ampedlogix.com)')
      return
    }

    setIsConnectingOrg(true)
    localStorage.setItem('amped_org_url', formatted)

    // If running on native mobile device, redirect WebView directly to organization instance
    if (Capacitor.isNativePlatform()) {
      window.location.href = formatted
      return
    }

    // Web / local mode
    setOrgUrl(formatted)
    setIsConnectingOrg(false)
  }

  const handleChangeOrg = () => {
    localStorage.removeItem('amped_org_url')
    setOrgUrl('')
    setInputOrgUrl('')
    setOrgError(null)
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      if (rememberEmail) {
        localStorage.setItem('amped_remembered_email', data.email.trim())
      } else {
        localStorage.removeItem('amped_remembered_email')
      }

      await login(data)

      const from = (location.state as any)?.from?.pathname || '/app/dashboard'
      navigate(from, { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const displayHost = orgUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mb-3 shadow-lg shadow-primary/5">
            <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
          </div>
          <h1 className="text-gradient text-3xl font-extrabold tracking-tight mb-1.5">
            AmpedFieldOps
          </h1>
          <p className="text-text-muted text-xs">
            Field Operations & Workforce Management
          </p>
        </div>

        {/* STEP 1: Enter Organization URL */}
        {!orgUrl ? (
          <div className="bg-card-dark rounded-2xl border border-border-dark p-7 shadow-2xl shadow-black/50 space-y-5 animate-fadeIn">
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                Enter Organization URL
              </h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Connect your device to your company's AmpedFieldOps workspace address.
              </p>
            </div>

            <form onSubmit={handleConnectOrg} className="space-y-4">
              {orgError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-400 text-lg shrink-0">error</span>
                  <p className="text-xs text-red-300 flex-1 leading-relaxed">{orgError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/90">
                  Organization URL
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                    dns
                  </span>
                  <input
                    type="text"
                    value={inputOrgUrl}
                    onChange={(e) => setInputOrgUrl(e.target.value)}
                    placeholder="https://admin.ampedlogix.com"
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-text-muted/70 pl-1">
                  e.g. <span className="text-white/80 font-mono">https://admin.ampedlogix.com</span>
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isConnectingOrg}
                className="py-2.5 flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Button>
            </form>
          </div>
        ) : (
          /* STEP 2: Sign In with Email and Password */
          <div className="bg-card-dark rounded-2xl border border-border-dark p-7 shadow-2xl shadow-black/50 space-y-5 animate-fadeIn">
            {/* Active Workspace Pill Banner */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-background-dark/80 border border-border-dark/80">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-primary text-base shrink-0">
                  domain
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    Organization
                  </p>
                  <p className="text-xs font-bold text-white truncate max-w-[180px]">
                    {displayHost}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleChangeOrg}
                className="px-2.5 py-1 rounded-lg border border-border-dark text-[11px] font-medium text-text-muted hover:text-white hover:border-primary transition-colors"
              >
                Change
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 animate-fadeIn">
                  <span className="material-symbols-outlined text-red-400 text-lg shrink-0">error</span>
                  <p className="text-xs text-red-300 flex-1 leading-relaxed">{errorMessage}</p>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="rounded border-border-dark bg-background-dark text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs text-text-muted">Remember email</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
              >
                Sign In
              </Button>
            </form>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-text-muted text-xs">
          AmpedFieldOps V2 © {new Date().getFullYear()} • Secure Enterprise Access
        </p>
      </div>
    </div>
  )
}
