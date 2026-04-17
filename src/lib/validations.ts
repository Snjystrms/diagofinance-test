import { z } from 'zod';
import { COUNTRY_CODES } from '@/lib/countries';

const personNameSchema = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .min(2, `${label} must be at least 2 characters`)
    .max(50, `${label} must be less than 50 characters`)
    .regex(/^[a-zA-Z\s'-]+$/, `${label} can only contain letters, spaces, hyphens, and apostrophes`);

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .transform((value) => value.toLowerCase())
  .refine((email) => email.length <= 100, 'Email must be less than 100 characters');

const securePasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const isValidCountryCode = (value: string) => (COUNTRY_CODES as readonly string[]).includes(value);

// Register form validation schema
export const registerSchema = z.object({
  first_name: personNameSchema('First name'),
  last_name: personNameSchema('Last name'),
  country_code: z
    .string()
    .min(1, 'Country code is required')
    .refine(isValidCountryCode, 'Select a valid country code'),
  email: emailSchema,
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d+$/, 'Mobile number must contain only digits')
    .length(10, 'Mobile number must be exactly 10 digits'),
  country: z.string().min(1, 'Country is required'),
  password: securePasswordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
  referral_code: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

export const adminUserCreateSchema = z.object({
  first_name: personNameSchema('First name'),
  last_name: personNameSchema('Last name'),
  email: emailSchema,
  mobile: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^\d+$/.test(value), 'Mobile number must contain only digits')
    .refine((value) => !value || value.length >= 6, 'Mobile number must be at least 6 digits')
    .refine((value) => !value || value.length <= 15, 'Mobile number must be less than 16 digits'),
  country: z.string().trim().max(100, 'Country must be less than 100 characters').optional().or(z.literal('')),
  country_code: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidCountryCode(value), 'Select a valid country code'),
  password: securePasswordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
  referral_code: z.string().trim().max(100, 'Referral code must be less than 100 characters').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

// Login form validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Verify OTP form validation schema
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().min(4, 'OTP must be at least 4 characters').max(6, 'OTP must be at most 6 characters'),
});

// Resend OTP form validation schema
export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Forgot password form validation schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Reset password form validation schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Trading account form validation schema
export const tradingAccountSchema = z.object({
  accountType: z.string().min(1, 'Account type is required'),
  groupId: z
    .string()
    .min(1, 'Group ID is required')
    .regex(/^\d+$/, 'Group ID must be a valid number'),
  leverage: z.string().min(1, 'Leverage is required'),
  mainPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
  investorPassword: z.string()
    .min(8, 'Investor password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Investor password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Investor password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Investor password must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Investor password must contain at least one special character'),
  extraFields: z.string().superRefine((value, ctx) => {
    if (!value.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(value);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Extra fields must be a JSON object',
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Extra fields must be valid JSON',
      });
    }
  }),
});

// Manager form validation schema
export const managerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .toLowerCase()
    .refine((email) => email.length <= 100, 'Email must be less than 100 characters'),
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d+$/, 'Mobile number must contain only digits')
    .length(10, 'Mobile number must be exactly 10 digits'),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, 'Password must be at least 8 characters')
    .refine((val) => !val || /[A-Z]/.test(val), 'Password must contain at least one uppercase letter')
    .refine((val) => !val || /[a-z]/.test(val), 'Password must contain at least one lowercase letter')
    .refine((val) => !val || /[0-9]/.test(val), 'Password must contain at least one number')
    .refine((val) => !val || /[^A-Za-z0-9]/.test(val), 'Password must contain at least one special character'),
  status: z.boolean().optional(),
  permissions: z.array(z.number()).optional(),
});

// Manager create schema (password required)
export const managerCreateSchema = managerSchema.extend({
  password: securePasswordSchema,
});

// Type exports
export type RegisterFormData = z.infer<typeof registerSchema>;
export type AdminUserCreateFormData = z.infer<typeof adminUserCreateSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type ResendOtpFormData = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type TradingAccountFormData = z.infer<typeof tradingAccountSchema>;
export type ManagerFormData = z.infer<typeof managerSchema>;
export type ManagerCreateFormData = z.infer<typeof managerCreateSchema>;
