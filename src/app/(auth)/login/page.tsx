'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  password: 'password123'
};

// Demo user data
const DUMMY_USER = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  type: 'admin' as const,
  role: 'admin'
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
  sponsor_id: 'SPONSOR_123'
};

export default function LoginPage() {
  const { loginMutation } = useAuthMutations();
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [useDemoLogin, setUseDemoLogin] = useState(true);
  const [demoUserType, setDemoUserType] = useState<'admin' | 'user'>('admin');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      if (useDemoLogin) {
        // Demo login implementation
        if (data.email === DUMMY_CREDENTIALS.email && data.password === DUMMY_CREDENTIALS.password) {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Login with dummy data based on selected user type
          const demoUser = demoUserType === 'admin' ? DUMMY_USER : DUMMY_REGULAR_USER;
          login(demoUser, 'dummy-token-12345');
          toast.success(`Login successful as ${demoUserType}! (Demo mode)`);
          router.push('/dashboard');
        } else {
          toast.error('Invalid demo credentials. Use admin@example.com / password123');
        }
      } else {
        // Real API login
        const response = await loginMutation.mutateAsync(data);
        // The loginMutation will handle success/error and navigation
      }
    } catch (error) {
      if (!useDemoLogin) {
        toast.error('Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex">
        {/* Left side - Background Image */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Login background"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                Sign in to your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:text-primary/80">
                  Sign up
                </Link>
              </p>
              
              {/* Demo/API Login Toggle */}
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
              
              {/* Demo user type selector */}
              {/* {useDemoLogin && (
                <div className="mt-4 flex items-center justify-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="demo-admin"
                      name="demo-user-type"
                      value="admin"
                      checked={demoUserType === 'admin'}
                      onChange={(e) => setDemoUserType(e.target.value as 'admin' | 'user')}
                      className="text-primary"
                    />
                    <Label htmlFor="demo-admin" className="text-sm">Admin</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="demo-user"
                      name="demo-user-type"
                      value="user"
                      checked={demoUserType === 'user'}
                      onChange={(e) => setDemoUserType(e.target.value as 'admin' | 'user')}
                      className="text-primary"
                    />
                    <Label htmlFor="demo-user" className="text-sm">User</Label>
                  </div>
                </div>
              )} */}
              
              {/* Demo login notice */}
              {useDemoLogin && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Demo Mode:</strong> Use <code>admin@example.com</code> / <code>password123</code>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Select user type to see different sidebar navigation
                  </p>
                </div>
              )}
              
              {/* API login notice */}
              {!useDemoLogin && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>API Mode:</strong> Connecting to real backend at <code>/auth/login</code>
                  </p>
                </div>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  {useDemoLogin 
                    ? 'Enter demo credentials to test the application'
                    : 'Enter your credentials to access your account'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder={useDemoLogin ? "admin@example.com" : "Enter your email"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder={useDemoLogin ? "password" : "Enter your password"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <Link
                        href="/forgot-password"
                        className="text-sm text-primary hover:text-primary/80"
                      >
                        Forgot your password?
                      </Link>
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 