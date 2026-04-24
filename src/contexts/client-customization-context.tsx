"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildPresetSnapshot,
  getActiveClientPreset,
  getDashboardHiddenStorageKey,
  getDashboardLayoutStorageKey,
  getDashboardModeStorageKey,
  isCustomizationModeEnabled,
  readStoredJson,
  SIDEBAR_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ClientPreset,
  type DashboardArea,
  type DashboardMode,
  type DashboardPresetConfig,
  type SidebarId,
} from "@/lib/client-presets";
import { applyThemeById } from "@/components/theme-customizer";

interface ClientCustomizationContextValue {
  activePreset: ClientPreset;
  customizationEnabled: boolean;
  canCustomizeTheme: boolean;
  canCustomizeSidebar: boolean;
  canCustomizeDashboard: boolean;
  themeId: string;
  sidebarId: SidebarId;
  setThemeId: (themeId: string) => void;
  setSidebarId: (sidebarId: SidebarId) => void;
  getDashboardMode: (area: DashboardArea) => DashboardMode;
  setDashboardMode: (area: DashboardArea, mode: DashboardMode) => void;
  getDashboardPreset: (area: DashboardArea) => DashboardPresetConfig | undefined;
  exportPresetSnapshot: () => string;
}

const ClientCustomizationContext = createContext<ClientCustomizationContextValue | undefined>(
  undefined
);

export function ClientCustomizationProvider({ children }: { children: ReactNode }) {
  const activePreset = useMemo(() => getActiveClientPreset(), []);
  const customizationEnabled = useMemo(() => isCustomizationModeEnabled(), []);
  const allowThemeCustomization = customizationEnabled || !activePreset.locks.theme;
  const allowSidebarCustomization = customizationEnabled || !activePreset.locks.sidebar;
  const allowDashboardCustomization = customizationEnabled || !activePreset.locks.dashboardLayout;
  const [themeId, setThemeIdState] = useState<string>(activePreset.themeId);
  const [sidebarId, setSidebarIdState] = useState<SidebarId>(activePreset.sidebarId);
  const [dashboardModes, setDashboardModes] = useState<Record<DashboardArea, DashboardMode>>({
    admin: activePreset.dashboards.admin?.mode ?? "normal",
    client: activePreset.dashboards.client?.mode ?? "normal",
  });

  useEffect(() => {
    let nextThemeId = activePreset.themeId;
    let nextSidebarId = activePreset.sidebarId;
    const nextModes: Record<DashboardArea, DashboardMode> = {
      admin: activePreset.dashboards.admin?.mode ?? "normal",
      client: activePreset.dashboards.client?.mode ?? "normal",
    };

    if (typeof window !== "undefined") {
      if (allowThemeCustomization) {
        nextThemeId = window.localStorage.getItem(THEME_STORAGE_KEY) || nextThemeId;
      }

      if (allowSidebarCustomization) {
        nextSidebarId =
          (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) as SidebarId | null) || nextSidebarId;
      }

      if (allowDashboardCustomization) {
        (["admin", "client"] as DashboardArea[]).forEach((area) => {
          const storedMode = window.localStorage.getItem(getDashboardModeStorageKey(area));
          if (storedMode === "normal" || storedMode === "custom") {
            nextModes[area] = storedMode;
          }
        });
      }
    }

    setThemeIdState(nextThemeId);
    setSidebarIdState(nextSidebarId);
    setDashboardModes(nextModes);
  }, [activePreset, allowDashboardCustomization, allowSidebarCustomization, allowThemeCustomization]);

  useEffect(() => {
    applyThemeById(themeId);
  }, [themeId]);

  const setThemeId = useCallback(
    (nextThemeId: string) => {
      if (!allowThemeCustomization) return;
      setThemeIdState(nextThemeId);
      window.localStorage.setItem(THEME_STORAGE_KEY, nextThemeId);
    },
    [allowThemeCustomization]
  );

  const setSidebarId = useCallback(
    (nextSidebarId: SidebarId) => {
      if (!allowSidebarCustomization) return;
      setSidebarIdState(nextSidebarId);
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, nextSidebarId);
    },
    [allowSidebarCustomization]
  );

  const setDashboardMode = useCallback(
    (area: DashboardArea, mode: DashboardMode) => {
      if (!allowDashboardCustomization) return;
      setDashboardModes((current) => ({ ...current, [area]: mode }));
      window.localStorage.setItem(getDashboardModeStorageKey(area), mode);
    },
    [allowDashboardCustomization]
  );

  const getDashboardMode = useCallback(
    (area: DashboardArea) => dashboardModes[area] ?? activePreset.dashboards[area]?.mode ?? "normal",
    [dashboardModes]
  );

  const getDashboardPreset = useCallback(
    (area: DashboardArea) => activePreset.dashboards[area],
    []
  );

  const exportPresetSnapshot = useCallback(() => {
    const dashboards = (["admin", "client"] as DashboardArea[]).reduce<
      Partial<Record<DashboardArea, DashboardPresetConfig>>
    >((result, area) => {
      result[area] = {
        mode: dashboardModes[area] ?? activePreset.dashboards[area]?.mode ?? "normal",
        layout:
          readStoredJson(getDashboardLayoutStorageKey(area)) ??
          activePreset.dashboards[area]?.layout ??
          [],
        hiddenWidgets:
          readStoredJson<string[]>(getDashboardHiddenStorageKey(area)) ??
          activePreset.dashboards[area]?.hiddenWidgets ??
          [],
      };
      return result;
    }, {});

    return buildPresetSnapshot(activePreset, {
      themeId,
      sidebarId,
      dashboards,
    });
  }, [dashboardModes, sidebarId, themeId]);

  const value = useMemo<ClientCustomizationContextValue>(
    () => ({
      activePreset,
      customizationEnabled,
      canCustomizeTheme: allowThemeCustomization,
      canCustomizeSidebar: allowSidebarCustomization,
      canCustomizeDashboard: allowDashboardCustomization,
      themeId,
      sidebarId,
      setThemeId,
      setSidebarId,
      getDashboardMode,
      setDashboardMode,
      getDashboardPreset,
      exportPresetSnapshot,
    }),
    [
      activePreset,
      allowDashboardCustomization,
      allowSidebarCustomization,
      allowThemeCustomization,
      customizationEnabled,
      exportPresetSnapshot,
      getDashboardMode,
      getDashboardPreset,
      setDashboardMode,
      setSidebarId,
      setThemeId,
      sidebarId,
      themeId,
    ]
  );

  return (
    <ClientCustomizationContext.Provider value={value}>
      {children}
    </ClientCustomizationContext.Provider>
  );
}

export function useClientCustomization() {
  const context = useContext(ClientCustomizationContext);
  if (!context) {
    throw new Error("useClientCustomization must be used within ClientCustomizationProvider");
  }

  return context;
}
