'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionAwareButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  requiredModule: string;
  requiredAction: string;
  fallbackComponent?: React.ComponentType<Record<string, unknown>> | null;
  showTooltip?: boolean;
  tooltipMessage?: string;
}

export function PermissionAwareButton({
  children,
  requiredModule: _requiredModule,
  requiredAction: _requiredAction,
  fallbackComponent: FallbackComponent,
  showTooltip: _showTooltip = true,
  tooltipMessage: _tooltipMessage,
  ...buttonProps
}: PermissionAwareButtonProps) {
  const { user } = useAuth();

  // Subadmins use the same grouped-permission system as managers. Access is
  // gated via useManagerPermissions/useModuleCapabilities at the page level,
  // so legacy flat-permission helpers no longer restrict them.
  return <Button {...buttonProps}>{children}</Button>;
}

// Higher-order component for conditional rendering based on permissions
interface PermissionGateProps {
  children: React.ReactNode;
  requiredModule: string;
  requiredAction: string;
  fallback?: React.ReactNode;
}

export function PermissionGate({
  children,
  requiredModule: _requiredModule,
  requiredAction: _requiredAction,
  fallback: _fallback = null
}: PermissionGateProps) {
  // Subadmins use the same grouped-permission system as managers. Access is
  // gated via useManagerPermissions/useModuleCapabilities at the page level,
  // so legacy flat-permission helpers no longer restrict them.
  return <>{children}</>;
}