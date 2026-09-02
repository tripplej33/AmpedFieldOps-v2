import { z } from 'zod'

/**
 * Standard password validation schema for AmpedFieldOps:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
  .regex(/[0-9]/, 'Password must contain at least one number (0-9)')

export interface PasswordCriteria {
  hasMinLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  isValid: boolean
}

export function validatePasswordStrength(password: string): PasswordCriteria {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const isValid = hasMinLength && hasUppercase && hasNumber

  return {
    hasMinLength,
    hasUppercase,
    hasNumber,
    isValid,
  }
}
