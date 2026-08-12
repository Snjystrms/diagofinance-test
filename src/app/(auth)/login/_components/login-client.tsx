'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import {
  loginSchema,
  forgotPasswordSchema,
  type LoginFormData,
  type ForgotPasswordFormData,
} from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { useAuth } from '@/contexts/auth-context';
import { PasswordInput } from '@/components/password-input';
import { Input } from '@/components/ui/input';
import { admin2FAApi, authApi, manager2FAApi, type GroupedPermissions } from '@/lib/api';
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
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';

export function LoginClient() {
  const { loginMutation, forgotPasswordMutation } = useAuthMutations();
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    defaultValues: { email: '', password: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // `rememberMe` is currently a client-side preference only. Wire it into
      // `loginMutation`/your auth API if the backend supports persistent sessions.
      const response = await loginMutation.mutateAsync(data);
      if (response?.requires_2fa || response?.data?.requires_2fa) {
        const responseData = response.data || {};
        const nestedData = (responseData as Record<string, unknown>)?.data || responseData;
        const nestedDataObj = nestedData as Record<string, unknown>;
        const userType =
          (nestedDataObj?.type as string | undefined) ||
          ((nestedDataObj?.user as Record<string, unknown>)?.type as string | undefined) ||
          ((nestedDataObj?.admin as Record<string, unknown>)?.type as string | undefined) ||
          ((nestedDataObj?.manager as Record<string, unknown>)?.type as string | undefined) ||
          'user';

        let userId: string | number | undefined;
        if (userType === 'admin') {
          userId =
            (nestedDataObj?.admin_id as string | number | undefined) ||
            ((nestedDataObj?.admin as Record<string, unknown>)?.id as string | number | undefined) ||
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        } else if (userType === 'manager') {
          userId =
            (nestedDataObj?.manager_id as string | number | undefined) ||
            ((nestedDataObj?.manager as Record<string, unknown>)?.id as string | number | undefined) ||
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        } else {
          userId =
            (nestedDataObj?.user_id as string | number | undefined) ||
            ((nestedDataObj?.user as Record<string, unknown>)?.id as string | number | undefined);
        }

        if (userId) {
          setPendingLoginData({
            email: data.email,
            password: data.password,
            ...(userType === 'admin'
              ? { adminId: userId }
              : userType === 'manager'
              ? { managerId: userId }
              : { userId }),
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
        const loginResponse = response.data as Record<string, unknown>;
        const responseData = (loginResponse.data as Record<string, unknown>) || loginResponse;
        const token = (responseData.token as string) || (loginResponse.token as string);
        const userData =
          (responseData.admin as Record<string, unknown>) ||
          (responseData.manager as Record<string, unknown>) ||
          (responseData.user as Record<string, unknown>) ||
          (loginResponse.user as Record<string, unknown>) ||
          (loginResponse.admin as Record<string, unknown>) ||
          (loginResponse.manager as Record<string, unknown>);

        if (token && userData) {
          const userType = (userData.type as string) || pendingLoginData.userType || 'user';
          const finalUserData = {
            id: userData.id as string | number,
            email: (userData.email as string) || pendingLoginData.email,
            type: userType as 'admin' | 'user' | 'manager' | 'subadmin',
            name: (userData.name as string) || '',
            mobile: (userData.mobile as string) || undefined,
            status:
              typeof userData.status === 'number'
                ? Boolean(userData.status)
                : (userData.status as boolean | undefined),
            requires_usdt_transaction: userData.requires_usdt_transaction as boolean | undefined,
            sponsor_id: (userData.sponsor_id as string) || undefined,
            role: (userData.role as string) || undefined,
            managerPermissions:
              (loginResponse.permissions as GroupedPermissions[] | undefined) ||
              (userType === 'manager' ? [] : undefined),
            is_ib_user:
              typeof userData.is_ib_user === 'number'
                ? Boolean(userData.is_ib_user)
                : (userData.is_ib_user as boolean | undefined),
          };

          login(finalUserData, token);
          toast.success(response.message || 'Login successful!');

          if (userType === 'user') {
            try {
              const profileResponse = await authApi.getProfileView(token);
              if (profileResponse.success && profileResponse.data) {
                const verificationStatus = profileResponse.data.verification_status;
                const incomplete: Array<{
                  key: 'personal_information' | 'legal_information' | 'documents_verification';
                  title: string;
                  message: string;
                  route: string;
                }> = [];
                if (verificationStatus.personal_information.status !== 'completed') {
                  incomplete.push({
                    key: 'personal_information',
                    title: 'Personal Information',
                    message:
                      verificationStatus.personal_information.message ||
                      'Please complete your personal information to continue.',
                    route: '/profile/view_profile#personal',
                  });
                }
                if (verificationStatus.legal_information.status !== 'completed') {
                  incomplete.push({
                    key: 'legal_information',
                    title: 'Legal Information',
                    message:
                      verificationStatus.legal_information.message ||
                      'Please complete your legal information to continue.',
                    route: '/profile/view_profile#account',
                  });
                }
                if (verificationStatus.documents_verification.status !== 'completed') {
                  incomplete.push({
                    key: 'documents_verification',
                    title: 'Documents Verification',
                    message:
                      verificationStatus.documents_verification.message ||
                      'Please upload and verify your KYC documents to continue.',
                    route: '/profile/kyc-verification',
                  });
                }
                if (incomplete.length > 0) {
                  sessionStorage.setItem(
                    'incomplete_profile_sections',
                    JSON.stringify(incomplete)
                  );
                }
              }
            } catch (error) {
              console.error('Failed to check profile completion:', error);
            }
          }

          router.push('/dashboard');
        } else {
          toast.error('Invalid response from server');
        }
      } else {
        toast.error(response.message || '2FA verification failed');
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : '2FA verification failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsForgotPasswordLoading(true);
    try {
      await forgotPasswordMutation.mutateAsync(data);
    } catch (_error) {
      toast.error('Failed to send reset password link. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const heading = show2FA
    ? 'Two-factor authentication'
    : showForgotPassword
    ? 'Forgot your password?'
    : 'Welcome Back';
  const subheading = show2FA
    ? 'Enter the 6-digit code from your authenticator app'
    : showForgotPassword
    ? 'Enter your email to receive a password reset link'
    : 'Enter your email and password to access your account.';

  const primaryButtonGradient: React.CSSProperties = {
    background:
      'linear-gradient(0deg, #C50435, #C50435), linear-gradient(180deg, #EC0808 -78.33%, #500101 265%)',
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              {heading}
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              {subheading}
            </p>
          </div>

{/* ── 2FA ── */}
          {show2FA ? (
            <div key="2fa-form" className="space-y-6">
              <div className="flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isVerifying2FA && twoFACode.length === 6) {
                      handle2FAVerification();
                    }
                  }}
                  placeholder="123456"
                  autoFocus
                  className="
                    w-48 text-center text-2xl tracking-[0.4em] font-bold
                    font-sans font-bold text-[24px] leading-[150%] tracking-[-3%]
                    bg-input border border-border rounded-md
                    text-foreground placeholder:text-muted-foreground/50
                    px-4 py-3.5 outline-none
                    focus:border-primary/60 focus:ring-1 focus:ring-primary/20
                    transition-all
                  "
                />
              </div>
              <div className="flex justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFACode('');
                    setPendingLoginData(null);
                  }}
                  className="
                    px-5 py-2.5 rounded-md font-sans font-medium text-[14px] leading-[150%] tracking-[-3%]
                    border border-border text-muted-foreground
                    hover:border-border hover:text-foreground
                    transition-all
                  "
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handle2FAVerification}
                  disabled={isVerifying2FA || twoFACode.length !== 6}
                  style={primaryButtonGradient}
                  className="
                    px-5 py-2.5 rounded-md font-sans font-semibold text-[14px] leading-[150%] tracking-[-3%]
                    text-white
                    hover:opacity-90
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center gap-2
                  "
                >
                  {isVerifying2FA ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & login
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

/* ── Forgot password ── */
          ) : showForgotPassword ? (
            <div key="forgot-form" className="space-y-6">
              <Form {...forgotPasswordForm}>
                <form
                  onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={forgotPasswordForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground">Email</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <input
                              type="email"
                              placeholder="Enter your email"
                              autoFocus
                              {...field}
                              className="
                                w-full bg-transparent
                                font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60
                                pr-4 py-2.5 outline-none
                              "
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                  <button
                    type="submit"
                    disabled={isForgotPasswordLoading}
                    style={primaryButtonGradient}
                    className="
                      w-full py-3.5 rounded-md font-sans font-bold text-[14px] leading-[150%] tracking-[-3%]
                      text-white
                      hover:opacity-90
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all flex items-center justify-center gap-2 cursor-pointer
                    "
                  >
                    {isForgotPasswordLoading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Sending reset link...
                      </>
                    ) : (
                      'Send reset link'
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="font-sans font-medium text-[14px] leading-[150%] tracking-[-3%] text-primary hover:text-primary/80 transition-colors"
                    >
                      ← Back to login
                    </button>
                  </div>
                </form>
              </Form>
            </div>

          /* ── Login form ── */
          ) : (
            <div key="login-form">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground">Email</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <Input
                              type="email"
                              placeholder="akash25@gmail.com"
                              {...field}
                              className="
                                w-full !bg-transparent border-0
                                font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60
                                !pl-0 pr-4 py-2.5 outline-none focus-visible:ring-0
                              "
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground">Password</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <PasswordInput
                              placeholder="••••••••••"
                              autoComplete="current-password"
                              onChange={field.onChange}
                              value={field.value}
                              className="flex-1 min-w-0"
                              inputClassName="
                                w-full !bg-transparent border-0
                                font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60
                                !pl-0 pr-11 py-2.5 outline-none
                              "
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                      />
                      Remember me
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground hover:text-primary/80 transition-colors underline underline-offset-2 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={primaryButtonGradient}
                    className="
                      w-full py-3.5 rounded-md font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] tracking-wide
                      text-white
                      hover:opacity-90
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all flex items-center justify-center gap-2 cursor-pointer
                    "
                  >
                    {isLoading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </form>
              </Form>

              <p className="mt-8 text-center font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-normal text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Create Now
                </Link>
              </p>
            </div>
          )}
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}