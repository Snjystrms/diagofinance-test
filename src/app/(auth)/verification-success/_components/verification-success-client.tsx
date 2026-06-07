'use client';

import { use } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import Link from 'next/link';
import { CheckCircle, Clock, Mail, User, Shield } from 'lucide-react';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';

interface PageProps {
  searchParams: Promise<{ data?: string }>
}

interface VerificationData {
  message: string;
  user: {
    name: string;
    username: string;
    email: string;
  };
  status: string;
  nextSteps: string[];
}

export function VerificationSuccessClient({ searchParams }: PageProps) {
  const resolved = use(searchParams);
  const data: VerificationData | null = resolved?.data 
    ? JSON.parse(decodeURIComponent(resolved.data))
    : null;

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-6"
            style={{ background: 'rgba(34,197,94,0.15)' }}>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Verification Successful!
          </h1>

          <p className="text-white/40 text-lg">
            Your email and payment have been verified successfully.
          </p>
        </div>

        {/* Card with gold border accent */}
        <div
          className="rounded-xl border border-[#FFB800]/20 bg-[#0f0f0f] overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,184,0,0.08), 0 24px 60px rgba(0,0,0,0.6)' }}
        >
          {/* Gold top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/60 to-transparent" />

          <div className="px-8 pt-7 pb-2 text-center">
            <h3 className="text-green-400 font-semibold text-lg">What&apos;s Next?</h3>
            <p className="text-white/40 text-sm mt-0.5">
              Your registration is now pending admin approval
            </p>
          </div>

          <div className="px-8 pb-8 pt-4 space-y-6">
            {/* User Info */}
            {data?.user && (
              <div className="p-4 bg-[#1a1a1a] rounded-lg space-y-3 border border-[#FFB800]/10">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-white/40" />
                  <span className="text-sm font-medium text-white">User Details</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">Name:</span>
                    <span className="font-medium text-white">{data.user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Username:</span>
                    <span className="font-medium text-white">{data.user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Email:</span>
                    <span className="font-medium text-white break-all">{data.user.email}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Next Steps</span>
              </div>
              <div className="space-y-2">
                {data?.nextSteps?.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-white/40">{step}</p>
                  </div>
                )) || (
                  <>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-white/40">Your email has been verified</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-white/40">Your payment has been verified</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-white/40">Your registration is now pending admin approval</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#FFB800] rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-white/40">You will receive notification once approved</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Important Notice */}
            <div className="p-3 bg-[#3b82f6]/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-300">
                  <strong>Important:</strong> Please wait for admin approval. You&apos;ll receive an email notification once your account is approved.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/login"
                className="
                  block w-full py-3 rounded-lg text-sm font-bold tracking-wide text-center
                  bg-[#FFB800] text-black
                  hover:bg-[#FFB800]/90
                  transition-all
                  shadow-[0_0_20px_rgba(255,184,0,0.2)]
                "
              >
                <Mail className="h-4 w-4 inline mr-2" />
                Back to Login
              </Link>
            </div>

            {/* Additional help */}
            <div className="text-center">
              <p className="text-xs text-white/25">
                Need help? Contact our support team for assistance.
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