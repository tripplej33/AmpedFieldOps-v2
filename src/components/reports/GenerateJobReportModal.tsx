import React, { useState, useRef, useEffect } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { useAllClients } from '@/hooks/useClients'
import { useTimesheets } from '@/hooks/useTimesheets'
import { usePlantEquipment } from '@/hooks/usePlantEquipment'
import { useSitePhotos } from '@/hooks/useSitePhotos'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import { generateJobReportPdf, type JobReportData } from '@/lib/pdf/jobReportPdfGenerator'
import type { Client, Project } from '@/types'
import Button from '@/components/ui/Button'

interface GenerateJobReportModalProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

export default function GenerateJobReportModal({
  isOpen,
  onClose,
  projectId: defaultProjectId,
}: GenerateJobReportModalProps) {
  const { data: projects = [] } = useProjects()
  const { clients = [] } = useAllClients()
  const { profile: companyProfile } = useCompanyProfile()

  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId || '')
  const [executiveSummary, setExecutiveSummary] = useState('')
  const [clientSignerName, setClientSignerName] = useState('')
  const [clientSignatureSvg, setClientSignatureSvg] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const selectedProject = projects.find((p: Project) => p.id === selectedProjectId)
  const selectedClient = clients.find((c: Client) => c.id === selectedProject?.client_id)

  const { data: timesheets = [] } = useTimesheets({ projectId: selectedProjectId || undefined })
  const { usageLogs } = usePlantEquipment()
  const { photos } = useSitePhotos(selectedProjectId || undefined)

  const projectPlantLogs = usageLogs.filter((u) => u.project_id === selectedProjectId)

  // Canvas drawing setup
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
  }, [isOpen])

  if (!isOpen) return null

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    const me = e as React.MouseEvent
    return { x: me.clientX - rect.left, y: me.clientY - rect.top }
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
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (canvasRef.current) {
      setClientSignatureSvg(canvasRef.current.toDataURL('image/png'))
    }
  }

  const handleClearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setClientSignatureSvg(null)
  }

  const handleGeneratePdf = () => {
    try {
      setGenerating(true)
      const reportPayload: JobReportData = {
        projectName: selectedProject?.name || 'Field Project',
        clientName: selectedClient?.name || 'Valued Client',
        clientAddress: selectedClient?.address,
        dateRange: new Date().toLocaleDateString(),
        executiveSummary: executiveSummary || undefined,
        timesheets,
        equipmentLogs: projectPlantLogs,
        materials: [],
        photos,
        clientSignerName: clientSignerName || selectedClient?.name,
        clientSignatureSvg: clientSignatureSvg || undefined,
      }

      const pdf = generateJobReportPdf(reportPayload, companyProfile)
      pdf.save(`${selectedProject?.name.replace(/[^a-zA-Z0-9]/g, '_')}_Job_Report.pdf`)
      onClose()
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-6 space-y-5 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Field Service & Job Completion Report</h2>
              <p className="text-xs text-text-muted">
                Compile technician shift notes, heavy plant hours, and site photos into a branded client handover pack.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-2 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          <div>
            <label className="text-[11px] text-text-muted block mb-1">Select Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
            >
              <option value="">-- Choose Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1">Executive Work Summary</label>
            <textarea
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              rows={3}
              className="w-full px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-white"
              placeholder="e.g. Completed submain cabling installation, verified AS/NZS 3000 compliance, tested earth continuity, and commissioned sub-board."
            />
          </div>

          {/* Metrics Preview */}
          <div className="grid grid-cols-3 gap-3 bg-surface-dark/50 border border-border-dark rounded-xl p-3 text-center">
            <div>
              <span className="text-[10px] text-text-muted block">Timesheet Entries</span>
              <span className="text-sm font-bold text-white font-mono">{timesheets.length} Logs</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Plant & Machinery</span>
              <span className="text-sm font-bold text-amber-400 font-mono">{projectPlantLogs.length} Records</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block">Site Photos</span>
              <span className="text-sm font-bold text-cyan-400 font-mono">{photos.length} Photos</span>
            </div>
          </div>

          {/* Client Sign-off Box */}
          <div className="space-y-2 p-3 bg-surface-dark/40 border border-border-dark rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">draw</span>
                Client On-Glass Handover Signature
              </span>
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-[10px] text-text-muted hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="bg-white rounded-lg overflow-hidden h-24 touch-none">
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
            <input
              type="text"
              value={clientSignerName}
              onChange={(e) => setClientSignerName(e.target.value)}
              className="w-full h-7 px-2 bg-background-dark border border-border-dark rounded text-xs text-white"
              placeholder="Signer Full Name (e.g. Property Owner / Site Manager)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark flex-wrap gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={generating} className="text-xs">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleGeneratePdf}
            disabled={generating || !selectedProjectId}
            className="text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            {generating ? 'Generating...' : 'Export Branded Job Report (PDF)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
