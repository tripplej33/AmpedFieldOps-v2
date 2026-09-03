import React, { useRef, useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useAuth } from '@/contexts/AuthContext'

interface SignatureCanvasModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveSignature: (signatureData: {
    signer_name: string
    signer_role: string
    signature_data: string // base64 PNG data URL
    geo_location?: { latitude: number; longitude: number; accuracy?: number } | null
  }) => Promise<void>
  defaultName?: string
  defaultRole?: string
  title?: string
}

export default function SignatureCanvasModal({
  isOpen,
  onClose,
  onSaveSignature,
  defaultName = '',
  defaultRole = 'Technician',
  title = 'Add Digital Signature',
}: SignatureCanvasModalProps) {
  const { user } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [signerName, setSignerName] = useState(defaultName || user?.full_name || '')
  const [signerRole, setSignerRole] = useState(defaultRole || 'Lead Technician')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Geolocation for legal compliance stamp
  const { getCurrentLocation, coordinates } = useGeolocation()
  const [capturedGeo, setCapturedGeo] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSignerName(defaultName || user?.full_name || '')
      setSignerRole(defaultRole || 'Lead Technician')
      setHasDrawn(false)
      setError(null)
      // Attempt passive GPS acquisition
      getCurrentLocation({ timeout: 5000, enableHighAccuracy: true })
        .then((coords) => {
          setCapturedGeo({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          })
        })
        .catch(() => {
          // Non-blocking
        })
    }
  }, [isOpen, defaultName, defaultRole, user, getCurrentLocation])

  // Setup high-DPI canvas
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
    if (isOpen) {
      const timer = setTimeout(() => {
        initCanvas()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initCanvas])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
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

  const handleSave = async () => {
    if (!signerName.trim()) {
      setError('Signer name is required')
      return
    }

    if (!hasDrawn) {
      setError('Please provide a signature on the pad')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    try {
      setSaving(true)
      setError(null)

      // Export canvas as high-resolution PNG data URL
      const dataUrl = canvas.toDataURL('image/png')

      await onSaveSignature({
        signer_name: signerName.trim(),
        signer_role: signerRole.trim() || 'Technician',
        signature_data: dataUrl,
        geo_location: capturedGeo || (coordinates ? {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          accuracy: coordinates.accuracy,
        } : null),
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Signer Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-white/90">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. John Doe"
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
              <option value="Permit Issuer">Permit Issuer</option>
              <option value="Standby Observer">Standby Observer</option>
              <option value="Subcontractor">Subcontractor</option>
              <option value="Inspector / Auditor">Inspector / Auditor</option>
            </select>
          </div>
        </div>

        {/* Touch / Mouse Canvas Pad */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">draw</span>
              Draw Signature Below <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-text-muted hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">restart_alt</span>
              Clear Pad
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
              className="w-full h-44 cursor-crosshair touch-none"
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-text-muted/40 gap-1 select-none">
                <span className="material-symbols-outlined text-3xl">gesture</span>
                <span className="text-xs">Sign here with finger, stylus, or mouse</span>
              </div>
            )}

            {/* Baseline indicator */}
            <div className="absolute bottom-8 left-6 right-6 border-b border-white/10 pointer-events-none" />
          </div>
        </div>

        {/* Geolocation & Compliance Meta Footer */}
        <div className="p-2.5 rounded-xl bg-background-dark/80 border border-border-dark/60 flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-primary text-sm">my_location</span>
            {capturedGeo ? (
              <span className="truncate">
                GPS Verified: {capturedGeo.latitude.toFixed(4)}, {capturedGeo.longitude.toFixed(4)}
              </span>
            ) : (
              <span>GPS Geostamp Pending...</span>
            )}
          </div>
          <span className="font-mono text-[10px] text-text-muted/60">
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-dark">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!hasDrawn || !signerName.trim()}>
            <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
            Accept & Sign
          </Button>
        </div>
      </div>
    </Modal>
  )
}
