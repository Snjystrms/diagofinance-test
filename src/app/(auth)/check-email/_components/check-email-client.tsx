'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Mail, CheckCircle, ArrowLeft, RefreshCw, Key, AlertCircle } from 'lucide-react';
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
        email: email
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
        email: email
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

        console.log('OTP resent successfully');
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.');
      }
    } catch (_err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <ProtectedRoute requireAuth={false}>
        <AuthLayout>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6"
              style={{ background: 'rgba(34,197,94,0.15)' }}>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              You&apos;re all set!
            </h1>
            <p className="text-white/40 text-lg">
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
        <div className="text-center">
          {/* Email Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: 'rgba(255,184,0,0.1)' }}>
            <Mail className="h-6 w-6 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Check your email
          </h1>

          <p className="text-white/40 text-lg">
            {email
              ? "We've sent a verification OTP to"
              : "We've sent a verification OTP to your inbox"}
          </p>

          {email && (
            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#FFB800]/20">
              <p className="text-sm font-medium text-white break-all">
                {email}
              </p>
            </div>
          )}
        </div>

        {/* Card with gold border accent */}
        <div
          className="rounded-xl border border-[#FFB800]/20 bg-[#0f0f0f] overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,184,0,0.08), 0 24px 60px rgba(0,0,0,0.6)' }}
        >
          {/* Gold top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/60 to-transparent" />

          <div className="px-8 pt-7 pb-2 text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full mb-3"
              style={{ background: 'rgba(59,130,246,0.15)' }}>
              <Key className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-white font-semibold text-lg">Enter Verification OTP</h3>
            <p className="text-white/40 text-sm mt-0.5">
              Please enter the 6-digit OTP sent to your email
            </p>
          </div>

          <div className="px-8 pb-8 pt-4 space-y-6">
            {/* OTP Input */}
            <div className="space-y-3">
              <Label htmlFor="otp" className="text-sm font-medium text-white/70">
                OTP Code
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleOtpChange}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
                className="text-center text-lg font-mono tracking-widest bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15"
                maxLength={6}
              />
              {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-white/40">
                  Open your email application or inbox
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-white/40">
                  Look for an email with the subject &quot;Your OTP for Registration&quot;
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-white/40">
                  Enter the 6-digit OTP code above
                </p>
              </div>
            </div>

            {/* Spam folder notice */}
            <div className="p-3 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-lg">
              <p className="text-sm text-[#FFB800]">
                <strong>Tip:</strong> If you don&apos;t see the email, check your spam or junk folder.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifying || otp.length !== 6}
                className="
                  w-full py-3 rounded-lg text-sm font-bold tracking-wide
                  bg-[#FFB800] text-black
                  hover:bg-[#FFB800]/90
                  disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all flex items-center justify-center gap-2
                  shadow-[0_0_20px_rgba(255,184,0,0.2)]
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
                  w-full py-2.5 rounded-lg text-sm font-medium
                  border border-white/10 text-white/60
                  hover:border-white/20 hover:text-white/90
                  transition-all flex items-center justify-center gap-2
                "
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                {resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : isResending
                    ? 'Resending...'
                    : "Didn't receive OTP?"
                }
              </button>

              <Link
                href="/login"
                className="
                  block w-full py-2.5 rounded-lg text-sm font-medium text-center
                  text-white/40 hover:text-white/70 transition-colors
                "
              >
                <ArrowLeft className="h-4 w-4 inline mr-2" />
                Back to Login
              </Link>
            </div>

            {/* Additional help */}
            <div className="text-center">
              <p className="text-xs text-white/25">
                Having trouble? Contact our support team for assistance.
              </p>
            </div>
          </div>

          {/* Gold bottom bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/30 to-transparent" />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}