import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import type { UserInvitation } from '@/types'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<UserInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Missing invitation token. Please check your link.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [{ data: inv, error: invErr }, { data: rolesData }] = await Promise.all([
          supabase
            .from('user_invitations')
            .select('*')
            .eq('token', token)
            .single(),
          supabase.from('roles').select('*'),
        ])

        if (invErr || !inv) {
          setError('This invitation link is invalid or has already been used.')
          return
        }

        if (inv.status === 'revoked') {
          setError('This invitation has been revoked by an administrator.')
          return
        }

        if (inv.status === 'accepted') {
          setError('This invitation has already been accepted. Please proceed to login.')
          return
        }

        if (new Date(inv.expires_at).getTime() < Date.now()) {
          setError('This invitation link has expired. Please ask your administrator to resend it.')
          return
        }

        const roleMap = new Map((rolesData || []).map((r) => [r.id, r]))
        setInvitation({
          ...inv,
          role: roleMap.get(inv.role_id),
        } as UserInvitation)
      } catch (err) {
        console.error('Error verifying invitation token:', err)
        setError('Failed to verify invitation. Please check your internet connection.')
      } finally {
        setLoading(false)
      }
    }

    verifyToken()
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation) return

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // 1. Sign up Supabase Auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: invitation.full_name,
            role: invitation.role_id,
          },
        },
      })

      if (authErr) {
        // If user already registered in auth, try sign in with provided password
        if (authErr.message.toLowerCase().includes('already registered')) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          })
          if (signInErr) {
            throw new Error('An account with this email already exists. Please login instead.')
          }
        } else {
          throw authErr
        }
      }

      const userId = authData.user?.id
      if (userId) {
        // 2. Upsert record into public.users
        await supabase.from('users').upsert({
          id: userId,
          email: invitation.email,
          full_name: invitation.full_name,
          role: invitation.role_id,
          updated_at: new Date().toISOString(),
        })

        // 3. Mark invitation as accepted
        await supabase
          .from('user_invitations')
          .update({ status: 'accepted' })
          .eq('id', invitation.id)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/app/dashboard')
      }, 2000)
    } catch (err) {
      console.error('Failed to accept invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-white font-sans">
      <div className="max-w-md w-full bg-card-dark/95 border border-border-dark rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-sm">
        {/* Logo & Brand Header */}
        <div className="text-center space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-sm">badge</span>
            Team Member Onboarding
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight mt-2">
            Amped FieldOps
          </h1>
          <p className="text-text-muted text-xs">
            Electrical Contracting & Field Operations Management
          </p>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-text-muted text-xs">Verifying invitation token...</p>
          </div>
        ) : error && !invitation ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1.5">
              <span className="material-symbols-outlined text-3xl text-red-400 block mx-auto">
                error_outline
              </span>
              <p className="font-semibold text-sm">Invitation Issue</p>
              <p className="opacity-90">{error}</p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
            >
              ← Back to Login
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-3 text-center py-4">
            <span className="material-symbols-outlined text-5xl text-emerald-400 block mx-auto animate-bounce">
              check_circle
            </span>
            <h3 className="font-bold text-lg text-white">Account Activated Successfully!</h3>
            <p className="text-xs text-text-muted">
              Redirecting you to your Amped FieldOps dashboard...
            </p>
          </div>
        ) : invitation ? (
          <form onSubmit={handleAccept} className="space-y-4 text-xs">
            {/* Welcome banner */}
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 space-y-1">
              <p className="text-white font-semibold text-xs">
                Welcome, <strong>{invitation.full_name}</strong>!
              </p>
              <p className="text-text-muted text-[11px]">
                You have been invited to join the field team as:{' '}
                <strong className="text-primary font-mono">{invitation.role?.name || invitation.role_id}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            )}

            {/* Email (Readonly) */}
            <div className="space-y-1">
              <label className="block font-medium text-text-muted">Email Address</label>
              <input
                type="email"
                readOnly
                value={invitation.email}
                className="w-full h-[40px] px-3 bg-background-dark/60 border border-border-dark/60 rounded-xl text-text-muted font-mono focus:outline-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block font-medium text-text-muted">
                Create Secure Password <span className="text-primary">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[40px] px-3 bg-background-dark border border-border-dark rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block font-medium text-text-muted">
                Confirm Password <span className="text-primary">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[40px] px-3 bg-background-dark border border-border-dark rounded-xl text-white text-xs focus:outline-none focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !password}
              className="w-full h-[44px] text-sm font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 mt-2"
            >
              {submitting ? 'Setting Up Account...' : 'Set Password & Activate Account'}
            </Button>
          </form>
        ) : null}

        <div className="text-center pt-2 border-t border-border-dark/60">
          <p className="text-[11px] text-text-muted">
            Already have an active account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
