import { z } from 'zod'

export const projectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(255, 'Project name must be under 255 characters'),
  description: z.string().max(500, 'Description must be under 500 characters').optional(),
  client_id: z.string().uuid('Invalid client ID'),
  status: z.enum(['Pending', 'Active', 'On Hold', 'Completed', 'Invoiced', 'Archived']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().positive('Budget must be a positive number').optional(),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
  address: z.string().max(255, 'Address must be under 255 characters').optional(),
  suburb: z.string().max(100, 'Suburb must be under 100 characters').optional(),
  city: z.string().max(100, 'City must be under 100 characters').optional(),
  postal_code: z.string().max(20, 'Postal code must be under 20 characters').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  site_access_notes: z.string().max(500, 'Site access notes must be under 500 characters').optional(),
  assigned_user_ids: z.array(z.string()).optional(),
})

export type ProjectSchema = z.infer<typeof projectSchema>
