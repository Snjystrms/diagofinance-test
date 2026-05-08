'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  forgotPasswordSchema,
  type LoginFormData,
  type ForgotPasswordFormData,
} from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/password-input';
import { admin2FAApi, authApi, manager2FAApi, type GroupedPermissions } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProtectedRoute } from '@/components/protected-route';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function LoginClient() {
  const { loginMutation, forgotPasswordMutation } = useAuthMutations();
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingLoginData, setPendingLoginData] = useState<{ 
    email: string; 
    password: string; 
    adminId?: string | number;
    managerId?: string | number;
    userId?: string | number;
    userType?: 'admin' | 'user' | 'manager';
  } | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);


  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await loginMutation.mutateAsync(data);
      
      // Check if 2FA is required (for both admin and user)
      if (response?.requires_2fa || response?.data?.requires_2fa) {
        const responseData = response.data || {};
        const nestedData = (responseData as Record<string, unknown>)?.data || responseData;
        const nestedDataObj = nestedData as Record<string, unknown>;
        const userType = (nestedDataObj?.type as string | undefined) || 
          ((nestedDataObj?.user as Record<string, unknown>)?.type as string | undefined) || 
          ((nestedDataObj?.admin as Record<string, unknown>)?.type as string | undefined) || 
          ((nestedDataObj?.manager as Record<string, unknown>)?.type as string | undefined) || 'user';
        
        // Extract ID based on user type - check for specific ID fields first
        let userId: string | number | undefined;
        if (userType === 'admin') {
          userId = (nestedDataObj?.admin_id as string | number | undefined) || 
            ((nestedDataObj?.admin as Record<string, unknown>)?.id as string | number | undefined) || 
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        } else if (userType === 'manager') {
          userId = (nestedDataObj?.manager_id as string | number | undefined) || 
            ((nestedDataObj?.manager as Record<string, unknown>)?.id as string | number | undefined) || 
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        } else {
          userId = (nestedDataObj?.user_id as string | number | undefined) || 
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        }

        if (userId) {
          setPendingLoginData({
            email: data.email,
            password: data.password,
            ...(userType === 'admin' ? { adminId: userId } : userType === 'manager' ? { managerId: userId } : { userId: userId }),
            userType: userType as 'admin' | 'user' | 'manager',
          });
          setShow2FA(true);
          toast.success('Please enter your 2FA code to complete login');
        }
      }
    } catch (_error) {
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerification = async () => {
    if (!pendingLoginData || !twoFACode || twoFACode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying2FA(true);
    try {
      let response;
      
      // Use appropriate API based on user type
      if (pendingLoginData.userType === 'admin' && pendingLoginData.adminId) {
        response = await admin2FAApi.verifyLogin2FA({
          admin_id: pendingLoginData.adminId,
          verify_otp: twoFACode,
        });
      } else if (pendingLoginData.userType === 'manager' && pendingLoginData.managerId) {
        response = await manager2FAApi.verifyLogin2FA({
          manager_id: pendingLoginData.managerId,
          verify_otp: twoFACode,
        });
      } else if (pendingLoginData.userType === 'user' && pendingLoginData.userId) {
        response = await authApi.verifyLogin2FA({
          user_id: pendingLoginData.userId,
          verify_otp: twoFACode,
        });
      } else {
        throw new Error('Invalid login data');
      }

      if (response.success && response.data) {
        // Handle response structure - it might be in response.data or response.data.data
        const loginResponse = response.data as Record<string, unknown>;
        const responseData = (loginResponse.data as Record<string, unknown>) || loginResponse;
        const token = (responseData.token as string) || (loginResponse.token as string);
        // Check for admin, manager, or user object in response
        const userData = (responseData.admin as Record<string, unknown>) || 
          (responseData.manager as Record<string, unknown>) || 
          (responseData.user as Record<string, unknown>) || 
          (loginResponse.user as Record<string, unknown>) || 
          (loginResponse.admin as Record<string, unknown>) || 
          (loginResponse.manager as Record<string, unknown>);

        if (token && userData) {
          const userType = (userData.type as string) || pendingLoginData.userType || 'user';
          // Permissions are on the LoginResponse, not on the nested data object
          const finalUserData = {
            id: (userData.id as string | number),
            email: (userData.email as string) || pendingLoginData.email,
            type: userType as 'admin' | 'user' | 'manager' | 'subadmin',
            name: (userData.name as string) || '',
            mobile: (userData.mobile as string) || undefined,
            // Convert status to boolean if it's a number
            status: typeof userData.status === 'number' ? Boolean(userData.status) : (userData.status as boolean | undefined),
            requires_usdt_transaction: userData.requires_usdt_transaction as boolean | undefined,
            requires_registration_fee: userData.requires_registration_fee as boolean | undefined,
            is_account_active: userData.is_account_active as boolean | undefined,
            sponsor_id: (userData.sponsor_id as string) || undefined,
            role: (userData.role as string) || undefined,
            managerPermissions: (loginResponse.permissions as GroupedPermissions[] | undefined) || (userType === 'manager' ? [] : undefined),
            is_ib_user: typeof userData.is_ib_user === 'number' ? Boolean(userData.is_ib_user) : (userData.is_ib_user as boolean | undefined),
            // Exclude permissions as it's a different type structure
          };

          login(finalUserData, token);
          toast.success(response.message || 'Login successful!');
          
          // Check profile completion for regular users only
          if (userType === 'user' && !userData.requires_registration_fee) {
            try {
              const profileResponse = await authApi.getProfileView(token);
              if (profileResponse.success && profileResponse.data) {
                const verificationStatus = profileResponse.data.verification_status;
                const incomplete: Array<{ key: "personal_information" | "legal_information" | "documents_verification"; title: string; message: string; route: string }> = [];
                
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
                
                if (incomplete.length > 0) {
                  sessionStorage.setItem('incomplete_profile_sections', JSON.stringify(incomplete));
                }
              }
            } catch (error) {
              console.error('Failed to check profile completion:', error);
            }
          }
          
          if (userData.requires_registration_fee) {
            router.push('/test-registration-fee');
          } else {
            router.push('/dashboard');
          }
        } else {
          toast.error('Invalid response from server');
        }
      } else {
        toast.error(response.message || '2FA verification failed');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '2FA verification failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsForgotPasswordLoading(true);

    try {
      await forgotPasswordMutation.mutateAsync(data);
      // mutation shows toast
    } catch (_error) {
      toast.error('Failed to send reset password link. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex bg-background">
        {/* Left side - Background / Brand side */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Login background"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Right side content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                {showForgotPassword
                  ? 'Reset your password'
                  : 'Sign in to your account'}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {showForgotPassword
                  ? 'Enter your email to receive a password reset link'
                  : (
                    <>
                      Don&apos;t have an account?{' '}
                      <Link
                        href="/register"
                        className="font-medium text-primary hover:text-primary/80"
                      >
                        Sign up
                      </Link>
                    </>
                  )}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {show2FA 
                    ? 'Two-Factor Authentication' 
                    : showForgotPassword 
                      ? 'Forgot Password' 
                      : 'Login'}
                </CardTitle>
                <CardDescription>
                  {show2FA
                    ? 'Enter the 6-digit code from your authenticator app'
                    : showForgotPassword
                      ? 'Enter your email to receive a password reset link'
                      : 'Enter your credentials to access your account'}
                </CardDescription>
              </CardHeader>
            <CardContent>
  {show2FA ? (
    <div key="2fa-form" className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Enter the 6-digit code from your authenticator app
        </p>
        
        <div className="flex justify-center">
          <div className="w-48">
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="text-center text-lg tracking-widest"
              autoFocus
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            setShow2FA(false);
            setTwoFACode('');
            setPendingLoginData(null);
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handle2FAVerification}
          disabled={isVerifying2FA || twoFACode.length !== 6}
        >
          {isVerifying2FA ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Verifying...
            </>
          ) : (
            'Verify & Login'
          )}
        </Button>
      </div>
    </div>
  ) : showForgotPassword ? (
    <div key="forgot-form">
      <Form {...forgotPasswordForm}>
        <form
          onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
          className="space-y-4"
        >
          <FormField
            control={forgotPasswordForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isForgotPasswordLoading}
          >
            {isForgotPasswordLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Sending Reset Link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="text-primary hover:text-primary/80"
            >
              Back to Login
            </Button>
          </div>
        </form>
      </Form>
    </div>
  ) : (
    <div key="login-form">
      <Form {...loginForm}>
        <form
          onSubmit={loginForm.handleSubmit(onLoginSubmit)}
          className="space-y-4"
        >
          <FormField
            control={loginForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={loginForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    onChange={(e) => {
                      field.onChange(e);
                    }}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <Button
              variant="link"
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:text-primary/80 p-0"
            >
              Forgot your password?
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )}
</CardContent>

            </Card>
          </div>
        </div>
      </div>
      
    </ProtectedRoute>
  );
}
