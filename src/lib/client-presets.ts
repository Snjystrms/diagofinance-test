import type { Layout } from "react-grid-layout";

export type SidebarId = "default" | "two-panel" | "expanded-panel";
export type DashboardArea = "admin" | "client";
export type DashboardMode = "normal" | "custom";

export interface DashboardPresetConfig {
  mode: DashboardMode;
  layout?: Layout[];
  hiddenWidgets?: string[];
}

export interface ClientPreset {
  id: string;
  name: string;
  themeId: string;
  themePairId?: string;
  themeMode?: "bright" | "dark";
  sidebarId: SidebarId;
  dashboards: Partial<Record<DashboardArea, DashboardPresetConfig>>;
  locks: {
    theme: boolean;
    sidebar: boolean;
    dashboardLayout: boolean;
  };
}

export const THEME_STORAGE_KEY = "selected-theme";
export const THEME_PAIR_STORAGE_KEY = "selected-theme-pair";
export const THEME_MODE_STORAGE_KEY = "selected-theme-mode";
export const SIDEBAR_STORAGE_KEY = "selected-sidebar";

export const getDashboardStorageKey = (area: DashboardArea) => `${area}_dashboard`;
export const getDashboardModeStorageKey = (area: DashboardArea) => `dashboard_mode_${area}`;
export const getDashboardLayoutStorageKey = (area: DashboardArea) =>
  `dashboard_grid_layouts_${getDashboardStorageKey(area)}`;
export const getDashboardHiddenStorageKey = (area: DashboardArea) =>
  `dashboard_grid_hidden_${getDashboardStorageKey(area)}`;

export const defaultClientPreset: ClientPreset = {
  id: "default",
  name: "Default CRM Preset",
  themeId: "golden-bull-dark",
  themePairId: "golden-bull",
  themeMode: "bright",
  sidebarId: "default",
  dashboards: {
    admin: {
      mode: "normal",
      layout: [],
      hiddenWidgets: [],
    },
    client: {
      mode: "normal",
      layout: [],
      hiddenWidgets: [],
    },
  },
  locks: {
    theme: false,
    sidebar: true,
    dashboardLayout: true,
  },
};

const clientPresets: Record<string, ClientPreset> = {
  default: defaultClientPreset,
  "client-a": {
    id: "client-a",
    name: "Client A Preset",
    themeId: "golden-bull-dark",
    themePairId: "golden-bull",
    themeMode: "bright",
    sidebarId: "two-panel",
    dashboards: {
      admin: {
        mode: "normal",
        layout: [],
        hiddenWidgets: [],
      },
      client: {
        mode: "custom",
        layout: [],
        hiddenWidgets: [],
      },
    },
    locks: {
      theme: false,
      sidebar: true,
      dashboardLayout: true,
    },
  },
  diagofinance: {
    id: "diagofinance",
    name: "Diagofinance Preset",
    themeId: "diagofinance-dark",
    themePairId: "diagofinance",
    themeMode: "dark",
    sidebarId: "default",
    dashboards: {
      admin: {
        mode: "normal",
        layout: [],
        hiddenWidgets: [],
      },
      client: {
        mode: "normal",
        layout: [],
        hiddenWidgets: [],
      },
    },
    locks: {
      theme: false,
      sidebar: true,
      dashboardLayout: true,
    },
  },
};

export const getActiveClientPresetId = () => process.env.NEXT_PUBLIC_CLIENT_PRESET || "default";

export const getActiveClientPreset = () =>
  clientPresets[getActiveClientPresetId()] ?? defaultClientPreset;

export const isCustomizationModeEnabled = () =>
  process.env.NEXT_PUBLIC_ENABLE_CUSTOMIZER === "true" || process.env.NODE_ENV !== "production";

export const readStoredJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`Failed to parse stored customization value for ${key}:`, error);
    return null;
  }
};

export const buildPresetSnapshot = (preset: ClientPreset, overrides: Partial<ClientPreset>) =>
  JSON.stringify(
    {
      ...preset,
      ...overrides,
      dashboards: {
        ...preset.dashboards,
        ...overrides.dashboards,
      },
      locks: {
        ...preset.locks,
        ...overrides.locks,
      },
    },
    null,
    2
  );

export const parsePresetSnapshot = (value: string): ClientPreset | null => {
  try {
    return JSON.parse(value) as ClientPreset;
  } catch (error) {
    console.error("Failed to parse preset snapshot:", error);
    return null;
  }
};
