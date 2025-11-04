export interface Permission {
  id: number;
  module: string;
  action: string;
  created_at: string;
  updated_at: string;
  AdminPermission: {
    id: number;
    admin_id: string;
    permission_id: number;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
    status: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface SubadminPermissionsResponse {
  success: boolean;
  message: string;
  data: {
    subadmin_id: string;
    permissions: Permission[];
    total: number;
  };
}

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
}

export type UserType = "admin" | "user" | "subadmin";