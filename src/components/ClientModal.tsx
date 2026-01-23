import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Client, ClientFormData } from '../types'
import { clientSchema } from '../lib/validators/clients'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ClientFormData) => Promise<void>
  onDelete?: (clientId: string) => Promise<void>
  client?: Client | null
  isLoading?: boolean
}

export default function ClientModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  client = null,
  isLoading = false,
}: ClientModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          first_name: client.first_name,
          last_name: client.last_name,
          company: client.company || '',
          email: client.email,
          phone: client.phone || '',
          street_address: client.street_address || '',
          city: client.city || '',
          state_province: client.state_province || '',
          postal_code: client.postal_code || '',
          country: client.country || '',
          status: client.status,
          notes: client.notes || '',
        }
      : {
          first_name: '',
          last_name: '',
          company: '',
          email: '',
          phone: '',
          street_address: '',
          city: '',
          state_province: '',
          postal_code: '',
          country: '',
          status: 'active',
          notes: '',
        },
  })

  useEffect(() => {
    if (isOpen && client) {
      reset({
        first_name: client.first_name,
        last_name: client.last_name,
        company: client.company || '',
        email: client.email,
        phone: client.phone || '',
        street_address: client.street_address || '',
        city: client.city || '',
        state_province: client.state_province || '',
        postal_code: client.postal_code || '',
        country: client.country || '',
        status: client.status,
        notes: client.notes || '',
      })
    } else if (isOpen) {
      reset({
        first_name: '',
        last_name: '',
        company: '',
        email: '',
        phone: '',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: '',
        status: 'active',
        notes: '',
      })
    }
  }, [isOpen, client, reset])

  const onSubmit = async (data: ClientFormData) => {
    try {
      setIsSaving(true)
      await onSave(data)
      reset()
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!client?.id || !onDelete) return

    try {
      setIsDeleting(true)
      await onDelete(client.id)
      setShowDeleteConfirm(false)
      reset()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Edit Client' : 'New Client'}>
      <div className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">First Name *</label>
              <Input
                type="text"
                placeholder="John"
                {...register('first_name')}
                disabled={isSaving || isLoading}
                className={errors.first_name ? 'border-red-500' : ''}
              />
              {errors.first_name && (
                <p className="text-red-400 text-xs mt-1">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Last Name *</label>
              <Input
                type="text"
                placeholder="Doe"
                {...register('last_name')}
                disabled={isSaving || isLoading}
                className={errors.last_name ? 'border-red-500' : ''}
              />
              {errors.last_name && (
                <p className="text-red-400 text-xs mt-1">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Company</label>
            <Input
              type="text"
              placeholder="Company Name"
              {...register('company')}
              disabled={isSaving || isLoading}
            />
            {errors.company && (
              <p className="text-red-400 text-xs mt-1">{errors.company.message}</p>
            )}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Email *</label>
              <Input
                type="email"
                placeholder="john@example.com"
                {...register('email')}
                disabled={isSaving || isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Phone</label>
              <Input
                type="tel"
                placeholder="+1-555-000-0000"
                {...register('phone')}
                disabled={isSaving || isLoading}
              />
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Street Address</label>
            <Input
              type="text"
              placeholder="123 Main St"
              {...register('street_address')}
              disabled={isSaving || isLoading}
            />
            {errors.street_address && (
              <p className="text-red-400 text-xs mt-1">{errors.street_address.message}</p>
            )}
          </div>

          {/* City, State, Postal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">City</label>
              <Input
                type="text"
                placeholder="New York"
                {...register('city')}
                disabled={isSaving || isLoading}
              />
              {errors.city && (
                <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">State/Province</label>
              <Input
                type="text"
                placeholder="NY"
                {...register('state_province')}
                disabled={isSaving || isLoading}
              />
              {errors.state_province && (
                <p className="text-red-400 text-xs mt-1">{errors.state_province.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Postal Code</label>
              <Input
                type="text"
                placeholder="10001"
                {...register('postal_code')}
                disabled={isSaving || isLoading}
              />
              {errors.postal_code && (
                <p className="text-red-400 text-xs mt-1">{errors.postal_code.message}</p>
              )}
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Country</label>
            <Input
              type="text"
              placeholder="USA"
              {...register('country')}
              disabled={isSaving || isLoading}
            />
            {errors.country && (
              <p className="text-red-400 text-xs mt-1">{errors.country.message}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Status</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="active"
                  {...register('status')}
                  disabled={isSaving || isLoading}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text-muted">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="inactive"
                  {...register('status')}
                  disabled={isSaving || isLoading}
                  className="w-4 h-4"
                />
                <span className="text-sm text-text-muted">Inactive</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Notes</label>
            <textarea
              placeholder="Additional notes (max 500 characters)"
              {...register('notes')}
              disabled={isSaving || isLoading}
              maxLength={500}
              rows={3}
              className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
            {errors.notes && (
              <p className="text-red-400 text-xs mt-1">{errors.notes.message}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-border-dark">
            {client && onDelete && !showDeleteConfirm && (
              <Button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSaving || isLoading}
                className="bg-red-900/30 hover:bg-red-900/50 text-red-400"
              >
                Delete
              </Button>
            )}
            {showDeleteConfirm && (
              <div className="flex-1 flex gap-2">
                <Button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel Delete
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            )}
            {!showDeleteConfirm && (
              <>
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving || isLoading}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isSaving ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </Modal>
  )
}
