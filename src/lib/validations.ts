import { z } from 'zod';

// Register form validation schema
export const registerSchema = z.object({
  sponsor_id: z.string().min(1, 'Sponsor ID is required'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  country: z.string().min(1, 'Country is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  transaction_password: z.string().min(6, 'Transaction password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_transaction_password: z.string().min(6, 'Transaction password must be at least 6 characters'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
}).refine((data) => data.transaction_password === data.confirm_transaction_password, {
  message: "Transaction passwords don't match",
  path: ["confirm_transaction_password"],
});

// Login form validation schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Verify OTP form validation schema
export const verifyOtpSchema = z.object({
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