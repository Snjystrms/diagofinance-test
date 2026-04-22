'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CenteredLoadingSurface } from '@/components/loading/page-loading-skeleton';
import { useAuth } from '@/contexts/auth-context';
import { isRouteAllowedForRole } from '@/lib/app-route-registry';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

type UserRole = 'admin' | 'manager' | 'user' | 'subadmin';

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = (user?.type ?? 'user') as UserRole;

  const isAuthorized = useMemo(() => {
    if (!requireAuth) return true;
    if (!isAuthenticated) return false;
    return isRouteAllowedForRole(pathname, userRole, {
      managerPermissions: user?.managerPermissions,
    });
  }, [requireAuth, isAuthenticated, userRole, pathname, user?.managerPermissions]);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!requireAuth && isAuthenticated) {
      if (user?.requires_registration_fee) {
        router.replace('/test-registration-fee');
      } else {
        router.replace('/dashboard');
      }
      return;
    }

    if (requireAuth && isAuthenticated && !isAuthorized) {
      router.replace('/dashboard');
    }
  }, [
    isAuthenticated,
    requireAuth,
    redirectTo,
    router,
    user,
    isAuthorized,
  ]);

  if (requireAuth && !isAuthenticated) {
    return (
      <CenteredLoadingSurface
        minHeightClassName="min-h-screen"
        title="Loading"
        description="Checking your session and preparing the workspace."
      />
    );
  }

  if (!requireAuth && isAuthenticated) {
    return (
      <CenteredLoadingSurface
        minHeightClassName="min-h-screen"
        title="Redirecting"
        description="Taking you to the right dashboard."
      />
    );
  }

  if (requireAuth && isAuthenticated && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mt-2 text-sm text-gray-600">You do not have access to this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
