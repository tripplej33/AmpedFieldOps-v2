import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '@/hooks/useProjects'
import { useSiteAttendance, useSiteSignIn } from '@/hooks/useSiteSafety'
import Button from '@/components/ui/Button'
import type { PersonType } from '@/types'

export default function SiteKioskPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading: projectLoading } = useProject(projectId || '')
  const { attendances, refresh: refreshAttendances } = useSiteAttendance(projectId)
  const { signIn, signOut, isPending } = useSiteSignIn()

  const [personName, setPersonName] = useState('')
  const [personType, setPersonType] = useState<PersonType>('technician')
  const [companyName, setCompanyName] = useState('Amped Electrical')
  const [phone, setPhone] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [inductionConfirmed, setInductionConfirmed] = useState(true)
  const [hazardsAcknowledged, setHazardsAcknowledged] = useState(true)

  // Camera selfie state
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signout'>('signin')

  // Start / stop camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 400, height: 400 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch (err) {
      console.warn('Camera access not granted or unavailable:', err)
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
    setIsCameraActive(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 320
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setSelfiePhoto(dataUrl)
      stopCamera()
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !personName.trim()) return

    try {
      await signIn({
        project_id: projectId,
        person_name: personName.trim(),
        person_type: personType,
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        emergency_contact_phone: emergencyPhone.trim() || undefined,
        selfie_photo_url: selfiePhoto || undefined,
        induction_confirmed: inductionConfirmed,
        hazards_acknowledged: hazardsAcknowledged,
      })

      setSuccessMessage(`Welcome to site, ${personName}! You are officially signed in.`)
      setPersonName('')
      setPhone('')
      setEmergencyPhone('')
      setSelfiePhoto(null)
      await refreshAttendances()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSignOut = async (id: string, name: string) => {
    await signOut(id)
    await refreshAttendances()
    setSuccessMessage(`Goodbye, ${name}! You have been signed out of the site safely.`)
    setTimeout(() => setSuccessMessage(null), 4000)
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const onSiteList = attendances.filter((a) => a.status === 'on_site')

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8 font-sans">
      {/* Kiosk Header */}
      <div className="max-w-2xl mx-auto w-full text-center space-y-2 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase">
          <span className="material-symbols-outlined text-sm">shield_with_heart</span>
          Site Safety & Induction Gate
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-display">
          {project?.name || 'Amped Field Operations'}
        </h1>
        <p className="text-text-muted text-xs sm:text-sm">
          Main Contractor Site Register • All personnel must sign in before entering
        </p>

        {/* Tab Switcher: Sign In vs Sign Out */}
        <div className="flex justify-center pt-2">
          <div className="bg-card-dark p-1 rounded-xl border border-border-dark flex gap-1">
            <button
              onClick={() => setMode('signin')}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                mode === 'signin'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Sign In to Site
            </button>
            <button
              onClick={() => setMode('signout')}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                mode === 'signout'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              Sign Out ({onSiteList.length} on site)
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="max-w-2xl mx-auto w-full my-4 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-bold text-center text-sm animate-bounce shadow-lg shadow-emerald-900/30">
          {successMessage}
        </div>
      )}

      {/* Main Kiosk Content */}
      <div className="max-w-2xl mx-auto w-full my-6 bg-card-dark/90 border border-border-dark rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
        {mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4 text-xs sm:text-sm">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block font-semibold text-text-muted">
                Your Full Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="First & Last Name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full h-[46px] px-4 bg-background-dark border border-border-dark rounded-xl text-white text-base focus:outline-none focus:border-primary"
              />
            </div>

            {/* Role Category */}
            <div className="space-y-1">
              <label className="block font-semibold text-text-muted">Site Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background-dark p-1.5 rounded-xl border border-border-dark">
                {(['technician', 'subcontractor', 'visitor', 'inspector'] as PersonType[]).map(
                  (t) => {
                    const isSelected = personType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setPersonType(t)
                          if (t === 'technician') setCompanyName('Amped Electrical')
                          else if (companyName === 'Amped Electrical') setCompanyName('')
                        }}
                        className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                          isSelected
                            ? 'bg-primary text-white shadow'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {/* Company & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-semibold text-text-muted">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Amped, Plumbing Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-[42px] px-3 bg-background-dark border border-border-dark rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-text-muted">Your Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="021 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-[42px] px-3 bg-background-dark border border-border-dark rounded-xl text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Camera Selfie Feature */}
            <div className="space-y-2 bg-background-dark p-3.5 rounded-xl border border-border-dark text-center">
              <span className="block font-semibold text-white text-xs">
                Face Selfie Verification (Optional)
              </span>

              {selfiePhoto ? (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={selfiePhoto}
                    alt="Selfie Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelfiePhoto(null)
                      startCamera()
                    }}
                    className="text-xs text-text-muted hover:text-white underline"
                  >
                    Retake Photo
                  </button>
                </div>
              ) : isCameraActive ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-48 h-48 rounded-xl overflow-hidden bg-black border border-primary">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-md inline-flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">photo_camera</span>
                      Capture Selfie
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 rounded-lg bg-background-dark text-text-muted hover:text-white text-xs border border-border-dark"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-lg bg-card-dark hover:bg-border-dark border border-border-dark text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm text-primary">photo_camera</span>
                  Take Site Entry Selfie
                </button>
              )}
            </div>

            {/* Mandatory Induction & Hazard Checkboxes */}
            <div className="space-y-2 bg-background-dark/80 p-3.5 rounded-xl border border-border-dark/60 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={inductionConfirmed}
                  onChange={(e) => setInductionConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-dark bg-card-dark text-primary focus:ring-primary"
                />
                <span className="text-text-muted">
                  I agree to adhere to site health & safety rules and wear appropriate PPE at all times.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={hazardsAcknowledged}
                  onChange={(e) => setHazardsAcknowledged(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-border-dark bg-card-dark text-primary focus:ring-primary"
                />
                <span className="text-text-muted">
                  I have reviewed the site hazard board and will report any safety hazards or incidents.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isPending || !personName.trim()}
              className="w-full h-[48px] text-base font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20"
            >
              {isPending ? 'Signing In...' : 'Complete Site Sign-In'}
            </Button>
          </form>
        ) : (
          /* Sign Out Mode */
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-muted">
              Select your name to sign out of the site:
            </h3>

            {onSiteList.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-xs">
                No personnel currently signed in.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {onSiteList.map((person) => (
                  <div
                    key={person.id}
                    className="p-3.5 rounded-xl bg-background-dark border border-border-dark flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{person.person_name}</h4>
                      <p className="text-xs text-text-muted">
                        {person.company_name || 'Individual'} • In at{' '}
                        {new Date(person.signed_in_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleSignOut(person.id, person.person_name)}
                      className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
                    >
                      Sign Out →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kiosk Footer */}
      <div className="text-center text-xs text-text-muted py-2">
        Powered by <strong className="text-white">Amped FieldOps</strong> • Electrical Contracting Management
      </div>
    </div>
  )
}
