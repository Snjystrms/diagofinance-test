'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ProtectedRoute } from '@/components/protected-route';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { PasswordInput } from '@/components/password-input';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';

export function ResetPasswordTokenClient() {
  const router = useRouter();
  const params = useParams();
  const { resetPasswordMutation } = useAuthMutations();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const token = params?.token as string | undefined;

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      password: '',
      confirm_password: '',
    },
  });

  useEffect(() => {
    if (token) {
      form.setValue('token', token);
    }
  }, [token, form]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await resetPasswordMutation.mutateAsync(data);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error) {
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const primaryButtonGradient: React.CSSProperties = {
    background:
      'linear-gradient(0deg, #C50435, #C50435), linear-gradient(180deg, #EC0808 -78.33%, #500101 265%)',
  };

  if (isSuccess) {
    return (
      <ProtectedRoute requireAuth={false}>
        <AuthLayout>
          <div className="w-full max-w-md mx-auto text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-green-500/15">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              Password Reset Successful!
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                style={primaryButtonGradient}
                className="
                  inline-flex items-center gap-2
                  px-6 py-2.5 rounded-md font-sans font-bold text-[14px] leading-[150%] tracking-[-3%]
                  text-white
                  hover:opacity-90
                  transition-all
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              Reset your password
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <PasswordInput
                            placeholder="Enter your new password"
                            autoComplete="new-password"
                            {...field}
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

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <PasswordInput
                            placeholder="Confirm your new password"
                            autoComplete="new-password"
                            {...field}
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

                <button
                  type="submit"
                  disabled={isLoading}
                  style={primaryButtonGradient}
                  className="
                    w-full py-3.5 rounded-md font-sans font-normal text-[14px] leading-[150%] tracking-[-3%]
                    text-white
                    hover:opacity-90
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                  "
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="border-primary-foreground/40" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            </Form>

            <p className="mt-8 text-center font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 font-normal text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}