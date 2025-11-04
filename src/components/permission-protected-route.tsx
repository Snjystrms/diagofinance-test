'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}