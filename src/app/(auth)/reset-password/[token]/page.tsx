'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ProtectedRoute } from '@/components/protected-route';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import Image from 'next/image';
import { Key, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: PageProps) {
  const router = useRouter();
  const { resetPasswordMutation } = useAuthMutations();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: params.token,
      password: '',
      confirm_password: '',
    },
  });

  // Set the token from URL params
  useEffect(() => {
    if (params.token) {
      form.setValue('token', params.token);
    }
  }, [params.token, form]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await resetPasswordMutation.mutateAsync(data);
      setIsSuccess(true);
      // Redirect to login after 3 seconds
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
        <div className="min-h-screen flex">
          <div className="hidden lg:flex lg:w-2/5 relative bg-background">
            <Image
              src="/loginbackground.png"
              alt="Reset password background"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <Key className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Password Reset Successful!
                </h1>
                <p className="text-muted-foreground text-lg">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Reset password background"
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                Reset your password
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Please enter your new password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your new password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm your new password"
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
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Resetting Password...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}