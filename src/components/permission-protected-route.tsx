'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredLoadingSurface } from '@/components/loading/page-loading-skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useManagerPermissions } from '@/hooks/use-manager-permissions';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: string;
  requiredAction?: string;
  route?: string;
}

export function PermissionProtectedRoute({ 
  children, 
  requiredModule, 
  requiredAction, 
  route 
}: PermissionProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { hasPermissionName } = useManagerPermissions();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Subadmins use the same grouped-permission system as managers. Gate them
    // by grouped permission names when module/action details are provided.
    if (user?.type === 'subadmin') {
      if (route || requiredModule) {
        const permissionName = requiredAction
          ? `${requiredModule} ${requiredAction}`
          : requiredModule;
        if (permissionName && !hasPermissionName(permissionName)) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [isAuthenticated, user, router, requiredModule, requiredAction, route, hasPermissionName]);

  // Show loading state while checking permissions
  if (!isAuthenticated || (user?.type === 'subadmin' && !user.managerPermissions)) {
    return (
      <CenteredLoadingSurface
        minHeightClassName="min-h-screen"
        title="Checking permissions"
        description="Validating access for this section."
      />
    );
  }

  return <>{children}</>;
}
