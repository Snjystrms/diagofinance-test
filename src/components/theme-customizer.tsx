"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Check, Palette, Image, Link } from "lucide-react"
import { cn } from "@/lib/utils"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { showDevThemeTools } from "@/components/theme-provider"

interface SidebarThemeOverrides {
  background?: string
  foreground?: string
  primary?: string
  primaryForeground?: string
  accent?: string
  accentForeground?: string
  border?: string
  ring?: string
}

interface ThemeSwatch {
  id: string
  name: string
  leftColor: string
  rightColor: string
  cssVariables: {
    primary: string
    secondary: string
    accent: string
    background: string
    foreground: string
    border: string
    muted: string
    mutedForeground: string
    sidebar?: SidebarThemeOverrides
  }
}

export type ThemeMode = "bright" | "dark"

export interface ThemePair {
  id: string
  name: string
  brightThemeId: string
  darkThemeId: string
}

const themeSwatches: ThemeSwatch[] = [
  {
    id: "default",
    name: "Default",
    leftColor: "#f8fafc",
    rightColor: "#e2e8f0",
    cssVariables: {
      primary: "#3b82f6",
      secondary: "#60a5fa",
      accent: "#93c5fd",
      background: "#ffffff",
      foreground: "#0f172a",
      border: "#e2e8f0",
      muted: "#f8fafc",
      mutedForeground: "#64748b"
    }
  },
  {
    id: "warm",
    name: "Warm",
    leftColor: "#fef7ed",
    rightColor: "#fed7aa",
    cssVariables: {
      primary: "#ea580c",
      secondary: "#f97316",
      accent: "#fb923c",
      background: "#fef7ed",
      foreground: "#451a03",
      border: "#fed7aa",
      muted: "#fef3c7",
      mutedForeground: "#92400e"
    }
  },
  {
    id: "cool",
    name: "Cool",
    leftColor: "#f0f9ff",
    rightColor: "#bae6fd",
    cssVariables: {
      primary: "#0284c7",
      secondary: "#0ea5e9",
      accent: "#38bdf8",
      background: "#f0f9ff",
      foreground: "#0c4a6e",
      border: "#bae6fd",
      muted: "#e0f2fe",
      mutedForeground: "#0369a1"
    }
  },
  {
    id: "nature",
    name: "Nature",
    leftColor: "#f0fdf4",
    rightColor: "#bbf7d0",
    cssVariables: {
      primary: "#16a34a",
      secondary: "#22c55e",
      accent: "#4ade80",
      background: "#f0fdf4",
      foreground: "#14532d",
      border: "#bbf7d0",
      muted: "#dcfce7",
      mutedForeground: "#166534"
    }
  },
  {
    id: "sunset",
    name: "Sunset",
    leftColor: "#fef2f2",
    rightColor: "#fecaca",
    cssVariables: {
      primary: "#ef4444",
      secondary: "#f87171",
      accent: "#fca5a5",
      background: "#fef2f2",
      foreground: "#7f1d1d",
      border: "#fecaca",
      muted: "#fee2e2",
      mutedForeground: "#dc2626"
    }
  },
  {
    id: "ocean",
    name: "Ocean",
    leftColor: "#f0f9ff",
    rightColor: "#c7d2fe",
    cssVariables: {
      primary: "#1e3a8a",
      secondary: "#3730a3",
      accent: "#6366f1",
      background: "#0f172a",
      foreground: "#f0f9ff",
      border: "#334155",
      muted: "#1e293b",
      mutedForeground: "#94a3b8"
    }
  },
  {
    id: "forest",
    name: "Forest",
    leftColor: "#f0fdf4",
    rightColor: "#dcfce7",
    cssVariables: {
      primary: "#14532d",
      secondary: "#166534",
      accent: "#22c55e",
      background: "#f0fdf4",
      foreground: "#14532d",
      border: "#bbf7d0",
      muted: "#dcfce7",
      mutedForeground: "#166534"
    }
  },
  {
    id: "berry",
    name: "Berry",
    leftColor: "#fdf2f8",
    rightColor: "#f9a8d4",
    cssVariables: {
      primary: "#831843",
      secondary: "#be185d",
      accent: "#ec4899",
      background: "#fdf2f8",
      foreground: "#831843",
      border: "#f9a8d4",
      muted: "#fce7f3",
      mutedForeground: "#be185d"
    }
  },
  {
    id: "citrus",
    name: "Citrus",
    leftColor: "#fffbeb",
    rightColor: "#fde68a",
    cssVariables: {
      primary: "#78350f",
      secondary: "#a16207",
      accent: "#eab308",
      background: "#fffbeb",
      foreground: "#78350f",
      border: "#fde68a",
      muted: "#fef3c7",
      mutedForeground: "#a16207"
    }
  },
  {
    id: "lavender",
    name: "Lavender",
    leftColor: "#faf5ff",
    rightColor: "#ddd6fe",
    cssVariables: {
      primary: "#581c87",
      secondary: "#7c3aed",
      accent: "#a855f7",
      background: "#faf5ff",
      foreground: "#581c87",
      border: "#ddd6fe",
      muted: "#f3e8ff",
      mutedForeground: "#7c3aed"
    }
  },
  {
    id: "sage",
    name: "Sage",
    leftColor: "#f6fef7",
    rightColor: "#d1fae5",
    cssVariables: {
      primary: "#064e3b",
      secondary: "#047857",
      accent: "#10b981",
      background: "#f6fef7",
      foreground: "#064e3b",
      border: "#d1fae5",
      muted: "#dcfce7",
      mutedForeground: "#047857"
    }
  },
  {
    id: "coral",
    name: "Coral",
    leftColor: "#fff5f5",
    rightColor: "#fecaca",
    cssVariables: {
      primary: "#7f1d1d",
      secondary: "#dc2626",
      accent: "#f87171",
      background: "#fff5f5",
      foreground: "#7f1d1d",
      border: "#fecaca",
      muted: "#fee2e2",
      mutedForeground: "#dc2626"
    }
  },
  {
    id: "midnight",
    name: "Midnight",
    leftColor: "#1e293b",
    rightColor: "#334155",
    cssVariables: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      accent: "#64748b",
      background: "#0f172a",
      foreground: "#f8fafc",
      border: "#334155",
      muted: "#1e293b",
      mutedForeground: "#94a3b8"
    }
  },
  {
    id: "charcoal",
    name: "Charcoal",
    leftColor: "#374151",
    rightColor: "#4b5563",
    cssVariables: {
      primary: "#f9fafb",
      secondary: "#d1d5db",
      accent: "#6b7280",
      background: "#111827",
      foreground: "#f9fafb",
      border: "#374151",
      muted: "#1f2937",
      mutedForeground: "#9ca3af"
    }
  },
  {
    id: "navy",
    name: "Navy",
    leftColor: "#1e3a8a",
    rightColor: "#1e40af",
    cssVariables: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      accent: "#3b82f6",
      background: "#1e3a8a",
      foreground: "#f8fafc",
      border: "#1e40af",
      muted: "#1e40af",
      mutedForeground: "#94a3b8"
    }
  },
  {
    id: "emerald",
    name: "Emerald",
    leftColor: "#064e3b",
    rightColor: "#065f46",
    cssVariables: {
      primary: "#f0fdf4",
      secondary: "#bbf7d0",
      accent: "#10b981",
      background: "#064e3b",
      foreground: "#f0fdf4",
      border: "#065f46",
      muted: "#065f46",
      mutedForeground: "#a7f3d0"
    }
  },
  {
    id: "ruby",
    name: "Ruby",
    leftColor: "#7f1d1d",
    rightColor: "#991b1b",
    cssVariables: {
      primary: "#fef2f2",
      secondary: "#fecaca",
      accent: "#dc2626",
      background: "#7f1d1d",
      foreground: "#fef2f2",
      border: "#991b1b",
      muted: "#991b1b",
      mutedForeground: "#fecaca"
    }
  },
  {
    id: "sapphire",
    name: "Sapphire",
    leftColor: "#1e3a8a",
    rightColor: "#1e40af",
    cssVariables: {
      primary: "#f0f9ff",
      secondary: "#bae6fd",
      accent: "#3b82f6",
      background: "#1e3a8a",
      foreground: "#f0f9ff",
      border: "#1e40af",
      muted: "#1e40af",
      mutedForeground: "#bae6fd"
    }
  },
  {
    id: "amethyst",
    name: "Amethyst",
    leftColor: "#faf5ff",
    rightColor: "#ddd6fe",
    cssVariables: {
      primary: "#a855f7",
      secondary: "#c084fc",
      accent: "#d8b4fe",
      background: "#faf5ff",
      foreground: "#581c87",
      border: "#ddd6fe",
      muted: "#f3e8ff",
      mutedForeground: "#7c3aed"
    }
  },
  {
    id: "custom",
    name: "Custom",
    leftColor: "#ffffff",
    rightColor: "#f1f5f9",
    cssVariables: {
      primary: "#0f172a",
      secondary: "#475569",
      accent: "#3b82f6",
      background: "#ffffff",
      foreground: "#0f172a",
      border: "#e2e8f0",
      muted: "#f8fafc",
      mutedForeground: "#64748b"
    }
  },
  {
    id: "dark-blue",
    name: "Dark Blue",
    leftColor: "#0f172a",
    rightColor: "#1e293b",
    cssVariables: {
      primary: "#60a5fa",
      secondary: "#93c5fd",
      accent: "#dbeafe",
      background: "#0f172a",
      foreground: "#f8fafc",
      border: "#1e293b",
      muted: "#1e293b",
      mutedForeground: "#94a3b8"
    }
  },
  {
    id: "rose",
    name: "Rose",
    leftColor: "#fff1f2",
    rightColor: "#ffe4e6",
    cssVariables: {
      primary: "#e11d48",
      secondary: "#f43f5e",
      accent: "#fb7185",
      background: "#fff1f2",
      foreground: "#881337",
      border: "#ffe4e6",
      muted: "#fdf2f8",
      mutedForeground: "#be185d"
    }
  },
  {
    id: "noir",
    name: "Noir",
    leftColor: "#020617",
    rightColor: "#0f172a",
    cssVariables: {
      primary: "#6366f1",
      secondary: "#8b5cf6",
      accent: "#22d3ee",
      background: "#020617",
      foreground: "#f8fafc",
      border: "#1e293b",
      muted: "#0f172a",
      mutedForeground: "#94a3b8",
      sidebar: {
        background: "#050a18",
        foreground: "#e2e8f0",
        primary: "#6366f1",
        primaryForeground: "#f8fafc",
        accent: "#0f172a",
        accentForeground: "#e2e8f0",
        border: "#1f2937",
        ring: "#4c1d95"
      }
    }
  },
  {
    id: "classic-bw",
    name: "Classic B/W",
    leftColor: "#000000",
    rightColor: "#f5f5f5",
    cssVariables: {
      primary: "#fafafa",
      secondary: "#d4d4d4",
      accent: "#737373",
      background: "#000000",
      foreground: "#fafafa",
      border: "#262626",
      muted: "#111111",
      mutedForeground: "#a3a3a3",
      sidebar: {
        background: "#050505",
        foreground: "#fafafa",
        primary: "#fafafa",
        primaryForeground: "#050505",
        accent: "#171717",
        accentForeground: "#f5f5f5",
        border: "#262626",
        ring: "#d4d4d4"
      }
    }
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    leftColor: "#0f172a",
    rightColor: "#ec4899",
    cssVariables: {
      primary: "#06b6d4", // Neon Cyan
      secondary: "#ec4899", // Neon Pink
      accent: "#eab308", // Yellow
      background: "#030712", // Deep Space Black
      foreground: "#f3f4f6",
      border: "#1f2937",
      muted: "#111827",
      mutedForeground: "#9ca3af",
      sidebar: {
        background: "#0b0f19",
        foreground: "#f3f4f6",
        primary: "#ec4899",
        primaryForeground: "#030712",
        accent: "#1f2937",
        accentForeground: "#06b6d4",
        border: "#1f2937",
        ring: "#ec4899"
      }
    }
  },
  {
    id: "dracula",
    name: "Dracula Vamp",
    leftColor: "#282a36",
    rightColor: "#ff79c6",
    cssVariables: {
      primary: "#bd93f9", // Purple
      secondary: "#ff79c6", // Pink
      accent: "#50fa7b", // Green
      background: "#282a36", // Dracula BG
      foreground: "#f8f8f2",
      border: "#44475a",
      muted: "#1d1f27",
      mutedForeground: "#6272a4",
      sidebar: {
        background: "#21222c",
        foreground: "#f8f8f2",
        primary: "#ff79c6",
        primaryForeground: "#282a36",
        accent: "#44475a",
        accentForeground: "#8be9fd",
        border: "#44475a",
        ring: "#bd93f9"
      }
    }
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    leftColor: "#1a1b26",
    rightColor: "#7aa2f7",
    cssVariables: {
      primary: "#7aa2f7", // Tokyo Blue
      secondary: "#bb9af7", // Tokyo Purple
      accent: "#f7768e", // Tokyo Red/Pink
      background: "#1a1b26", // Stormy Dark Blue
      foreground: "#a9b1d6",
      border: "#24283b",
      muted: "#16161e",
      mutedForeground: "#565f89",
      sidebar: {
        background: "#12131a",
        foreground: "#a9b1d6",
        primary: "#bb9af7",
        primaryForeground: "#1a1b26",
        accent: "#24283b",
        accentForeground: "#7aa2f7",
        border: "#24283b",
        ring: "#bb9af7"
      }
    }
  },
  {
    id: "matrix-glitch",
    name: "Matrix Glitch",
    leftColor: "#052e16",
    rightColor: "#22c55e",
    cssVariables: {
      primary: "#22c55e", // Bright Green
      secondary: "#4ade80", // Light Green
      accent: "#15803d", // Deep Green
      background: "#020617", // True Deep Black
      foreground: "#dcfce7",
      border: "#14532d",
      muted: "#052e16",
      mutedForeground: "#22c55e",
      sidebar: {
        background: "#022c22", // Terminal Sidebar
        foreground: "#4ade80",
        primary: "#22c55e",
        primaryForeground: "#020617",
        accent: "#042f1a",
        accentForeground: "#86efac",
        border: "#115e59",
        ring: "#22c55e"
      }
    }
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    leftColor: "#2e3440",
    rightColor: "#88c0d0",
    cssVariables: {
      primary: "#88c0d0", // Frost Cyan
      secondary: "#81a1c1", // Ice Blue
      accent: "#b48ead", // Aurora Pink
      background: "#2e3440", // Polar Night Dark
      foreground: "#eceff4",
      border: "#3b4252",
      muted: "#242933",
      mutedForeground: "#d8dee9",
      sidebar: {
        background: "#242933",
        foreground: "#eceff4",
        primary: "#8fbcbb",
        primaryForeground: "#2e3440",
        accent: "#3b4252",
        accentForeground: "#88c0d0",
        border: "#3b4252",
        ring: "#88c0d0"
      }
    }
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    leftColor: "#1e1b4b",
    rightColor: "#f97316",
    cssVariables: {
      primary: "#f97316", // Intense Orange
      secondary: "#facc15", // Electric Yellow
      accent: "#ef4444", // Deep Red
      background: "#0f051d", // Dark Cosmos Purple
      foreground: "#faf5ff",
      border: "#2e1065",
      muted: "#1e1b4b",
      mutedForeground: "#c084fc",
      sidebar: {
        background: "#1e102f",
        foreground: "#faf5ff",
        primary: "#facc15",
        primaryForeground: "#0f051d",
        accent: "#2e1065",
        accentForeground: "#f97316",
        border: "#3b0764",
        ring: "#f97316"
      }
    }
  },
  {
    id: "oceanic-abyss",
    name: "Oceanic Abyss",
    leftColor: "#042f1a",
    rightColor: "#0ea5e9",
    cssVariables: {
      primary: "#0ea5e9", // Electric Blue
      secondary: "#2dd4bf", // Teal Splash
      accent: "#38bdf8", // Sky
      background: "#030712",
      foreground: "#f0f9ff",
      border: "#0f172a",
      muted: "#0c4a6e",
      mutedForeground: "#38bdf8",
      sidebar: {
        background: "#021c24", // Deep Deep Blue/Green
        foreground: "#e0f2fe",
        primary: "#2dd4bf",
        primaryForeground: "#030712",
        accent: "#075985",
        accentForeground: "#f0f9ff",
        border: "#0c4a6e",
        ring: "#0ea5e9"
      }
    }
  },
  {
    id: "crimson-tide",
    name: "Crimson Tide",
    leftColor: "#4c0519",
    rightColor: "#f43f5e",
    cssVariables: {
      primary: "#f43f5e", // Rose Pink
      secondary: "#fda4af", // Light Rose
      accent: "#9f1239", // Deep Wine Red
      background: "#0f0507", // Near-black burgundy
      foreground: "#fff1f2",
      border: "#310c14",
      muted: "#4c0519",
      mutedForeground: "#fb7185",
      sidebar: {
        background: "#1f070c",
        foreground: "#fff1f2",
        primary: "#f43f5e",
        primaryForeground: "#0f0507",
        accent: "#4c0519",
        accentForeground: "#fda4af",
        border: "#4c0519",
        ring: "#f43f5e"
      }
    }
  },
  {
    id: "synthwave-84",
    name: "Synthwave '84",
    leftColor: "#2b213a",
    rightColor: "#f43f5e",
    cssVariables: {
      primary: "#ff79c6", // Neon Pink
      secondary: "#8be9fd", // Neon Cyan
      accent: "#f1fa8c", // Laser Yellow
      background: "#241b2f", // Deep Retro Purple
      foreground: "#f8f8f2",
      border: "#3d2f4d",
      muted: "#1d1626",
      mutedForeground: "#9d8ba9",
      sidebar: {
        background: "#191222",
        foreground: "#f8f8f2",
        primary: "#ff79c6",
        primaryForeground: "#241b2f",
        accent: "#2b213a",
        accentForeground: "#8be9fd",
        border: "#3d2f4d",
        ring: "#ff79c6"
      }
    }
  },
  {
    id: "monokai-pro",
    name: "Monokai Pro",
    leftColor: "#2d2a2e",
    rightColor: "#ffd866",
    cssVariables: {
      primary: "#ffd866", // Mustard Yellow
      secondary: "#fc9867", // Sunset Orange
      accent: "#ab9df2", // Muted Lavender
      background: "#2d2a2e", // Sophisticated Dark Charcoal
      foreground: "#fcfcfa",
      border: "#403e41",
      muted: "#221f22",
      mutedForeground: "#727072",
      sidebar: {
        background: "#221f22",
        foreground: "#fcfcfa",
        primary: "#a9dc76", // Matcha Green
        primaryForeground: "#2d2a2e",
        accent: "#403e41",
        accentForeground: "#ff6188",
        border: "#403e41",
        ring: "#ffd866"
      }
    }
  },
  {
    id: "nord-aurora",
    name: "Nord Aurora",
    leftColor: "#2e3440",
    rightColor: "#a3be8c",
    cssVariables: {
      primary: "#8fbcbb", // Frost Teal
      secondary: "#b48ead", // Muted Plum
      accent: "#ebcb8b", // Soft Gold
      background: "#2e3440", // Classic Nord Slate
      foreground: "#eceff4",
      border: "#3b4252",
      muted: "#242933",
      mutedForeground: "#d8dee9",
      sidebar: {
        background: "#242933",
        foreground: "#eceff4",
        primary: "#a3be8c", // Aurora Green
        primaryForeground: "#2e3440",
        accent: "#3b4252",
        accentForeground: "#88c0d0",
        border: "#3b4252",
        ring: "#8fbcbb"
      }
    }
  },
  {
    id: "midnight-moss",
    name: "Midnight Moss",
    leftColor: "#022c22",
    rightColor: "#fbbf24",
    cssVariables: {
      primary: "#34d399", // Emerald Splash
      secondary: "#fbbf24", // Amber Pop
      accent: "#a7f3d0", // Mint
      background: "#061512", // Deep Velvet Forest
      foreground: "#e6f4ea",
      border: "#112e27",
      muted: "#02110e",
      mutedForeground: "#689f92",
      sidebar: {
        background: "#0a1f1b",
        foreground: "#e6f4ea",
        primary: "#fbbf24",
        primaryForeground: "#061512",
        accent: "#112e27",
        accentForeground: "#34d399",
        border: "#163a31",
        ring: "#34d399"
      }
    }
  },
  {
    id: "deep-ocean-inc",
    name: "Deep Ocean Ink",
    leftColor: "#0f172a",
    rightColor: "#38bdf8",
    cssVariables: {
      primary: "#38bdf8", // Sky Blue
      secondary: "#818cf8", // Indigo Spark
      accent: "#f472b6", // Bubblegum highlight
      background: "#0b0f19", // Near-black oceanic navy
      foreground: "#f1f5f9",
      border: "#1e293b",
      muted: "#0f172a",
      mutedForeground: "#64748b",
      sidebar: {
        background: "#0f1423",
        foreground: "#f1f5f9",
        primary: "#818cf8",
        primaryForeground: "#0b0f19",
        accent: "#1e293b",
        accentForeground: "#38bdf8",
        border: "#1e293b",
        ring: "#38bdf8"
      }
    }
  },
  {
    id: "blood-moon",
    name: "Blood Moon",
    leftColor: "#1a0505",
    rightColor: "#ef4444",
    cssVariables: {
      primary: "#ef4444", // Crimson Red
      secondary: "#f97316", // Ember Orange
      accent: "#f87171", // Soft Red
      background: "#0f0202", // Absolute Void Crimson
      foreground: "#fef2f2",
      border: "#2a0808",
      muted: "#1a0505",
      mutedForeground: "#b91c1c",
      sidebar: {
        background: "#160404",
        foreground: "#fef2f2",
        primary: "#ef4444",
        primaryForeground: "#0f0202",
        accent: "#2a0808",
        accentForeground: "#f97316",
        border: "#3a0c0c",
        ring: "#ef4444"
      }
    }
  },
  {
    id: "rose-gold-dark",
    name: "Rose Quartz",
    leftColor: "#1e1b1c",
    rightColor: "#fda4af",
    cssVariables: {
      primary: "#fda4af", // Dusty Rose Gold
      secondary: "#f472b6", // Muted Pink
      accent: "#e2e8f0",
      background: "#181415", // Warm Luxury Obsidian
      foreground: "#fbcfe8",
      border: "#2e2528",
      muted: "#120e0f",
      mutedForeground: "#9d8286",
      sidebar: {
        background: "#1f191b",
        foreground: "#fbcfe8",
        primary: "#f472b6",
        primaryForeground: "#181415",
        accent: "#2e2528",
        accentForeground: "#fda4af",
        border: "#3a2f33",
        ring: "#fda4af"
      }
    }
  },
  {
    id: "cyber-lime",
    name: "Cyber Lime",
    leftColor: "#171717",
    rightColor: "#a3e635",
    cssVariables: {
      primary: "#a3e635", // High-Vis Lime
      secondary: "#22d3ee", // Cyan Flash
      accent: "#facc15", // Electric Yellow
      background: "#0a0a0a", // Pure Amoled Black
      foreground: "#f4f4f5",
      border: "#27272a",
      muted: "#18181b",
      mutedForeground: "#71717a",
      sidebar: {
        background: "#121212",
        foreground: "#f4f4f5",
        primary: "#a3e635",
        primaryForeground: "#0a0a0a",
        accent: "#27272a",
        accentForeground: "#22d3ee",
        border: "#27272a",
        ring: "#a3e635"
      }
    }
  },
  {
    id: "neon-vamp",
    name: "Neon Vamp",
    leftColor: "#090514",
    rightColor: "#f43f5e",
    cssVariables: {
      primary: "#e11d48", // Crimson Velvet
      secondary: "#c084fc", // Electric Violet
      accent: "#22d3ee", // Cyan Highlight
      background: "#05020a", // Pitch Purple-Black
      foreground: "#f5f3ff",
      border: "#1e1135",
      muted: "#0d061a",
      mutedForeground: "#9333ea",
      sidebar: {
        background: "#090414",
        foreground: "#ede9fe",
        primary: "#c084fc",
        primaryForeground: "#05020a",
        accent: "#1e1135",
        accentForeground: "#22d3ee",
        border: "#291749",
        ring: "#c084fc"
      }
    }
  },
  {
    id: "stealth-amber",
    name: "Stealth Amber",
    leftColor: "#171717",
    rightColor: "#f59e0b",
    cssVariables: {
      primary: "#f59e0b", // Molten Amber
      secondary: "#78350f", // Burnt Sienna
      accent: "#ffffff",
      background: "#0a0a0a", // True Matte Black
      foreground: "#f4f4f5",
      border: "#27272a",
      muted: "#18181b",
      mutedForeground: "#a1a1aa",
      sidebar: {
        background: "#121212",
        foreground: "#fafafa",
        primary: "#f59e0b",
        primaryForeground: "#0a0a0a",
        accent: "#27272a",
        accentForeground: "#fbbf24",
        border: "#27272a",
        ring: "#f59e0b"
      }
    }
  },
  {
    id: "abyssal-emerald",
    name: "Abyssal Emerald",
    leftColor: "#022c22",
    rightColor: "#10b981",
    cssVariables: {
      primary: "#10b981", // High-energy Emerald
      secondary: "#047857", // Deep Forest
      accent: "#a7f3d0", // Jade Ice
      background: "#020806", // Dark Jade Void
      foreground: "#ecfdf5",
      border: "#062e21",
      muted: "#021610",
      mutedForeground: "#059669",
      sidebar: {
        background: "#041c15",
        foreground: "#ecfdf5",
        primary: "#10b981",
        primaryForeground: "#020806",
        accent: "#062e21",
        accentForeground: "#a7f3d0",
        border: "#0c4f3a",
        ring: "#10b981"
      }
    }
  },
  {
    id: "sub-zero",
    name: "Sub Zero",
    leftColor: "#0f172a",
    rightColor: "#38bdf8",
    cssVariables: {
      primary: "#38bdf8", // Glacial Blue
      secondary: "#1d4ed8", // Deep Cobalt
      accent: "#93c5fd", // Frost Spark
      background: "#030712", // Arctic Midnight
      foreground: "#f0f9ff",
      border: "#111827",
      muted: "#0b0f19",
      mutedForeground: "#60a5fa",
      sidebar: {
        background: "#090d16",
        foreground: "#f0f9ff",
        primary: "#38bdf8",
        primaryForeground: "#030712",
        accent: "#1e293b",
        accentForeground: "#93c5fd",
        border: "#1e293b",
        ring: "#38bdf8"
      }
    }
  },
  {
    id: "toxic-waste",
    name: "Toxic Waste",
    leftColor: "#000000",
    rightColor: "#a3e635",
    cssVariables: {
      primary: "#a3e635", // Hazardous Radioactive Lime
      secondary: "#4b5563", // Dark Steel
      accent: "#facc15", // Warning Yellow
      background: "#000000", // Pure AMOLED Ink
      foreground: "#f4f4f5",
      border: "#262626",
      muted: "#171717",
      mutedForeground: "#737373",
      sidebar: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        primary: "#a3e635",
        primaryForeground: "#000000",
        accent: "#171717",
        accentForeground: "#e4e4e7",
        border: "#262626",
        ring: "#a3e635"
      }
    }
  },
  {
    id: "phantom-rose",
    name: "Phantom Rose",
    leftColor: "#1c0d12",
    rightColor: "#fb7185",
    cssVariables: {
      primary: "#fb7185", // Neon Rose petals
      secondary: "#9f1239", // Deep Crimson
      accent: "#f472b6", // Hot Pink highlights
      background: "#090305", // Near-black Burgundy
      foreground: "#fff1f2",
      border: "#2a0f17",
      muted: "#14060b",
      mutedForeground: "#e11d48",
      sidebar: {
        background: "#120509",
        foreground: "#fff1f2",
        primary: "#fb7185",
        primaryForeground: "#090305",
        accent: "#2a0f17",
        accentForeground: "#f472b6",
        border: "#431422",
        ring: "#fb7185"
      }
    }
  },
  {
    id: "graphite",
    name: "Graphite",
    leftColor: "#111827",
    rightColor: "#1f2937",
    cssVariables: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#facc15",
      background: "#0b1120",
      foreground: "#f8fafc",
      border: "#1f2937",
      muted: "#111827",
      mutedForeground: "#9ca3af",
      sidebar: {
        background: "#111827",
        foreground: "#f8fafc",
        primary: "#f97316",
        primaryForeground: "#0b0f19",
        accent: "#1f2937",
        accentForeground: "#fde68a",
        border: "#1f2937",
        ring: "#fb923c"
      }
    }
  },
  {
    id: "purple-noir",
    name: "Purple Noir",
    leftColor: "#2e1065",
    rightColor: "#000000",
    cssVariables: {
      primary: "#a855f7",
      secondary: "#c084fc",
      accent: "#7c3aed",
      background: "#000000",
      foreground: "#f5f3ff",
      border: "#27272a",
      muted: "#09090b",
      mutedForeground: "#a1a1aa",
      sidebar: {
        background: "#0a0a0f",
        foreground: "#ede9fe",
        primary: "#a855f7",
        primaryForeground: "#0a0a0f",
        accent: "#1a1129",
        accentForeground: "#ddd6fe",
        border: "#27272a",
        ring: "#7c3aed"
      }
    }
  },
 {
  id: "golden-bull-bright",
  name: "Golden Bull Bright",
  leftColor: "#F6F1E8",
  rightColor: "#EDE4D2",

  cssVariables: {
    primary: "#B8860B",          // Deep golden amber
    secondary: "#A16518",        // Rich burnt orange-gold
    accent: "#D9A520",           // Vibrant metallic gold

    background: "#F8F4EC",       // Warm ivory
    foreground: "#2B2116",       // Dark espresso brown

    border: "#DCCBA8",           // Soft champagne border

    muted: "#EFE5D3",            // Warm card/surface color
    mutedForeground: "#7A6547",  // Warm brown-grey

    sidebar: {
      background: "#F2E8D8",         // Slightly darker than page bg
      foreground: "#2B2116",

      primary: "#B8860B",
      primaryForeground: "#FFFFFF",

      accent: "#E6D3AA",             // Hover state
      accentForeground: "#A16518",

      border: "#DCCBA8",
      ring: "#D9A520"
    }
  }
},
  {
    id: "golden-bull-dark",
    name: "Golden Bull Dark",
    leftColor: "#0D0B09",
    rightColor: "#211D17",
    cssVariables: {
      primary: "#C9A84C",          // Warm gold — richer than flat #CBB067, leather-toned
      secondary: "#7D5B20",        // Deep amber-brown — replaces the cold grey secondary
      accent: "#E8C96A",           // Bright highlight gold — for active states, glow
      background: "#0D0B09",       // Warm near-black — brown undertone, NOT cold grey-black
      foreground: "#F2EDE6",       // Warm off-white — soft on eyes, natural with leather bg
      border: "#2A2218",           // Warm dark border — clearly visible against bg, has depth
      muted: "#1C1812",            // Warm surface — distinct from bg, not muddy
      mutedForeground: "#9A8C7A",  // Warm stone — readable without being too bright
      sidebar: {
        background: "#100E0C",         // Slightly darker / richer than page bg
        foreground: "#F2EDE6",
        primary: "#C9A84C",
        primaryForeground: "#0D0B09",
        accent: "#211D17",             // Hover state — clearly distinct from sidebar bg
        accentForeground: "#E8C96A",
        border: "#2A2218",
        ring: "#E8C96A"
      }
    }
  }
]

const swatchById = new Map(themeSwatches.map((swatch) => [swatch.id, swatch]))

export function isGoldenBullTheme(pairId: string, mode?: ThemeMode): boolean {
  const pair = themePairs.find((p) => p.id === pairId)
  if (!pair) return false
  const themeId = mode === "dark" ? pair.darkThemeId : pair.brightThemeId
  return themeId === "golden-bull-dark" || themeId === "golden-bull-bright"
}

export const themePairs: ThemePair[] = [
  { id: "clean-slate", name: "Clean Slate", brightThemeId: "default", darkThemeId: "charcoal" },
  { id: "amber-glow", name: "Amber Glow", brightThemeId: "warm", darkThemeId: "stealth-amber" },
  { id: "arctic-cyan", name: "Arctic Cyan", brightThemeId: "cool", darkThemeId: "sub-zero" },
  { id: "evergreen", name: "Evergreen", brightThemeId: "nature", darkThemeId: "abyssal-emerald" },
  { id: "red-horizon", name: "Red Horizon", brightThemeId: "sunset", darkThemeId: "crimson-tide" },
  { id: "ocean-drive", name: "Ocean Drive", brightThemeId: "ocean", darkThemeId: "deep-ocean-inc" },
  { id: "forest-night", name: "Forest Night", brightThemeId: "forest", darkThemeId: "midnight-moss" },
  { id: "berry-neon", name: "Berry Neon", brightThemeId: "berry", darkThemeId: "phantom-rose" },
  { id: "citrus-toxic", name: "Citrus Toxic", brightThemeId: "citrus", darkThemeId: "toxic-waste" },
  { id: "lavender-noir", name: "Lavender Noir", brightThemeId: "lavender", darkThemeId: "purple-noir" },
  { id: "sage-matrix", name: "Sage Matrix", brightThemeId: "sage", darkThemeId: "matrix-glitch" },
  { id: "coral-blood", name: "Coral Blood", brightThemeId: "coral", darkThemeId: "blood-moon" },
  { id: "midnight-ivory", name: "Midnight Ivory", brightThemeId: "custom", darkThemeId: "midnight" },
  { id: "blue-shift", name: "Blue Shift", brightThemeId: "dark-blue", darkThemeId: "navy" },
  { id: "rose-vamp", name: "Rose Vamp", brightThemeId: "rose", darkThemeId: "neon-vamp" },
  { id: "mono-contrast", name: "Mono Contrast", brightThemeId: "amethyst", darkThemeId: "classic-bw" },
  { id: "noir-radiant", name: "Noir Radiant", brightThemeId: "sapphire", darkThemeId: "noir" },
  { id: "cyber-wave", name: "Cyber Wave", brightThemeId: "ruby", darkThemeId: "cyberpunk" },
  { id: "dracula-dusk", name: "Dracula Dusk", brightThemeId: "sunset", darkThemeId: "dracula" },
  { id: "tokyo-frost", name: "Tokyo Frost", brightThemeId: "cool", darkThemeId: "tokyo-night" },
  { id: "nord-tundra", name: "Nord Tundra", brightThemeId: "nord-aurora", darkThemeId: "nordic-frost" },
  { id: "solar-abyss", name: "Solar Abyss", brightThemeId: "solar-flare", darkThemeId: "oceanic-abyss" },
  { id: "synth-graphite", name: "Synth Graphite", brightThemeId: "synthwave-84", darkThemeId: "graphite" },
  { id: "gold-obsidian", name: "Gold Obsidian", brightThemeId: "rose-gold-dark", darkThemeId: "monokai-pro" },
  { id: "golden-bull", name: "Golden Bull", brightThemeId: "golden-bull-bright", darkThemeId: "golden-bull-dark" }
]

const defaultThemePair = themePairs[0]

const legacyThemeToPairMode = new Map<string, { pairId: string; mode: ThemeMode }>()
themePairs.forEach((pair) => {
  legacyThemeToPairMode.set(pair.brightThemeId, { pairId: pair.id, mode: "bright" })
  legacyThemeToPairMode.set(pair.darkThemeId, { pairId: pair.id, mode: "dark" })
})

interface ThemeCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** ---------- Utilities ---------- **/

// Convert #rrggbb to relative luminance (0 = black, 1 = white)
function hexToLuminance(hex: string): number {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  const srgb = [r, g, b].map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

function isDarkTheme(bgHex: string): boolean {
  try {
    return hexToLuminance(bgHex) < 0.35
  } catch {
    // Fallback heuristic
    return bgHex.startsWith("#0") || bgHex.startsWith("#1") || bgHex.startsWith("#2") || bgHex.startsWith("#3")
  }
}

function writeVariables(target: HTMLElement, vars: ThemeSwatch["cssVariables"]) {
  // Core variables used by shadcn/ui
  target.style.setProperty("--primary", vars.primary)
  target.style.setProperty("--secondary", vars.secondary)
  target.style.setProperty("--accent", vars.accent)

  const sidebarVars = vars.sidebar ?? {}
  const sidebarBackground = sidebarVars.background ?? vars.background
  const sidebarForeground = sidebarVars.foreground ?? vars.foreground
  const sidebarPrimary = sidebarVars.primary ?? vars.primary
  const sidebarPrimaryForeground = sidebarVars.primaryForeground ?? vars.foreground
  const sidebarAccent = sidebarVars.accent ?? vars.accent
  const sidebarAccentForeground =
    sidebarVars.accentForeground ?? vars.foreground
  const sidebarBorder = sidebarVars.border ?? vars.border
  const sidebarRing = sidebarVars.ring ?? vars.border

  target.style.setProperty("--background", vars.background)
  target.style.setProperty("--card", vars.background)
  target.style.setProperty("--popover", vars.background)
  target.style.setProperty("--sidebar", sidebarBackground)

  target.style.setProperty("--foreground", vars.foreground)
  target.style.setProperty("--card-foreground", vars.foreground)
  target.style.setProperty("--popover-foreground", vars.foreground)
  target.style.setProperty("--sidebar-foreground", sidebarForeground)

  target.style.setProperty("--sidebar-primary", sidebarPrimary)
  target.style.setProperty("--sidebar-primary-foreground", sidebarPrimaryForeground)
  target.style.setProperty("--sidebar-accent", sidebarAccent)
  target.style.setProperty("--sidebar-accent-foreground", sidebarAccentForeground)
  target.style.setProperty("--sidebar-border", sidebarBorder)
  target.style.setProperty("--sidebar-ring", sidebarRing)

  target.style.setProperty("--border", vars.border)
  target.style.setProperty("--muted", vars.muted)
  target.style.setProperty("--muted-foreground", vars.mutedForeground)

  // Back-compat custom vars
  target.style.setProperty("--color-primary", vars.primary)
  target.style.setProperty("--color-secondary", vars.secondary)
  target.style.setProperty("--color-accent", vars.accent)
}

function clearVariables(target: HTMLElement) {
  const keys = [
    "--primary",
    "--secondary",
    "--accent",
    "--background",
    "--card",
    "--popover",
    "--sidebar",
    "--foreground",
    "--card-foreground",
    "--popover-foreground",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
    "--border",
    "--muted",
    "--muted-foreground",
    "--color-primary",
    "--color-secondary",
    "--color-accent"
  ]
  keys.forEach(k => target.style.removeProperty(k))
}

export function resolveThemePairMode(themeId: string): { pairId: string; mode: ThemeMode } {
  const pairById = themePairs.find((pair) => pair.id === themeId)
  if (pairById) {
    return { pairId: pairById.id, mode: "bright" }
  }
  return legacyThemeToPairMode.get(themeId) ?? { pairId: defaultThemePair.id, mode: "bright" }
}

export function getThemeIdForPairMode(pairId: string, mode: ThemeMode): string {
  const pair = themePairs.find((entry) => entry.id === pairId) ?? defaultThemePair
  return mode === "dark" ? pair.darkThemeId : pair.brightThemeId
}

export function applyThemePairMode(pairId: string, mode: ThemeMode) {
  if (typeof document === "undefined") return

  const themeId = getThemeIdForPairMode(pairId, mode)
  const theme = swatchById.get(themeId) ?? themeSwatches[0]
  if (!theme) return

  const root = document.documentElement
  const darkContainer = document.querySelector(".dark") as HTMLElement | null
  const dark = isDarkTheme(theme.cssVariables.background)

  if (dark) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }

  clearVariables(root)
  if (darkContainer) clearVariables(darkContainer)

  const target = dark ? (darkContainer || root) : root
  writeVariables(target, theme.cssVariables)
}

export function applyThemeById(themeId: string) {
  const resolved = resolveThemePairMode(themeId)
  applyThemePairMode(resolved.pairId, resolved.mode)
}

/** ---------- Component ---------- **/

export function ThemeCustomizer({ open, onOpenChange }: ThemeCustomizerProps) {
  const { canCustomizeTheme, themePairId, setThemePairId } = useClientCustomization()
  const [activeTab, setActiveTab] = useState<"background" | "shortcuts" | "color-theme">("color-theme")
  const [selectedThemePairId, setSelectedThemePairId] = useState<string>(themePairId)
  const [initialThemePairId, setInitialThemePairId] = useState<string>(themePairId)

  useEffect(() => {
    if (!open) return
    setSelectedThemePairId(themePairId)
    setInitialThemePairId(themePairId)
  }, [open, themePairId])

  const handleThemeSelect = (pairId: string) => {
    if (!canCustomizeTheme) return
    setSelectedThemePairId(pairId)
    setThemePairId(pairId)
  }

  const handleDone = () => {
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedThemePairId(initialThemePairId)
    setThemePairId(initialThemePairId)
    onOpenChange(false)
  }

  if (!showDevThemeTools) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "color-theme":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
              {themePairs.map((pair) => {
                const brightTheme = swatchById.get(pair.brightThemeId)
                const darkTheme = swatchById.get(pair.darkThemeId)
                const leftColor = brightTheme?.leftColor ?? "#f8fafc"
                const rightColor = darkTheme?.rightColor ?? "#0f172a"
                return (
                <button
                  key={pair.id}
                  onClick={() => handleThemeSelect(pair.id)}
                  disabled={!canCustomizeTheme}
                  className={cn(
                    "relative w-12 h-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    canCustomizeTheme && "hover:scale-105",
                    selectedThemePairId === pair.id && "ring-2 ring-blue-500 ring-offset-2"
                  )}
                  title={pair.name}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <div
                      className="w-1/2 h-full float-left"
                      style={{ backgroundColor: leftColor }}
                    />
                    <div
                      className="w-1/2 h-full float-right"
                      style={{ backgroundColor: rightColor }}
                    />
                  </div>
                  {selectedThemePairId === pair.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-5 h-5 text-blue-600 bg-white rounded-full p-0.5" />
                    </div>
                  )}
                </button>
                )
              })}
            </div>
          </div>
        )
      case "background":
        return (
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Background customization coming soon</p>
            </div>
          </div>
        )
      case "shortcuts":
        return (
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Shortcuts customization coming soon</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setInitialThemePairId(selectedThemePairId)
      }
      onOpenChange(o)
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center">Customize this page</DialogTitle>
        </DialogHeader>

        <div className="flex h-[500px]">
          {/* Left Sidebar */}
          <div className="w-48 border-r pr-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("background")}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "background"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Image className="w-4 h-4" />
                <span>Background</span>
              </button>

              <button
                onClick={() => setActiveTab("shortcuts")}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "shortcuts"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Link className="w-4 h-4" />
                <span>Shortcuts</span>
              </button>

              <button
                onClick={() => setActiveTab("color-theme")}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors",
                  activeTab === "color-theme"
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <Palette className="w-4 h-4" />
                <span>Color and theme</span>
              </button>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 pl-6">
            <ScrollArea className="h-full pr-4">
              {renderTabContent()}
            </ScrollArea>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Bottom Buttons */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleDone} disabled={!canCustomizeTheme}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
