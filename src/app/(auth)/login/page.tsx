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
import { admin2FAApi, authApi } from '@/lib/api';
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
import { ProfileCompletionDialog } from '@/components/profile-completion-dialog';
import { useEffect } from 'react';
import { Settings, Scale, FileText } from 'lucide-react';

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
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [pendingLoginData, setPendingLoginData] = useState<{ 
    email: string; 
    password: string; 
    adminId?: string | number;
    userId?: string | number;
    userType?: 'admin' | 'user';
  } | null>(null);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }>>([]);

  // Check for incomplete profile sections after navigation
  useEffect(() => {
    const checkIncompleteSections = () => {
      const stored = sessionStorage.getItem('incomplete_profile_sections');
      if (stored) {
        try {
          const sections = JSON.parse(stored);
          if (Array.isArray(sections) && sections.length > 0) {
            setIncompleteSections(sections);
            setShowProfileDialog(true);
            sessionStorage.removeItem('incomplete_profile_sections');
          }
        } catch (error) {
          console.error('Error parsing incomplete sections:', error);
        }
      }
    };

    // Check immediately and also after a short delay to catch navigation
    checkIncompleteSections();
    const timer = setTimeout(checkIncompleteSections, 500);
    
    return () => clearTimeout(timer);
  }, []);

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
        const response = await loginMutation.mutateAsync(data);
        
        // Check if 2FA is required (for both admin and user)
        if (response?.requires_2fa || response?.data?.requires_2fa) {
          const responseData = response.data || {};
          const userType = (responseData as any)?.type || responseData.user?.type || 'user';
          const userId = (responseData as any)?.user_id || responseData.user?.id;
          
          if (userId) {
            setPendingLoginData({
              email: data.email,
              password: data.password,
              ...(userType === 'admin' ? { adminId: userId } : { userId: userId }),
              userType: userType as 'admin' | 'user',
            });
            setShow2FA(true);
            toast.success('Please enter your 2FA code to complete login');
          }
        }
        // Otherwise loginMutation handles success & redirect
      }
    } catch (error) {
      if (!useDemoLogin) {
        toast.error('Login failed. Please check your credentials.');
      }
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
          token: twoFACode,
          email: pendingLoginData.email,
          password: pendingLoginData.password,
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
        const responseData = response.data.data || response.data;
        const token = responseData.token || response.data.token;
        const userData = responseData.user || response.data.user;

        if (token && userData) {
          const userType = userData.type || pendingLoginData.userType || 'user';
          const finalUserData = {
            id: userData.id,
            email: userData.email || pendingLoginData.email,
            type: userType,
            name: userData.name,
            mobile: userData.mobile,
            // Convert status to boolean if it's a number
            status: typeof userData.status === 'number' ? Boolean(userData.status) : userData.status,
            requires_usdt_transaction: userData.requires_usdt_transaction,
            requires_registration_fee: userData.requires_registration_fee,
            is_account_active: userData.is_account_active,
            sponsor_id: userData.sponsor_id,
            role: userData.role,
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
                const incomplete: typeof incompleteSections = [];
                
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
                  setIncompleteSections(incomplete);
                  setShowProfileDialog(true);
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
    } catch (error: any) {
      toast.error(error?.message || '2FA verification failed. Please try again.');
    } finally {
      setIsVerifying2FA(false);
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
                      : useDemoLogin
                        ? 'Enter demo credentials to test the application'
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
                  <PasswordInput
                    placeholder={
                      useDemoLogin
                        ? 'password123'
                        : 'Enter your password'
                    }
                    autoComplete={useDemoLogin ? 'off' : 'current-password'}
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
      
      {/* Profile Completion Dialog */}
      <ProfileCompletionDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        incompleteSections={incompleteSections.map(section => ({
          ...section,
          icon: section.key === 'personal_information' ? (
            <Settings className="h-5 w-5 text-orange-600" />
          ) : section.key === 'legal_information' ? (
            <Scale className="h-5 w-5 text-orange-600" />
          ) : (
            <FileText className="h-5 w-5 text-orange-600" />
          ),
        }))}
      />
    </ProtectedRoute>
  );
}
