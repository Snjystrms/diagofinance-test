'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import Link from 'next/link';
import { Mail, ArrowLeft, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { ApiRequestError } from '@/lib/api-core';
import confetti from 'canvas-confetti';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';
import Image from 'next/image';

// how long the success screen stays up before redirecting to /login
const SUCCESS_REDIRECT_DELAY_MS = 2600;

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
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Fire confetti from the logo's actual on-screen position once the
  // grow-reveal has settled, then redirect after the success screen has
  // had time to actually be seen.
  useEffect(() => {
    if (!success) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced) {
      const confettiTimer = setTimeout(() => {
        const el = document.getElementById('success-logo-wrap');
        if (el) {
          const rect = el.getBoundingClientRect();
          const originX = (rect.left + rect.width / 2) / window.innerWidth;
          const originY = (rect.top + rect.height / 2) / window.innerHeight;
          confetti({
            particleCount: 55,
            spread: 65,
            startVelocity: 30,
            gravity: 1.1,
            scalar: 0.8,
            origin: { x: originX, y: originY },
            colors: ['#7a1010', '#a31c1c', '#d4a017', '#f0c94a'],
          });
        }
      }, 950);
      redirectTimerRef.current = confettiTimer;
    }

    const redirectTimer = setTimeout(() => {
      router.push('/login');
    }, SUCCESS_REDIRECT_DELAY_MS);

    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
      clearTimeout(redirectTimer);
    };
  }, [success, router]);

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

        // Don't navigate immediately — let the success screen show first.
        // The redirect itself is handled by the useEffect above.
        setSuccess(true);
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
          <div className="relative flex flex-col items-center text-center px-6 w-full max-w-md mx-auto">
            {/* Radial glow behind logo */}
            <div
              className="success-glow absolute -z-10 w-72 h-72 rounded-full blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(212,160,23,0.35) 0%, rgba(122,16,16,0.25) 45%, transparent 70%)',
              }}
            />

            {/* Logo with grow-reveal + shine */}
            <div id="success-logo-wrap" className="relative w-32 h-32">
              <Image
                src="/diagologo.svg"
                alt="Diago Finance"
                width={128}
                height={128}
                className="success-logo"
              />
              <div className="success-shine" />
            </div>

            {/* Heading */}
            <h1 className="success-t1 mt-8 text-2xl font-semibold text-foreground tracking-tight">
              Welcome aboard, Diago Finance
            </h1>

            {/* Description */}
            <p className="success-t2 mt-2 text-sm text-muted-foreground max-w-xs">
              Your account is verified. Everything&apos;s set up and ready to go.
            </p>

            {/* Redirecting */}
            <p className="success-btn mt-7 text-xs text-muted-foreground/50 animate-pulse">
              Redirecting to login...
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
                  transition-all flex items-center justify-center gap-2 cursor-pointer
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