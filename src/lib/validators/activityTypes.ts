import { z } from 'zod'

export const activityTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  default_rate: z.number().min(0).optional(),
  xero_item_id: z.string().max(50).optional(),
  xero_item_code: z.string().max(50).optional(),
  xero_tax_type: z.string().max(50).optional(),
  managed_by_xero: z.boolean().optional(),
})

export type ActivityTypeFormData = z.infer<typeof activityTypeSchema>
