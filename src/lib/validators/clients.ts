import { z } from 'zod'

export const clientSchema = z.object({
  first_name: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(255, 'First name must not exceed 255 characters'),
  last_name: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(255, 'Last name must not exceed 255 characters'),
  company: z.string()
    .max(255, 'Company name must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must not exceed 255 characters'),
  phone: z.string()
    .max(20, 'Phone number must not exceed 20 characters')
    .optional()
    .or(z.literal('')),
  street_address: z.string()
    .max(255, 'Street address must not exceed 255 characters')
    .optional()
    .or(z.literal('')),
  city: z.string()
    .max(100, 'City must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  state_province: z.string()
    .max(100, 'State/Province must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  postal_code: z.string()
    .max(20, 'Postal code must not exceed 20 characters')
    .optional()
    .or(z.literal('')),
  country: z.string()
    .max(100, 'Country must not exceed 100 characters')
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
