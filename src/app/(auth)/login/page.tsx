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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Demo credentials for testing
const DUMMY_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'password123',
};

// Demo user data
const DUMMY_USER = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  type: 'admin' as const,
  role: 'admin',
};

// Demo user data for regular user
const DUMMY_REGULAR_USER = {
  id: '10',
  name: 'Regular User',
  email: 'user@example.com',
  type: 'user' as const,
  mobile: '1234567890',
  status: true,
  requires_usdt_transaction: false,
  is_account_active: true,
  sponsor_id: 'SPONSOR_123',
};

export default function LoginPage() {
  const { loginMutation, forgotPasswordMutation } = useAuthMutations();
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [useDemoLogin, setUseDemoLogin] = useState(false); // Changed default to false (API mode)
  const [demoUserType, setDemoUserType] = useState<'admin' | 'user'>('admin');

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
      if (useDemoLogin) {
        // Demo login implementation
        if (
          data.email === DUMMY_CREDENTIALS.email &&
          data.password === DUMMY_CREDENTIALS.password
        ) {
          // fake delay
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const demoUser =
            demoUserType === 'admin' ? DUMMY_USER : DUMMY_REGULAR_USER;
          login(demoUser, 'dummy-token-12345');
          toast.success(`Login successful as ${demoUserType}! (Demo mode)`);
          router.push('/dashboard');
        } else {
          toast.error(
            'Invalid demo credentials. Use admin@example.com / password123'
          );
        }
      } else {
        // Real API login
        await loginMutation.mutateAsync(data);
        // loginMutation handles success & redirect already
      }
    } catch (error) {
      if (!useDemoLogin) {
        toast.error('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsForgotPasswordLoading(true);

    try {
      await forgotPasswordMutation.mutateAsync(data);
      // mutation shows toast
    } catch (error) {
      toast.error('Failed to send reset password link. Please try again.');
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      {/* We enforce layering ourselves */}
      <div className="relative min-h-screen flex bg-background">
        {/* Left side background image */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background z-0">
          <Image
            src="/loginbackground.png"
            alt="Login background"
            fill
            className="object-cover pointer-events-none select-none"
            priority
          />
        </div>

        {/* Right side content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
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

              {/* Demo/API toggle only on login view */}
              {!showForgotPassword && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <Switch
                    id="demo-mode"
                    checked={useDemoLogin}
                    onCheckedChange={setUseDemoLogin}
                  />
                  <Label htmlFor="demo-mode" className="text-sm">
                    {useDemoLogin ? 'Demo Mode' : 'API Mode'}
                  </Label>
                </div>
              )}

              {/* Demo login notice */}
              {useDemoLogin && !showForgotPassword && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Demo Mode:</strong> Use{' '}
                    <code>admin@example.com</code> / <code>password123</code>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Select user type to see different sidebar navigation
                  </p>
                </div>
              )}

              {/* API login notice */}
              {!useDemoLogin && !showForgotPassword && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>API Mode:</strong> Connecting to real backend at{' '}
                    <code>/auth/login</code>
                  </p>
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {showForgotPassword ? 'Forgot Password' : 'Login'}
                </CardTitle>
                <CardDescription>
                  {showForgotPassword
                    ? 'Enter your email to receive a password reset link'
                    : useDemoLogin
                      ? 'Enter demo credentials to test the application'
                      : 'Enter your credentials to access your account'}
                </CardDescription>
              </CardHeader>
            <CardContent>
  {showForgotPassword ? (
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
                    placeholder={
                      useDemoLogin
                        ? 'admin@example.com'
                        : 'Enter your email'
                    }
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
                  <Input
                    type="password"
                    placeholder={
                      useDemoLogin
                        ? 'password123'
                        : 'Enter your password'
                    }
                    {...field}
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
                {useDemoLogin ? 'Signing in (Demo)...' : 'Signing in...'}
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
