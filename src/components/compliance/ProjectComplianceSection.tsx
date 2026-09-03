import { useState } from 'react'
import { useCompliance } from '@/hooks/useCompliance'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import type { ElectricalTestSheet, ElectricalCertificate, SwitchboardSchedule } from '@/types/compliance'
import { generateCertificatePdf, generateSwitchboardSchedulePdf } from '@/lib/pdf/compliancePdfGenerator'
import TestSheetModal from './TestSheetModal'
import CertificateModal from './CertificateModal'
import SwitchboardScheduleModal from './SwitchboardScheduleModal'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface ProjectComplianceSectionProps {
  projectId: string
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void
}

export default function ProjectComplianceSection({
  projectId,
  onToast,
}: ProjectComplianceSectionProps) {
  const { profile: companyProfile } = useCompanyProfile()
  const {
    testSheets,
    certificates,
    switchboards,
    loading,
    error,
    saveTestSheet,
    deleteTestSheet,
    saveCertificate,
    deleteCertificate,
    saveSwitchboard,
    deleteSwitchboard,
  } = useCompliance(projectId)

  // Modal States
  const [isTestSheetModalOpen, setIsTestSheetModalOpen] = useState(false)
  const [editingTestSheet, setEditingTestSheet] = useState<ElectricalTestSheet | null>(null)

  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<ElectricalCertificate | null>(null)

  const [isSwitchboardModalOpen, setIsSwitchboardModalOpen] = useState(false)
  const [editingSwitchboard, setEditingSwitchboard] = useState<SwitchboardSchedule | null>(null)

  // Confirm Delete Dialog State
  const [deleteItem, setDeleteItem] = useState<{
    type: 'testSheet' | 'certificate' | 'switchboard'
    id: string
    title: string
  } | null>(null)

  const handleOpenNewTestSheet = () => {
    setEditingTestSheet(null)
    setIsTestSheetModalOpen(true)
  }

  const handleOpenEditTestSheet = (sheet: ElectricalTestSheet) => {
    setEditingTestSheet(sheet)
    setIsTestSheetModalOpen(true)
  }

  const handleOpenNewCert = () => {
    setEditingCert(null)
    setIsCertModalOpen(true)
  }

  const handleOpenEditCert = (cert: ElectricalCertificate) => {
    setEditingCert(cert)
    setIsCertModalOpen(true)
  }

  const handleOpenNewSwitchboard = () => {
    setEditingSwitchboard(null)
    setIsSwitchboardModalOpen(true)
  }

  const handleOpenEditSwitchboard = (board: SwitchboardSchedule) => {
    setEditingSwitchboard(board)
    setIsSwitchboardModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    try {
      if (deleteItem.type === 'testSheet') {
        await deleteTestSheet(deleteItem.id)
        onToast?.('success', 'Test sheet deleted successfully')
      } else if (deleteItem.type === 'certificate') {
        await deleteCertificate(deleteItem.id)
        onToast?.('success', 'Certificate deleted successfully')
      } else if (deleteItem.type === 'switchboard') {
        await deleteSwitchboard(deleteItem.id)
        onToast?.('success', 'Switchboard schedule deleted successfully')
      }
    } catch {
      onToast?.('error', 'Failed to delete compliance item')
    } finally {
      setDeleteItem(null)
    }
  }

  const handleDownloadCertPdf = (cert: ElectricalCertificate) => {
    const pdf = generateCertificatePdf(cert, companyProfile)
    pdf.save(`${cert.cert_number}_${cert.cert_type}.pdf`)
    onToast?.('success', `Exported certificate ${cert.cert_number} (PDF)`)
  }

  const handleDownloadSwitchboardPdf = (board: SwitchboardSchedule) => {
    const pdf = generateSwitchboardSchedulePdf(board, companyProfile)
    pdf.save(`${board.board_name.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.pdf`)
    onToast?.('success', `Exported switchboard directory ${board.board_name} (PDF)`)
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted animate-pulse">
        <span className="material-symbols-outlined text-4xl mb-2">electrical_services</span>
        <p className="text-sm">Loading Electrical Compliance & Verification Suite...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Banner & Action Buttons */}
      <div className="bg-gradient-to-r from-card-dark to-surface-dark border border-border-dark rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-3xl">verified</span>
            <h2 className="text-lg font-bold text-white font-display">
              Electrical Compliance & Testing Suite
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              AS/NZS 3000:2018
            </span>
          </div>
          <p className="text-xs text-text-muted max-w-2xl">
            Record verification test results, issue statutory Certificates of Compliance (CoC) and Electrical Safety Certificates (ESC), and export switchboard schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleOpenNewTestSheet}
            className="text-xs font-bold flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-500/20"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            + Test Sheet
          </Button>

          <Button
            onClick={handleOpenNewCert}
            className="text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            + Issue CoC / ESC
          </Button>

          <Button
            onClick={handleOpenNewSwitchboard}
            variant="secondary"
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            + Switchboard
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {error}
        </div>
      )}

      {/* 1. AS/NZS 3000 Verification Test Sheets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-amber-400 text-lg">checklist</span>
            AS/NZS 3000 Verification Test Sheets ({testSheets.length})
          </h3>
        </div>

        {testSheets.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card-dark border border-dashed border-border-dark text-center space-y-2">
            <span className="material-symbols-outlined text-text-muted text-3xl">science</span>
            <p className="text-xs text-text-muted">No test sheets recorded for this project yet.</p>
            <Button variant="secondary" onClick={handleOpenNewTestSheet} className="text-xs">
              Create First Test Sheet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testSheets.map((sheet) => {
              const circuitsCount = sheet.circuits?.length || 0
              const passCount = sheet.circuits?.filter((c) => c.pass).length || 0
              const allPass = circuitsCount > 0 && passCount === circuitsCount

              return (
                <div
                  key={sheet.id}
                  className="bg-card-dark border border-border-dark hover:border-text-muted/40 rounded-2xl p-4 space-y-3 transition-all shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-text-muted">
                        {new Date(sheet.test_date).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          allPass
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {allPass ? 'VERIFIED PASS' : `${passCount}/${circuitsCount} Passed`}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{sheet.title}</h4>

                    <div className="text-[11px] text-text-muted space-y-1">
                      <p>Supply: <span className="text-white font-mono">{sheet.supply_system} ({sheet.voltage})</span></p>
                      <p>Main Earth: <span className="text-white font-mono">{sheet.main_earth_resistance || 0.5} Ω</span></p>
                      <p>Tester: <span className="text-white">{sheet.tester_model || 'Multifunction Tester'}</span></p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-dark/60 flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleOpenEditTestSheet(sheet)}
                      className="text-xs py-1 flex-1 font-bold"
                    >
                      View / Edit Sheet
                    </Button>
                    <button
                      onClick={() =>
                        setDeleteItem({
                          type: 'testSheet',
                          id: sheet.id,
                          title: sheet.title,
                        })
                      }
                      className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-surface-dark transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. Certificates of Compliance & ESC */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-blue-400 text-lg">verified</span>
            Official CoC & Electrical Safety Certificates ({certificates.length})
          </h3>
        </div>

        {certificates.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card-dark border border-dashed border-border-dark text-center space-y-2">
            <span className="material-symbols-outlined text-text-muted text-3xl">history_edu</span>
            <p className="text-xs text-text-muted">No electrical certificates issued for this project yet.</p>
            <Button variant="secondary" onClick={handleOpenNewCert} className="text-xs">
              Issue First Certificate
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => {
              const hasSignatures = !!cert.certifier_signature_svg

              return (
                <div
                  key={cert.id}
                  className="bg-card-dark border border-border-dark hover:border-text-muted/40 rounded-2xl p-4 space-y-3 transition-all shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-primary">
                        {cert.cert_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          cert.cert_type === 'combined_coc_esc'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        }`}
                      >
                        {cert.cert_type === 'combined_coc_esc'
                          ? 'Combined CoC/ESC'
                          : cert.cert_type.toUpperCase()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">
                      {cert.installation_type.replace('_', ' ').toUpperCase()} • {cert.certifier_name}
                    </h4>

                    <div className="text-[11px] text-text-muted space-y-1">
                      <p>Practitioner Reg: <span className="text-white font-mono">{cert.certifier_registration}</span></p>
                      <p>Date: <span className="text-white">{cert.certification_date}</span></p>
                      <p>
                        Signed Status:{' '}
                        <span className={hasSignatures ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {hasSignatures ? 'Practitioner Signed' : 'Signature Required'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-dark/60 flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleDownloadCertPdf(cert)}
                      className="text-xs py-1 flex items-center gap-1 text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                      PDF
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => handleOpenEditCert(cert)}
                      className="text-xs py-1 flex-1 font-bold"
                    >
                      Edit / Sign
                    </Button>

                    <button
                      onClick={() =>
                        setDeleteItem({
                          type: 'certificate',
                          id: cert.id,
                          title: cert.cert_number,
                        })
                      }
                      className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-surface-dark transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 3. Switchboard Circuit Directories */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
            <span className="material-symbols-outlined text-purple-400 text-lg">table_chart</span>
            Switchboard Circuit Directories ({switchboards.length})
          </h3>
        </div>

        {switchboards.length === 0 ? (
          <div className="p-6 rounded-2xl bg-card-dark border border-dashed border-border-dark text-center space-y-2">
            <span className="material-symbols-outlined text-text-muted text-3xl">door_front</span>
            <p className="text-xs text-text-muted">No switchboard schedules created yet.</p>
            <Button variant="secondary" onClick={handleOpenNewSwitchboard} className="text-xs">
              Create Switchboard Directory
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {switchboards.map((board) => (
              <div
                key={board.id}
                className="bg-card-dark border border-border-dark hover:border-text-muted/40 rounded-2xl p-4 space-y-3 transition-all shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-muted">
                      {board.circuits?.length || 0} Circuits
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {board.incomer_rating || '63A'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate">{board.board_name}</h4>

                  <div className="text-[11px] text-text-muted space-y-1">
                    <p>Location: <span className="text-white">{board.location || 'Main Board'}</span></p>
                    <p>Enclosure: <span className="text-white">{board.enclosure_type || 'Standard'}</span></p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-dark/60 flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleDownloadSwitchboardPdf(board)}
                    className="text-xs py-1 flex items-center gap-1 text-purple-400 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    <span className="material-symbols-outlined text-xs">print</span>
                    Print Labels
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => handleOpenEditSwitchboard(board)}
                    className="text-xs py-1 flex-1 font-bold"
                  >
                    Edit
                  </Button>

                  <button
                    onClick={() =>
                      setDeleteItem({
                        type: 'switchboard',
                        id: board.id,
                        title: board.board_name,
                      })
                    }
                    className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-surface-dark transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isTestSheetModalOpen && (
        <TestSheetModal
          isOpen={isTestSheetModalOpen}
          onClose={() => setIsTestSheetModalOpen(false)}
          onSave={async (data) => {
            await saveTestSheet(data)
            onToast?.('success', 'AS/NZS 3000 Test Sheet saved successfully!')
          }}
          initialData={editingTestSheet}
          projectId={projectId}
        />
      )}

      {isCertModalOpen && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          onSave={async (data) => {
            await saveCertificate(data)
            onToast?.('success', 'Certificate saved & issued successfully!')
          }}
          initialData={editingCert}
          projectId={projectId}
          testSheets={testSheets}
        />
      )}

      {isSwitchboardModalOpen && (
        <SwitchboardScheduleModal
          isOpen={isSwitchboardModalOpen}
          onClose={() => setIsSwitchboardModalOpen(false)}
          onSave={async (data) => {
            await saveSwitchboard(data)
            onToast?.('success', 'Switchboard Directory saved successfully!')
          }}
          initialData={editingSwitchboard}
          projectId={projectId}
        />
      )}

      {/* Confirm Delete Dialog */}
      {deleteItem && (
        <ConfirmDialog
          isOpen={!!deleteItem}
          title={`Delete ${deleteItem.type === 'testSheet' ? 'Test Sheet' : deleteItem.type === 'certificate' ? 'Certificate' : 'Switchboard'}?`}
          message={`Are you sure you want to permanently delete "${deleteItem.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}
