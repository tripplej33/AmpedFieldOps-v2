import { useState, useEffect, useCallback, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import SafetyFormRenderer from './SafetyFormRenderer'
import SignatureCanvasModal from './SignatureCanvasModal'
import CrewQRSignModal from './CrewQRSignModal'
import EmailSafetyDocModal from './EmailSafetyDocModal'
import { generateSafetyPdf } from '@/lib/pdf/safetyPdfGenerator'
import { useSafetySignatures } from '@/hooks/useSafety'
import { supabase } from '@/lib/supabase'
import type { SafetyDocument, SafetyTemplate, SafetyCategory } from '@/types/safety'

interface SafetyDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  document?: SafetyDocument | null
  templates: SafetyTemplate[]
  projectId?: string
  costCenterId?: string
  projectName?: string
  onSaveDocument: (docData: {
    id?: string
    template_id?: string | null
    project_id?: string | null
    cost_center_id?: string | null
    title: string
    category: SafetyCategory
    form_data: Record<string, any>
  }) => Promise<SafetyDocument>
  onArchivePdf: (
    documentId: string,
    pdfBlob: Blob,
    pdfFileName: string,
    targetProjectId?: string,
    targetCostCenterId?: string
  ) => Promise<{ updatedDoc: SafetyDocument; publicPdfUrl: string | null }>
}

export default function SafetyDocumentModal({
  isOpen,
  onClose,
  document,
  templates,
  projectId: propProjectId,
  costCenterId: propCostCenterId,
  projectName: propProjectName,
  onSaveDocument,
  onArchivePdf,
}: SafetyDocumentModalProps) {
  // Stable document UUID guaranteed from mount
  const activeDocId = useMemo(() => document?.id || crypto.randomUUID(), [document?.id])
  const [isPersistedInDb, setIsPersistedInDb] = useState<boolean>(Boolean(document?.id))

  const [selectedTemplate, setSelectedTemplate] = useState<SafetyTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [compilingPdf, setCompilingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [currentDoc, setCurrentDoc] = useState<SafetyDocument | null>(document || null)

  // Project & Cost Center selection state
  const [availableProjects, setAvailableProjects] = useState<{ id: string; name: string; project_number?: string }[]>([])
  const [availableCostCenters, setAvailableCostCenters] = useState<{ id: string; name: string; code?: string; project_id?: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(propProjectId || document?.project_id || '')
  const [selectedCostCenterId, setSelectedCostCenterId] = useState<string>(propCostCenterId || document?.cost_center_id || '')

  // Available Users to assign
  const [availableUsers, setAvailableUsers] = useState<{ id: string; full_name: string; email: string; role?: string }[]>([])
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<string>('')
  const [guestName, setGuestName] = useState('')
  const [guestRole, setGuestRole] = useState('Subcontractor')
  const [isAddingGuest, setIsAddingGuest] = useState(false)

  // Sub-modal states
  const [isSignCanvasOpen, setIsSignCanvasOpen] = useState(false)
  const [activeSignerForCanvas, setActiveSignerForCanvas] = useState<{ name: string; role: string; signatureId?: string } | null>(null)
  const [isQROpen, setIsQROpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)

  // Signatures hook using guaranteed activeDocId
  const {
    signatures,
    addSignature,
    assignUserToSign,
    addPendingCrewMember,
    signPendingSignature,
    deleteSignature,
    refresh: refreshSignatures,
  } = useSafetySignatures(activeDocId)

  // Load Projects, Cost Centers, and Team Users
  useEffect(() => {
    if (isOpen) {
      supabase
        .from('projects')
        .select('id, name, project_number')
        .order('name', { ascending: true })
        .then(({ data }) => setAvailableProjects(data || []))

      supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true })
        .then(({ data }) => setAvailableUsers(data || []))
    }
  }, [isOpen])

  // Load Cost Centers when Project changes
  useEffect(() => {
    if (selectedProjectId) {
      supabase
        .from('cost_centers')
        .select('id, name, code, project_id')
        .eq('project_id', selectedProjectId)
        .order('name', { ascending: true })
        .then(({ data }) => setAvailableCostCenters(data || []))
    } else {
      supabase
        .from('cost_centers')
        .select('id, name, code, project_id')
        .order('name', { ascending: true })
        .then(({ data }) => setAvailableCostCenters(data || []))
    }
  }, [selectedProjectId])

  useEffect(() => {
    if (isOpen) {
      if (document) {
        setCurrentDoc(document)
        setIsPersistedInDb(true)
        setTitle(document.title)
        setFormData(document.form_data || {})
        setSelectedProjectId(document.project_id || '')
        setSelectedCostCenterId(document.cost_center_id || '')
        const tpl = templates.find((t) => t.id === document.template_id) || document.template || null
        setSelectedTemplate(tpl)
      } else {
        // New Document
        setCurrentDoc(null)
        setIsPersistedInDb(false)
        const defaultTpl = templates[0] || null
        setSelectedTemplate(defaultTpl)
        const initialProj = propProjectId || ''
        setSelectedProjectId(initialProj)
        setSelectedCostCenterId(propCostCenterId || '')
        const pName = propProjectName || (initialProj ? availableProjects.find(p => p.id === initialProj)?.name : '') || 'Site Ops'
        setTitle(defaultTpl ? `${defaultTpl.title} - ${pName}` : '')
        setFormData({})
      }
      setError(null)
      setToastMessage(null)
    }
  }, [isOpen, document, templates, propProjectId, propCostCenterId, propProjectName, availableProjects])

  // Select Template Handler
  const handleSelectTemplate = (tpl: SafetyTemplate) => {
    setSelectedTemplate(tpl)
    const pName = availableProjects.find(p => p.id === selectedProjectId)?.name || propProjectName || 'Site Ops'
    setTitle(`${tpl.title} - ${pName}`)
    setFormData({})
  }

  // Handle Form Section Change
  const handleSectionChange = useCallback((sectionId: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [sectionId]: value }
      try {
        localStorage.setItem('amped_safety_draft', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  // Save Draft Helper (Guaranteed ID)
  const ensureDocSaved = async () => {
    if (isPersistedInDb && currentDoc) {
      return currentDoc
    }

    const finalTitle = (title || selectedTemplate?.title || 'Safety Compliance Document').trim()
    if (!finalTitle) {
      setError('Document title is required')
      return null
    }

    try {
      setSaving(true)
      setError(null)

      const saved = await onSaveDocument({
        id: activeDocId,
        template_id: selectedTemplate?.id || null,
        project_id: selectedProjectId || null,
        cost_center_id: selectedCostCenterId || null,
        title: finalTitle,
        category: selectedTemplate?.category || 'custom',
        form_data: formData,
      })

      setIsPersistedInDb(true)
      setCurrentDoc(saved)
      return saved
    } catch (err) {
      console.error('[SafetyDocumentModal] Error saving document:', err)
      setError(err instanceof Error ? err.message : 'Failed to save document')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleManualSaveDraft = async () => {
    const saved = await ensureDocSaved()
    if (saved) {
      setToastMessage('Draft saved successfully')
      setTimeout(() => setToastMessage(null), 2500)
    }
  }

  // Assign Registered User to Roster
  const handleAssignUser = async () => {
    if (!selectedUserToAssign) return
    const targetUser = availableUsers.find((u) => u.id === selectedUserToAssign)
    if (!targetUser) return

    const active = await ensureDocSaved()
    if (!active) return

    try {
      await assignUserToSign({
        id: targetUser.id,
        full_name: targetUser.full_name,
        role: targetUser.role,
      })
      setSelectedUserToAssign('')
      setToastMessage(`Assigned ${targetUser.full_name} to sign-off roster`)
      setTimeout(() => setToastMessage(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign user')
    }
  }

  // Add Guest / Subcontractor to Roster
  const handleAddGuest = async () => {
    if (!guestName.trim()) return
    const active = await ensureDocSaved()
    if (!active) return

    try {
      await addPendingCrewMember({
        signer_name: guestName.trim(),
        signer_role: guestRole.trim(),
      })
      setGuestName('')
      setIsAddingGuest(false)
      setToastMessage(`Added ${guestName} to sign-off roster`)
      setTimeout(() => setToastMessage(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add crew member')
    }
  }

  // Open Canvas for specific roster member or general signature
  const handleOpenSignCanvas = async (signer?: { name: string; role: string; signatureId?: string }) => {
    const active = await ensureDocSaved()
    if (!active) return

    if (signer) {
      setActiveSignerForCanvas(signer)
    } else {
      setActiveSignerForCanvas(null)
    }
    setIsSignCanvasOpen(true)
  }

  // Open Touchless QR Modal
  const handleOpenQR = async () => {
    const active = await ensureDocSaved()
    if (!active) return
    setIsQROpen(true)
  }

  // Handle Canvas Signature Save
  const handleSaveSignature = async (sigData: {
    signer_name: string
    signer_role: string
    signature_data: string
    geo_location?: { latitude: number; longitude: number; accuracy?: number } | null
  }) => {
    if (activeSignerForCanvas?.signatureId) {
      await signPendingSignature(activeSignerForCanvas.signatureId, {
        signature_data: sigData.signature_data,
        geo_location: sigData.geo_location,
      })
    } else {
      await addSignature({
        ...sigData,
        sign_type: 'on_the_spot',
      })
    }

    await refreshSignatures()
    setToastMessage('Signature recorded successfully!')
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Compile Final Audit PDF & Archive to Storage
  const handleCompileAndComplete = async () => {
    const activeDoc = await ensureDocSaved()
    if (!activeDoc) return

    try {
      setCompilingPdf(true)
      setError(null)

      const fullDocForPdf: SafetyDocument = {
        ...activeDoc,
        template: selectedTemplate || undefined,
        signatures: signatures || [],
      }

      // 1. Generate PDF
      const { blob, filename } = await generateSafetyPdf(fullDocForPdf)

      // 2. Archive PDF to Supabase Storage and Project Files
      const { updatedDoc } = await onArchivePdf(
        activeDoc.id,
        blob,
        filename,
        selectedProjectId || undefined,
        selectedCostCenterId || undefined
      )

      setCurrentDoc({ ...updatedDoc, signatures })
      localStorage.removeItem('amped_safety_draft')
      setIsEmailOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile and archive PDF')
    } finally {
      setCompilingPdf(false)
    }
  }

  const isCompleted = currentDoc?.status === 'completed'
  const signedCount = signatures.filter((s) => s.status === 'signed').length
  const pendingCount = signatures.filter((s) => s.status === 'pending').length

  const modalDocumentForSubComponents: SafetyDocument = currentDoc || {
    id: activeDocId,
    title: (title || selectedTemplate?.title || 'Safety Document').trim(),
    category: selectedTemplate?.category || 'custom',
    status: 'draft',
    form_data: formData,
    project_id: selectedProjectId || null,
    cost_center_id: selectedCostCenterId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: availableProjects.find((p) => p.id === selectedProjectId)
      ? { id: selectedProjectId, name: availableProjects.find((p) => p.id === selectedProjectId)!.name }
      : undefined,
    signatures,
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentDoc ? currentDoc.title : 'New Safety Document'}
      size="xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {toastMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* STEP 1: Template Picker (If creating new) */}
        {!document && (
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-white uppercase tracking-wider">
              Select Safety Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {templates.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-white shadow-sm ring-1 ring-primary'
                        : 'border-border-dark bg-card-dark text-text-muted hover:border-border-dark/80 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white leading-tight">
                          {tpl.title}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase bg-background-dark border border-border-dark text-text-muted">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Document Context & Project / Cost Center Linkage */}
        <div className="p-4 rounded-2xl bg-card-dark border border-border-dark space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-white/90">
                Document Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                disabled={isCompleted}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. SWMS - Main Switchboard Upgrade"
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90">Category</label>
              <div className="px-3 py-2 bg-background-dark border border-border-dark rounded-xl text-xs text-primary font-bold uppercase flex items-center justify-between">
                <span>{selectedTemplate?.category || 'Custom'}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : signatures.length > 0
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-border-dark bg-background-dark text-text-muted'
                  }`}
                >
                  {isCompleted ? 'COMPLETED' : signatures.length > 0 ? 'SIGNING' : 'DRAFT'}
                </span>
              </div>
            </div>
          </div>

          {/* Project and Cost Center Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border-dark/60">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">work</span>
                Assign to Project
              </label>
              <select
                value={selectedProjectId}
                disabled={isCompleted}
                onChange={(e) => {
                  const newProjId = e.target.value
                  setSelectedProjectId(newProjId)
                  setSelectedCostCenterId('')
                  if (newProjId) {
                    const p = availableProjects.find((p) => p.id === newProjId)
                    if (p && (!title || title.includes(' - '))) {
                      setTitle(`${selectedTemplate?.title || 'Safety Document'} - ${p.name}`)
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none font-medium"
              >
                <option value="">Company-Wide / General Operations (No Project)</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.project_number ? `(#${p.project_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-text-muted text-sm">account_tree</span>
                Cost Center / Task (Optional)
              </label>
              <select
                value={selectedCostCenterId}
                disabled={isCompleted}
                onChange={(e) => setSelectedCostCenterId(e.target.value)}
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none"
              >
                <option value="">General Project Cost Center</option>
                {availableCostCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.name} {cc.code ? `(${cc.code})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* STEP 3: Schema-Driven Form Renderer */}
        {selectedTemplate?.schema && (
          <SafetyFormRenderer
            schema={selectedTemplate.schema}
            formData={formData}
            onChange={handleSectionChange}
            readOnly={isCompleted}
          />
        )}

        {/* STEP 4: Worker & Crew Sign-Off Register (Signers & Assignees) */}
        <div className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">draw</span>
                Worker & Crew Sign-Off Register
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                Assign crew members, dispatch remote sign-offs, or pass around device to sign on site.
              </p>
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleOpenQR}
                  className="text-xs py-1.5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm text-cyan-400">qr_code_2</span>
                  <span>Touchless QR Sign</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleOpenSignCanvas()}
                  className="text-xs py-1.5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">gesture</span>
                  <span>Sign On The Spot</span>
                </Button>
              </div>
            )}
          </div>

          {/* Assign Team Members & Guest Workers Toolbar */}
          {!isCompleted && (
            <div className="p-3.5 rounded-xl bg-background-dark/80 border border-border-dark/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-sm">person_add</span>
                  Assign Required Signer / Team Member:
                </span>

                <button
                  type="button"
                  onClick={() => setIsAddingGuest(!isAddingGuest)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">
                    {isAddingGuest ? 'close' : 'add'}
                  </span>
                  {isAddingGuest ? 'Cancel Guest Form' : '+ Add Subcontractor / Guest to Roster'}
                </button>
              </div>

              {/* Assign Registered User Selection */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={selectedUserToAssign}
                  onChange={(e) => setSelectedUserToAssign(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-card-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="">-- Select Registered Team Member to Assign --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role || 'Technician'}) - {u.email}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAssignUser}
                  disabled={!selectedUserToAssign}
                  className="shrink-0 text-xs py-1.5"
                >
                  Assign to Document
                </Button>
              </div>

              {/* Guest / Subcontractor Form */}
              {isAddingGuest && (
                <div className="pt-2 border-t border-border-dark/60 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Worker / Subcontractor Name"
                    className="px-3 py-1.5 bg-card-dark border border-border-dark rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={guestRole}
                    onChange={(e) => setGuestRole(e.target.value)}
                    placeholder="Role (e.g. Apprentice, Subcontractor)"
                    className="px-3 py-1.5 bg-card-dark border border-border-dark rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddGuest}
                    disabled={!guestName.trim()}
                    className="text-xs py-1.5"
                  >
                    Add to Roster
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Signatures Roster List */}
          {signatures.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border-dark bg-background-dark/40 text-text-muted text-xs">
              <span className="material-symbols-outlined text-3xl block mb-1 text-text-muted/40">
                how_to_reg
              </span>
              No signers added yet. Assign team members above or tap "Sign On The Spot" / "Touchless QR Sign".
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-text-muted px-1">
                <span>Signatures: {signedCount} Completed, {pendingCount} Pending</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {signatures.map((sig) => {
                  const isSigPending = sig.status === 'pending'

                  return (
                    <div
                      key={sig.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 relative group transition-all ${
                        isSigPending
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-background-dark/90 border-border-dark'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{sig.signer_name}</p>
                          <p className="text-[10px] text-primary font-semibold leading-tight mt-0.5">
                            {sig.signer_role}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                            isSigPending
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          }`}
                        >
                          {isSigPending ? 'PENDING' : 'SIGNED'}
                        </span>
                      </div>

                      {/* Signature Preview or Sign Now Button */}
                      {isSigPending ? (
                        <div className="p-3 rounded-lg bg-card-dark/80 border border-border-dark/60 text-center space-y-2">
                          <p className="text-[11px] text-text-muted">Awaiting digital signature</p>
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSignCanvas({
                                  name: sig.signer_name,
                                  role: sig.signer_role,
                                  signatureId: sig.id,
                                })
                              }
                              className="w-full px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">draw</span>
                              <span>Sign Now</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        sig.signature_data && (
                          <div className="bg-[#0e1114] rounded-lg p-1.5 border border-border-dark/60 flex items-center justify-center h-14">
                            <img
                              src={sig.signature_data}
                              alt="Signature"
                              className="max-h-full max-w-full object-contain filter invert"
                            />
                          </div>
                        )
                      )}

                      <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border-dark/60">
                        <span>
                          {sig.signed_at
                            ? new Date(sig.signed_at).toLocaleDateString()
                            : 'Not yet signed'}
                        </span>
                        {sig.geo_location ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">place</span>
                            GPS Stamped
                          </span>
                        ) : (
                          <span className="text-text-muted/60">{sig.sign_type}</span>
                        )}
                      </div>

                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => deleteSignature(sig.id)}
                          className="absolute top-2 right-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove from roster"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-border-dark flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {currentDoc?.pdf_url && (
              <a
                href={currentDoc.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-background-dark border border-border-dark hover:border-primary text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-primary">picture_as_pdf</span>
                <span>View Stored PDF</span>
              </a>
            )}

            {currentDoc && (
              <button
                type="button"
                onClick={() => setIsEmailOpen(true)}
                className="px-3 py-2 rounded-xl bg-background-dark border border-border-dark hover:border-cyan-400 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-cyan-400">mail</span>
                <span>Email Document</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>

            {!isCompleted && (
              <Button
                variant="secondary"
                onClick={handleManualSaveDraft}
                loading={saving}
                disabled={compilingPdf}
              >
                Save Draft
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handleCompileAndComplete}
              loading={compilingPdf || saving}
              disabled={signedCount === 0}
              className="flex items-center gap-1.5 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>{isCompleted ? 'Re-Generate & Archive PDF' : 'Finalize & Archive PDF'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-Modals */}
      <SignatureCanvasModal
        isOpen={isSignCanvasOpen}
        onClose={() => {
          setIsSignCanvasOpen(false)
          setActiveSignerForCanvas(null)
        }}
        defaultName={activeSignerForCanvas?.name}
        defaultRole={activeSignerForCanvas?.role}
        onSaveSignature={handleSaveSignature}
        title={activeSignerForCanvas ? `Sign for ${activeSignerForCanvas.name}` : `Sign ${title}`}
      />

      <CrewQRSignModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        document={modalDocumentForSubComponents}
      />

      <EmailSafetyDocModal
        isOpen={isEmailOpen}
        onClose={() => setIsEmailOpen(false)}
        document={modalDocumentForSubComponents}
      />
    </Modal>
  )
}
