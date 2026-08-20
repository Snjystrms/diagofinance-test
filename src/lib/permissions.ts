import { Permission, SubadminPermissionsResponse } from '@/types/permissions';
import { API_BASE_URL, handle401Redirect } from './api';
import { useAuth } from '@/contexts/auth-context';

export const fetchSubadminPermissions = async (token: string): Promise<SubadminPermissionsResponse> => {
  const response = await fetch(`${API_BASE_URL}/permissions/subadmin/permissions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (handle401Redirect(response, !!token)) {
    return { success: false, message: "Session expired", data: { subadmin_id: "", permissions: [], total: 0 } } as unknown as SubadminPermissionsResponse;
  }

  if (!response.ok) {
    throw new Error('Failed to fetch subadmin permissions');
  }

  return response.json();
};

export const hasPermission = (permissions: Permission[], module: string, action: string): boolean => {
  return permissions.some(p => 
    p.module === module && 
    p.action === action && 
    p.AdminPermission.status === true
  );
};

export const getModulePermissions = (permissions: Permission[], module: string): string[] => {
  return permissions
    .filter(p => p.module === module && p.AdminPermission.status === true)
    .map(p => p.action);
};

export const getAllowedModules = (permissions: Permission[]): string[] => {
  return [...new Set(permissions
    .filter(p => p.AdminPermission.status === true)
    .map(p => p.module))];
};

// Hook for component-level permission checking
export const usePermissions = () => {
  const { user } = useAuth();

  const checkPermission = (_module: string, _action: string): boolean => {
    // Subadmins use the same grouped-permission system as managers. Their
    // access is gated via useManagerPermissions/useModuleCapabilities at the
    // page level, so legacy flat-permission helpers no longer restrict them.
    return true;
  };

  const getModuleActions = (_module: string): string[] => {
    return ['read', 'write', 'delete', 'create', 'update'];
  };

  const canWrite = (_module: string): boolean => {
    return checkPermission(_module, 'write');
  };

  const canRead = (_module: string): boolean => {
    return checkPermission(_module, 'read');
  };

  return {
    checkPermission,
    getModuleActions,
    canWrite,
    canRead,
    userType: user?.type || 'user',
    permissions: user?.permissions || [],
  };
};