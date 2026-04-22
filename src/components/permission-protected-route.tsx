'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CenteredLoadingSurface } from '@/components/loading/page-loading-skeleton';
import { useAuth } from '@/contexts/auth-context';
import { canAccessRoute } from '@/lib/permission-nav-mapper';

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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.type === 'subadmin') {
      const permissions = user.permissions || [];
      
      // Check route-based permission if route is provided
      if (route && !canAccessRoute(permissions, route)) {
        router.push('/dashboard');
        return;
      }
      
      // Check module/action permission if provided
      if (requiredModule && requiredAction) {
        const hasPermission = permissions.some(p => 
          p.module === requiredModule && 
          p.action === requiredAction && 
          p.AdminPermission.status === true
        );
        
        if (!hasPermission) {
          router.push('/dashboard');
          return;
        }
      }
    }
  }, [isAuthenticated, user, router, requiredModule, requiredAction, route]);

  // Show loading state while checking permissions
  if (!isAuthenticated || (user?.type === 'subadmin' && !user.permissions)) {
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
