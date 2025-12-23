'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { GroupedPermissions } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

type UserRole = 'admin' | 'manager' | 'user' | 'subadmin';

const USER_ALLOWED_PREFIXES: string[] = [
  '/dashboard',
  '/my_wallet',
  '/my_accounts',
  '/funds',
  '/social-trading',
  '/trading_platforms',
  '/profile',
  '/trading-central',
  '/help-support',
  '/raise-ticket',
  '/ticket-history',
];

const MANAGER_BASE_ROUTES = ['/dashboard'];

const MANAGER_CATEGORY_ROUTE_MAP: Record<string, string[]> = {
  Bonus: ['/bonus-management'],
  'E-Mail Management': ['/email-management'],
  'Group Management': ['/packages', '/all-accounts', '/package-sales', '/package-analytics'],
  'IB Management': ['/ib-management'],
  'Marketing Management': ['/marketing-management'],
  'News Management': ['/news-management'],
  Notification: ['/notification-management'],
  'Report Management': ['/report-management'],
  'Rewards Management': ['/reward-management'],
  'Settings Management': ['/settings-management'],
  'Sub Admin': ['/manager', '/all-managers'],
  'Ticket Management': ['/ticket-management'],
  Transaction: ['/transactions', '/usdt-transactions'],
  'User Management': ['/users', '/new-users', '/user-verification'],
};

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const getManagerCategories = (permissions?: GroupedPermissions[]) =>
  new Set((permissions ?? []).map((group) => group.category).filter(Boolean));

const isRouteAllowedForUser = (pathname: string): boolean =>
  matchesPrefix(pathname, USER_ALLOWED_PREFIXES);

const isRouteAllowedForManager = (pathname: string, categories: Set<string>): boolean => {
  if (matchesPrefix(pathname, MANAGER_BASE_ROUTES)) {
    return true;
  }

  for (const [category, routes] of Object.entries(MANAGER_CATEGORY_ROUTE_MAP)) {
    if (matchesPrefix(pathname, routes)) {
      return categories.has(category);
    }
  }

  return false;
};

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

    if (userRole === 'admin') return true;
    if (userRole === 'user') {
      return isRouteAllowedForUser(pathname);
    }
    if (userRole === 'manager') {
      const categories = getManagerCategories(user?.managerPermissions);
      return isRouteAllowedForManager(pathname, categories);
    }

    // default deny for unknown role
    return false;
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!requireAuth && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Redirecting...</p>
        </div>
      </div>
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