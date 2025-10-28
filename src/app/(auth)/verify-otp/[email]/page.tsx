'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';

interface PageProps {
  params: Promise<{ email: string }>;
}

export default function VerifyOtpPage({ params }: PageProps) {
  const router = useRouter();
  const resolved = use(params);
  const email = decodeURIComponent(resolved.email);

  useEffect(() => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    router.replace(`/check-email${query}`);
  }, [email, router]);

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center py-24 px-6">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </ProtectedRoute>
  );
} 