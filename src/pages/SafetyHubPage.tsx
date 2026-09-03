import { useState } from 'react'
import { useSafetyDocuments, useSafetyTemplates } from '@/hooks/useSafety'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import SafetyDocumentsList from '@/components/safety/SafetyDocumentsList'
import SafetyDocumentModal from '@/components/safety/SafetyDocumentModal'
import TemplateBuilderModal from '@/components/safety/TemplateBuilderModal'
import type { SafetyDocument, SafetyTemplate } from '@/types/safety'

export default function SafetyHubPage() {
  const { user } = useAuth()
  const { templates, loading: templatesLoading, createTemplate, updateTemplate, deleteTemplate } = useSafetyTemplates()
  const {
    documents,
    loading: docsLoading,
    createDocument,
    deleteDocument,
    archiveDocumentPdf,
  } = useSafetyDocuments()

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'templates'>('all')
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<SafetyDocument | null>(null)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<SafetyTemplate | null>(null)

  // Metrics
  const totalDocs = documents.length
  const pendingDocs = documents.filter((d) => d.status === 'pending_signatures' || d.status === 'draft').length
  const completedDocs = documents.filter((d) => d.status === 'completed').length

  const handleOpenDoc = (doc: SafetyDocument) => {
    setSelectedDoc(doc)
    setIsDocModalOpen(true)
  }

  const handleCreateNewDoc = () => {
    setSelectedDoc(null)
    setIsDocModalOpen(true)
  }

  const handleOpenTemplateBuilder = (tpl?: SafetyTemplate) => {
    setSelectedTemplate(tpl || null)
    setIsTemplateModalOpen(true)
  }

  const handleSaveDocData = async (docData: any) => {
    return await createDocument(docData)
  }

  const handleSaveTemplateData = async (tplData: any) => {
    if (tplData.id) {
      await updateTemplate(tplData.id, tplData)
    } else {
      await createTemplate(tplData)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Page Header & Overview Metrics */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">shield_with_heart</span>
            Safety & Compliance Hub
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Manage JSA, SWMS, Confined Space Permits, Take 5s, and multi-worker digital signatures.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {user?.role === 'admin' || user?.role === 'manager' ? (
            <Button
              variant="secondary"
              onClick={() => handleOpenTemplateBuilder()}
              className="text-xs py-2 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">dashboard_customize</span>
              <span>Template Builder</span>
            </Button>
          ) : null}

          <Button
            variant="primary"
            onClick={handleCreateNewDoc}
            className="text-xs py-2 flex items-center gap-1.5 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Safety Document</span>
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card-dark border border-border-dark flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Total Documents
            </p>
            <h3 className="text-xl font-extrabold text-white mt-0.5">{totalDocs}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">description</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-dark border border-border-dark flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Awaiting Signatures
            </p>
            <h3 className="text-xl font-extrabold text-amber-400 mt-0.5">{pendingDocs}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <span className="material-symbols-outlined text-xl">draw</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-dark border border-border-dark flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Completed & Archived
            </p>
            <h3 className="text-xl font-extrabold text-emerald-400 mt-0.5">{completedDocs}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <span className="material-symbols-outlined text-xl">verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card-dark border border-border-dark flex items-center justify-between shadow-lg shadow-black/10">
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Active Templates
            </p>
            <h3 className="text-xl font-extrabold text-cyan-400 mt-0.5">{templates.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <span className="material-symbols-outlined text-xl">dataset</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border-dark overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'all'
              ? 'border-primary text-white bg-card-dark/60'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">inventory_2</span>
          <span>All Safety Documents</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background-dark text-text-muted font-normal">
            {totalDocs}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-amber-400 text-amber-300 bg-card-dark/60'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">pending_actions</span>
          <span>Needs Signatures</span>
          {pendingDocs > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">
              {pendingDocs}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'completed'
              ? 'border-emerald-400 text-emerald-300 bg-card-dark/60'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>Completed Archive</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background-dark text-text-muted font-normal">
            {completedDocs}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'templates'
              ? 'border-cyan-400 text-cyan-300 bg-card-dark/60'
              : 'border-transparent text-text-muted hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">dashboard_customize</span>
          <span>Template Library</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'all' && (
        <SafetyDocumentsList
          documents={documents}
          loading={docsLoading}
          onOpenDocument={handleOpenDoc}
          onDeleteDocument={deleteDocument}
          onCreateNew={handleCreateNewDoc}
        />
      )}

      {activeTab === 'pending' && (
        <SafetyDocumentsList
          documents={documents.filter((d) => d.status === 'pending_signatures' || d.status === 'draft')}
          loading={docsLoading}
          onOpenDocument={handleOpenDoc}
          onDeleteDocument={deleteDocument}
          onCreateNew={handleCreateNewDoc}
        />
      )}

      {activeTab === 'completed' && (
        <SafetyDocumentsList
          documents={documents.filter((d) => d.status === 'completed')}
          loading={docsLoading}
          onOpenDocument={handleOpenDoc}
          onDeleteDocument={deleteDocument}
          onCreateNew={handleCreateNewDoc}
        />
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">Compliance Template Library</h3>
              <p className="text-xs text-text-muted">
                Pre-seeded industry templates and custom organization safety forms.
              </p>
            </div>

            <Button
              variant="primary"
              onClick={() => handleOpenTemplateBuilder()}
              className="text-xs py-1.5 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Create Custom Template</span>
            </Button>
          </div>

          {templatesLoading ? (
            <div className="p-12 text-center text-text-muted text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading compliance templates...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-card-dark border border-border-dark flex flex-col justify-between space-y-3 shadow-lg shadow-black/10"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-background-dark border border-border-dark text-primary">
                      {tpl.category}
                    </span>
                    {tpl.is_system_default ? (
                      <span className="text-[10px] font-semibold text-text-muted flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs text-emerald-400">lock</span>
                        System Default
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-cyan-400">Custom</span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{tpl.title}</h4>
                    <p className="text-xs text-text-muted line-clamp-2 mt-1 leading-relaxed">
                      {tpl.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border-dark/60 text-xs">
                  <span className="text-text-muted text-[11px]">
                    {tpl.schema?.sections?.length || 0} Sections
                  </span>

                  <div className="flex items-center gap-2">
                    {!tpl.is_system_default && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenTemplateBuilder(tpl)}
                          className="text-text-muted hover:text-white font-medium text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTemplate(tpl.id)}
                          className="text-text-muted hover:text-red-400 text-xs"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tpl)
                        setSelectedDoc(null)
                        setIsDocModalOpen(true)
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Document Create / Edit Modal */}
      <SafetyDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        document={selectedDoc}
        templates={templates}
        onSaveDocument={handleSaveDocData}
        onArchivePdf={archiveDocumentPdf}
      />

      {/* Template Builder Modal */}
      <TemplateBuilderModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        template={selectedTemplate}
        onSaveTemplate={handleSaveTemplateData}
      />
    </div>
  )
}
