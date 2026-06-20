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
import { Key, ArrowLeft, CheckCircle } from 'lucide-react';
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

  if (isSuccess) {
    return (
      <ProtectedRoute requireAuth={false}>
        <AuthLayout>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-green-500/15">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Password Reset Successful!
            </h1>
            <p className="text-muted-foreground text-lg">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="
                  inline-flex items-center gap-2
                  px-6 py-2.5 rounded-lg text-sm font-semibold
                  bg-primary text-primary-foreground
                  hover:bg-primary/90
                  transition-all
                  shadow-lg shadow-primary/20
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
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        {/* Card with primary border accent */}
        <div className="rounded-xl border border-primary/20 bg-card overflow-hidden shadow-2xl shadow-primary/5">
          {/* Primary top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="px-8 pt-7 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="text-foreground font-semibold text-lg">Reset Password</h3>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Please enter your new password
            </p>
          </div>

          <div className="px-8 pb-8 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/70 text-sm">New Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter your new password"
                          autoComplete="new-password"
                          {...field}
                           inputClassName="
                                w-full bg-input border border-primary/20 rounded-lg
                                text-foreground placeholder:text-muted-foreground/50 text-sm
                                px-4 py-2.5 outline-none
                                focus:border-primary/50 focus:ring-1 focus:ring-primary/15
                                transition-all
                              "
                            />
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/70 text-sm">Confirm New Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Confirm your new password"
                          autoComplete="new-password"
                          {...field}
                           inputClassName="
                                w-full bg-input border border-primary/20 rounded-lg
                                text-foreground placeholder:text-muted-foreground/50 text-sm
                                px-4 py-2.5 outline-none
                                focus:border-primary/50 focus:ring-1 focus:ring-primary/15
                                transition-all
                              "
                            />
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    w-full py-3 rounded-lg text-sm font-bold tracking-wide
                    bg-primary text-primary-foreground
                    hover:bg-primary/90
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                    shadow-lg shadow-primary/20
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
          </div>

          {/* Primary bottom bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}