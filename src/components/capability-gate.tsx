"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function CapabilityGate({
  allowed,
  children,
  fallback = null,
}: {
  allowed: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function CapabilityProtectedView({
  allowed,
  message,
  children,
}: {
  allowed: boolean;
  message: string;
  children: ReactNode;
}) {
  if (allowed) return <>{children}</>;
  return (
    <Card>
      <CardContent className="p-6 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

