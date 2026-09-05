import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import { getStoredPreferences, savePreferences } from '@/lib/theme'
import { validatePasswordStrength } from '@/lib/validators/passwordRules'
import Button from '@/components/ui/Button'
import Toast from '@/components/ui/Toast'
import UserAvatar from '@/components/ui/UserAvatar'
import UserCredentialsModal from '@/components/settings/UserCredentialsModal'
import type { UserPreferences, UserCredential } from '@/types'

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
]

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth()
  const { userRole } = usePermissions()

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Security & Password State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Credentials State
  const [credentials, setCredentials] = useState<UserCredential[]>([])
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false)

  // Preferences State
  const [preferences, setPreferences] = useState<UserPreferences>(() => getStoredPreferences())
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
      setAvatarUrl(user.avatar_url || '')
      fetchMyCredentials()
    }
  }, [user])

  const fetchMyCredentials = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('user_credentials')
      .select('*')
      .eq('user_id', user.id)
      .order('expiry_date', { ascending: true })

    if (data) setCredentials(data)
  }

  // Password validation analysis
  const passwordStrength = validatePasswordStrength(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const isPasswordReady = passwordStrength.isValid && passwordsMatch

  // Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setIsUpdatingProfile(true)

      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshUser()
      setToast({ type: 'success', message: 'Profile details and avatar saved successfully' })
    } catch (err) {
      console.error('Failed to update profile:', err)
      setToast({ type: 'error', message: 'Failed to update profile details' })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(reader.result as string)
      setUploadingAvatar(false)
    }
    reader.onerror = () => {
      setToast({ type: 'error', message: 'Failed to read image file' })
      setUploadingAvatar(false)
    }
    reader.readAsDataURL(file)
  }

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordStrength.isValid) {
      setToast({
        type: 'error',
        message: 'Password must be at least 8 characters with 1 uppercase letter and 1 number',
      })
      return
    }

    if (!passwordsMatch) {
      setToast({ type: 'error', message: 'Passwords do not match' })
      return
    }

    try {
      setIsUpdatingPassword(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setNewPassword('')
      setConfirmPassword('')
      setToast({ type: 'success', message: 'Account password updated securely' })
    } catch (err) {
      console.error('Failed to update password:', err)
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to update password' })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Live Preference Change
  const updatePreferenceField = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    const updated = { ...preferences, [key]: value }
    setPreferences(updated)
    savePreferences(updated)
  }

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSavingPreferences(true)
      savePreferences(preferences)
      setToast({ type: 'success', message: 'App preferences applied and saved' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to save preferences' })
    } finally {
      setIsSavingPreferences(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2.5">
          <span className="material-symbols-outlined text-4xl text-primary">account_circle</span>
          My Profile & User Settings
        </h1>
        <p className="text-text-muted text-xs mt-1">
          Personal contact details, profile picture, compliance licences, security credentials, and application interface settings
        </p>
      </div>

      {/* User Overview Card */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-lg flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <UserAvatar
            user={{
              full_name: fullName,
              email: user?.email,
              avatar_url: avatarUrl,
              role: user?.role,
            }}
            size="lg"
            showRoleBadge
          />
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {fullName || 'Technician'}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary/20 text-primary border border-primary/30">
                {userRole?.name || user?.role || 'Staff'}
              </span>
            </h2>
            <p className="text-xs text-text-muted font-mono">{user?.email}</p>
            <p className="text-[11px] text-text-muted mt-1">
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '2026'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsCredentialsModalOpen(true)}
            className="text-xs h-[36px]"
          >
            <span className="material-symbols-outlined text-base text-primary">badge</span>
            Licences ({credentials.length})
          </Button>

          <div className="flex items-center gap-2 bg-background-dark/80 px-3.5 py-2 rounded-xl border border-border-dark">
            <span className="material-symbols-outlined text-emerald-400 text-lg">verified_user</span>
            <div className="text-right">
              <span className="text-[10px] text-text-muted uppercase font-bold block">Permissions</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {userRole?.permissions?.length || (user?.role === 'admin' ? 'All' : 0)} Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Edit Profile & Avatar */}
        <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-dark">
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
            <h3 className="font-bold text-white text-sm">Personal Details & Profile Picture</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Avatar Selector */}
            <div className="space-y-2">
              <label className="block text-text-muted font-medium">Profile Picture / Avatar</label>
              <div className="flex items-center gap-3">
                <UserAvatar src={avatarUrl} name={fullName} size="md" />

                <label className="h-[34px] px-3 rounded-lg bg-background-dark hover:bg-nav-hover border border-border-dark text-text-muted hover:text-white font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-sm text-primary">upload</span>
                  <span>{uploadingAvatar ? 'Loading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </label>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-[11px] text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Avatar Presets */}
              <div className="pt-1">
                <span className="text-[10px] text-text-muted block mb-1.5 font-medium">
                  Or select a preset avatar:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-9 h-9 rounded-xl overflow-hidden border transition-transform hover:scale-105 shrink-0 ${
                        avatarUrl === preset
                          ? 'border-primary ring-2 ring-primary/50'
                          : 'border-border-dark opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={preset} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Duncan Woomack"
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full h-[38px] px-3 bg-background-dark/50 border border-border-dark/60 rounded-lg text-text-muted cursor-not-allowed font-mono text-[11px]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Direct Phone / Mobile</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +64 21 123 4567"
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile} className="text-xs">
                {isUpdatingProfile ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </div>

        {/* Section 2: Account Security & Password Standards */}
        <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-dark">
            <span className="material-symbols-outlined text-primary text-xl">lock_reset</span>
            <h3 className="font-bold text-white text-sm">Security & Password</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="block text-text-muted font-medium">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* Standard Security Criteria Checklist */}
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

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                disabled={isUpdatingPassword || !isPasswordReady}
                className="text-xs"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 3: My Registered Licences & Certifications */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border-dark">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">badge</span>
            <h3 className="font-bold text-white text-sm">My Licences, Courses & Compliance Documents</h3>
          </div>

          <Button
            type="button"
            onClick={() => setIsCredentialsModalOpen(true)}
            className="text-xs h-[32px]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Upload & Manage Licences
          </Button>
        </div>

        {credentials.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
            <p className="text-white text-xs font-semibold">No licences or certificates logged yet</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Upload your EWRB licence, Driver's licence, or Site Safe passport with automatic expiry alerts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                onClick={() => setIsCredentialsModalOpen(true)}
                className="p-3 rounded-xl bg-background-dark border border-border-dark hover:border-primary/40 cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-xs truncate">{cred.document_name}</h4>
                  <span className="material-symbols-outlined text-text-muted text-sm">open_in_new</span>
                </div>
                {cred.document_number && (
                  <p className="text-[10px] text-primary font-mono">#{cred.document_number}</p>
                )}
                <p className="text-[10px] text-text-muted">
                  Expires: {cred.expiry_date || 'No Expiry'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: App Appearance & Preferences (Light/Dark Mode + Colors) */}
      <div className="bg-card-dark border border-border-dark rounded-2xl p-5 shadow-md space-y-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border-dark">
          <span className="material-symbols-outlined text-primary text-xl">palette</span>
          <h3 className="font-bold text-white text-sm">App Appearance & Preferences</h3>
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-5 text-xs">
          {/* Light / Dark Mode Toggle */}
          <div>
            <label className="block text-text-muted font-medium mb-2">Display Theme Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => updatePreferenceField('themeMode', 'dark')}
                className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  preferences.themeMode === 'dark'
                    ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                    : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">dark_mode</span>
                <span className="font-semibold text-xs">Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => updatePreferenceField('themeMode', 'light')}
                className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  preferences.themeMode === 'light'
                    ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                    : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">light_mode</span>
                <span className="font-semibold text-xs">Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => updatePreferenceField('themeMode', 'system')}
                className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  preferences.themeMode === 'system'
                    ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                    : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">settings_brightness</span>
                <span className="font-semibold text-xs">System Auto</span>
              </button>
            </div>
          </div>

          {/* Color Accent & Default Landing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-text-muted font-medium">Default Starting Page</label>
              <select
                value={preferences.defaultLandingPage}
                onChange={(e) => updatePreferenceField('defaultLandingPage', e.target.value)}
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="/app/dashboard">Main Dashboard</option>
                <option value="/app/projects">Projects Hub & Kanban</option>
                <option value="/app/timesheets">Timesheets</option>
                <option value="/app/van-stock">Mobile Van Stock</option>
                <option value="/app/purchase-orders">Purchase Orders</option>
                <option value="/app/fleet">Fleet Management</option>
              </select>
              <p className="text-[10px] text-text-muted">The initial view loaded after signing in</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-text-muted font-medium">Brand Accent Color</label>
              <select
                value={preferences.themeColor}
                onChange={(e) => updatePreferenceField('themeColor', e.target.value)}
                className="w-full h-[38px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
              >
                <option value="cyan">Cyan (Default Amped)</option>
                <option value="amber">Amped Amber</option>
                <option value="blue">Electric Blue</option>
                <option value="emerald">Safety Green</option>
                <option value="violet">Cyber Violet</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <label className="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark cursor-pointer hover:border-primary/40 transition-colors">
              <div>
                <span className="font-semibold text-white block">Sidebar Sub-tabs</span>
                <span className="text-[10px] text-text-muted">Nested nav categories</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.showSidebarSubcategories ?? false}
                onChange={(e) => updatePreferenceField('showSidebarSubcategories', e.target.checked)}
                className="rounded border-border-dark text-primary focus:ring-primary w-4 h-4 bg-card-dark"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark cursor-pointer hover:border-primary/40 transition-colors">
              <div>
                <span className="font-semibold text-white block">Compact Density</span>
                <span className="text-[10px] text-text-muted">Tighter card spacing</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.compactView}
                onChange={(e) => updatePreferenceField('compactView', e.target.checked)}
                className="rounded border-border-dark text-primary focus:ring-primary w-4 h-4 bg-card-dark"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark cursor-pointer hover:border-primary/40 transition-colors">
              <div>
                <span className="font-semibold text-white block">Sound Alerts</span>
                <span className="text-[10px] text-text-muted">Audio chimes on receipt</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.enableSoundAlerts}
                onChange={(e) => updatePreferenceField('enableSoundAlerts', e.target.checked)}
                className="rounded border-border-dark text-primary focus:ring-primary w-4 h-4 bg-card-dark"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-background-dark border border-border-dark cursor-pointer hover:border-primary/40 transition-colors">
              <div>
                <span className="font-semibold text-white block">Email Digests</span>
                <span className="text-[10px] text-text-muted">Weekly project summary</span>
              </div>
              <input
                type="checkbox"
                checked={preferences.enableEmailNotifications}
                onChange={(e) => updatePreferenceField('enableEmailNotifications', e.target.checked)}
                className="rounded border-border-dark text-primary focus:ring-primary w-4 h-4 bg-card-dark"
              />
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={isSavingPreferences} className="text-xs">
              {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </div>

      {/* User Credentials Modal */}
      {user && (
        <UserCredentialsModal
          isOpen={isCredentialsModalOpen}
          onClose={() => setIsCredentialsModalOpen(false)}
          user={user}
          onUpdated={fetchMyCredentials}
        />
      )}

      {/* Toast */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
