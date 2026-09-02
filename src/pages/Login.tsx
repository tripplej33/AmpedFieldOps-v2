import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_ANON_KEY,
} from '@/lib/supabase'

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

  // Server host pointer config state
  const [showServerConfig, setShowServerConfig] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [serverKey, setServerKey] = useState('')
  const [serverSavedNotice, setServerSavedNotice] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    // Load remembered email
    const savedEmail = localStorage.getItem('amped_remembered_email')
    if (savedEmail) {
      setValue('email', savedEmail)
    }

    // Load active server config
    const activeConfig = getStoredSupabaseConfig()
    setServerUrl(activeConfig.url)
    setServerKey(activeConfig.key)
  }, [setValue])

  useEffect(() => {
    if (!loading && user) {
      const from = (location.state as any)?.from?.pathname || '/app/dashboard'
      navigate(from, { replace: true })
    }
  }, [user, loading, navigate, location.state])

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

  const handleSaveServerConfig = () => {
    if (!serverUrl.trim()) return

    saveSupabaseConfig(
      serverUrl.trim(),
      serverKey.trim() || DEFAULT_SUPABASE_ANON_KEY,
      serverUrl.trim()
    )

    setServerSavedNotice('Server configuration saved! Reloading...')
    setTimeout(() => {
      window.location.reload()
    }, 600)
  }

  const handleResetServerConfig = () => {
    resetSupabaseConfig()
    setServerUrl(DEFAULT_SUPABASE_URL)
    setServerKey(DEFAULT_SUPABASE_ANON_KEY)
    setServerSavedNotice('Reset to default cloud server! Reloading...')
    setTimeout(() => {
      window.location.reload()
    }, 600)
  }

  const isCustomServer = serverUrl !== DEFAULT_SUPABASE_URL

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo & Title */}
        <div className="text-center mb-6">
          <h1 className="text-gradient text-4xl font-bold mb-2">
            AmpedFieldOps
          </h1>
          <p className="text-text-muted text-sm">
            Sign in to your field operations account
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card-dark rounded-2xl border border-border-dark p-7 shadow-xl shadow-black/40">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 animate-fadeIn">
                <span className="material-symbols-outlined text-red-400 text-xl shrink-0">
                  error
                </span>
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

        {/* Server Pointer / Host Connection Panel */}
        <div className="bg-card-dark/60 rounded-xl border border-border-dark/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm text-primary">
                {showServerConfig ? 'expand_less' : 'settings_ethernet'}
              </span>
              <span>Server Connection:</span>
              <span className="font-mono text-[11px] text-white/90 truncate max-w-[170px]">
                {isCustomServer ? serverUrl.replace(/^https?:\/\//, '') : 'Amped Cloud'}
              </span>
            </button>

            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isCustomServer
                  ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isCustomServer ? 'Custom Host' : 'Cloud'}
            </span>
          </div>

          {showServerConfig && (
            <div className="pt-2 border-t border-border-dark/60 space-y-3 animate-fadeIn">
              {serverSavedNotice && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 text-center">
                  {serverSavedNotice}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">
                  Server Domain / Supabase URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://your-instance.supabase.co"
                  className="w-full px-3 py-1.5 bg-background-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/40 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-text-muted">
                  Anon API Key (Optional Override)
                </label>
                <input
                  type="password"
                  value={serverKey}
                  onChange={(e) => setServerKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  className="w-full px-3 py-1.5 bg-background-dark border border-border-dark focus:border-primary rounded-lg text-xs text-white placeholder-text-muted/40 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {isCustomServer && (
                  <button
                    type="button"
                    onClick={handleResetServerConfig}
                    className="px-2.5 py-1 text-xs text-text-muted hover:text-red-400 transition-colors"
                  >
                    Reset Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveServerConfig}
                  className="px-3.5 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-xs">
          AmpedFieldOps V2 © {new Date().getFullYear()} • Mobile & Cloud Synced
        </p>
      </div>
    </div>
  )
}
