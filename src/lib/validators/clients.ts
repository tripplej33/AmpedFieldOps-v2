import { z } from 'zod'

export const clientSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must not exceed 255 characters'),
  contact_name: z.string()
    .max(255, 'Contact name must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .max(50, 'Phone number must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .optional()
    .or(z.literal('')),
  billing_address: z.string()
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  notes: z.string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
})

export type ClientFormSchema = z.infer<typeof clientSchema>

export const validateClientForm = (data: unknown) => {
  try {
    return {
      success: true,
      data: clientSchema.parse(data),
      errors: null,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      type ZodIssue = typeof error.issues[number]
      const fieldErrors = (error.issues as ZodIssue[]).reduce(
        (acc: Record<string, string>, issue: ZodIssue) => {
          const path = issue.path.join('.')
          acc[path] = issue.message
          return acc
        },
        {} as Record<string, string>
      )
      return {
        success: false,
        data: null,
        errors: fieldErrors,
      }
    }
    return {
      success: false,
      data: null,
      errors: { general: 'Validation failed' },
    }
  }
}
