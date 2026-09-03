import React, { useState, useRef, useEffect } from 'react'
import type { ElectricalCertificate, ElectricalTestSheet, CertType, CertStatus } from '@/types/compliance'
import { generateCertificatePdf } from '@/lib/pdf/compliancePdfGenerator'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import Button from '@/components/ui/Button'

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<ElectricalCertificate>) => Promise<void>
  initialData?: ElectricalCertificate | null
  projectId: string
  testSheets: ElectricalTestSheet[]
}

function SignaturePad({
  title,
  initialDataUrl,
  onSignatureChange,
}: {
  title: string
  initialDataUrl?: string | null
  onSignatureChange: (dataUrl: string | null) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(!!initialDataUrl)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (initialDataUrl) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
      }
      img.src = initialDataUrl
    }
  }, [initialDataUrl])

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    const me = e as React.MouseEvent
    return {
      x: me.clientX - rect.left,
      y: me.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (canvasRef.current && hasDrawn) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'))
    }
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onSignatureChange(null)
  }

  return (
    <div className="space-y-2 p-3 bg-surface-dark/40 border border-border-dark rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5">
          <span className="material-symbols-outlined text-primary text-base">draw</span>
          {title}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="text-[10px] text-text-muted hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="bg-white rounded-lg overflow-hidden h-28 touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair block"
        />
      </div>
    </div>
  )
}

export default function CertificateModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  projectId,
  testSheets,
}: CertificateModalProps) {
  const { profile: companyProfile } = useCompanyProfile()

  const [certType, setCertType] = useState<CertType>(initialData?.cert_type || 'combined_coc_esc')
  const [certNumber, setCertNumber] = useState(
    initialData?.cert_number || `NZ-COC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  )
  const [testSheetId, setTestSheetId] = useState<string>(initialData?.test_sheet_id || (testSheets[0]?.id || ''))
  const [installationType, setInstallationType] = useState<'new_work' | 'alteration' | 'repair'>(
    (initialData?.installation_type as any) || 'new_work'
  )
  const [isHighRisk, setIsHighRisk] = useState(initialData?.is_high_risk || false)
  const [highRiskDetails, setHighRiskDetails] = useState(initialData?.high_risk_details || '')
  const [certifierName, setCertifierName] = useState(initialData?.certifier_name || 'Duncan Woomack')
  const [certifierRegistration, setCertifierRegistration] = useState(
    initialData?.certifier_registration || 'E 248910'
  )
  const [certificationDate, setCertificationDate] = useState(
    initialData?.certification_date || new Date().toISOString().slice(0, 10)
  )
  const [clientSignerName, setClientSignerName] = useState(initialData?.client_signer_name || '')
  const [status] = useState<CertStatus>(initialData?.status || 'draft')
  const [notes] = useState(initialData?.notes || '')
  const [certifierSig, setCertifierSig] = useState<string | null>(initialData?.certifier_signature_svg || null)
  const [clientSig, setClientSig] = useState<string | null>(initialData?.client_signature_svg || null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleDownloadPdf = () => {
    const selectedTestSheet = testSheets.find((t) => t.id === testSheetId) || null

    const certPayload: ElectricalCertificate = {
      id: initialData?.id || crypto.randomUUID(),
      project_id: projectId,
      test_sheet_id: testSheetId || null,
      cert_type: certType,
      cert_number: certNumber,
      installation_type: installationType,
      is_high_risk: isHighRisk,
      high_risk_details: highRiskDetails,
      certifier_name: certifierName,
      certifier_registration: certifierRegistration,
      certification_date: certificationDate,
      certifier_signature_svg: certifierSig || undefined,
      client_signer_name: clientSignerName,
      client_signature_svg: clientSig || undefined,
      status,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      test_sheet: selectedTestSheet,
    }

    const pdf = generateCertificatePdf(certPayload, companyProfile)
    pdf.save(`${certNumber}_${certType}.pdf`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await onSave({
        id: initialData?.id,
        project_id: projectId,
        test_sheet_id: testSheetId || null,
        cert_type: certType,
        cert_number: certNumber,
        installation_type: installationType,
        is_high_risk: isHighRisk,
        high_risk_details: highRiskDetails,
        certifier_name: certifierName,
        certifier_registration: certifierRegistration,
        certification_date: certificationDate,
        certifier_signature_svg: certifierSig || undefined,
        client_signer_name: clientSignerName,
        client_signature_svg: clientSig || undefined,
        status,
        notes,
      })
      onClose()
    } catch (err) {
      console.error('Error saving certificate:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-6 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                {certType === 'coc'
                  ? 'Certificate of Compliance (CoC)'
                  : certType === 'esc'
                  ? 'Electrical Safety Certificate (ESC)'
                  : 'Combined CoC & Electrical Safety Certificate (ESC)'}
              </h2>
              <p className="text-xs text-text-muted">
                Official statutory certificate under NZ Electricity (Safety) Regulations & AS/NZS 3000
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white p-2 rounded-lg hover:bg-surface-dark transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-6 pr-2">
          {/* Certificate Type Pills */}
          <div className="flex bg-surface-dark border border-border-dark rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setCertType('combined_coc_esc')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                certType === 'combined_coc_esc' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              Combined CoC & ESC
            </button>
            <button
              type="button"
              onClick={() => setCertType('esc')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                certType === 'esc' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              Electrical Safety Cert (ESC)
            </button>
            <button
              type="button"
              onClick={() => setCertType('coc')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                certType === 'coc' ? 'bg-primary text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              Certificate of Compliance (CoC)
            </button>
          </div>

          {/* Section 1: Certificate Numbers & Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-surface-dark/40 border border-border-dark rounded-xl p-4">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Certificate #</label>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Installation Type</label>
              <select
                value={installationType}
                onChange={(e) => setInstallationType(e.target.value as any)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="new_work">New Installation Work</option>
                <option value="alteration">Alteration / Addition</option>
                <option value="repair">Repair / Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Linked Test Sheet</label>
              <select
                value={testSheetId}
                onChange={(e) => setTestSheetId(e.target.value)}
                className="w-full h-8 px-2 bg-background-dark border border-border-dark rounded-lg text-white"
              >
                <option value="">-- No Test Sheet Attached --</option>
                {testSheets.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.title} ({ts.circuits?.length || 0} circuits)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Certifier / Practitioner Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-surface-dark/40 border border-border-dark rounded-xl p-4">
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Certified Practitioner Name</label>
              <input
                type="text"
                value={certifierName}
                onChange={(e) => setCertifierName(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Electrical Registration # (EWB)</label>
              <input
                type="text"
                value={certifierRegistration}
                onChange={(e) => setCertifierRegistration(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-text-muted block mb-1">Certification Date</label>
              <input
                type="date"
                value={certificationDate}
                onChange={(e) => setCertificationDate(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
                required
              />
            </div>
          </div>

          {/* High Risk Work Alert Toggle */}
          <div className="p-3 bg-background-dark border border-border-dark rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">High Risk Prescribed Electrical Work?</span>
              <span className="text-[11px] text-text-muted">
                Requires independent inspector sign-off / Energy Safety High Risk Database lodging
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isHighRisk}
                onChange={(e) => setIsHighRisk(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-dark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          {isHighRisk && (
            <div>
              <label className="text-[11px] text-text-muted block mb-1">High Risk Details / Hazardous Area</label>
              <input
                type="text"
                value={highRiskDetails}
                onChange={(e) => setHighRiskDetails(e.target.value)}
                className="w-full h-8 px-2.5 bg-background-dark border border-red-500/50 rounded-lg text-white text-xs"
                placeholder="e.g. Hazardous explosive dust zone / mains parallel generation"
              />
            </div>
          )}

          {/* Section 3: Dual Digital Signatures */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SignaturePad
              title="Certifier / Practitioner Signature"
              initialDataUrl={certifierSig}
              onSignatureChange={setCertifierSig}
            />

            <div className="space-y-2">
              <SignaturePad
                title="Client / Owner Signature"
                initialDataUrl={clientSig}
                onSignatureChange={setClientSig}
              />
              <input
                type="text"
                value={clientSignerName}
                onChange={(e) => setClientSignerName(e.target.value)}
                className="w-full h-7 px-2 bg-background-dark border border-border-dark rounded text-xs text-white"
                placeholder="Client / Property Owner Full Name"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border-dark flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownloadPdf}
              className="text-xs flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Preview & Download Certificate PDF
            </Button>

            <div className="flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save & Issue Certificate'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
