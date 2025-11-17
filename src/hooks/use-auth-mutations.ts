'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi, RegisterRequest, LoginRequest, VerifyOtpRequest, ResendOtpRequest, ForgotPasswordRequest, ResetPasswordRequest, type ProfileViewResponse } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

// Helper function to check incomplete profile sections
function checkIncompleteSections(profileData: ProfileViewResponse): Array<{
  key: "personal_information" | "legal_information" | "documents_verification";
  title: string;
  message: string;
  route: string;
}> {
  const incomplete: Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }> = [];

  const verificationStatus = profileData.verification_status;

  if (verificationStatus.personal_information.status !== "completed") {
    incomplete.push({
      key: "personal_information",
      title: "Personal Information",
      message: verificationStatus.personal_information.message || "Please complete your personal information to continue.",
      route: "/profile/view_profile#personal",
    });
  }

  if (verificationStatus.legal_information.status !== "completed") {
    incomplete.push({
      key: "legal_information",
      title: "Legal Information",
      message: verificationStatus.legal_information.message || "Please complete your legal information to continue.",
      route: "/profile/view_profile#account",
    });
  }

  if (verificationStatus.documents_verification.status !== "completed") {
    incomplete.push({
      key: "documents_verification",
      title: "Documents Verification",
      message: verificationStatus.documents_verification.message || "Please upload and verify your KYC documents to continue.",
      route: "/profile/kyc-verification",
    });
  }

  return incomplete;
}

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
    onSuccess: async (response, variables) => {
      // Check if 2FA is required (for both admin and user) - don't proceed with login
      if (response.requires_2fa || response.data?.requires_2fa) {
        // Don't login yet, let the login page handle 2FA verification
        return;
      }

      if (response.data) {
        // Extract user data and ensure type is properly set
        const userType = response.data.user?.type || 'user';
        const rawUserData = response.data.user;
        
        // Ensure required fields are present before login
        if (response.data.token && rawUserData?.id && rawUserData?.email) {
          const userData = {
            id: rawUserData.id,
            email: rawUserData.email,
            type: userType,
            name: rawUserData.name,
            mobile: rawUserData.mobile,
            status: typeof rawUserData.status === 'number' ? Boolean(rawUserData.status) : rawUserData.status,
            requires_usdt_transaction: rawUserData.requires_usdt_transaction,
            requires_registration_fee: rawUserData.requires_registration_fee,
            is_account_active: rawUserData.is_account_active,
            sponsor_id: rawUserData.sponsor_id,
            role: rawUserData.role,
            managerPermissions: response.data.permissions ?? (userType === 'manager' ? [] : undefined),
          };
          
          login(userData, response.data.token);
          
          // Show appropriate message based on response status
          if (response.status === 'no_usdt_transaction') {
            toast.success('Login successful but USDT transaction required');
            // You might want to redirect to a USDT transaction page here
          } else {
            toast.success(response.message || 'Login successful!');
          }
          
          // Check profile completion for regular users only
          let hasIncompleteSections = false;
          if (userType === 'user' && !response.data.user?.requires_registration_fee) {
            try {
              const profileResponse = await authApi.getProfileView(response.data.token);
              if (profileResponse.success && profileResponse.data) {
                const incompleteSections = checkIncompleteSections(profileResponse.data);
                if (incompleteSections.length > 0) {
                  hasIncompleteSections = true;
                  // Store incomplete sections in sessionStorage to be picked up by the login page or dashboard
                  sessionStorage.setItem('incomplete_profile_sections', JSON.stringify(incompleteSections));
                }
              }
            } catch (error) {
              // Silently fail - don't block login if profile check fails
              console.error('Failed to check profile completion:', error);
            }
          }
          
          if(response.data.user?.requires_registration_fee){
            router.push('/test-registration-fee');
          }else{
            router.push('/dashboard');
          }
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