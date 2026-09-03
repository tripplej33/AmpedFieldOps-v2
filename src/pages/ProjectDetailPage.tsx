import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { useCostCenters } from '@/hooks/useCostCenters'
import { useFiles } from '@/hooks/useFiles'
import { useUsers } from '@/hooks/useUsers'
import { useActivityTypes } from '@/hooks/useActivityTypes'
import {
  useBulkCreateTimesheets,
  useSubmitTimesheet,
  useApproveTimesheet,
  useUnapproveTimesheet,
  useDeleteTimesheet,
} from '@/hooks/useTimesheets'
import { usePurchaseOrders, useCreatePurchaseOrder, useReceivePOItem } from '@/hooks/usePurchaseOrders'
import {
  useProjectContacts,
  useCreateProjectContact,
  useUpdateProjectContact,
  useDeleteProjectContact,
} from '@/hooks/useProjectContacts'
import { useProjectMaterials, useLogProjectMaterial } from '@/hooks/useProjectMaterials'
import { useSnags, useCreateSnag, useUpdateSnagStatus } from '@/hooks/useSnags'
import { useSiteAttendance, useSiteSignIn } from '@/hooks/useSiteSafety'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ProjectModal from '@/components/ProjectModal'
import CostCentersSection from '@/components/CostCentersSection'
import ProjectTeamSection from '@/components/projects/ProjectTeamSection'
import DocumentScannerModal from '@/components/DocumentScannerModal'
import TimesheetModal from '@/components/TimesheetModal'
import FileUploader from '@/components/files/FileUploader'
import FileList from '@/components/files/FileList'
import PurchaseOrdersList from '@/components/procurement/PurchaseOrdersList'
import PurchaseOrderModal from '@/components/procurement/PurchaseOrderModal'
import ProjectContactsList from '@/components/contacts/ProjectContactsList'
import ProjectMaterialsList from '@/components/materials/ProjectMaterialsList'
import ProjectSnagsList from '@/components/snags/ProjectSnagsList'
import SiteSafetySection from '@/components/safety/SiteSafetySection'
import SafetyDocumentsList from '@/components/safety/SafetyDocumentsList'
import SafetyDocumentModal from '@/components/safety/SafetyDocumentModal'
import { useSafetyDocuments, useSafetyTemplates } from '@/hooks/useSafety'
import type { SafetyDocument } from '@/types/safety'
import Toast from '@/components/ui/Toast'
import type {
  ProjectFormData,
  Timesheet,
  ProjectFile,
  BulkTimesheetFormData,
  PurchaseOrderFormData,
  ProjectContactFormData,
  ProjectMaterialFormData,
  ProjectSnagFormData,
  SiteAttendanceFormData,
} from '@/types'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = user?.role === 'manager' || user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<
    'overview' | 'materials' | 'purchase_orders' | 'contacts' | 'safety' | 'snags' | 'timesheets' | 'files' | 'financials'
  >('overview')

  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isTimesheetModalOpen, setIsTimesheetModalOpen] = useState(false)
  const [isPOModalOpen, setIsPOModalOpen] = useState(false)
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false)
  const [projectTimesheets, setProjectTimesheets] = useState<Timesheet[]>([])
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const { data: project, isLoading, error, refresh: refreshProject } = useProject(id || '')
  const { mutate: updateProject, isPending: isUpdatingProject } = useUpdateProject()
  const { data: costCenters, refresh: refreshCostCenters } = useCostCenters(id || '')
  const { data: users } = useUsers()
  const { data: activityTypes } = useActivityTypes()
  const { files: projectFiles, loading: filesLoading, error: filesError, refresh: refreshFiles } = useFiles(id || '')
  const [filesList, setFilesList] = useState<ProjectFile[]>([])

  // Purchase Orders & Contacts hooks
  const { purchaseOrders, loading: posLoading, refresh: refreshPOs } = usePurchaseOrders(id)
  const { create: createPO, isPending: isPOCreating } = useCreatePurchaseOrder()
  const { receiveItem: receivePOItem } = useReceivePOItem()

  const { contacts, loading: contactsLoading, refresh: refreshContacts } = useProjectContacts(id)
  const { create: createContact } = useCreateProjectContact()
  const { update: updateContact } = useUpdateProjectContact()
  const { deleteContact } = useDeleteProjectContact()

  // Project Materials hook
  const { materials, loading: materialsLoading, refresh: refreshMaterials } = useProjectMaterials(id)
  const { logMaterial: logProjectMaterial } = useLogProjectMaterial()

  // Project Snags hook
  const { snags, loading: snagsLoading, refresh: refreshSnags } = useSnags(id)
  const { create: createSnag } = useCreateSnag()
  const { updateStatus: updateSnagStatus } = useUpdateSnagStatus()

  // Site Safety & Attendance hook
  const { attendances, loading: attendancesLoading, refresh: refreshAttendances } = useSiteAttendance(id)
  const { signIn: siteSignIn, signOut: siteSignOut, toggleAccountedFor } = useSiteSignIn()

  // Safety Documents & Compliance hooks
  const [safetySubTab, setSafetySubTab] = useState<'documents' | 'attendance'>('documents')
  const [isSafetyDocModalOpen, setIsSafetyDocModalOpen] = useState(false)
  const [selectedSafetyDoc, setSelectedSafetyDoc] = useState<SafetyDocument | null>(null)
  const {
    documents: safetyDocs,
    loading: safetyDocsLoading,
    createDocument: createSafetyDoc,
    updateDocument: updateSafetyDoc,
    deleteDocument: deleteSafetyDoc,
    archiveDocumentPdf,
  } = useSafetyDocuments(id)
  const { templates: safetyTemplates } = useSafetyTemplates()

  const { mutate: bulkCreateTimesheets, isPending: isBulkCreating } = useBulkCreateTimesheets()
  const { mutate: submitTimesheet } = useSubmitTimesheet()
  const { mutate: approveTimesheet } = useApproveTimesheet()
  const { mutate: unapproveTimesheet } = useUnapproveTimesheet()
  const { mutate: deleteTimesheet } = useDeleteTimesheet()
  const [tsToDelete, setTsToDelete] = useState<string | null>(null)
  const [tsToUnapprove, setTsToUnapprove] = useState<string | null>(null)

  useEffect(() => {
    setFilesList(projectFiles)
  }, [projectFiles])

  // Fetch Project Timesheets with Cost Centers, Activity Types, and Users joined
  const fetchProjectExtraData = useCallback(async () => {
    if (!id) return
    try {
      const [{ data: tsData, error: tsErr }, { data: usersData }] = await Promise.all([
        supabase
          .from('timesheets')
          .select(
            '*, cost_center:cost_centers(id, name, customer_po_number), activity_type:activity_types(id, name)'
          )
          .eq('project_id', id)
          .order('entry_date', { ascending: false }),
        supabase.from('users').select('id, full_name, email, role'),
      ])

      if (tsErr) {
        console.error('Error loading project timesheets:', tsErr)
      } else if (tsData) {
        const userMap = new Map((usersData || []).map((u) => [u.id, u]))
        const enriched = tsData.map((ts: any) => ({
          ...ts,
          user: userMap.get(ts.user_id) || { full_name: 'Technician', email: '' },
        }))
        setProjectTimesheets(enriched as Timesheet[])
      }
    } catch (err) {
      console.error('Error loading project extra data:', err)
    }
  }, [id])

  useEffect(() => {
    fetchProjectExtraData()

    if (!id) return
    const channel = supabase
      .channel(`project_detail_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timesheets', filter: `project_id=eq.${id}` },
        () => fetchProjectExtraData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders', filter: `project_id=eq.${id}` },
        () => refreshPOs()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_contacts', filter: `project_id=eq.${id}` },
        () => refreshContacts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_materials', filter: `project_id=eq.${id}` },
        () => refreshMaterials()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_snags', filter: `project_id=eq.${id}` },
        () => refreshSnags()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_attendances', filter: `project_id=eq.${id}` },
        () => refreshAttendances()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, fetchProjectExtraData, refreshPOs, refreshContacts, refreshMaterials, refreshSnags, refreshAttendances])

  const handleUploadComplete = (file: ProjectFile) => {
    setFilesList((prev) => [file, ...prev])
    refreshFiles()
    setToast({ type: 'success', message: `${file.name} uploaded successfully` })
  }

  const handleFileDeleted = (fileId: string) => {
    setFilesList((prev) => prev.filter((f) => f.id !== fileId))
    setToast({ type: 'success', message: 'File deleted successfully' })
  }

  const handleFolderDeleted = (deletedFileIds: string[]) => {
    setFilesList((prev) => prev.filter((f) => !deletedFileIds.includes(f.id)))
    refreshFiles()
    setToast({ type: 'success', message: 'Folder and its contents deleted successfully' })
  }

  const handleFileUpdated = (updatedFile: ProjectFile) => {
    setFilesList((prev) => prev.map((f) => (f.id === updatedFile.id ? updatedFile : f)))
    refreshFiles()
    setToast({ type: 'success', message: `File renamed to "${updatedFile.name}"` })
  }

  const handleFileError = (errMsg: string) => {
    setToast({ type: 'error', message: errMsg })
  }

  const handleSaveTimesheetDraft = async (data: BulkTimesheetFormData) => {
    try {
      await bulkCreateTimesheets(data)
      await fetchProjectExtraData()
      setIsTimesheetModalOpen(false)
      setToast({ type: 'success', message: 'Timesheet logged as draft' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to record timesheet' })
    }
  }

  const handleSubmitTimesheetApproval = async (data: BulkTimesheetFormData) => {
    try {
      const created = await bulkCreateTimesheets(data)
      if (created && created.length > 0) {
        for (const ts of created) {
          await submitTimesheet(ts.id)
        }
      }
      await fetchProjectExtraData()
      setIsTimesheetModalOpen(false)
      setToast({ type: 'success', message: 'Timesheet submitted for manager approval' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to submit timesheet' })
    }
  }

  const handleQuickApprove = async (tsId: string) => {
    await approveTimesheet(tsId)
    await fetchProjectExtraData()
    setToast({ type: 'success', message: 'Timesheet approved' })
  }

  const handleQuickSubmit = async (tsId: string) => {
    await submitTimesheet(tsId)
    await fetchProjectExtraData()
    setToast({ type: 'success', message: 'Timesheet submitted for review' })
  }

  const handleConfirmDeleteTimesheet = async () => {
    if (!tsToDelete) return
    await deleteTimesheet(tsToDelete)
    await fetchProjectExtraData()
    setToast({ type: 'success', message: 'Timesheet deleted successfully' })
    setTsToDelete(null)
  }

  const handleConfirmUnapproveTimesheet = async () => {
    if (!tsToUnapprove) return
    await unapproveTimesheet(tsToUnapprove)
    await fetchProjectExtraData()
    setToast({ type: 'success', message: 'Timesheet unapproved and reverted to Submitted' })
    setTsToUnapprove(null)
  }

  const handleCreatePO = async (data: PurchaseOrderFormData) => {
    try {
      await createPO(data)
      await refreshPOs()
      setIsPOModalOpen(false)
      setToast({ type: 'success', message: `Purchase Order ${data.po_number} created` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to create Purchase Order' })
    }
  }

  const handleReceivePOItem = async (itemId: string, qty: number, poId: string) => {
    try {
      await receivePOItem(itemId, qty, poId)
      await refreshPOs()
      setToast({ type: 'success', message: 'Delivered goods updated' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update goods receipt' })
    }
  }

  const handleAddContact = async (data: ProjectContactFormData) => {
    if (!id) return
    try {
      await createContact(id, data)
      await refreshContacts()
      setToast({ type: 'success', message: `${data.name} added as site contact` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to add contact' })
    }
  }

  const handleUpdateContact = async (contactId: string, data: Partial<ProjectContactFormData>) => {
    try {
      await updateContact(contactId, data)
      await refreshContacts()
      setToast({ type: 'success', message: 'Contact details updated' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update contact' })
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId)
      await refreshContacts()
      setToast({ type: 'success', message: 'Contact removed from project' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to remove contact' })
    }
  }

  const handleLogMaterial = async (data: ProjectMaterialFormData) => {
    try {
      await logProjectMaterial(data)
      await refreshMaterials()
      setToast({ type: 'success', message: `${data.description} logged to job` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to log material' })
    }
  }

  const handleAddSnag = async (data: ProjectSnagFormData) => {
    try {
      await createSnag(data)
      await refreshSnags()
      setToast({ type: 'success', message: `Snag "${data.title}" recorded` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to record snag' })
    }
  }

  const handleUpdateSnagStatus = async (snagId: string, newStatus: any) => {
    try {
      await updateSnagStatus(snagId, newStatus)
      await refreshSnags()
      setToast({ type: 'success', message: `Snag status updated to ${newStatus}` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update snag status' })
    }
  }

  const handleSiteSignIn = async (data: SiteAttendanceFormData) => {
    try {
      await siteSignIn(data)
      await refreshAttendances()
      setToast({ type: 'success', message: `${data.person_name} signed into site` })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to sign into site' })
    }
  }

  const handleSiteSignOut = async (attendanceId: string) => {
    try {
      await siteSignOut(attendanceId)
      await refreshAttendances()
      setToast({ type: 'success', message: 'Signed out of site safely' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to sign out' })
    }
  }

  const handleUpdateProject = async (data: ProjectFormData) => {
    if (!id) return
    try {
      await updateProject(id, data)
      await refreshProject()
      setIsEditProjectModalOpen(false)
      setToast({ type: 'success', message: 'Project details updated successfully' })
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update project' })
    }
  }

  if (!id) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400">Invalid project ID</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted text-xs">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400 mb-4">{error || 'Project not found'}</p>
        <Button onClick={() => navigate('/app/projects')}>Back to Projects</Button>
      </div>
    )
  }

  const clientDisplayName =
    project.clients?.name ||
    project.clients?.company ||
    (project.clients ? `${project.clients.first_name || ''} ${project.clients.last_name || ''}`.trim() : '') ||
    '—'

  // Budget & Financial calculations
  const totalBudget = project.budget || 0
  const allocatedBudget = (costCenters || []).reduce((sum, cc) => sum + (cc.budget ? Number(cc.budget) : 0), 0)
  const totalLaborHours = projectTimesheets.reduce((sum, ts) => sum + (Number(ts.hours) || 0), 0)
  const estimatedLaborCost = totalLaborHours * 85 // $85/hr
  const totalMaterialOrders = purchaseOrders.reduce((sum, po) => sum + (Number(po.total) || 0), 0)
  const totalLoggedMaterials = materials.reduce((sum, m) => sum + (Number(m.total_cost) || 0), 0)
  const totalProjectSpend = estimatedLaborCost + totalMaterialOrders + totalLoggedMaterials
  const budgetAllocatedPct = totalBudget > 0 ? Math.min(100, Math.round((allocatedBudget / totalBudget) * 100)) : 0
  const budgetSpentPct = totalBudget > 0 ? Math.min(100, Math.round((totalProjectSpend / totalBudget) * 100)) : 0

  const onSiteCount = attendances.filter((a) => a.status === 'on_site').length
  const fullAddress = [project?.address, project?.suburb, project?.city, project?.postal_code].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => navigate('/app/projects')} className="text-text-muted hover:text-white transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2.5 font-display">
              <span className="material-symbols-outlined text-4xl text-primary">folder_open</span>
              {project.name}
            </h1>
          </div>
          <p className="text-text-muted text-xs flex items-center gap-2">
            <span>Client: <strong className="text-white">{clientDisplayName}</strong></span>
            <span className="w-1 h-1 rounded-full bg-text-muted/40 inline-block shrink-0" />
            <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsEditProjectModalOpen(true)}>
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit Project
          </Button>
          <Button variant="secondary" onClick={() => setIsScannerOpen(true)}>
            <span className="material-symbols-outlined">document_scanner</span>
            Scan Receipt / Doc
          </Button>
          <span className={`px-3 py-1 rounded text-xs font-semibold ${
            project.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            project.status === 'Completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
            project.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            'bg-slate-500/20 text-slate-400 border border-slate-500/30'
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* 360° Navigation Tabs */}
      <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'overview' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">dashboard</span>
          Overview & Cost Centers
        </button>
        <button
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'materials' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">inventory_2</span>
          Job Materials & Stock ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab('purchase_orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'purchase_orders' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">shopping_cart</span>
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'contacts' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">contact_phone</span>
          Site Contacts ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab('safety')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'safety' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">shield</span>
          Site Safety & Sign-In ({onSiteCount} on site)
        </button>
        <button
          onClick={() => setActiveTab('snags')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'snags' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">fact_check</span>
          QC & Snags ({snags.length})
        </button>
        <button
          onClick={() => setActiveTab('timesheets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'timesheets' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">schedule</span>
          Timesheets ({projectTimesheets.length})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'files' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">folder</span>
          Files & Scans ({filesList.length})
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'financials' ? 'bg-primary text-white font-semibold' : 'text-text-muted hover:text-white hover:bg-card-dark'
          }`}
        >
          <span className="material-symbols-outlined text-base">payments</span>
          Financials & Billing
        </button>
      </div>

      {/* TAB 1: OVERVIEW & COST CENTERS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Project Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
              <p className="text-text-muted text-xs mb-1 uppercase font-semibold">Total Budget</p>
              <p className="text-white text-xl font-bold">{totalBudget ? `$${totalBudget.toLocaleString()}` : 'No Budget Set'}</p>
            </div>
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
              <p className="text-text-muted text-xs mb-1 uppercase font-semibold">Allocated to Cost Centers</p>
              <p className="text-primary text-xl font-bold">${allocatedBudget.toLocaleString()} <span className="text-xs text-text-muted font-normal">({budgetAllocatedPct}%)</span></p>
            </div>
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
              <p className="text-text-muted text-xs mb-1 uppercase font-semibold">Logged Labor</p>
              <p className="text-white text-xl font-bold">{totalLaborHours.toFixed(1)} hrs <span className="text-xs text-text-muted font-normal">(~${estimatedLaborCost.toLocaleString()})</span></p>
            </div>
            <div className="bg-card-dark border border-border-dark rounded-xl p-4 shadow-md">
              <p className="text-text-muted text-xs mb-1 uppercase font-semibold">Materials & POs</p>
              <p className="text-white text-xl font-bold">${(totalMaterialOrders + totalLoggedMaterials).toLocaleString()}</p>
              <p className="text-xs text-emerald-400 mt-0.5">{purchaseOrders.length} POs • {materials.length} Van Items</p>
            </div>
          </div>

          {/* Budget Health Bar */}
          {totalBudget > 0 && (
            <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-3 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-base">donut_large</span>
                  Project Financial Health & Spend Tracking
                </span>
                <span className="text-text-muted font-mono font-medium">
                  Total Spent: <strong className="text-white">${totalProjectSpend.toLocaleString()}</strong> of ${totalBudget.toLocaleString()} ({budgetSpentPct}%)
                </span>
              </div>
              <div className="w-full bg-background-dark rounded-full h-3 overflow-hidden p-0.5 border border-border-dark">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetSpentPct > 90 ? 'bg-red-500' : budgetSpentPct > 70 ? 'bg-amber-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(100, budgetSpentPct)}%` }}
                />
              </div>
            </div>
          )}

          {/* Assigned Team Members Component */}
          <ProjectTeamSection projectId={id} isManager={isManager} />

          {/* Site Location & Interactive Navigation Map */}
          <div className="bg-card-dark border border-border-dark rounded-xl p-5 shadow-lg shadow-black/20 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">pin_drop</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Physical Site Location & Navigation</h3>
                  <p className="text-[11px] text-text-muted">
                    Site address, direct navigation links, and facility access notes
                  </p>
                </div>
              </div>

              {fullAddress && (
                <div className="flex items-center gap-2">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">directions</span>
                    Google Maps
                  </a>
                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-background-dark hover:bg-border-dark text-text-muted hover:text-white border border-border-dark text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">map</span>
                    Apple Maps
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsEditProjectModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-background-dark hover:bg-border-dark text-text-muted hover:text-white border border-border-dark text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">edit_location</span>
                    Edit Location
                  </button>
                </div>
              )}
            </div>

            {fullAddress ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4 pt-1">
                {/* Address and Access Instructions */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-background-dark/80 border border-border-dark/80 space-y-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                      Physical Site Address
                    </span>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">location_on</span>
                      {fullAddress}
                    </p>
                  </div>

                  {project.site_access_notes && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">key</span>
                        <span>Site Access & Hazard Instructions</span>
                      </div>
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        {project.site_access_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Map Embed Frame */}
                <div className="rounded-xl overflow-hidden border border-border-dark h-[180px] bg-background-dark/90 relative">
                  <iframe
                    title="Site Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    className="w-full h-full border-0 opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-background-dark/40 rounded-xl border border-dashed border-border-dark space-y-2">
                <span className="material-symbols-outlined text-3xl text-text-muted/40 block">location_off</span>
                <p className="text-xs font-semibold text-white">No Site Address Configured</p>
                <p className="text-[11px] text-text-muted max-w-sm mx-auto">
                  Configure a physical street address, suburb, GPS coordinates, and site access instructions for field technicians.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsEditProjectModalOpen(true)}
                    className="mt-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">add_location_alt</span>
                    Add Site Location & Address
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cost Centers Component */}
          <CostCentersSection
            projectId={id}
            costCenters={costCenters || []}
            onMutationComplete={refreshCostCenters}
          />
        </div>
      )}

      {/* TAB 2: MATERIALS & VAN STOCK */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <ProjectMaterialsList
            materials={materials}
            loading={materialsLoading}
            project={project}
            costCenters={costCenters || []}
            onLogMaterial={handleLogMaterial}
          />
        </div>
      )}

      {/* TAB 3: PURCHASE ORDERS */}
      {activeTab === 'purchase_orders' && (
        <div className="space-y-4">
          <PurchaseOrdersList
            purchaseOrders={purchaseOrders}
            loading={posLoading}
            onRaisePO={() => setIsPOModalOpen(true)}
            onReceiveItem={handleReceivePOItem}
          />
        </div>
      )}

      {/* TAB 4: SITE CONTACTS & STAKEHOLDERS */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <ProjectContactsList
            contacts={contacts}
            loading={contactsLoading}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
          />
        </div>
      )}

      {/* TAB 5: SITE SAFETY & SWMS (ENHANCED) */}
      {activeTab === 'safety' && (
        <div className="space-y-4">
          {/* Sub-tab segment selector */}
          <div className="flex items-center gap-2 border-b border-border-dark pb-2">
            <button
              type="button"
              onClick={() => setSafetySubTab('documents')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                safetySubTab === 'documents'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card-dark text-text-muted hover:text-white border border-border-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">shield_with_heart</span>
              <span>Safety Documents & SWMS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background-dark/80 text-text-muted">
                {safetyDocs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSafetySubTab('attendance')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                safetySubTab === 'attendance'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-card-dark text-text-muted hover:text-white border border-border-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              <span>Site Attendance & Muster</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-background-dark/80 text-text-muted">
                {attendances.filter((a) => a.status === 'on_site').length} On Site
              </span>
            </button>
          </div>

          {safetySubTab === 'documents' ? (
            <SafetyDocumentsList
              documents={safetyDocs}
              loading={safetyDocsLoading}
              onOpenDocument={(doc) => {
                setSelectedSafetyDoc(doc)
                setIsSafetyDocModalOpen(true)
              }}
              onDeleteDocument={deleteSafetyDoc}
              onCreateNew={() => {
                setSelectedSafetyDoc(null)
                setIsSafetyDocModalOpen(true)
              }}
              hideProjectColumn
            />
          ) : (
            <SiteSafetySection
              attendances={attendances}
              loading={attendancesLoading}
              project={project}
              onSignIn={handleSiteSignIn}
              onSignOut={handleSiteSignOut}
              onToggleAccounted={toggleAccountedFor}
            />
          )}
        </div>
      )}

      {/* TAB 6: QC & SNAG LISTS */}
      {activeTab === 'snags' && (
        <div className="space-y-4">
          <ProjectSnagsList
            snags={snags}
            loading={snagsLoading}
            project={project}
            costCenters={costCenters || []}
            users={users || []}
            onAddSnag={handleAddSnag}
            onUpdateStatus={handleUpdateSnagStatus}
          />
        </div>
      )}

      {/* TAB 7: TIMESHEETS */}
      {activeTab === 'timesheets' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-5 space-y-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Project Labor Timesheets</h2>
              <p className="text-xs text-text-muted">Recorded field technician hours and cost center allocations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsTimesheetModalOpen(true)}>
                <span className="material-symbols-outlined text-base">add</span>
                Record Hours for Job
              </Button>
            </div>
          </div>

          {projectTimesheets.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-dark rounded-xl bg-background-dark/40">
              <span className="material-symbols-outlined text-4xl text-text-muted/40 block mb-2">schedule</span>
              <p className="text-white text-sm font-medium">No timesheets logged for this project yet.</p>
              <p className="text-xs text-text-muted mt-1">Click "Record Hours for Job" to log technician hours.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border-dark rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-background-dark/90 text-text-muted border-b border-border-dark font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3">Cost Center</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3 text-center">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-dark/60 text-white">
                  {projectTimesheets.map((ts) => {
                    const techName = ts.user?.full_name || ts.user?.email || 'Technician'
                    const techInitial = techName.charAt(0).toUpperCase()

                    return (
                      <tr key={ts.id} className="hover:bg-background-dark/40 transition-colors">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{ts.entry_date}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {techInitial}
                            </div>
                            <span className="text-text-muted font-medium">{techName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {ts.cost_center ? (
                            <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                              <span className="material-symbols-outlined text-xs">account_tree</span>
                              <span>{ts.cost_center.name}</span>
                              {ts.cost_center.customer_po_number && (
                                <span className="text-[10px] text-text-muted font-mono">
                                  ({ts.cost_center.customer_po_number})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-text-muted/60">General Scope</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{ts.activity_type?.name || 'Field Labor'}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          <span className="text-white bg-background-dark px-2 py-0.5 rounded border border-border-dark">
                            {Number(ts.hours).toFixed(1)} hrs
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${
                            ts.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            ts.status === 'submitted' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {ts.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {ts.status === 'draft' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleQuickSubmit(ts.id)}
                                  className="px-2 py-1 rounded bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold"
                                >
                                  Submit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTsToDelete(ts.id)}
                                  className="p-1 text-text-muted hover:text-red-400"
                                  title="Delete Draft"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </>
                            )}

                            {ts.status === 'submitted' && (
                              <>
                                {isManager && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickApprove(ts.id)}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                  >
                                    Approve
                                  </button>
                                )}
                                {isManager && (
                                  <button
                                    type="button"
                                    onClick={() => setTsToDelete(ts.id)}
                                    className="p-1 text-text-muted hover:text-red-400"
                                    title="Delete Timesheet"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                )}
                              </>
                            )}

                            {ts.status === 'approved' && (
                              <>
                                {isManager ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setTsToUnapprove(ts.id)}
                                      className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-medium flex items-center gap-1"
                                      title="Unapprove & unlock timesheet"
                                    >
                                      <span className="material-symbols-outlined text-xs">lock_open</span>
                                      Unapprove
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTsToDelete(ts.id)}
                                      className="p-1 text-text-muted hover:text-red-400"
                                      title="Delete Approved Timesheet"
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-text-muted/60 italic flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
                                    Approved
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: FILES & SCANS */}
      {activeTab === 'files' && (
        <div className="space-y-6">
          {filesError && (
            <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-xs text-red-200">
              {filesError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Upload Project Documents</h2>
                  <p className="text-xs text-text-muted mt-0.5">Drag and drop plans, specifications, SWMS or scan receipts</p>
                </div>
                <span className="text-xs text-text-muted bg-background-dark px-2.5 py-1 rounded-full border border-border-dark">Max 20MB</span>
              </div>
              <FileUploader
                projectId={id}
                onUploadComplete={handleUploadComplete}
                onError={handleFileError}
                costCenters={costCenters || []}
                customFolders={Array.from(
                  new Set(
                    filesList
                      .map((f) => {
                        const parts = f.path.split('/')
                        return parts.length > 1 && parts[1].startsWith('folder_')
                          ? decodeURIComponent(parts[1].replace('folder_', ''))
                          : null
                      })
                      .filter(Boolean) as string[]
                  )
                )}
              />
            </div>

            <div className="rounded-xl border border-border-dark bg-card-dark p-5 shadow-lg shadow-black/20">
              <FileList
                files={filesList}
                loading={filesLoading}
                onFileDeleted={handleFileDeleted}
                onFileUpdated={handleFileUpdated}
                onFolderDeleted={handleFolderDeleted}
                onError={handleFileError}
                costCenters={costCenters || []}
                projectId={id}
                onFolderCreated={handleUploadComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: FINANCIALS & BILLING */}
      {activeTab === 'financials' && (
        <div className="bg-card-dark border border-border-dark rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white">Financial & Spend Breakdown</h2>
            <p className="text-xs text-text-muted">Cost center allocation status, supplier POs, and labor burn</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-background-dark border border-border-dark rounded-xl p-4">
              <p className="text-text-muted text-xs uppercase font-semibold">Total Cost Center Allocated</p>
              <p className="text-white text-xl font-bold mt-1">${allocatedBudget.toLocaleString()}</p>
              <p className="text-xs text-primary mt-1">Across {(costCenters || []).length} Cost Centers</p>
            </div>
            <div className="bg-background-dark border border-border-dark rounded-xl p-4">
              <p className="text-text-muted text-xs uppercase font-semibold">Supplier Materials & POs</p>
              <p className="text-white text-xl font-bold mt-1">
                ${(totalMaterialOrders + totalLoggedMaterials).toLocaleString()}
              </p>
              <p className="text-xs text-emerald-400 mt-1">{purchaseOrders.length} POs • {materials.length} Materials</p>
            </div>
            <div className="bg-background-dark border border-border-dark rounded-xl p-4">
              <p className="text-text-muted text-xs uppercase font-semibold">Estimated Labor Incurred</p>
              <p className="text-white text-xl font-bold mt-1">${estimatedLaborCost.toLocaleString()}</p>
              <p className="text-xs text-text-muted mt-1">{totalLaborHours.toFixed(1)} total technician hours</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
            <Button variant="secondary" onClick={() => navigate('/app/financials')}>
              <span className="material-symbols-outlined">payments</span>
              Open Master Financials
            </Button>
          </div>
        </div>
      )}

      {/* Raise Purchase Order Modal */}
      {isPOModalOpen && (
        <PurchaseOrderModal
          isOpen={isPOModalOpen}
          onClose={() => setIsPOModalOpen(false)}
          onSubmit={handleCreatePO}
          projects={project ? [project] : []}
          costCenters={costCenters || []}
          preselectedProjectId={id}
          isPending={isPOCreating}
        />
      )}

      {/* Log Timesheet Modal */}
      <TimesheetModal
        isOpen={isTimesheetModalOpen}
        onClose={() => setIsTimesheetModalOpen(false)}
        onSaveDraft={handleSaveTimesheetDraft}
        onSubmitForApproval={handleSubmitTimesheetApproval}
        projects={project ? [project] : []}
        costCenters={costCenters || []}
        activityTypes={activityTypes || []}
        users={users || []}
        initialProjectId={id}
        isPending={isBulkCreating}
      />

      {/* OCR Document Scanner Modal */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        projectId={id}
        onApply={(data) => {
          setToast({
            type: 'success',
            message: `Scanned receipt from ${data.vendor} ($${data.totalAmount.toFixed(2)}) processed!`,
          })
          fetchProjectExtraData()
        }}
      />

      {/* Edit Project Modal */}
      {isEditProjectModalOpen && project && (
        <ProjectModal
          isOpen={isEditProjectModalOpen}
          onClose={() => setIsEditProjectModalOpen(false)}
          onSubmit={handleUpdateProject}
          project={project}
          isPending={isUpdatingProject}
        />
      )}

      {/* Native Confirm Dialog: Delete Timesheet */}
      <ConfirmDialog
        isOpen={Boolean(tsToDelete)}
        onClose={() => setTsToDelete(null)}
        onConfirm={handleConfirmDeleteTimesheet}
        title="Delete Timesheet Record?"
        message="Are you sure you want to permanently delete this timesheet entry? This action cannot be undone."
        confirmText="Delete Record"
        variant="danger"
        icon="delete"
      />

      {/* Native Confirm Dialog: Unapprove Timesheet */}
      <ConfirmDialog
        isOpen={Boolean(tsToUnapprove)}
        onClose={() => setTsToUnapprove(null)}
        onConfirm={handleConfirmUnapproveTimesheet}
        title="Unapprove Timesheet Record?"
        message="This will revert the status from Approved to Submitted so hours, notes, and activity can be edited or corrected."
        confirmText="Unapprove & Unlock"
        variant="warning"
        icon="lock_open"
      />

      {/* Project Safety Document Modal */}
      <SafetyDocumentModal
        isOpen={isSafetyDocModalOpen}
        onClose={() => setIsSafetyDocModalOpen(false)}
        document={selectedSafetyDoc}
        templates={safetyTemplates}
        projectId={id}
        projectName={project?.name || 'Project Site'}
        onSaveDocument={async (docData) => {
          if (docData.id) {
            return await updateSafetyDoc(docData.id, docData)
          } else {
            return await createSafetyDoc(docData)
          }
        }}
        onArchivePdf={archiveDocumentPdf}
      />

      {/* Toast Notification */}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  )
}
