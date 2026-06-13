'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredLoadingSurface } from '@/components/loading/page-loading-skeleton';
import { useAuth } from '@/contexts/auth-context';

export function HomeRedirectClient() {
  const user= useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user.isAuthenticated ) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user.isAuthenticated, router]);

  return (
    <CenteredLoadingSurface
      minHeightClassName="min-h-screen"
      title="Loading"
      description="Preparing your CRM workspace."
    />
  );
}
