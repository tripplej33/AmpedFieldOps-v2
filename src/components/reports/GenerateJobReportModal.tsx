import React, { useState, useRef, useEffect } from 'react'
import { useProjects } from '@/hooks/useProjects'
import { useAllClients } from '@/hooks/useClients'
import { useTimesheets } from '@/hooks/useTimesheets'
import { usePlantEquipment } from '@/hooks/usePlantEquipment'
import { useProjectMaterials } from '@/hooks/useProjectMaterials'
import { useSnags } from '@/hooks/useSnags'
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

async function urlToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string) || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
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
  const [activeBuilderTab, setActiveBuilderTab] = useState<
    'scope' | 'timesheets' | 'plant' | 'materials' | 'snags' | 'photos' | 'signoff'
  >('scope')

  // Section Toggles
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeTimesheets, setIncludeTimesheets] = useState(true)
  const [includeEquipment, setIncludeEquipment] = useState(true)
  const [includeMaterials, setIncludeMaterials] = useState(true)
  const [includeSnags, setIncludeSnags] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeSignoff, setIncludeSignoff] = useState(true)

  // Item Checkboxes
  const [selectedTsIds, setSelectedTsIds] = useState<string[]>([])
  const [selectedEqIds, setSelectedEqIds] = useState<string[]>([])
  const [selectedMatIds, setSelectedMatIds] = useState<string[]>([])
  const [selectedSnagIds, setSelectedSnagIds] = useState<string[]>([])
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const selectedProject = projects.find((p: Project) => p.id === selectedProjectId)
  const selectedClient = clients.find((c: Client) => c.id === selectedProject?.client_id)

  const { data: timesheets = [] } = useTimesheets({ projectId: selectedProjectId || undefined })
  const { usageLogs } = usePlantEquipment()
  const { materials = [] } = useProjectMaterials(selectedProjectId || undefined)
  const { snags = [] } = useSnags(selectedProjectId || undefined)
  const { photos = [] } = useSitePhotos(selectedProjectId || undefined)

  const projectPlantLogs = usageLogs.filter((u) => u.project_id === selectedProjectId)

  // Auto-select all items by default on project change
  useEffect(() => {
    setSelectedTsIds(timesheets.map((t) => t.id))
  }, [timesheets])

  useEffect(() => {
    setSelectedEqIds(projectPlantLogs.map((e) => e.id))
  }, [projectPlantLogs])

  useEffect(() => {
    setSelectedMatIds(materials.map((m) => m.id))
  }, [materials])

  useEffect(() => {
    setSelectedSnagIds(snags.map((s) => s.id))
  }, [snags])

  useEffect(() => {
    setSelectedPhotoIds(photos.map((p) => p.id))
  }, [photos])

  // Canvas drawing setup
  useEffect(() => {
    if (activeBuilderTab !== 'signoff') return
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
  }, [isOpen, activeBuilderTab])

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

  const toggleSelectAll = (
    currentList: string[],
    allIds: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.length === allIds.length) {
      setter([])
    } else {
      setter(allIds)
    }
  }

  const handleGeneratePdf = async () => {
    try {
      setGenerating(true)

      // Filter chosen items
      const chosenTs = timesheets.filter((t) => selectedTsIds.includes(t.id))
      const chosenEq = projectPlantLogs.filter((e) => selectedEqIds.includes(e.id))
      const chosenMat = materials.filter((m) => selectedMatIds.includes(m.id))
      const chosenSnags = snags.filter((s) => selectedSnagIds.includes(s.id))
      const chosenPhotosRaw = photos.filter((p) => selectedPhotoIds.includes(p.id))

      // Pre-convert chosen photos to base64 Data URLs for guaranteed offline jsPDF rendering
      const enrichedPhotos = await Promise.all(
        chosenPhotosRaw.map(async (p) => {
          if (p.photo_url) {
            const base64 = await urlToBase64(p.photo_url)
            return { ...p, base64DataUrl: base64 }
          }
          return p
        })
      )

      const reportPayload: JobReportData = {
        projectName: selectedProject?.name || 'Field Project',
        clientName: selectedClient?.name || 'Valued Client',
        clientAddress: selectedClient?.address,
        dateRange: new Date().toLocaleDateString(),
        executiveSummary: executiveSummary || undefined,
        includeSummary,
        timesheets: chosenTs,
        includeTimesheets,
        equipmentLogs: chosenEq,
        includeEquipment,
        materials: chosenMat,
        includeMaterials,
        snags: chosenSnags,
        includeSnags,
        photos: enrichedPhotos,
        includePhotos,
        clientSignerName: clientSignerName || selectedClient?.name,
        clientSignatureSvg: clientSignatureSvg || undefined,
        includeSignoff,
      }

      const pdf = generateJobReportPdf(reportPayload, companyProfile)
      pdf.save(`${(selectedProject?.name || 'Job').replace(/[^a-zA-Z0-9]/g, '_')}_Completion_Report.pdf`)
      onClose()
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card-dark border border-border-dark rounded-2xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-dark pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Interactive Job Handover & Report Builder
              </h2>
              <p className="text-[11px] text-text-muted">
                Pick and choose shift notes, plant hours, materials, and photo evidence to construct a client handover pack.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white p-1.5 rounded-lg">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Project Selector Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-dark/40 border border-border-dark rounded-xl p-3 text-xs shrink-0">
          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">Target Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full h-8 px-2.5 bg-background-dark border border-border-dark rounded-lg text-white"
            >
              <option value="">-- Select Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-text-muted block mb-1 font-semibold">Client</label>
            <div className="h-8 px-2.5 bg-background-dark/70 border border-border-dark rounded-lg text-white flex items-center">
              {selectedClient?.name || (selectedProjectId ? 'No client linked' : 'Choose a project')}
            </div>
          </div>
        </div>

        {/* Builder Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border-dark shrink-0 text-xs">
          {[
            { id: 'scope', label: '1. Executive Summary', icon: 'edit_note', enabled: includeSummary, onToggle: () => setIncludeSummary(!includeSummary) },
            { id: 'timesheets', label: `2. Shift Logs (${selectedTsIds.length}/${timesheets.length})`, icon: 'schedule', enabled: includeTimesheets, onToggle: () => setIncludeTimesheets(!includeTimesheets) },
            { id: 'plant', label: `3. Plant / Machinery (${selectedEqIds.length}/${projectPlantLogs.length})`, icon: 'precision_manufacturing', enabled: includeEquipment, onToggle: () => setIncludeEquipment(!includeEquipment) },
            { id: 'materials', label: `4. Materials (${selectedMatIds.length}/${materials.length})`, icon: 'inventory_2', enabled: includeMaterials, onToggle: () => setIncludeMaterials(!includeMaterials) },
            { id: 'snags', label: `5. QA / Snags (${selectedSnagIds.length}/${snags.length})`, icon: 'checklist', enabled: includeSnags, onToggle: () => setIncludeSnags(!includeSnags) },
            { id: 'photos', label: `6. Site Photos (${selectedPhotoIds.length}/${photos.length})`, icon: 'photo_camera', enabled: includePhotos, onToggle: () => setIncludePhotos(!includePhotos) },
            { id: 'signoff', label: '7. Sign-off', icon: 'draw', enabled: includeSignoff, onToggle: () => setIncludeSignoff(!includeSignoff) },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveBuilderTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                activeBuilderTab === tab.id
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'bg-surface-dark/60 text-text-muted hover:text-white border border-border-dark/60'
              } ${!tab.enabled ? 'opacity-40 line-through' : ''}`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* TAB 1: SCOPE */}
          {activeBuilderTab === 'scope' && (
            <div className="space-y-3 bg-surface-dark/30 border border-border-dark rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Executive Work Description
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded bg-background-dark border-border-dark text-purple-500"
                  />
                  Include in PDF
                </label>
              </div>
              <textarea
                value={executiveSummary}
                onChange={(e) => setExecutiveSummary(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-background-dark border border-border-dark rounded-lg text-white"
                placeholder="Describe work completed, compliance standards tested (e.g. AS/NZS 3000), client observations, and recommendations..."
              />
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] text-text-muted self-center">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setExecutiveSummary(
                      'Completed full field installation per scope. Verified AS/NZS 3000 standard compliance, earth loop impedance tests, and commissioned all operational circuits.'
                    )
                  }
                  className="px-2 py-1 rounded bg-background-dark border border-border-dark hover:border-purple-400/50 text-[10px] text-text-muted hover:text-white"
                >
                  Electrical Standard
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setExecutiveSummary(
                      'Completed high-pressure washing, surface restoration, and sealant application. Site left clean with zero safety defects observed.'
                    )
                  }
                  className="px-2 py-1 rounded bg-background-dark border border-border-dark hover:border-purple-400/50 text-[10px] text-text-muted hover:text-white"
                >
                  Pressure Wash & Surface
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TIMESHEETS */}
          {activeBuilderTab === 'timesheets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pick Technician Timesheets & Shift Notes
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSelectAll(
                        selectedTsIds,
                        timesheets.map((t) => t.id),
                        setSelectedTsIds
                      )
                    }
                    className="px-2 py-0.5 rounded bg-surface-dark border border-border-dark text-[10px] text-primary hover:underline"
                  >
                    {selectedTsIds.length === timesheets.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-purple-400">
                  {selectedTsIds.length} logs selected
                </span>
              </div>

              {timesheets.length === 0 ? (
                <div className="p-6 text-center text-text-muted border border-dashed border-border-dark rounded-xl">
                  No timesheet shift logs logged for this project yet.
                </div>
              ) : (
                <div className="border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 max-h-60 overflow-y-auto">
                  {timesheets.map((ts) => {
                    const isChecked = selectedTsIds.includes(ts.id)
                    return (
                      <label
                        key={ts.id}
                        className={`flex items-start justify-between p-3 cursor-pointer hover:bg-surface-dark transition-colors ${
                          isChecked ? 'bg-purple-500/5' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedTsIds((prev) =>
                                prev.includes(ts.id) ? prev.filter((i) => i !== ts.id) : [...prev, ts.id]
                              )
                            }
                            className="mt-0.5 rounded border-border-dark bg-background-dark text-purple-500"
                          />
                          <div>
                            <p className="text-white font-semibold">
                              {ts.user?.full_name} • {ts.activity_type?.name}
                            </p>
                            <p className="text-text-muted text-[11px] mt-0.5">
                              {ts.entry_date ? new Date(ts.entry_date).toLocaleDateString() : ''} — {ts.notes || 'General Work'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-purple-300 font-bold shrink-0">{ts.hours} hrs</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PLANT & MACHINERY */}
          {activeBuilderTab === 'plant' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pick Heavy Plant & Machinery Operations
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSelectAll(
                        selectedEqIds,
                        projectPlantLogs.map((e) => e.id),
                        setSelectedEqIds
                      )
                    }
                    className="px-2 py-0.5 rounded bg-surface-dark border border-border-dark text-[10px] text-amber-400 hover:underline"
                  >
                    {selectedEqIds.length === projectPlantLogs.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {selectedEqIds.length} machines selected
                </span>
              </div>

              {projectPlantLogs.length === 0 ? (
                <div className="p-6 text-center text-text-muted border border-dashed border-border-dark rounded-xl">
                  No heavy machinery or plant logged for this project.
                </div>
              ) : (
                <div className="border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 max-h-60 overflow-y-auto">
                  {projectPlantLogs.map((eq) => {
                    const isChecked = selectedEqIds.includes(eq.id)
                    return (
                      <label
                        key={eq.id}
                        className={`flex items-start justify-between p-3 cursor-pointer hover:bg-surface-dark transition-colors ${
                          isChecked ? 'bg-amber-500/5' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedEqIds((prev) =>
                                prev.includes(eq.id) ? prev.filter((i) => i !== eq.id) : [...prev, eq.id]
                              )
                            }
                            className="mt-0.5 rounded border-border-dark bg-background-dark text-amber-500"
                          />
                          <div>
                            <p className="text-white font-semibold">{eq.vehicle?.make_model}</p>
                            <p className="text-text-muted text-[11px] mt-0.5">
                              {eq.date} — {eq.notes || 'Plant operation'}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-amber-300 font-bold shrink-0">
                          {eq.units_used} {eq.tracking_type}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MATERIALS */}
          {activeBuilderTab === 'materials' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pick Materials & Installed Parts
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSelectAll(
                        selectedMatIds,
                        materials.map((m) => m.id),
                        setSelectedMatIds
                      )
                    }
                    className="px-2 py-0.5 rounded bg-surface-dark border border-border-dark text-[10px] text-cyan-400 hover:underline"
                  >
                    {selectedMatIds.length === materials.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {selectedMatIds.length} items selected
                </span>
              </div>

              {materials.length === 0 ? (
                <div className="p-6 text-center text-text-muted border border-dashed border-border-dark rounded-xl">
                  No materials booked to this project yet.
                </div>
              ) : (
                <div className="border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 max-h-60 overflow-y-auto">
                  {materials.map((mat) => {
                    const isChecked = selectedMatIds.includes(mat.id)
                    return (
                      <label
                        key={mat.id}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-surface-dark transition-colors ${
                          isChecked ? 'bg-cyan-500/5' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedMatIds((prev) =>
                                prev.includes(mat.id) ? prev.filter((i) => i !== mat.id) : [...prev, mat.id]
                              )
                            }
                            className="rounded border-border-dark bg-background-dark text-cyan-500"
                          />
                          <div>
                            <p className="text-white font-semibold">
                              {mat.description || mat.inventory_item?.name || 'Material Item'}
                            </p>
                            <p className="text-text-muted text-[11px]">
                              Qty: {mat.quantity_used} {mat.unit_of_measure}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-white font-bold">${Number(mat.total_cost || 0).toFixed(2)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SNAGS */}
          {activeBuilderTab === 'snags' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Pick QA Defect & Closeout Items
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSelectAll(
                        selectedSnagIds,
                        snags.map((s) => s.id),
                        setSelectedSnagIds
                      )
                    }
                    className="px-2 py-0.5 rounded bg-surface-dark border border-border-dark text-[10px] text-cyan-400 hover:underline"
                  >
                    {selectedSnagIds.length === snags.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">{selectedSnagIds.length} snags selected</span>
              </div>

              {snags.length === 0 ? (
                <div className="p-6 text-center text-text-muted border border-dashed border-border-dark rounded-xl">
                  No snag list items logged for this project.
                </div>
              ) : (
                <div className="border border-border-dark rounded-xl bg-card-dark divide-y divide-border-dark/60 max-h-60 overflow-y-auto">
                  {snags.map((snag) => {
                    const isChecked = selectedSnagIds.includes(snag.id)
                    return (
                      <label
                        key={snag.id}
                        className={`flex items-start justify-between p-3 cursor-pointer hover:bg-surface-dark transition-colors ${
                          isChecked ? 'bg-cyan-500/5' : 'opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              setSelectedSnagIds((prev) =>
                                prev.includes(snag.id) ? prev.filter((i) => i !== snag.id) : [...prev, snag.id]
                              )
                            }
                            className="mt-0.5 rounded border-border-dark bg-background-dark text-cyan-500"
                          />
                          <div>
                            <p className="text-white font-semibold">{snag.title}</p>
                            <p className="text-text-muted text-[11px] mt-0.5">
                              {snag.location} — {snag.description || 'Verified'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-surface-dark text-text-muted">
                          {snag.status}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PHOTOS */}
          {activeBuilderTab === 'photos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Site Photo Evidence Gallery Picker
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSelectAll(
                        selectedPhotoIds,
                        photos.map((p) => p.id),
                        setSelectedPhotoIds
                      )
                    }
                    className="px-2 py-0.5 rounded bg-surface-dark border border-border-dark text-[10px] text-cyan-400 hover:underline"
                  >
                    {selectedPhotoIds.length === photos.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {selectedPhotoIds.length} photos chosen
                </span>
              </div>

              {photos.length === 0 ? (
                <div className="p-6 text-center text-text-muted border border-dashed border-border-dark rounded-xl">
                  No site photos uploaded to this project yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1">
                  {photos.map((p) => {
                    const isChecked = selectedPhotoIds.includes(p.id)
                    return (
                      <div
                        key={p.id}
                        onClick={() =>
                          setSelectedPhotoIds((prev) =>
                            prev.includes(p.id) ? prev.filter((i) => i !== p.id) : [...prev, p.id]
                          )
                        }
                        className={`relative rounded-xl border overflow-hidden cursor-pointer group transition-all ${
                          isChecked
                            ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                            : 'border-border-dark opacity-50 hover:opacity-80'
                        }`}
                      >
                        <div className="aspect-video bg-black/40 overflow-hidden">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.caption || 'Photo'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted">
                              <span className="material-symbols-outlined text-2xl">photo</span>
                            </div>
                          )}
                        </div>

                        {/* Checkbox overlay badge */}
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-black/70 flex items-center justify-center border border-white/20">
                          {isChecked && <span className="material-symbols-outlined text-xs text-cyan-400">check</span>}
                        </div>

                        <div className="p-2 bg-card-dark text-[10px]">
                          <p className="text-white font-medium truncate">{p.caption || 'Site photo'}</p>
                          <span className="text-text-muted text-[9px] block">
                            {p.category ? `[${p.category}] ` : ''}
                            {p.taken_at ? new Date(p.taken_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: SIGNOFF */}
          {activeBuilderTab === 'signoff' && (
            <div className="space-y-3 bg-surface-dark/30 border border-border-dark rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">draw</span>
                  Client On-Glass Handover Signature
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="text-[11px] text-text-muted hover:text-white px-2 py-0.5 rounded bg-background-dark border border-border-dark"
                  >
                    Clear Canvas
                  </button>
                  <label className="flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-white">
                    <input
                      type="checkbox"
                      checked={includeSignoff}
                      onChange={(e) => setIncludeSignoff(e.target.checked)}
                      className="rounded bg-background-dark border-border-dark text-purple-500"
                    />
                    Include in PDF
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-xl overflow-hidden h-28 touch-none shadow-inner">
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
                className="w-full h-8 px-3 bg-background-dark border border-border-dark rounded-lg text-xs text-white"
                placeholder="Signer Full Name (e.g. John Smith - Property Owner / Project Manager)"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-dark flex-wrap gap-3 shrink-0">
          <Button type="button" variant="secondary" onClick={onClose} disabled={generating} className="text-xs">
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generating || !selectedProjectId}
              className="text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              {generating ? 'Compiling PDF with Photos...' : 'Export Branded Handover Report (PDF)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

