'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import Link from 'next/link';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-core';
import confetti from 'canvas-confetti';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';

export function CheckEmailClient() {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [email, setEmail] = useState<string | undefined>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  useEffect(() => {
    const otpInput = document.getElementById('otp');
    if (otpInput) {
      otpInput.focus();
    }
  }, []);

  useEffect(() => {
    if (!success) return;

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }, [success]);

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
        email: email,
      });

      if (result.success) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        setSuccess(true);
        router.push('/login');
      } else {
        setError(result.message || 'OTP verification failed. Please try again.');
      }
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Network error. Please check your connection and try again.');
      }
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
        email: email,
      });

      if (result.success) {
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
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (_err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  const primaryButtonGradient: React.CSSProperties = {
    background:
      'linear-gradient(0deg, #C50435, #C50435), linear-gradient(180deg, #EC0808 -78.33%, #500101 265%)',
  };

  if (success) {
    return (
      <ProtectedRoute requireAuth={false}>
        <AuthLayout>
          <div className="w-full max-w-md mx-auto text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6 bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              You&apos;re all set!
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              Your email has been verified successfully. Welcome aboard! Redirecting to login...
            </p>
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
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full border border-primary/25 bg-primary/10 mb-5">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              Check your email
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              {email
                ? "We've sent a verification OTP to"
                : "We've sent a verification OTP to your inbox"}
            </p>

            {email && (
              <div className="mt-3 inline-flex px-3 py-2 bg-input/60 rounded-md border border-[#2A2A2E]">
                <p className="font-sans font-medium text-[14px] leading-[150%] tracking-[-3%] text-foreground break-all">
                  {email}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/25 bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otp}
                onChange={handleOtpChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyOtp();
                }}
                placeholder="123456"
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
              {error && (
                <div className="flex items-center gap-1.5 font-sans text-[13px] text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <p className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
                  Open your email application or inbox
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <p className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
                  Look for an email with the subject &quot;Your OTP for Registration&quot;
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <p className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
                  Enter the 6-digit OTP code above
                </p>
              </div>
            </div>

            {/* Spam folder notice */}
            <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
              <p className="font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-primary">
                <span className="font-semibold">Tip:</span> If you don&apos;t see the email, check your spam or junk folder.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifying || otp.length !== 6}
                style={primaryButtonGradient}
                className="
                  w-full py-3.5 rounded-md font-sans font-normal text-[14px] leading-[150%] tracking-[-3%]
                  text-white
                  hover:opacity-90
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all flex items-center justify-center gap-2
                "
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCountdown > 0 || isResending}
                className="
                  w-full py-2.5 rounded-md font-sans font-medium text-[14px] leading-[150%] tracking-[-3%]
                  border border-border text-muted-foreground
                  hover:border-primary/50 hover:text-foreground
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all flex items-center justify-center gap-2
                "
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                {resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : isResending
                  ? 'Resending...'
                  : "Didn't receive OTP?"}
              </button>

              <Link
                href="/login"
                className="
                  flex items-center justify-center gap-2
                  w-full py-2.5 rounded-md font-sans font-medium text-[14px] leading-[150%] tracking-[-3%]
                  text-muted-foreground hover:text-foreground transition-colors
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>

            {/* Additional help */}
            <p className="text-center font-sans font-normal text-[12px] leading-[150%] tracking-[-3%] text-muted-foreground/60">
              Having trouble? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}