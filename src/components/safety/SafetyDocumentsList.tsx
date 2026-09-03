import { useState } from 'react'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CrewQRSignModal from './CrewQRSignModal'
import EmailSafetyDocModal from './EmailSafetyDocModal'
import type { SafetyDocument, SafetyCategory, SafetyDocStatus } from '@/types/safety'

interface SafetyDocumentsListProps {
  documents: SafetyDocument[]
  loading: boolean
  onOpenDocument: (doc: SafetyDocument) => void
  onDeleteDocument: (id: string) => Promise<void>
  onCreateNew?: () => void
  hideProjectColumn?: boolean
}

export default function SafetyDocumentsList({
  documents,
  loading,
  onOpenDocument,
  onDeleteDocument,
  onCreateNew,
  hideProjectColumn = false,
}: SafetyDocumentsListProps) {
  const [selectedCategory, setSelectedCategory] = useState<SafetyCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<SafetyDocStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Sub-modal states for direct list actions
  const [selectedQrDoc, setSelectedQrDoc] = useState<SafetyDocument | null>(null)
  const [selectedEmailDoc, setSelectedEmailDoc] = useState<SafetyDocument | null>(null)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false
    if (selectedStatus !== 'all' && doc.status !== selectedStatus) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = doc.title.toLowerCase().includes(q)
      const projMatch = doc.project?.name?.toLowerCase().includes(q)
      const clientMatch = doc.project?.client_name?.toLowerCase().includes(q)
      if (!titleMatch && !projMatch && !clientMatch) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-card-dark border border-border-dark">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search safety documents..."
              className="w-full pl-9 pr-3 py-1.5 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/50 focus:outline-none"
            />
          </div>

          {/* Category Dropdown Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-1.5 bg-background-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="jsa">JSA</option>
            <option value="swms">SWMS</option>
            <option value="confined_space">Confined Space</option>
            <option value="take5">Take 5</option>
            <option value="hot_work">Hot Work / LOTO</option>
            <option value="custom">Custom</option>
          </select>

          {/* Status Dropdown Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-1.5 bg-background-dark border border-border-dark rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_signatures">Awaiting Signatures</option>
            <option value="completed">Completed & Signed</option>
          </select>
        </div>

        {onCreateNew && (
          <Button variant="primary" onClick={onCreateNew} className="text-xs py-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Safety Document</span>
          </Button>
        )}
      </div>

      {/* Documents Grid / Table */}
      {loading ? (
        <div className="p-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading safety compliance records...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border-dark bg-card-dark/40 text-text-muted space-y-2">
          <span className="material-symbols-outlined text-4xl text-text-muted/40 block">
            shield_with_heart
          </span>
          <p className="text-sm font-semibold text-white">No Safety Documents Found</p>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try clearing your filters or search query.'
              : 'Create a JSA, SWMS, Take 5, or Permit to get started with site safety compliance.'}
          </p>
          {onCreateNew && (
            <div className="pt-2">
              <Button variant="primary" onClick={onCreateNew} className="text-xs py-1.5">
                Create First Safety Document
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDocs.map((doc) => {
            const sigCount = doc.signatures?.length || 0
            const isCompleted = doc.status === 'completed'

            return (
              <div
                key={doc.id}
                className="p-4 rounded-2xl bg-card-dark border border-border-dark hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 shadow-lg shadow-black/20"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-background-dark border border-border-dark text-primary">
                      {doc.category.toUpperCase()}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isCompleted
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : sigCount > 0
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-border-dark bg-background-dark text-text-muted'
                      }`}
                    >
                      {isCompleted ? 'COMPLETED' : sigCount > 0 ? 'AWAITING SIGNS' : 'DRAFT'}
                    </span>
                  </div>

                  <div>
                    <h4
                      onClick={() => onOpenDocument(doc)}
                      className="text-sm font-bold text-white hover:text-primary transition-colors cursor-pointer line-clamp-1 leading-snug"
                    >
                      {doc.title}
                    </h4>
                    {!hideProjectColumn && (
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {doc.project?.name ? `Project: ${doc.project.name}` : 'General Site Document'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata & Signatures Counter */}
                <div className="space-y-2 pt-2 border-t border-border-dark/60 text-[11px]">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">how_to_reg</span>
                      <span>{sigCount} {sigCount === 1 ? 'Signer' : 'Signers'}</span>
                    </span>

                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedQrDoc(doc)}
                        className="p-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-cyan-400 text-cyan-400 text-xs transition-colors"
                        title="Touchless QR Sign"
                      >
                        <span className="material-symbols-outlined text-sm">qr_code_2</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEmailDoc(doc)}
                        className="p-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-primary text-text-muted hover:text-white text-xs transition-colors"
                        title="Email Document"
                      >
                        <span className="material-symbols-outlined text-sm">mail</span>
                      </button>

                      {doc.pdf_url && (
                        <a
                          href={doc.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-background-dark border border-border-dark hover:border-emerald-400 text-emerald-400 text-xs transition-colors"
                          title="View PDF"
                        >
                          <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenDocument(doc)}
                        className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-colors"
                      >
                        Open
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingDocId(doc.id)}
                        className="p-1 text-text-muted hover:text-red-400 transition-colors"
                        title="Delete Document"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sub-modals for QR Code & Email */}
      {selectedQrDoc && (
        <CrewQRSignModal
          isOpen={!!selectedQrDoc}
          onClose={() => setSelectedQrDoc(null)}
          document={selectedQrDoc}
        />
      )}

      {selectedEmailDoc && (
        <EmailSafetyDocModal
          isOpen={!!selectedEmailDoc}
          onClose={() => setSelectedEmailDoc(null)}
          document={selectedEmailDoc}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingDocId}
        onClose={() => setDeletingDocId(null)}
        onConfirm={async () => {
          if (deletingDocId) {
            await onDeleteDocument(deletingDocId)
            setDeletingDocId(null)
          }
        }}
        title="Delete Safety Document"
        message="Are you sure you want to delete this safety document? This action cannot be undone."
      />
    </div>
  )
}
