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
})

export type ProjectSchema = z.infer<typeof projectSchema>
