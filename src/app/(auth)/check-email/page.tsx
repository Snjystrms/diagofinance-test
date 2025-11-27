'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Key, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function CheckEmailPage() {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [email, setEmail] = useState<string | undefined>();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get email from search params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  // Auto-focus OTP input when component mounts
  useEffect(() => {
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.focus();
    }
  }, []);

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!email) {
      setError('Email not found. Please try again.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await authApi.verifyOtp({
        otp: otp,
        email: email
      });

      if (result.success) {
        // Clear any existing auth state to prevent auto-login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        setSuccess(true);
        // Redirect to login page immediately without delay
        router.push('/login');
      } else {
        setError(result.message || 'OTP verification failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !email) return;
    
    try {
      setIsResending(true);
      setError('');
      
      const result = await authApi.resendOtp({
        email: email
      });

      if (result.success) {
        // Start countdown timer
        setResendCountdown(60);
        const timer = setInterval(() => {
          setResendCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        // Show success message (optional)
        console.log('OTP resent successfully');
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <ProtectedRoute requireAuth={false}>
        <div className="min-h-screen flex">
          <div className="hidden lg:flex lg:w-2/5 relative bg-background">
            <Image
              src="/loginbackground.png"
              alt="Success background"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Email Verified!
                </h1>
                <p className="text-muted-foreground text-lg">
                  Your email has been successfully verified. Redirecting to login page...
                </p>
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
        {/* Left side - Background Image */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Check email background"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Right side - Content */}
        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              {/* Email Icon */}
              <div className="mx-auto flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Check your email
              </h1>
              
              <p className="text-muted-foreground text-lg">
                {email
                  ? "We've sent a verification OTP to"
                  : "We've sent a verification OTP to your inbox"}
              </p>
              
              {email && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground break-all">
                    {email}
                  </p>
                </div>
              )}
            </div>

            <Card className="border-2 border-primary/20 shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Enter Verification OTP</CardTitle>
                <CardDescription className="text-base">
                  Please enter the 6-digit OTP sent to your email
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* OTP Input */}
                <div className="space-y-3">
                  <Label htmlFor="otp" className="text-sm font-medium">
                    OTP Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={handleOtpChange}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                  />
                  {error && (
                    <div className="flex items-center space-x-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Open your email application or inbox
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Look for an email with the subject &quot;Your OTP for Registration&quot;
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit OTP code above
                    </p>
                  </div>
                </div>

                {/* Spam folder notice */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Tip:</strong> If you don&apos;t see the email, check your spam or junk folder.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length !== 6}
                    className="w-full" 
                    size="lg"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="lg"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || isResending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                    {resendCountdown > 0 
                      ? `Resend in ${resendCountdown}s` 
                      : isResending 
                        ? 'Resending...' 
                        : "Didn't receive OTP?"
                    }
                  </Button>

                  <Button asChild variant="ghost" className="w-full" size="lg">
                    <Link href="/login">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Login
                    </Link>
                  </Button>
                </div>

                {/* Additional help */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Having trouble? Contact our support team for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
