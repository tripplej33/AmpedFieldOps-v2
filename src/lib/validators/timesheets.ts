import { z } from 'zod'

export const timesheetSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
  cost_center_id: z.string().uuid().optional().nullable(),
  activity_type_id: z.string().uuid('Activity type is required'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  hours: z
    .number()
    .min(0.25, 'Minimum 0.25 hours (15 minutes)')
    .max(24, 'Cannot exceed 24 hours per day')
    .refine((val) => val % 0.25 === 0, 'Hours must be in 0.25 increments'),
  notes: z.string().max(500).optional(),
})

export type TimesheetFormData = z.infer<typeof timesheetSchema>

export const timesheetEntrySchema = z.object({
  activity_type_id: z.string().uuid('Activity type is required'),
  user_id: z.string().uuid('User is required'),
  hours: z
    .number()
    .min(0.25, 'Minimum 0.25 hours (15 minutes)')
    .max(24, 'Cannot exceed 24 hours per day')
    .refine((val) => val % 0.25 === 0, 'Hours must be in 0.25 increments'),
  notes: z.string().max(500).optional(),
})

export const bulkTimesheetSchema = z.object({
  project_id: z.string().uuid('Invalid project'),
  cost_center_id: z.string().uuid().optional().nullable(),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  entries: z.array(timesheetEntrySchema).min(1, 'At least one entry is required'),
})

export type BulkTimesheetFormData = z.infer<typeof bulkTimesheetSchema>
