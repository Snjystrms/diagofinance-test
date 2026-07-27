"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { isRouteAllowedForRole } from "@/lib/app-route-registry";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

type UserRole = "admin" | "manager" | "user" | "subadmin";

export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const userRole = (user?.type ?? "user") as UserRole;

  const isAuthorized = useMemo(() => {
    if (!requireAuth) return true;
    if (!isAuthenticated) return false;
    return isRouteAllowedForRole(pathname, userRole, {
      managerPermissions: user?.managerPermissions,
    });
  }, [
    requireAuth,
    isAuthenticated,
    userRole,
    pathname,
    user?.managerPermissions,
  ]);

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (!requireAuth && isAuthenticated) {
      router.replace("/dashboard");
      return;
    }

    if (requireAuth && isAuthenticated && !isAuthorized) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, requireAuth, redirectTo, router, user, isAuthorized]);

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-[26px] border border-border/80 bg-card/96 px-6 py-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)] backdrop-blur-sm">
          <Image
            src="/diagologo.svg"
            alt="Vinnexia"
            width={56}
            height={56}
            priority
            className="mx-auto"
          />
          <p className="mt-4 text-sm font-semibold tracking-[0.01em] text-foreground">
            Loading
          </p>
          <p className="mt-1.5 text-sm leading-6 text-foreground/78">
            Checking your session and preparing the workspace.
          </p>
        </div>
      </div>
    );
  }

  if (!requireAuth && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm rounded-[26px] border border-border/80 bg-card/96 px-6 py-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)] backdrop-blur-sm">
          <Image
            src="/diagologo.svg"
            alt="Vinnexia"
            width={56}
            height={56}
            priority
            className="mx-auto"
          />
          <p className="mt-4 text-sm font-semibold tracking-[0.01em] text-foreground">
            Redirecting
          </p>
          <p className="mt-1.5 text-sm leading-6 text-foreground/78">
            Taking you to the DiagoFinance dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (requireAuth && isAuthenticated && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mt-2 text-sm text-gray-600">
            You do not have access to this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
