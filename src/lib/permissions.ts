import { Permission, SubadminPermissionsResponse } from '@/types/permissions';
// import { API_BASE_URL } from '@/utils/operations';
import { API_BASE_URL } from './api';
import { useAuth } from '@/contexts/auth-context';

export const fetchSubadminPermissions = async (token: string): Promise<SubadminPermissionsResponse> => {
  const response = await fetch(`${API_BASE_URL}/permissions/subadmin/permissions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

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
  
  const checkPermission = (module: string, action: string): boolean => {
    // Admin and regular users have full access by default
    if (user?.type !== 'subadmin') {
      return true;
    }
    
    const permissions = user.permissions || [];
    return hasPermission(permissions, module, action);
  };
  
  const getModuleActions = (module: string): string[] => {
    // Admin and regular users have all actions
    if (user?.type !== 'subadmin') {
      return ['read', 'write', 'delete', 'create', 'update'];
    }
    
    const permissions = user.permissions || [];
    return getModulePermissions(permissions, module);
  };
  
  const canWrite = (module: string): boolean => {
    return checkPermission(module, 'write');
  };
  
  const canRead = (module: string): boolean => {
    return checkPermission(module, 'read');
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