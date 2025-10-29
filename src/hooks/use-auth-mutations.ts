'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi, RegisterRequest, LoginRequest, VerifyOtpRequest, ResendOtpRequest, ForgotPasswordRequest, ResetPasswordRequest } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export const useAuthMutations = () => {
  const router = useRouter();
  const { login } = useAuth();

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (response, variables) => {
      toast.success(response.message || 'Registration successful! Please check your email.');
      router.push(`/check-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed. Please try again.');
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: (data: VerifyOtpRequest) => authApi.verifyOtp(data),
    onSuccess: (response) => {
      toast.success(response.message || 'OTP verified successfully!');
      router.push('/login');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'OTP verification failed. Please try again.');
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (response) => {
      if (response.data) {
        // Extract user data and ensure type is properly set
        const userData = {
          ...response.data.user,
          type: response.data.user.type || 'user', // Default to 'user' if type is not specified
        };
        
        login(userData, response.data.token);
        
        // Show appropriate message based on response status
        if (response.status === 'no_usdt_transaction') {
          toast.success('Login successful but USDT transaction required');
          // You might want to redirect to a USDT transaction page here
        } else {
          toast.success(response.message || 'Login successful!');
        }
        if(response.data.user.requires_registration_fee){
          router.push('/test-registration-fee');
        }else{
          router.push('/dashboard');
        }
      
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    },
  });

  // Resend OTP mutation
  const resendOtpMutation = useMutation({
    mutationFn: (data: ResendOtpRequest) => authApi.resendOtp(data),
    onSuccess: (response) => {
      toast.success(response.message || 'OTP resent successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resend OTP. Please try again.');
    },
  });

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordRequest) => authApi.forgotPassword(data),
    onSuccess: (response) => {
      toast.success(response.message || 'Password reset instructions sent to your email!');
      // Stay on the same page so user can see the success message
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send reset instructions. Please try again.');
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: (response) => {
      toast.success(response.message || 'Password reset successfully!');
      // Redirect to login page
      router.push('/login');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Password reset failed. Please try again.');
    },
  });

  return {
    registerMutation,
    verifyOtpMutation,
    loginMutation,
    resendOtpMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
};