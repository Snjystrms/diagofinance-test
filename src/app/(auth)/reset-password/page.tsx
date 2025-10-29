'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';

export default function ResetPasswordRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // If someone visits /reset-password without a token, redirect to login
    router.replace('/login');
  }, [router]);

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </ProtectedRoute>
  );
}
