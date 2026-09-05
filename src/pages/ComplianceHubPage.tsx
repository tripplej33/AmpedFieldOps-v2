import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCompliance } from '@/hooks/useCompliance'
import { useEquipment } from '@/hooks/useEquipment'
import { useCompanyProfile } from '@/hooks/useCompanyProfile'
import type { ElectricalCertificate, ElectricalTestSheet, SwitchboardSchedule } from '@/types/compliance'
import type { EquipmentItem, PatTestLog } from '@/types/equipment'
import { generateCertificatePdf, generateSwitchboardSchedulePdf } from '@/lib/pdf/compliancePdfGenerator'
import TestSheetModal from '@/components/compliance/TestSheetModal'
import CertificateModal from '@/components/compliance/CertificateModal'
import SwitchboardScheduleModal from '@/components/compliance/SwitchboardScheduleModal'
import EquipmentModal from '@/components/equipment/EquipmentModal'
import PatTestModal from '@/components/equipment/PatTestModal'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Toast from '@/components/ui/Toast'

export default function ComplianceHubPage() {
  const { profile: companyProfile } = useCompanyProfile()
  const {
    testSheets,
    certificates,
    switchboards,
    loading: complianceLoading,
    saveTestSheet,
    deleteTestSheet,
    saveCertificate,
    deleteCertificate,
    saveSwitchboard,
    deleteSwitchboard,
  } = useCompliance()

  const {
    equipment,
    patLogs,
    loading: eqLoading,
    saveEquipment,
    deleteEquipment,
    logPatTest,
    deletePatLog,
  } = useEquipment()

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'certificates' | 'test_sheets' | 'switchboards' | 'equipment' | 'pat' | null

  const [activeTab, setActiveTab] = useState<'certificates' | 'test_sheets' | 'switchboards' | 'equipment' | 'pat'>(() => {
    if (tabParam && ['certificates', 'test_sheets', 'switchboards', 'equipment', 'pat'].includes(tabParam)) {
      return tabParam
    }
    return 'certificates'
  })

  useEffect(() => {
    if (tabParam && ['certificates', 'test_sheets', 'switchboards', 'equipment', 'pat'].includes(tabParam)) {
      setActiveTab(tabParam)
    } else if (!tabParam) {
      setActiveTab('certificates')
    }
  }, [tabParam])

  const handleTabChange = (tab: 'certificates' | 'test_sheets' | 'switchboards' | 'equipment' | 'pat') => {
    setActiveTab(tab)
    setSearchParams(tab === 'certificates' ? {} : { tab })
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  // Modals
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [editingCert, setEditingCert] = useState<ElectricalCertificate | null>(null)

  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [editingTestSheet, setEditingTestSheet] = useState<ElectricalTestSheet | null>(null)

  const [isSbModalOpen, setIsSbModalOpen] = useState(false)
  const [editingSb, setEditingSb] = useState<SwitchboardSchedule | null>(null)

  const [isEqModalOpen, setIsEqModalOpen] = useState(false)
  const [editingEq, setEditingEq] = useState<EquipmentItem | null>(null)

  const [isPatModalOpen, setIsPatModalOpen] = useState(false)
  const [editingPat, setEditingPat] = useState<PatTestLog | null>(null)

  const [deleteItem, setDeleteItem] = useState<{
    type: 'cert' | 'test' | 'sb' | 'eq' | 'pat'
    id: string
    name: string
  } | null>(null)

  const handleConfirmDelete = async () => {
    if (!deleteItem) return
    try {
      if (deleteItem.type === 'cert') await deleteCertificate(deleteItem.id)
      if (deleteItem.type === 'test') await deleteTestSheet(deleteItem.id)
      if (deleteItem.type === 'sb') await deleteSwitchboard(deleteItem.id)
      if (deleteItem.type === 'eq') await deleteEquipment(deleteItem.id)
      if (deleteItem.type === 'pat') await deletePatLog(deleteItem.id)
      setToast({ type: 'success', message: 'Record deleted' })
    } catch {
      setToast({ type: 'error', message: 'Failed to delete record' })
    } finally {
      setDeleteItem(null)
    }
  }

  const handleDownloadCertPdf = (cert: ElectricalCertificate) => {
    const pdf = generateCertificatePdf(cert, companyProfile)
    pdf.save(`${cert.cert_number}_${cert.cert_type}.pdf`)
    setToast({ type: 'success', message: `Exported ${cert.cert_number} (PDF)` })
  }

  const handleDownloadSwitchboardPdf = (board: SwitchboardSchedule) => {
    const pdf = generateSwitchboardSchedulePdf(board, companyProfile)
    pdf.save(`${board.board_name.replace(/[^a-zA-Z0-9]/g, '_')}_schedule.pdf`)
    setToast({ type: 'success', message: `Exported ${board.board_name} (PDF)` })
  }

  const filteredCerts = certificates.filter((c) =>
    c.cert_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.certifier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTests = testSheets.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tester_model?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBoards = switchboards.filter((b) =>
    b.board_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredEq = equipment.filter((e) =>
    e.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPat = patLogs.filter((p) =>
    p.appliance_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location_or_van?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (complianceLoading || eqLoading) {
    return (
      <div className="p-8 text-center text-text-muted animate-pulse">
        <span className="material-symbols-outlined text-4xl mb-2 text-amber-400">verified</span>
        <p className="text-sm">Loading Compliance & Verification Hub...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 flex items-center gap-2.5 font-display">
            <span className="material-symbols-outlined text-3xl text-amber-400">verified</span>
            Testing, Compliance & Calibration Hub
          </h1>
          <p className="text-text-muted text-xs">
            Company-wide AS/NZS 3000 verification records, official CoC/ESC certificates, switchboard schedules, and test meter calibration register.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              setEditingCert(null)
              setIsCertModalOpen(true)
            }}
            className="text-xs font-bold flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            + Issue CoC / ESC
          </Button>

          <Button
            onClick={() => {
              setEditingEq(null)
              setIsEqModalOpen(true)
            }}
            className="text-xs font-bold flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black"
          >
            <span className="material-symbols-outlined text-base">precision_manufacturing</span>
            + Add Tester
          </Button>

          <Button
            onClick={() => {
              setEditingPat(null)
              setIsPatModalOpen(true)
            }}
            variant="secondary"
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">qr_code_scanner</span>
            + Log PAT Test
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-1">
          <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">CoC / ESCs Issued</span>
          <span className="text-2xl font-bold text-white font-mono">{certificates.length}</span>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-1">
          <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">AS/NZS 3000 Tests</span>
          <span className="text-2xl font-bold text-amber-400 font-mono">{testSheets.length}</span>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-1">
          <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">Test Instruments</span>
          <span className="text-2xl font-bold text-cyan-400 font-mono">{equipment.length}</span>
        </div>
        <div className="bg-card-dark border border-border-dark rounded-xl p-4 space-y-1">
          <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider block">Tagged Appliances</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">{patLogs.length}</span>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto">
            <button
              onClick={() => handleTabChange('certificates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'certificates' ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              Certificates ({certificates.length})
            </button>
            <button
              onClick={() => handleTabChange('test_sheets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'test_sheets' ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">checklist</span>
              AS/NZS 3000 Logs ({testSheets.length})
            </button>
            <button
              onClick={() => handleTabChange('switchboards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'switchboards' ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">table_chart</span>
              Switchboards ({switchboards.length})
            </button>
            <button
              onClick={() => handleTabChange('equipment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'equipment' ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">precision_manufacturing</span>
              Meter Calibration ({equipment.length})
            </button>
            <button
              onClick={() => handleTabChange('pat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'pat' ? 'bg-primary text-white font-bold shadow-sm' : 'text-text-muted hover:text-white hover:bg-card-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              PAT / Test & Tag ({patLogs.length})
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full h-8 px-3 bg-surface-dark border border-border-dark rounded-xl text-xs text-white"
            />
          </div>
        </div>

        {/* Tab 1: Certificates */}
        {activeTab === 'certificates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCerts.map((cert) => (
              <div key={cert.id} className="bg-card-dark border border-border-dark rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-primary">{cert.cert_number}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                      {cert.cert_type.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{cert.project?.name || 'General Project'}</h4>
                  <p className="text-[11px] text-text-muted">Certifier: <span className="text-white">{cert.certifier_name} ({cert.certifier_registration})</span></p>
                  <p className="text-[11px] text-text-muted">Date: <span className="text-white font-mono">{cert.certification_date}</span></p>
                </div>
                <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => handleDownloadCertPdf(cert)} className="text-xs py-1 flex items-center gap-1 text-blue-400">
                    <span className="material-symbols-outlined text-xs">picture_as_pdf</span> PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setEditingCert(cert); setIsCertModalOpen(true) }} className="text-xs py-1 flex-1 font-bold">
                    Edit / Sign
                  </Button>
                  <button onClick={() => setDeleteItem({ type: 'cert', id: cert.id, name: cert.cert_number })} className="p-1 text-text-muted hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Test Sheets */}
        {activeTab === 'test_sheets' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTests.map((sheet) => (
              <div key={sheet.id} className="bg-card-dark border border-border-dark rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-muted">{sheet.test_date.slice(0, 10)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {sheet.circuits?.length || 0} Circuits
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{sheet.title}</h4>
                  <p className="text-[11px] text-text-muted">Project: <span className="text-white">{sheet.project?.name || 'General Project'}</span></p>
                  <p className="text-[11px] text-text-muted">Supply: <span className="text-white font-mono">{sheet.supply_system} ({sheet.voltage})</span></p>
                </div>
                <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => { setEditingTestSheet(sheet); setIsTestModalOpen(true) }} className="text-xs py-1 flex-1 font-bold">
                    View / Edit
                  </Button>
                  <button onClick={() => setDeleteItem({ type: 'test', id: sheet.id, name: sheet.title })} className="p-1 text-text-muted hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Switchboards */}
        {activeTab === 'switchboards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map((board) => (
              <div key={board.id} className="bg-card-dark border border-border-dark rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-text-muted">{board.circuits?.length || 0} Circuits</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {board.incomer_rating || '63A'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{board.board_name}</h4>
                  <p className="text-[11px] text-text-muted">Location: <span className="text-white">{board.location || 'Main Board'}</span></p>
                </div>
                <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => handleDownloadSwitchboardPdf(board)} className="text-xs py-1 flex items-center gap-1 text-purple-400">
                    <span className="material-symbols-outlined text-xs">print</span> Print Labels
                  </Button>
                  <Button variant="secondary" onClick={() => { setEditingSb(board); setIsSbModalOpen(true) }} className="text-xs py-1 flex-1 font-bold">
                    Edit
                  </Button>
                  <button onClick={() => setDeleteItem({ type: 'sb', id: board.id, name: board.board_name })} className="p-1 text-text-muted hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Meter Calibration Register */}
        {activeTab === 'equipment' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEq.map((eq) => {
              const isExpired = eq.calibration_expiry_date && new Date(eq.calibration_expiry_date) < new Date()

              return (
                <div key={eq.id} className="bg-card-dark border border-border-dark rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-cyan-400">{eq.asset_tag || 'METER'}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isExpired ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {isExpired ? 'CALIBRATION EXPIRED' : 'VALID'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate">{eq.equipment_name}</h4>
                    <p className="text-[11px] text-text-muted">Serial: <span className="text-white font-mono">{eq.serial_number}</span></p>
                    <p className="text-[11px] text-text-muted">Calibration Expiry: <span className="text-white font-mono">{eq.calibration_expiry_date || 'N/A'}</span></p>
                  </div>
                  <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-2">
                    <Button variant="secondary" onClick={() => { setEditingEq(eq); setIsEqModalOpen(true) }} className="text-xs py-1 flex-1 font-bold">
                      Edit Calibration
                    </Button>
                    <button onClick={() => setDeleteItem({ type: 'eq', id: eq.id, name: eq.equipment_name })} className="p-1 text-text-muted hover:text-red-400">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 5: PAT Logs */}
        {activeTab === 'pat' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPat.map((pat) => (
              <div key={pat.id} className="bg-card-dark border border-border-dark rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-purple-400">{pat.barcode}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      pat.overall_result === 'pass' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }`}>
                      {pat.overall_result.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{pat.appliance_name}</h4>
                  <p className="text-[11px] text-text-muted">Tested: <span className="text-white font-mono">{pat.test_date}</span></p>
                  <p className="text-[11px] text-text-muted">Next Due: <span className="text-white font-mono">{pat.next_test_date}</span></p>
                </div>
                <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-2">
                  <Button variant="secondary" onClick={() => { setEditingPat(pat); setIsPatModalOpen(true) }} className="text-xs py-1 flex-1 font-bold">
                    Edit Log
                  </Button>
                  <button onClick={() => setDeleteItem({ type: 'pat', id: pat.id, name: pat.appliance_name })} className="p-1 text-text-muted hover:text-red-400">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isCertModalOpen && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          onSave={async (data) => {
            await saveCertificate(data)
            setToast({ type: 'success', message: 'Certificate saved successfully!' })
          }}
          initialData={editingCert}
          projectId={editingCert?.project_id || ''}
          testSheets={testSheets}
        />
      )}

      {isTestModalOpen && (
        <TestSheetModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          onSave={async (data) => {
            await saveTestSheet(data)
            setToast({ type: 'success', message: 'Test sheet saved successfully!' })
          }}
          initialData={editingTestSheet}
          projectId={editingTestSheet?.project_id || ''}
        />
      )}

      {isSbModalOpen && (
        <SwitchboardScheduleModal
          isOpen={isSbModalOpen}
          onClose={() => setIsSbModalOpen(false)}
          onSave={async (data) => {
            await saveSwitchboard(data)
            setToast({ type: 'success', message: 'Switchboard schedule saved!' })
          }}
          initialData={editingSb}
          projectId={editingSb?.project_id || ''}
        />
      )}

      {isEqModalOpen && (
        <EquipmentModal
          isOpen={isEqModalOpen}
          onClose={() => setIsEqModalOpen(false)}
          onSave={async (data) => {
            await saveEquipment(data)
            setToast({ type: 'success', message: 'Test equipment saved!' })
          }}
          initialData={editingEq}
        />
      )}

      {isPatModalOpen && (
        <PatTestModal
          isOpen={isPatModalOpen}
          onClose={() => setIsPatModalOpen(false)}
          onSave={async (data) => {
            await logPatTest(data)
            setToast({ type: 'success', message: 'PAT test logged!' })
          }}
          initialData={editingPat}
        />
      )}

      {/* Delete Dialog */}
      {deleteItem && (
        <ConfirmDialog
          isOpen={!!deleteItem}
          title={`Delete ${deleteItem.name}?`}
          message="Are you sure you want to delete this record? This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteItem(null)}
        />
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
