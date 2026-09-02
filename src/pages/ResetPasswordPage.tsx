import { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { validatePasswordStrength } from '@/lib/validators/passwordRules'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordStrength = validatePasswordStrength(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const isReady = passwordStrength.isValid && passwordsMatch

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordStrength.isValid) {
      setError('Password must be at least 8 characters with 1 uppercase letter and 1 number')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (token) {
        // Use custom token RPC
        const { data, error: rpcErr } = await supabase.rpc('reset_password_with_token', {
          reset_token: token,
          new_password: newPassword,
        })

        if (rpcErr) throw rpcErr
        if (!data?.success) {
          throw new Error(data?.error || 'Invalid or expired password reset link')
        }
      } else {
        // Use Supabase native password update for recovery session
        const { error: authErr } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (authErr) throw authErr
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2500)
    } catch (err) {
      console.error('Password reset error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-gradient text-4xl font-bold mb-2">AmpedFieldOps</h1>
          <p className="text-text-muted text-sm">Set New Account Password</p>
        </div>

        <div className="bg-card-dark rounded-2xl border border-border-dark p-8 shadow-2xl space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h3 className="text-lg font-bold text-white">Password Updated!</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Your new password has been saved securely. Redirecting you to sign in...
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors"
                >
                  Proceed to Login Now
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Create New Password</h2>
                <p className="text-xs text-text-muted">
                  Choose a new password adhering to standard security requirements.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {error}
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />

              <Input
                label="Confirm New Password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />

              {/* Password criteria checklist */}
              <div className="p-3 rounded-xl bg-background-dark/80 border border-border-dark space-y-1.5 text-[11px]">
                <span className="font-semibold text-text-muted uppercase text-[10px] block">Password Security Standards</span>
                <div className="flex items-center gap-1.5 text-text-muted">
                  <span className={`material-symbols-outlined text-sm ${passwordStrength.hasMinLength ? 'text-emerald-400' : 'text-text-disabled'}`}>
                    {passwordStrength.hasMinLength ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={passwordStrength.hasMinLength ? 'text-white' : ''}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  <span className={`material-symbols-outlined text-sm ${passwordStrength.hasUppercase ? 'text-emerald-400' : 'text-text-disabled'}`}>
                    {passwordStrength.hasUppercase ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={passwordStrength.hasUppercase ? 'text-white' : ''}>At least 1 uppercase letter (A-Z)</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  <span className={`material-symbols-outlined text-sm ${passwordStrength.hasNumber ? 'text-emerald-400' : 'text-text-disabled'}`}>
                    {passwordStrength.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className={passwordStrength.hasNumber ? 'text-white' : ''}>At least 1 number (0-9)</span>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 text-text-muted pt-0.5 border-t border-border-dark/60">
                    <span className={`material-symbols-outlined text-sm ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                      {passwordsMatch ? 'check_circle' : 'cancel'}
                    </span>
                    <span className={passwordsMatch ? 'text-white' : 'text-red-400'}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" fullWidth loading={loading} disabled={!isReady} className="text-xs h-10">
                Save New Password & Sign In
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-text-muted hover:text-white transition-colors">
                  ← Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
