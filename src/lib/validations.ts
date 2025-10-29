import { z } from 'zod';

// Register form validation schema
export const registerSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  country_code: z.string().min(1, 'Country code is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  country: z.string().min(1, 'Country is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(8, 'Password must be at least 8 characters'),
  referral_code: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Type exports
export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type VerifyOtpFormData = z.infer<typeof verifyOtpSchema>;
export type ResendOtpFormData = z.infer<typeof resendOtpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;