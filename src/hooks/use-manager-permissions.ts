import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  managerPermissionConfig,
  ManagerPermissionModule,
  getManagerPermissionNames,
  normalizeManagerPermissionName,
} from "@/lib/manager-permissions";

type FeatureKeyValue = string | string[];
type FeatureOption<T = unknown> = T & { featureKey: FeatureKeyValue };

export function useManagerPermissions() {
  const { user } = useAuth();

  const userType = user?.type ?? "user";
  const isAdmin = userType === "admin";
  const isManager = userType === "manager";

  const permissionNameSet = useMemo(() => {
    if (!isManager) return new Set<string>();
    const set = new Set<string>();
    const grouped = (user as any)?.managerPermissions ?? [];
    grouped.forEach((group: any) => {
      (group?.permissions || []).forEach((perm: any) => {
        if (perm?.name) {
          set.add(normalizeManagerPermissionName(perm.name));
        }
      });
    });
    return set;
  }, [isManager, user]);

  const hasPermissionName = useCallback(
    (name: string) => {
      if (isAdmin || !isManager) return true;
      return permissionNameSet.has(normalizeManagerPermissionName(name));
    },
    [isAdmin, isManager, permissionNameSet]
  );

  const hasFeature = useCallback(
    (moduleKey: ManagerPermissionModule, featureKey: FeatureKeyValue) => {
      if (isAdmin || !isManager) return true;

      const keys = Array.isArray(featureKey) ? featureKey : [featureKey];

      return keys.every((key) => {
        const normalizedKey = key.toString();
        const names = getManagerPermissionNames(moduleKey, normalizedKey);
        if (!names.length) return false;
        return names.some((n) => permissionNameSet.has(n));
      });
    },
    [isAdmin, isManager, permissionNameSet]
  );

  const filterFeatureOptions = useCallback(
    <T extends FeatureOption>(
      moduleKey: ManagerPermissionModule,
      options: T[]
    ): T[] => {
      if (isAdmin || !isManager) {
        return options;
      }

      return options.filter((option) => hasFeature(moduleKey, option.featureKey));
    },
    [hasFeature, isAdmin, isManager]
  );

  return {
    isAdmin,
    isManager,
    hasPermissionName,
    hasFeature,
    filterFeatureOptions,
    permissionNameSet,
  };
}

