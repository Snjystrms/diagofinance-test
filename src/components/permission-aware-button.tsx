'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { hasPermission } from '@/lib/permissions';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionAwareButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
  requiredModule: string;
  requiredAction: string;
  fallbackComponent?: React.ComponentType<any> | null;
  showTooltip?: boolean;
  tooltipMessage?: string;
}

export function PermissionAwareButton({
  children,
  requiredModule,
  requiredAction,
  fallbackComponent: FallbackComponent,
  showTooltip = true,
  tooltipMessage,
  ...buttonProps
}: PermissionAwareButtonProps) {
  const { user } = useAuth();
  
  // Admin and regular users have full access by default
  if (user?.type !== 'subadmin') {
    return <Button {...buttonProps}>{children}</Button>;
  }

  const permissions = user.permissions || [];
  const canPerformAction = hasPermission(permissions, requiredModule, requiredAction);

  // If user has permission, show the button normally
  if (canPerformAction) {
    return <Button {...buttonProps}>{children}</Button>;
  }

  // If no permission and no fallback component, hide completely
  if (!FallbackComponent && !showTooltip) {
    return null;
  }

  // Show fallback component if provided
  if (FallbackComponent) {
    return <FallbackComponent {...buttonProps}>{children}</FallbackComponent>;
  }

  // Show disabled button with tooltip for read-only users
  const disabledMessage = tooltipMessage || 
    `You need '${requiredAction}' permission for '${requiredModule}' module to perform this action`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button {...buttonProps} disabled className="opacity-50 cursor-not-allowed">
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{disabledMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
  requiredModule,
  requiredAction,
  fallback = null
}: PermissionGateProps) {
  const { user } = useAuth();
  
  // Admin and regular users have full access by default
  if (user?.type !== 'subadmin') {
    return <>{children}</>;
  }

  const permissions = user.permissions || [];
  const canPerformAction = hasPermission(permissions, requiredModule, requiredAction);

  return canPerformAction ? <>{children}</> : <>{fallback}</>;
}