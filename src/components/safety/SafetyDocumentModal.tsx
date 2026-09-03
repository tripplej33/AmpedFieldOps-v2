import { useState, useEffect, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import SafetyFormRenderer from './SafetyFormRenderer'
import SignatureCanvasModal from './SignatureCanvasModal'
import CrewQRSignModal from './CrewQRSignModal'
import EmailSafetyDocModal from './EmailSafetyDocModal'
import { generateSafetyPdf } from '@/lib/pdf/safetyPdfGenerator'
import { useSafetySignatures } from '@/hooks/useSafety'
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
  projectId,
  costCenterId,
  projectName = 'Project Site',
  onSaveDocument,
  onArchivePdf,
}: SafetyDocumentModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SafetyTemplate | null>(null)
  const [title, setTitle] = useState('')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [compilingPdf, setCompilingPdf] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const [currentDoc, setCurrentDoc] = useState<SafetyDocument | null>(null)

  // Sub-modal states
  const [isSignCanvasOpen, setIsSignCanvasOpen] = useState(false)
  const [isQROpen, setIsQROpen] = useState(false)
  const [isEmailOpen, setIsEmailOpen] = useState(false)

  // Signatures hook for active document
  const {
    signatures,
    addSignature,
    deleteSignature,
    refresh: refreshSignatures,
  } = useSafetySignatures(savedDocId || document?.id)

  useEffect(() => {
    if (isOpen) {
      if (document) {
        setCurrentDoc(document)
        setSavedDocId(document.id)
        setTitle(document.title)
        setFormData(document.form_data || {})
        const tpl = templates.find((t) => t.id === document.template_id) || document.template || null
        setSelectedTemplate(tpl)
      } else {
        // New Document
        setCurrentDoc(null)
        setSavedDocId(null)
        const defaultTpl = templates[0] || null
        setSelectedTemplate(defaultTpl)
        setTitle(defaultTpl ? `${defaultTpl.title} - ${projectName}` : '')
        setFormData({})
      }
      setError(null)
    }
  }, [isOpen, document, templates, projectName])

  // Select Template Handler
  const handleSelectTemplate = (tpl: SafetyTemplate) => {
    setSelectedTemplate(tpl)
    setTitle(`${tpl.title} - ${projectName}`)
    setFormData({})
  }

  // Handle Form Section Change
  const handleSectionChange = useCallback((sectionId: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [sectionId]: value }
      // Auto-save draft locally
      try {
        localStorage.setItem('amped_safety_draft', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }, [])

  // Save Draft
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Document title is required')
      return
    }

    try {
      setSaving(true)
      setError(null)
      const saved = await onSaveDocument({
        id: savedDocId || undefined,
        template_id: selectedTemplate?.id || null,
        project_id: projectId || undefined,
        cost_center_id: costCenterId || undefined,
        title: title.trim(),
        category: selectedTemplate?.category || 'custom',
        form_data: formData,
      })
      setSavedDocId(saved.id)
      setCurrentDoc(saved)
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document')
      throw err
    } finally {
      setSaving(false)
    }
  }

  // Handle On-The-Spot Canvas Signature Save
  const handleSaveSignature = async (sigData: {
    signer_name: string
    signer_role: string
    signature_data: string
    geo_location?: { latitude: number; longitude: number; accuracy?: number } | null
  }) => {
    let docId = savedDocId
    if (!docId) {
      const saved = await handleSaveDraft()
      if (!saved) return
      docId = saved.id
    }

    await addSignature({
      ...sigData,
      sign_type: 'on_the_spot',
    })

    await refreshSignatures()
  }

  // Compile Final Audit PDF & Archive to Storage
  const handleCompileAndComplete = async () => {
    let activeDoc = currentDoc
    if (!activeDoc || !savedDocId) {
      const saved = await handleSaveDraft()
      if (saved) activeDoc = saved
    } else {
      const saved = await handleSaveDraft()
      if (saved) activeDoc = saved
    }

    if (!activeDoc) return

    try {
      setCompilingPdf(true)
      setError(null)

      // Attach latest signatures and template
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
        projectId,
        costCenterId
      )

      setCurrentDoc({ ...updatedDoc, signatures })

      // 3. Clear local storage draft
      localStorage.removeItem('amped_safety_draft')

      // 4. Prompt email / share
      setIsEmailOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compile and archive PDF')
    } finally {
      setCompilingPdf(false)
    }
  }

  const isCompleted = currentDoc?.status === 'completed'

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

        {/* Document Title Header */}
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
        </div>

        {/* STEP 2: Schema-Driven Form Renderer */}
        {selectedTemplate?.schema && (
          <SafetyFormRenderer
            schema={selectedTemplate.schema}
            formData={formData}
            onChange={handleSectionChange}
            readOnly={isCompleted}
          />
        )}

        {/* STEP 3: Multi-Sign Crew Sign-Off Section */}
        <div className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">draw</span>
                Worker & Crew Sign-Off Register
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                All technicians, apprentices, and subcontractors working on site must sign prior to work.
              </p>
            </div>

            {!isCompleted && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsQROpen(true)}
                  className="text-xs py-1.5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm text-cyan-400">qr_code_2</span>
                  <span>Touchless QR Sign</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsSignCanvasOpen(true)}
                  className="text-xs py-1.5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">gesture</span>
                  <span>Sign On The Spot</span>
                </Button>
              </div>
            )}
          </div>

          {/* Signatures Roster */}
          {signatures.length === 0 ? (
            <div className="p-6 text-center rounded-xl border border-dashed border-border-dark bg-background-dark/40 text-text-muted text-xs">
              <span className="material-symbols-outlined text-3xl block mb-1 text-text-muted/40">
                how_to_reg
              </span>
              No signatures recorded yet. Tap "Sign On The Spot" or "Touchless QR Sign" to add crew members.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="p-3.5 rounded-xl bg-background-dark/90 border border-border-dark flex flex-col justify-between space-y-2 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{sig.signer_name}</p>
                      <p className="text-[10px] text-primary font-semibold leading-tight mt-0.5">
                        {sig.signer_role}
                      </p>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-card-dark text-text-muted border border-border-dark">
                      {sig.sign_type}
                    </span>
                  </div>

                  {/* Rendered Signature Canvas Stroke */}
                  {sig.signature_data && (
                    <div className="bg-[#0e1114] rounded-lg p-1.5 border border-border-dark/60 flex items-center justify-center h-14">
                      <img
                        src={sig.signature_data}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain filter invert"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-1 border-t border-border-dark/60">
                    <span>{new Date(sig.signed_at || sig.created_at).toLocaleDateString()}</span>
                    {sig.geo_location && (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">place</span>
                        GPS Stamped
                      </span>
                    )}
                  </div>

                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => deleteSignature(sig.id)}
                      className="absolute top-2 right-2 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Remove signature"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              ))}
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
                onClick={handleSaveDraft}
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
              disabled={signatures.length === 0}
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
        onClose={() => setIsSignCanvasOpen(false)}
        onSaveSignature={handleSaveSignature}
        title={`Sign ${title}`}
      />

      {currentDoc && (
        <>
          <CrewQRSignModal
            isOpen={isQROpen}
            onClose={() => setIsQROpen(false)}
            document={{ ...currentDoc, signatures }}
          />

          <EmailSafetyDocModal
            isOpen={isEmailOpen}
            onClose={() => setIsEmailOpen(false)}
            document={{ ...currentDoc, signatures }}
          />
        </>
      )}
    </Modal>
  )
}
