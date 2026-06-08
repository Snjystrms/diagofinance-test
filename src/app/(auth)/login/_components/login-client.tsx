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
import { PasswordInput } from '@/components/password-input';
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
            requires_registration_fee: userData.requires_registration_fee as boolean | undefined,
            is_account_active: userData.is_account_active as boolean | undefined,
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

          if (userType === 'user' && !userData.requires_registration_fee) {
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

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {showForgotPassword ? 'Reset your password' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-white/40">
            {showForgotPassword ? (
              'Enter your email to receive a password reset link'
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-[#FFB800] hover:text-[#FFB800]/80 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </p>
        </div>

        {/* Card with gold border accent */}
        <div
          className="rounded-xl border border-[#FFB800]/20 bg-[#0f0f0f] overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,184,0,0.08), 0 24px 60px rgba(0,0,0,0.6)' }}
        >
          {/* Gold top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/60 to-transparent" />

          <div className="px-8 pt-7 pb-2">
            <h3 className="text-white font-semibold text-lg">
              {show2FA
                ? 'Two-Factor Authentication'
                : showForgotPassword
                ? 'Forgot Password'
                : 'Login'}
            </h3>
            <p className="text-white/40 text-sm mt-0.5">
              {show2FA
                ? 'Enter the 6-digit code from your authenticator app'
                : showForgotPassword
                ? 'Enter your email to receive a password reset link'
                : 'Enter your credentials to access your account'}
            </p>
          </div>

          <div className="px-8 pb-8 pt-4">

            {/* ── 2FA ── */}
            {show2FA ? (
              <div key="2fa-form" className="space-y-5">
                <p className="text-sm text-white/40 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    className="
                      w-48 text-center text-2xl tracking-[0.4em] font-bold
                      bg-[#1a1a1a] border border-[#FFB800]/25 rounded-lg
                      text-white placeholder:text-white/20
                      px-4 py-3 outline-none
                      focus:border-[#FFB800]/60 focus:ring-1 focus:ring-[#FFB800]/20
                      transition-all
                    "
                  />
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShow2FA(false);
                      setTwoFACode('');
                      setPendingLoginData(null);
                    }}
                    className="
                      px-5 py-2.5 rounded-lg text-sm font-medium
                      border border-white/10 text-white/60
                      hover:border-white/20 hover:text-white/90
                      transition-all
                    "
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handle2FAVerification}
                    disabled={isVerifying2FA || twoFACode.length !== 6}
                    className="
                      px-5 py-2.5 rounded-lg text-sm font-semibold
                      bg-[#FFB800] text-black
                      hover:bg-[#FFB800]/90
                      disabled:opacity-40 disabled:cursor-not-allowed
                      transition-all flex items-center gap-2
                    "
                  >
                    {isVerifying2FA ? (
                      <>
                        <Spinner size="sm" className="border-black/40" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Login'
                    )}
                  </button>
                </div>
              </div>

            /* ── Forgot password ── */
            ) : showForgotPassword ? (
              <div key="forgot-form" className="space-y-5">
                <div className="space-y-1.5">
                  {/* <label className="text-sm font-medium text-white/70">Email</label> */}
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
                            <FormLabel className="text-white/70">Email</FormLabel>
                            <FormControl>
                              <input
                                type="email"
                                placeholder="Enter your email"
                                autoFocus
                                {...field}
                                className="
                                  w-full bg-[#1a1a1a] border border-[#FFB800]/20 rounded-lg
                                  text-white placeholder:text-white/20 text-sm
                                  px-4 py-2.5 outline-none
                                  focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15
                                  transition-all
                                "
                              />
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />
                      <button
                        type="submit"
                        disabled={isForgotPasswordLoading}
                        className="
                          w-full py-2.5 rounded-lg text-sm font-semibold
                          bg-[#FFB800] text-black
                          hover:bg-[#FFB800]/90
                          disabled:opacity-40 disabled:cursor-not-allowed
                          transition-all flex items-center justify-center gap-2
                        "
                      >
                        {isForgotPasswordLoading ? (
                          <>
                            <Spinner size="sm" className="border-black/40" />
                            Sending Reset Link...
                          </>
                        ) : (
                          'Send Reset Link'
                        )}
                      </button>
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(false)}
                          className="text-sm text-[#FFB800]/70 hover:text-[#FFB800] transition-colors"
                        >
                          ← Back to Login
                        </button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>

            /* ── Login form ── */
            ) : (
              <div key="login-form">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white/70 text-sm">Email</FormLabel>
                          <FormControl>
                            <input
                              type="email"
                              placeholder="Enter your email"
                              {...field}
                              className="
                                w-full bg-[#1a1a1a] border border-[#FFB800]/20 rounded-lg
                                text-white placeholder:text-white/20 text-sm
                                px-4 py-2.5 outline-none
                                focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15
                                transition-all
                              "
                            />
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
                          <FormLabel className="text-white/70 text-sm">Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              onChange={field.onChange}
                              value={field.value}
                              inputClassName="
                                w-full bg-[#1a1a1a] border border-[#FFB800]/20 rounded-lg
                                text-white placeholder:text-white/20 text-sm
                                px-4 py-2.5 outline-none
                                focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15
                                transition-all
                              "
                            />
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-[#FFB800]/60 hover:text-[#FFB800] transition-colors"
                      >
                        Forgot your password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="
                        w-full py-3 rounded-lg text-sm font-bold tracking-wide
                        bg-[#FFB800] text-black
                        hover:bg-[#FFB800]/90
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all flex items-center justify-center gap-2
                        shadow-[0_0_20px_rgba(255,184,0,0.2)]
                      "
                    >
                      {isLoading ? (
                        <>
                          <Spinner size="sm" className="border-black/40" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </form>
                </Form>
              </div>
            )}
          </div>

          {/* Gold bottom bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/30 to-transparent" />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}