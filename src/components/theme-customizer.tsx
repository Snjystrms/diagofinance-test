"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Check, Palette, Image, Link } from "lucide-react"
import { cn } from "@/lib/utils"

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
  }
]

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

/** ---------- Component ---------- **/

export function ThemeCustomizer({ open, onOpenChange }: ThemeCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"background" | "shortcuts" | "color-theme">("color-theme")
  const [selectedTheme, setSelectedTheme] = useState<string>("default")
  const [initialTheme, setInitialTheme] = useState<string>("default")

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("selected-theme")
    const themeToUse = savedTheme || "default"
    setSelectedTheme(themeToUse)
    setInitialTheme(themeToUse)
    applyTheme(themeToUse)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyTheme = (themeId: string) => {
    const theme = themeSwatches.find(t => t.id === themeId)
    if (!theme) return

    const root = document.documentElement
    const darkContainer = document.querySelector(".dark") as HTMLElement | null

    const dark = isDarkTheme(theme.cssVariables.background)

    // Toggle .dark class to match theme brightness
    if (dark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    // Always clear both scopes first to avoid residuals
    clearVariables(root)
    if (darkContainer) clearVariables(darkContainer)

    // Write into the correct scope:
    // - For dark themes, write into `.dark` (Tailwind/Shadcn resolve vars there)
    // - For light themes, write into `:root`
    const target = dark ? (darkContainer || root) : root
    writeVariables(target, theme.cssVariables)

    localStorage.setItem("selected-theme", themeId)
  }

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId)
    applyTheme(themeId)
  }

  const handleDone = () => {
    onOpenChange(false)
  }

  const resetToDefaultTheme = () => {
    const root = document.documentElement
    const darkContainer = document.querySelector(".dark") as HTMLElement | null
    clearVariables(root)
    if (darkContainer) clearVariables(darkContainer)
    // Do not forcibly toggle dark here; respect current app mode
  }

  const handleCancel = () => {
    // Revert to the theme that was active when dialog opened
    setSelectedTheme(initialTheme)
    applyTheme(initialTheme)
    onOpenChange(false)
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "color-theme":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
              {themeSwatches.map((swatch) => (
                <button
                  key={swatch.id}
                  onClick={() => handleThemeSelect(swatch.id)}
                  className={cn(
                    "relative w-12 h-12 rounded-full transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                    selectedTheme === swatch.id && "ring-2 ring-blue-500 ring-offset-2"
                  )}
                  title={swatch.name}
                >
                  <div className="w-full h-full rounded-full overflow-hidden">
                    <div
                      className="w-1/2 h-full float-left"
                      style={{ backgroundColor: swatch.leftColor }}
                    />
                    <div
                      className="w-1/2 h-full float-right"
                      style={{ backgroundColor: swatch.rightColor }}
                    />
                  </div>
                  {selectedTheme === swatch.id && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-5 h-5 text-blue-600 bg-white rounded-full p-0.5" />
                    </div>
                  )}
                </button>
              ))}
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
        // closing: persist current selection as initial
        setInitialTheme(selectedTheme)
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
          <Button onClick={handleDone}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}