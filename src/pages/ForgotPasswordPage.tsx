import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      setLoading(true)
      setError(null)

      // Trigger official Supabase recovery email to the user's inbox
      const redirectTo = `${window.location.origin}/reset-password`
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      setSent(true)
    } catch (err) {
      console.error('Password reset request error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send password reset request')
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
          <p className="text-text-muted text-sm">Account Recovery & Password Reset</p>
        </div>

        <div className="bg-card-dark rounded-2xl border border-border-dark p-8 shadow-2xl space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">mark_email_read</span>
              </div>
              <h3 className="text-lg font-bold text-white">Reset Link Dispatched</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                If an account exists for <strong className="text-white">{email}</strong>, a secure password recovery link has been sent to your email inbox. Please check your inbox and spam folder.
              </p>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Forgot your password?</h2>
                <p className="text-xs text-text-muted">
                  Enter your verified account email address to receive a password reset link.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  {error}
                </div>
              )}

              <Input
                label="Account Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="technician@ampedlogix.com"
              />

              <Button type="submit" fullWidth loading={loading} className="text-xs h-10">
                Send Password Reset Email
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
