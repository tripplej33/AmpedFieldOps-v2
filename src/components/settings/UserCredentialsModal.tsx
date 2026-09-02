import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import UserAvatar from '@/components/ui/UserAvatar'
import type { User, UserCredential, UserCredentialCategory } from '@/types'

interface UserCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onUpdated?: () => void
}

const CATEGORY_CONFIG: Record<
  UserCredentialCategory,
  { label: string; icon: string; defaultName: string }
> = {
  electrical_license: {
    label: 'Electrical Practising Licence',
    icon: 'electric_bolt',
    defaultName: 'EWRB Electrical Practising Licence',
  },
  drivers_license: {
    label: "Driver's Licence",
    icon: 'directions_car',
    defaultName: "NZ Driver Licence (Class 1 / 2)",
  },
  site_safe: {
    label: 'Site Safe & Working at Heights',
    icon: 'health_and_safety',
    defaultName: 'Site Safe Passport / Heights Cert',
  },
  first_aid: {
    label: 'First Aid Certification',
    icon: 'medical_services',
    defaultName: 'Comprehensive Workplace First Aid',
  },
  training_course: {
    label: 'Specialized Course / HV Cert',
    icon: 'school',
    defaultName: 'High Voltage / Hazardous Areas Course',
  },
  other: {
    label: 'Other Compliance Document',
    icon: 'badge',
    defaultName: 'Compliance Certification',
  },
}

export default function UserCredentialsModal({
  isOpen,
  onClose,
  user,
  onUpdated,
}: UserCredentialsModalProps) {
  const [credentials, setCredentials] = useState<UserCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form State
  const [category, setCategory] = useState<UserCredentialCategory>('electrical_license')
  const [documentName, setDocumentName] = useState('EWRB Electrical Practising Licence')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issuedDate, setIssuedDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCredentials()
      resetForm()
    }
  }, [isOpen, user?.id])

  const fetchCredentials = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('expiry_date', { ascending: true })

      if (fetchErr) throw fetchErr
      setCredentials(data || [])
    } catch (err) {
      console.error('Failed to fetch user credentials:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setIsAdding(false)
    setEditingId(null)
    setCategory('electrical_license')
    setDocumentName('EWRB Electrical Practising Licence')
    setDocumentNumber('')
    setIssuedDate('')
    setExpiryDate('')
    setFileUrl('')
    setNotes('')
    setError(null)
  }

  const handleCategorySelect = (cat: UserCredentialCategory) => {
    setCategory(cat)
    if (!documentName || Object.values(CATEGORY_CONFIG).some((c) => c.defaultName === documentName)) {
      setDocumentName(CATEGORY_CONFIG[cat].defaultName)
    }
  }

  const handleStartEdit = (cred: UserCredential) => {
    setEditingId(cred.id)
    setIsAdding(true)
    setCategory(cred.category)
    setDocumentName(cred.document_name)
    setDocumentNumber(cred.document_number || '')
    setIssuedDate(cred.issued_date || '')
    setExpiryDate(cred.expiry_date || '')
    setFileUrl(cred.file_url || '')
    setNotes(cred.notes || '')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    try {
      setUploadingFile(true)
      setError(null)

      // Convert small image/pdf to base64 Data URL or upload to bucket
      const reader = new FileReader()
      reader.onload = () => {
        setFileUrl(reader.result as string)
        setUploadingFile(false)
      }
      reader.onerror = () => {
        setError('Failed to read document file')
        setUploadingFile(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('File upload error:', err)
      setError('Failed to process document file')
      setUploadingFile(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !documentName.trim()) {
      setError('Please provide a document title')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (editingId) {
        // Update
        const { error: updateErr } = await supabase
          .from('user_credentials')
          .update({
            category,
            document_name: documentName.trim(),
            document_number: documentNumber.trim() || null,
            issued_date: issuedDate || null,
            expiry_date: expiryDate || null,
            file_url: fileUrl || null,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (updateErr) throw updateErr
      } else {
        // Insert
        const { error: insertErr } = await supabase.from('user_credentials').insert({
          user_id: user.id,
          category,
          document_name: documentName.trim(),
          document_number: documentNumber.trim() || null,
          issued_date: issuedDate || null,
          expiry_date: expiryDate || null,
          file_url: fileUrl || null,
          notes: notes.trim() || null,
        })

        if (insertErr) throw insertErr
      }

      await fetchCredentials()
      resetForm()
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error('Failed to save credential:', err)
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this licence/certificate record?')) return

    try {
      const { error: delErr } = await supabase.from('user_credentials').delete().eq('id', id)
      if (delErr) throw delErr
      await fetchCredentials()
      if (onUpdated) onUpdated()
    } catch (err) {
      console.error('Failed to delete credential:', err)
    }
  }

  const getExpiryBadge = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) {
      return (
        <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-medium">
          No Expiry
        </span>
      )
    }

    const today = new Date().toISOString().slice(0, 10)
    const diffDays = Math.ceil(
      (new Date(expiryDateStr).getTime() - new Date(today).getTime()) / 86400000
    )

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold animate-pulse">
          Expired {Math.abs(diffDays)}d ago
        </span>
      )
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
          Expires in {diffDays} days
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
        Valid until {expiryDateStr}
      </span>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Licences, Courses & Compliance Certifications">
      <div className="space-y-5 text-xs">
        {/* User Card Header */}
        <div className="bg-background-dark/80 border border-border-dark p-3.5 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="md" />
            <div>
              <h3 className="font-bold text-white text-sm">{user?.full_name || user?.email}</h3>
              <p className="text-[11px] text-text-muted capitalize">
                {user?.role || 'Staff'} • {credentials.length} Registered Certifications
              </p>
            </div>
          </div>

          {!isAdding && (
            <Button
              type="button"
              onClick={() => {
                resetForm()
                setIsAdding(true)
              }}
              className="text-xs h-[34px]"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Add Document
            </Button>
          )}
        </div>

        {/* Add / Edit Form */}
        {isAdding && (
          <form onSubmit={handleSave} className="bg-card-dark p-4 rounded-xl border border-border-dark space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-dark">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">
                  {editingId ? 'edit_document' : 'add_circle'}
                </span>
                {editingId ? 'Edit Document Details' : 'Register New Licence or Course'}
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-text-muted hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px]">
                {error}
              </div>
            )}

            {/* Category Selector Grid */}
            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Document Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_CONFIG) as UserCredentialCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat]
                  const isSelected = category === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white ring-1 ring-primary/40'
                          : 'bg-background-dark border-border-dark text-text-muted hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base text-primary">{cfg.icon}</span>
                      <span className="text-[10px] font-semibold truncate">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Document Title & Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-text-muted font-medium">Document / Qualification Title</label>
                <input
                  type="text"
                  required
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="e.g. Registered Electrician (EWRB)"
                  className="w-full h-[36px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-text-muted font-medium">Licence / Certificate Number</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g. E123456 or NZDL-89472"
                  className="w-full h-[36px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-mono focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Issued & Expiry Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-text-muted font-medium">Issued / Course Date</label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full h-[36px] px-3 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-text-muted font-medium">
                  Expiry Date <span className="text-primary font-bold">(Auto Alerts)</span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full h-[36px] px-3 bg-background-dark border border-border-dark rounded-lg text-white font-semibold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Document Upload / Attachment */}
            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Certificate Scan / Photo Upload</label>
              <div className="flex items-center gap-3">
                <label className="h-[36px] px-3 rounded-lg bg-background-dark hover:bg-nav-hover border border-border-dark text-text-muted hover:text-white font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-sm text-primary">upload_file</span>
                  <span>{uploadingFile ? 'Uploading...' : fileUrl ? 'Replace Document' : 'Upload File'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {fileUrl && (
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                    Document attached
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-text-muted font-medium">Compliance Notes / Renewal Instructions</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details on renewing body, course provider, or refresher requirements..."
                className="w-full p-2.5 bg-background-dark border border-border-dark rounded-lg text-white focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-dark">
              <Button type="button" variant="secondary" onClick={resetForm} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs">
                {saving ? 'Saving Document...' : editingId ? 'Update Document' : 'Save Licence Record'}
              </Button>
            </div>
          </form>
        )}

        {/* Credentials List */}
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading compliance documents...</div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-border-dark rounded-xl bg-background-dark/30 space-y-1">
              <span className="material-symbols-outlined text-3xl text-text-muted/60 block">badge</span>
              <p className="font-semibold text-white">No compliance licences registered yet</p>
              <p className="text-text-muted text-[11px]">
                Click "Add Document" to record EWRB licences, Site Safe passports, or driver certifications.
              </p>
            </div>
          ) : (
            credentials.map((cred) => {
              const cfg = CATEGORY_CONFIG[cred.category] || CATEGORY_CONFIG.other

              return (
                <div
                  key={cred.id}
                  className="bg-card-dark p-3.5 rounded-xl border border-border-dark flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">{cfg.icon}</span>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-xs truncate">{cred.document_name}</h4>
                        {cred.document_number && (
                          <span className="px-1.5 py-0.5 rounded bg-background-dark text-primary font-mono text-[10px] border border-border-dark">
                            #{cred.document_number}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-text-muted flex-wrap">
                        {cred.issued_date && <span>Issued: {cred.issued_date}</span>}
                        {cred.issued_date && cred.expiry_date && <span>•</span>}
                        {getExpiryBadge(cred.expiry_date)}
                      </div>

                      {cred.notes && (
                        <p className="text-[10px] text-text-muted italic">{cred.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {cred.file_url && (
                      <a
                        href={cred.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-background-dark hover:bg-nav-hover text-text-muted hover:text-white border border-border-dark transition-colors"
                        title="View Document Attachment"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cred)}
                      className="p-1.5 rounded-lg bg-background-dark hover:bg-nav-hover text-text-muted hover:text-white border border-border-dark transition-colors"
                      title="Edit Document"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cred.id)}
                      className="p-1.5 rounded-lg bg-background-dark hover:bg-red-500/10 text-text-muted hover:text-red-400 border border-border-dark hover:border-red-500/30 transition-colors"
                      title="Delete Record"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </Modal>
  )
}
