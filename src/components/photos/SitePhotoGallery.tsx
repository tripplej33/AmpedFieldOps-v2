import React, { useState, useRef } from 'react'
import { useSitePhotos } from '@/hooks/useSitePhotos'
import type { ProjectSitePhoto, PhotoCategory } from '@/types/photos'
import PhotoMarkupCanvasModal from './PhotoMarkupCanvasModal'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface SitePhotoGalleryProps {
  projectId: string
  projectName?: string
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void
}

const CATEGORY_TABS: { key: PhotoCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All Photos', icon: 'collections' },
  { key: 'before', label: 'Before Work', icon: 'history' },
  { key: 'in_progress', label: 'In-Progress', icon: 'timelapse' },
  { key: 'as_built', label: 'As-Built / Handover', icon: 'check_circle' },
  { key: 'defect', label: 'Defects & Issues', icon: 'report_problem' },
  { key: 'hazard', label: 'Hazards & Safety', icon: 'warning' },
]

export default function SitePhotoGallery({
  projectId,
  projectName = 'Project Site',
  onToast,
}: SitePhotoGalleryProps) {
  const { photos, loading, uploading, uploadPhoto, deletePhoto } = useSitePhotos(projectId)

  const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | 'all'>('all')
  const [selectedPhotoForMarkup, setSelectedPhotoForMarkup] = useState<string | null>(null)
  const [targetCategoryForMarkup, setTargetCategoryForMarkup] = useState<PhotoCategory>('as_built')
  const [photoToDelete, setPhotoToDelete] = useState<ProjectSitePhoto | null>(null)
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>('as_built')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)

  const filteredPhotos = photos.filter((p) => {
    if (selectedCategory === 'all') return true
    return p.category === selectedCategory
  })

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadPhoto({
        file,
        category: uploadCategory,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      })
      onToast?.('success', 'Photo uploaded successfully!')
    } catch {
      onToast?.('error', 'Failed to upload photo')
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  const handleOpenMarkupFromExisting = (photo: ProjectSitePhoto) => {
    setSelectedPhotoForMarkup(photo.photo_url)
    setTargetCategoryForMarkup(photo.category)
  }

  const handleSaveAnnotatedPhoto = async (dataUrl: string, caption: string) => {
    try {
      await uploadPhoto({
        dataUrl,
        category: targetCategoryForMarkup,
        caption: caption || 'Marked-up Photo Annotation',
      })
      onToast?.('success', 'Marked-up photo saved successfully!')
    } catch {
      onToast?.('error', 'Failed to save marked photo')
    }
  }

  const handleConfirmDelete = async () => {
    if (!photoToDelete) return
    try {
      await deletePhoto(photoToDelete.id)
      onToast?.('success', 'Photo deleted')
    } catch {
      onToast?.('error', 'Failed to delete photo')
    } finally {
      setPhotoToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-card-dark to-surface-dark border border-border-dark rounded-2xl p-6 shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-cyan-400 text-3xl">photo_camera</span>
            <h2 className="text-lg font-bold text-white font-display">Structured Site Photos & Drawing Markups</h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {photos.length} Captured
            </span>
          </div>
          <p className="text-xs text-text-muted max-w-2xl">
            Organize site photos by stage, draw defect arrows and highlight cable runs directly over photos, with GPS & timestamp watermarks.
          </p>
        </div>

        {/* Upload & Camera Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value as PhotoCategory)}
            className="h-9 px-2.5 bg-surface-dark border border-border-dark rounded-xl text-xs text-white"
          >
            <option value="as_built">Slot: As-Built</option>
            <option value="before">Slot: Before Work</option>
            <option value="in_progress">Slot: In-Progress</option>
            <option value="defect">Slot: Defect / Issue</option>
            <option value="hazard">Slot: Safety Hazard</option>
          </select>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelected}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Upload File
          </Button>

          <Button
            type="button"
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
            className="text-xs font-bold flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg shadow-cyan-500/20"
          >
            <span className="material-symbols-outlined text-base">camera_alt</span>
            {uploading ? 'Uploading...' : 'Take Site Photo'}
          </Button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex gap-2 border-b border-border-dark pb-2 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => {
          const isActive = selectedCategory === tab.key
          const count = tab.key === 'all' ? photos.length : photos.filter((p) => p.category === tab.key).length

          return (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive ? 'bg-primary text-black' : 'text-text-muted hover:text-white hover:bg-surface-dark'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="p-8 text-center text-text-muted animate-pulse">
          <span className="material-symbols-outlined text-3xl mb-2">image</span>
          <p className="text-xs">Loading site photos...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="p-8 rounded-2xl bg-card-dark border border-dashed border-border-dark text-center space-y-2">
          <span className="material-symbols-outlined text-text-muted text-4xl">add_a_photo</span>
          <p className="text-xs text-text-muted">No site photos in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo) => {
            const dateStr = new Date(photo.taken_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={photo.id}
                className="group bg-card-dark border border-border-dark hover:border-text-muted/40 rounded-2xl overflow-hidden shadow-md transition-all flex flex-col justify-between"
              >
                {/* Photo Thumbnail */}
                <div className="relative aspect-video bg-black/60 overflow-hidden">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || 'Site Photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Stage Category Badge */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-sm text-white uppercase border border-white/20">
                    {photo.category.replace('_', ' ')}
                  </span>
                </div>

                {/* Card Info */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white truncate">
                      {photo.caption || 'Site Photo'}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono">{dateStr}</p>
                    {photo.latitude && photo.longitude && (
                      <p className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-primary">location_on</span>
                        {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-border-dark/60 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenMarkupFromExisting(photo)}
                      className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 py-1"
                    >
                      <span className="material-symbols-outlined text-sm">draw</span>
                      Draw / Markup
                    </button>

                    <div className="flex items-center gap-1">
                      <a
                        href={photo.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="p-1 text-text-muted hover:text-white rounded"
                        title="Download Original"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setPhotoToDelete(photo)}
                        className="p-1 text-text-muted hover:text-red-400 rounded"
                        title="Delete Photo"
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

      {/* Markup Modal */}
      {selectedPhotoForMarkup && (
        <PhotoMarkupCanvasModal
          isOpen={!!selectedPhotoForMarkup}
          onClose={() => setSelectedPhotoForMarkup(null)}
          imageSrc={selectedPhotoForMarkup}
          projectName={projectName}
          onSaveMarkedPhoto={handleSaveAnnotatedPhoto}
        />
      )}

      {/* Confirm Delete Dialog */}
      {photoToDelete && (
        <ConfirmDialog
          isOpen={!!photoToDelete}
          title="Delete Site Photo?"
          message="Are you sure you want to delete this photo? This cannot be undone."
          confirmText="Delete Photo"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onClose={() => setPhotoToDelete(null)}
        />
      )}
    </div>
  )
}
