"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
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
  THEME_MODE_STORAGE_KEY,
  THEME_PAIR_STORAGE_KEY,
  SIDEBAR_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type ClientPreset,
  type DashboardArea,
  type DashboardMode,
  type DashboardPresetConfig,
  type SidebarId,
} from "@/lib/client-presets";
import {
  applyThemePairMode,
  getThemeIdForPairMode,
  resolveThemePairMode,
  type ThemeMode,
  themePairs,
} from "@/components/theme-customizer";

interface ClientCustomizationContextValue {
  activePreset: ClientPreset;
  customizationEnabled: boolean;
  canCustomizeTheme: boolean;
  canCustomizeSidebar: boolean;
  canCustomizeDashboard: boolean;
  themePairId: string;
  themeMode: ThemeMode;
  sidebarId: SidebarId;
  setThemePairId: (pairId: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
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
  const resolvedFromThemeId = resolveThemePairMode(activePreset.themeId);
  const presetPairIsValid =
    typeof activePreset.themePairId === "string" &&
    themePairs.some((entry) => entry.id === activePreset.themePairId);
  const defaultTheme = {
    pairId: presetPairIsValid ? activePreset.themePairId! : resolvedFromThemeId.pairId,
    mode: activePreset.themeMode === "dark" || activePreset.themeMode === "bright"
      ? activePreset.themeMode
      : resolvedFromThemeId.mode,
  };

const [themePairId, setThemePairIdState] = useState<string>(() => {
    if (typeof window !== "undefined" && allowThemeCustomization) {
      const storedPairId = window.localStorage.getItem(THEME_PAIR_STORAGE_KEY);
      if (storedPairId && themePairs.some((entry) => entry.id === storedPairId)) {
        return storedPairId;
      }
      const legacyThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (legacyThemeId) {
        const resolved = resolveThemePairMode(legacyThemeId);
        window.localStorage.setItem(THEME_PAIR_STORAGE_KEY, resolved.pairId);
        return resolved.pairId;
      }
    }

    return defaultTheme.pairId;
  });
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined" && allowThemeCustomization) {
      const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (storedMode === "bright" || storedMode === "dark") {
        return storedMode;
      }
      const storedPairId = window.localStorage.getItem(THEME_PAIR_STORAGE_KEY);
      if (storedPairId && themePairs.some((entry) => entry.id === storedPairId)) {
        return defaultTheme.mode;
      }
      const legacyThemeId = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (legacyThemeId) {
        const resolved = resolveThemePairMode(legacyThemeId);
        window.localStorage.setItem(THEME_MODE_STORAGE_KEY, resolved.mode);
        return resolved.mode;
      }
    }

    return defaultTheme.mode;
  });
  const [sidebarId, setSidebarIdState] = useState<SidebarId>(() => {
    if (typeof window !== "undefined" && allowSidebarCustomization) {
      return (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) as SidebarId | null) || activePreset.sidebarId;
    }

    return activePreset.sidebarId;
});
  const [dashboardModes, setDashboardModes] = useState<Record<DashboardArea, DashboardMode>>(() => {
    const nextModes: Record<DashboardArea, DashboardMode> = {
      admin: activePreset.dashboards.admin?.mode ?? "normal",
      client: activePreset.dashboards.client?.mode ?? "normal",
    };

    if (typeof window !== "undefined" && allowDashboardCustomization) {
      (["admin", "client"] as DashboardArea[]).forEach((area) => {
        const storedMode = window.localStorage.getItem(getDashboardModeStorageKey(area));
        if (storedMode === "normal" || storedMode === "custom") {
          nextModes[area] = storedMode;
        }
      });
    }

    return nextModes;
  });

  useLayoutEffect(() => {
    applyThemePairMode(themePairId, themeMode);
  }, [themeMode, themePairId]);

  const setThemePairId = useCallback(
    (nextPairId: string) => {
      if (!allowThemeCustomization) return;
      if (!themePairs.some((entry) => entry.id === nextPairId)) return;
      setThemePairIdState(nextPairId);
      window.localStorage.setItem(THEME_PAIR_STORAGE_KEY, nextPairId);
      const activeThemeId = getThemeIdForPairMode(nextPairId, themeMode);
      window.localStorage.setItem(THEME_STORAGE_KEY, activeThemeId);
    },
    [allowThemeCustomization, themeMode]
  );

  const setThemeMode = useCallback(
    (nextMode: ThemeMode) => {
      if (!allowThemeCustomization) return;
      setThemeModeState(nextMode);
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
      const activeThemeId = getThemeIdForPairMode(themePairId, nextMode);
      window.localStorage.setItem(THEME_STORAGE_KEY, activeThemeId);
    },
    [allowThemeCustomization, themePairId]
  );

  const toggleThemeMode = useCallback(() => {
    setThemeMode(themeMode === "bright" ? "dark" : "bright");
  }, [setThemeMode, themeMode]);

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
      themeId: getThemeIdForPairMode(themePairId, themeMode),
      themePairId,
      themeMode,
      sidebarId,
      dashboards,
    });
  }, [dashboardModes, sidebarId, themeMode, themePairId]);

  const value = useMemo<ClientCustomizationContextValue>(
    () => ({
      activePreset,
      customizationEnabled,
      canCustomizeTheme: allowThemeCustomization,
      canCustomizeSidebar: allowSidebarCustomization,
      canCustomizeDashboard: allowDashboardCustomization,
      themePairId,
      themeMode,
      sidebarId,
      setThemePairId,
      setThemeMode,
      toggleThemeMode,
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
      setThemeMode,
      setThemePairId,
      sidebarId,
      themeMode,
      themePairId,
      toggleThemeMode,
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
