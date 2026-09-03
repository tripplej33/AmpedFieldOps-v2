import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { SafetyTemplate, SafetyCategory, SafetyFormSection } from '@/types/safety'

interface TemplateBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  template?: SafetyTemplate | null
  onSaveTemplate: (tpl: Omit<SafetyTemplate, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>
}

export default function TemplateBuilderModal({
  isOpen,
  onClose,
  template,
  onSaveTemplate,
}: TemplateBuilderModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<SafetyCategory>('custom')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<SafetyFormSection[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setTitle(template.title)
        setCategory(template.category)
        setDescription(template.description || '')
        setSections(template.schema?.sections || [])
      } else {
        setTitle('')
        setCategory('custom')
        setDescription('')
        setSections([
          {
            id: 'general_info',
            title: 'Scope & Work Details',
            fields: [
              { id: 'work_scope', label: 'Detailed Scope of Work', type: 'textarea', required: true, placeholder: 'Describe task...' },
              { id: 'site_hazard_notes', label: 'Known Site Hazards', type: 'textarea', placeholder: 'List specific hazards...' },
            ],
          },
        ])
      }
      setError(null)
    }
  }, [isOpen, template])

  const handleAddSection = () => {
    const newSectionId = `section_${Date.now()}`
    setSections((prev) => [
      ...prev,
      {
        id: newSectionId,
        title: 'New Section',
        type: 'standard',
        fields: [
          { id: `field_${Date.now()}`, label: 'New Question / Field', type: 'text', required: false },
        ],
      },
    ])
  }

  const handleRemoveSection = (index: number) => {
    setSections((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateSectionTitle = (index: number, newTitle: string) => {
    setSections((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], title: newTitle }
      return updated
    })
  }

  const handleUpdateSectionType = (index: number, newType: SafetyFormSection['type']) => {
    setSections((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], type: newType }
      return updated
    })
  }

  const handleAddFieldToSection = (sectionIndex: number) => {
    setSections((prev) => {
      const updated = [...prev]
      const currentFields = updated[sectionIndex].fields || []
      updated[sectionIndex] = {
        ...updated[sectionIndex],
        fields: [
          ...currentFields,
          { id: `field_${Date.now()}`, label: 'Field Label', type: 'text', required: false },
        ],
      }
      return updated
    })
  }

  const handleRemoveField = (sectionIndex: number, fieldIndex: number) => {
    setSections((prev) => {
      const updated = [...prev]
      const currentFields = (updated[sectionIndex].fields || []).filter((_, idx) => idx !== fieldIndex)
      updated[sectionIndex] = { ...updated[sectionIndex], fields: currentFields }
      return updated
    })
  }

  const handleUpdateField = (
    sectionIndex: number,
    fieldIndex: number,
    fieldUpdates: Partial<SafetyFormSection['fields'] extends (infer U)[] ? U : any>
  ) => {
    setSections((prev) => {
      const updated = [...prev]
      const fields = [...(updated[sectionIndex].fields || [])]
      fields[fieldIndex] = { ...fields[fieldIndex], ...fieldUpdates }
      updated[sectionIndex] = { ...updated[sectionIndex], fields }
      return updated
    })
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Template title is required')
      return
    }

    try {
      setSaving(true)
      setError(null)

      await onSaveTemplate({
        id: template?.id,
        title: title.trim(),
        category,
        description: description.trim() || null,
        is_system_default: false,
        schema: { sections },
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template ? 'Edit Safety Template' : 'Create Custom Safety Template'}
      size="xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Template Overview */}
        <div className="p-5 rounded-2xl bg-card-dark border border-border-dark space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-semibold text-white/90">
                Template Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Solar PV Rooftop Installation JSA"
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-white/90">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SafetyCategory)}
                className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white focus:outline-none font-bold"
              >
                <option value="jsa">JSA</option>
                <option value="swms">SWMS</option>
                <option value="confined_space">Confined Space</option>
                <option value="take5">Take 5</option>
                <option value="hot_work">Hot Work / LOTO</option>
                <option value="custom">Custom Trade Template</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-white/90">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of when and how this template should be used..."
              className="w-full px-3 py-2 bg-background-dark border border-border-dark focus:border-primary rounded-xl text-xs text-white placeholder-text-muted/40 focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* Sections Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Form Sections & Structure
              </h3>
              <p className="text-[11px] text-text-muted">
                Configure sections, 5x5 risk matrices, PPE checklists, and custom questions.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleAddSection}
              className="text-xs py-1.5 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Add Section</span>
            </Button>
          </div>

          {sections.map((section, sIdx) => (
            <div
              key={section.id || sIdx}
              className="p-4 rounded-2xl bg-card-dark border border-border-dark space-y-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                    placeholder="Section Title"
                    className="w-full px-3 py-1.5 bg-background-dark border border-border-dark focus:border-primary rounded-lg text-xs font-bold text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={section.type || 'standard'}
                    onChange={(e) => handleUpdateSectionType(sIdx, e.target.value as any)}
                    className="px-2.5 py-1.5 bg-background-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option value="standard">Standard Form Fields</option>
                    <option value="risk_matrix_table">5x5 Risk Matrix Table</option>
                    <option value="ppe_grid">PPE Grid Selector</option>
                    <option value="checkbox_group">Checkbox Group / Triggers</option>
                    <option value="gas_test_table">Gas Test Log Table</option>
                  </select>

                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(sIdx)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                      title="Delete Section"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* If Standard Section, render fields builder */}
              {(!section.type || section.type === 'standard') && (
                <div className="space-y-2 pt-2 border-t border-border-dark/60">
                  {(section.fields || []).map((field, fIdx) => (
                    <div
                      key={field.id || fIdx}
                      className="p-3 rounded-xl bg-background-dark/80 border border-border-dark/80 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            handleUpdateField(sIdx, fIdx, { label: e.target.value })
                          }
                          placeholder="Field Question / Label"
                          className="w-full px-2.5 py-1.5 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateField(sIdx, fIdx, { type: e.target.value as any })
                          }
                          className="w-full px-2 py-1.5 bg-card-dark border border-border-dark rounded-lg text-xs text-white focus:outline-none"
                        >
                          <option value="text">Text Input</option>
                          <option value="textarea">Paragraph / Notes</option>
                          <option value="select">Dropdown Select</option>
                          <option value="date">Date</option>
                          <option value="time">Time</option>
                          <option value="number">Number</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <label className="text-[11px] text-text-muted flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!field.required}
                            onChange={(e) =>
                              handleUpdateField(sIdx, fIdx, { required: e.target.checked })
                            }
                            className="rounded border-border-dark text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>Required</span>
                        </label>
                      </div>

                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveField(sIdx, fIdx)}
                          className="text-text-muted hover:text-red-400 p-1"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddFieldToSection(sIdx)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 pt-1"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Add Question to this Section
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-dark">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            {template ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
