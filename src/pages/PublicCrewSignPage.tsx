import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useGeolocation } from '@/hooks/useGeolocation'
import Button from '@/components/ui/Button'
import type { SafetyDocument } from '@/types/safety'
import { calculateRiskRating } from '@/lib/safety/riskMatrix'

export default function PublicCrewSignPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const [document, setDocument] = useState<SafetyDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Signer form state
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('Technician')
  const [hazardsAgreed, setHazardsAgreed] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { getCurrentLocation, coordinates } = useGeolocation()
  const [capturedGeo, setCapturedGeo] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)

  const fetchDoc = useCallback(async () => {
    if (!documentId) return
    try {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from('safety_documents')
        .select(`
          *,
          template:safety_templates(*),
          project:projects(id, name, project_number, client_name, site_address_street, site_address_city),
          signatures:safety_signatures(*)
        `)
        .eq('id', documentId)
        .single()

      if (err) throw err
      setDocument(data)

      // Passive GPS attempt
      getCurrentLocation({ timeout: 5000, enableHighAccuracy: true })
        .then((c) => setCapturedGeo({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy }))
        .catch(() => {})
    } catch (err) {
      console.error('[PublicCrewSignPage] Error:', err)
      setError('Safety document not found or link has expired.')
    } finally {
      setLoading(false)
    }
  }, [documentId, getCurrentLocation])

  useEffect(() => {
    fetchDoc()
  }, [fetchDoc])

  // Init canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  useEffect(() => {
    if (!submitted && !loading && document) {
      const timer = setTimeout(initCanvas, 150)
      return () => clearTimeout(timer)
    }
  }, [submitted, loading, document, initCanvas])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    } else {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsDrawing(false)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSubmitSignature = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documentId || !canvasRef.current) return

    if (!signerName.trim()) {
      setError('Please enter your full name')
      return
    }

    if (!hazardsAgreed) {
      setError('You must review and agree to the site hazards and control measures')
      return
    }

    if (!hasDrawn) {
      setError('Please draw your signature on the pad')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const signatureData = canvasRef.current.toDataURL('image/png')
      const locationPayload = capturedGeo || (coordinates ? {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      } : null)

      // Check if there is an existing pending signature for this signer's name
      const existingPending = (document?.signatures || []).find(
        (s) => s.status === 'pending' && s.signer_name.trim().toLowerCase() === signerName.trim().toLowerCase()
      )

      if (existingPending) {
        const { error: updErr } = await supabase
          .from('safety_signatures')
          .update({
            signature_data: signatureData,
            status: 'signed',
            signed_at: new Date().toISOString(),
            geo_location: locationPayload,
          })
          .eq('id', existingPending.id)

        if (updErr) throw updErr
      } else {
        const { error: insertErr } = await supabase.from('safety_signatures').insert([
          {
            document_id: documentId,
            signer_name: signerName.trim(),
            signer_role: signerRole.trim(),
            signature_data: signatureData,
            sign_type: 'qr_code',
            status: 'signed',
            signed_at: new Date().toISOString(),
            geo_location: locationPayload,
          },
        ])

        if (insertErr) throw insertErr
      }

      // Update doc status to pending_signatures if it was draft
      await supabase
        .from('safety_documents')
        .update({ status: 'pending_signatures', updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .eq('status', 'draft')

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record signature')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
        <div className="flex flex-col items-center gap-2 text-text-muted text-xs">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading Safety Compliance Document...</span>
        </div>
      </div>
    )
  }

  if (error && !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-card-dark border border-border-dark text-center space-y-3">
          <span className="material-symbols-outlined text-4xl text-red-400">error</span>
          <h2 className="text-base font-bold text-white">Document Not Available</h2>
          <p className="text-xs text-text-muted">{error}</p>
          <Link
            to="/login"
            className="inline-block mt-3 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl"
          >
            Go to AmpedFieldOps
          </Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-dark p-4">
        <div className="max-w-md w-full p-7 rounded-2xl bg-card-dark border border-emerald-500/40 text-center space-y-4 shadow-2xl shadow-emerald-500/10 animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Safety Sign-On Confirmed!</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Thank you, <span className="text-white font-semibold">{signerName}</span>. Your digital signature and compliance verification have been recorded in the site audit log.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-background-dark text-left text-xs space-y-1.5 border border-border-dark">
            <p className="text-text-muted">
              Document: <span className="text-white font-medium">{document?.title}</span>
            </p>
            <p className="text-text-muted">
              Project: <span className="text-white font-medium">{document?.project?.name || 'Site Ops'}</span>
            </p>
            <p className="text-text-muted">
              Time Stamped: <span className="text-white font-medium">{new Date().toLocaleTimeString()}</span>
            </p>
          </div>

          <p className="text-[11px] text-text-muted">
            You are authorized to proceed on site. Please follow all agreed controls and wear mandatory PPE.
          </p>
        </div>
      </div>
    )
  }

  const formData = document?.form_data || {}
  const schema = document?.template?.schema

  return (
    <div className="min-h-screen bg-background-dark text-white p-4 sm:p-6 pb-12">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Mobile Header Banner */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-1">
            <span className="material-symbols-outlined text-sm">shield_with_heart</span>
            <span>AmpedFieldOps Site Sign-On</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">{document?.title}</h1>
          <p className="text-xs text-text-muted">
            {document?.project?.name ? `Project: ${document.project.name}` : 'Field Operations Safety Briefing'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Hazard Briefing & Key Risk Summary */}
        <div className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4 shadow-lg shadow-black/20">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">fact_check</span>
              Step 1: Review Site Hazards & Control Measures
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Read through the key job steps and required safety procedures below before signing.
            </p>
          </div>

          {/* Render Hazards Table Summary if available */}
          {schema?.sections?.map((section) => {
            if (section.type === 'risk_matrix_table') {
              const rows = formData[section.id] || section.default_rows || []
              return (
                <div key={section.id} className="space-y-2">
                  <span className="text-[11px] font-bold text-primary block">{section.title}</span>
                  <div className="space-y-2">
                    {rows.map((row: any, rIdx: number) => {
                      const resRisk = calculateRiskRating(row.residual_likelihood, row.residual_consequence)
                      return (
                        <div
                          key={rIdx}
                          className="p-3 rounded-xl bg-background-dark/80 border border-border-dark/80 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{row.step || `Step #${rIdx + 1}`}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${resRisk.bgClass} ${resRisk.colorClass}`}>
                              Residual: {resRisk.level}
                            </span>
                          </div>
                          <p className="text-text-muted text-[11px]">
                            <strong className="text-amber-400">Hazard:</strong> {row.hazard}
                          </p>
                          <p className="text-text-muted text-[11px]">
                            <strong className="text-emerald-400">Control:</strong> {row.controls}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }
            return null
          })}
        </div>

        {/* Step 2: Sign-Off Form */}
        <form
          onSubmit={handleSubmitSignature}
          className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4 shadow-lg shadow-black/20"
        >
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">draw</span>
              Step 2: Provide Your Digital Signature
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Enter your details and sign on the touch pad below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90">
                Your Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="e.g. Jane Smith"
                required
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90">
                Role / Position <span className="text-red-400">*</span>
              </label>
              <select
                value={signerRole}
                onChange={(e) => setSignerRole(e.target.value)}
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="Lead Electrician">Lead Electrician</option>
                <option value="Electrician">Electrician</option>
                <option value="Apprentice">Apprentice</option>
                <option value="Trade Assistant">Trade Assistant</option>
                <option value="Site Supervisor">Site Supervisor</option>
                <option value="Subcontractor">Subcontractor</option>
                <option value="Visitor / Inspector">Visitor / Inspector</option>
              </select>
            </div>
          </div>

          {/* Signature Canvas Pad */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white/90">
                Touch Signature Pad <span className="text-red-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-text-muted hover:text-red-400 flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-xs">restart_alt</span>
                Clear
              </button>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-border-dark bg-[#0a0c0e] overflow-hidden">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair touch-none"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-text-muted/40 gap-1 select-none">
                  <span className="material-symbols-outlined text-3xl">gesture</span>
                  <span className="text-xs">Draw signature with your finger</span>
                </div>
              )}
            </div>
          </div>

          {/* Acknowledgement Checkbox */}
          <label className="p-3.5 rounded-xl bg-background-dark/90 border border-border-dark flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hazardsAgreed}
              onChange={(e) => setHazardsAgreed(e.target.checked)}
              className="mt-0.5 rounded border-border-dark bg-card-dark text-primary focus:ring-primary h-4 w-4 shrink-0"
            />
            <span className="text-xs text-text-muted leading-relaxed">
              I have read, understood, and agree to adhere to all hazard controls, SWMS procedures, and mandatory PPE outlined in this document.
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
            disabled={!signerName.trim() || !hasDrawn || !hazardsAgreed}
            className="py-3 font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            <span>Submit Digital Signature</span>
          </Button>
        </form>
      </div>
    </div>
  )
}
