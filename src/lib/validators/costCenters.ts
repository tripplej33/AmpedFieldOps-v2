import { z } from 'zod'

export const costCenterSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  budget: z.number().min(0).optional(),
  customer_po_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

export type CostCenterFormData = z.infer<typeof costCenterSchema>
