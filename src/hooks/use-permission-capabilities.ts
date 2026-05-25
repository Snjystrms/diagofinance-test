"use client";

import { useCallback, useMemo, useState } from "react";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  permissionCapabilities,
  type CapabilityKey,
  type CapabilityModuleKey,
} from "@/lib/permission-capabilities";

export function sanitizeFilterValue<T extends string>(
  value: T,
  allowedValues: readonly T[],
  fallbackValue: T
): T {
  return allowedValues.includes(value) ? value : fallbackValue;
}

export function assertCan(
  canAccess: boolean,
  errorMessage: string,
  onDeny?: (message: string) => void
) {
  if (canAccess) return true;
  onDeny?.(errorMessage);
  return false;
}

export function useModuleCapabilities<M extends CapabilityModuleKey>(moduleKey: M) {
  const { isAdmin, isManager, hasFeature } = useManagerPermissions();

  const definitions = permissionCapabilities[moduleKey];

  const capabilities = useMemo(() => {
    type ModuleCapabilityRecord = Record<CapabilityKey<M>, boolean>;
    const result = {} as ModuleCapabilityRecord;
    if (!definitions) return result;

    (Object.entries(definitions) as Array<[string, string | string[]]>).forEach(([key, featureKey]) => {
      result[key as CapabilityKey<M>] = isAdmin || !isManager || hasFeature(moduleKey, featureKey);
    });
    return result;
  }, [definitions, hasFeature, isAdmin, isManager, moduleKey]);

  const can = useCallback(
    (capability: CapabilityKey<M>) => {
      return Boolean(capabilities[capability]);
    },
    [capabilities]
  );

  return {
    isAdmin,
    isManager,
    capabilities,
    can,
  };
}

export function useCrudCapabilities<M extends CapabilityModuleKey>(
  moduleKey: M,
  mapping: {
    list: CapabilityKey<M>;
    add: CapabilityKey<M>;
    edit: CapabilityKey<M>;
    delete: CapabilityKey<M>;
  }
) {
  const { can } = useModuleCapabilities(moduleKey);
  const canViewList = can(mapping.list);
  const canAdd = can(mapping.add);
  const canEdit = can(mapping.edit);
  const canDelete = can(mapping.delete);
  return {
    canViewList,
    canAdd,
    canEdit,
    canDelete,
    showActionsColumn: canEdit || canDelete,
  };
}

export function useTabCapabilities<
  M extends CapabilityModuleKey,
  T extends string
>(
  moduleKey: M,
  tabCapabilityMap: Record<T, CapabilityKey<M>>,
  defaultTab: T
) {
  const { can } = useModuleCapabilities(moduleKey);

  const availableTabs = useMemo(
    () => (Object.keys(tabCapabilityMap) as T[]).filter((tab) => can(tabCapabilityMap[tab])),
    [can, tabCapabilityMap]
  );

  const [activeTab, unsafeSetActiveTab] = useState<T>(() =>
    availableTabs.includes(defaultTab) ? defaultTab : availableTabs[0] ?? defaultTab
  );

  const canViewTab = useCallback(
    (tab: T) => can(tabCapabilityMap[tab]),
    [can, tabCapabilityMap]
  );

  const setActiveTab = useCallback(
    (tab: T) => {
      if (canViewTab(tab)) {
        unsafeSetActiveTab(tab);
      }
    },
    [canViewTab]
  );

  const getSafeTab = useCallback(
    (tab: T) => {
      if (canViewTab(tab)) return tab;
      if (availableTabs.includes(defaultTab)) return defaultTab;
      return availableTabs[0] ?? tab;
    },
    [availableTabs, canViewTab, defaultTab]
  );

  return {
    activeTab,
    setActiveTab,
    availableTabs,
    canViewTab,
    getSafeTab,
  };
}
