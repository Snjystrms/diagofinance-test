"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Check, Palette, Image, Link } from "lucide-react"
import { cn } from "@/lib/utils"

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
      accent: "#6366f1"
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
      accent: "#22c55e"
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
      accent: "#ec4899"
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
      accent: "#eab308"
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
      accent: "#a855f7"
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
      accent: "#10b981"
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
      accent: "#f87171"
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
      accent: "#6b7280"
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
      accent: "#3b82f6"
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
      accent: "#10b981"
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
      accent: "#dc2626"
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
      accent: "#3b82f6"
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
  }
]

interface ThemeCustomizerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ThemeCustomizer({ open, onOpenChange }: ThemeCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"background" | "shortcuts" | "color-theme">("color-theme")
  const [selectedTheme, setSelectedTheme] = useState<string>("default")

  useEffect(() => {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("selected-theme")
    if (savedTheme) {
      setSelectedTheme(savedTheme)
      applyTheme(savedTheme)
    }

    // Cleanup function to reset theme when component unmounts
    return () => {
      if (!localStorage.getItem("selected-theme")) {
        resetToDefaultTheme()
      }
    }
  }, [])

  const applyTheme = (themeId: string) => {
    const theme = themeSwatches.find(t => t.id === themeId)
    if (theme) {
      const root = document.documentElement
      
      // Apply theme to the actual CSS variables used by components
      root.style.setProperty("--primary", theme.cssVariables.primary)
      root.style.setProperty("--secondary", theme.cssVariables.secondary)
      root.style.setProperty("--accent", theme.cssVariables.accent)
      
      // Apply background and surface colors
      root.style.setProperty("--background", theme.cssVariables.background)
      root.style.setProperty("--card", theme.cssVariables.background)
      root.style.setProperty("--popover", theme.cssVariables.background)
      root.style.setProperty("--sidebar", theme.cssVariables.background)
      
      // Apply text colors
      root.style.setProperty("--foreground", theme.cssVariables.foreground)
      root.style.setProperty("--card-foreground", theme.cssVariables.foreground)
      root.style.setProperty("--popover-foreground", theme.cssVariables.foreground)
      root.style.setProperty("--sidebar-foreground", theme.cssVariables.foreground)
      
      // Apply border and muted colors
      root.style.setProperty("--border", theme.cssVariables.border)
      root.style.setProperty("--muted", theme.cssVariables.muted)
      root.style.setProperty("--muted-foreground", theme.cssVariables.mutedForeground)
      
      // Also set the custom variables for backward compatibility
      root.style.setProperty("--color-primary", theme.cssVariables.primary)
      root.style.setProperty("--color-secondary", theme.cssVariables.secondary)
      root.style.setProperty("--color-accent", theme.cssVariables.accent)
      
      // Store in localStorage
      localStorage.setItem("selected-theme", themeId)
    }
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
    // Reset to default shadcn/ui colors
    root.style.removeProperty("--primary")
    root.style.removeProperty("--secondary")
    root.style.removeProperty("--accent")
    root.style.removeProperty("--background")
    root.style.removeProperty("--foreground")
    root.style.removeProperty("--card")
    root.style.removeProperty("--card-foreground")
    root.style.removeProperty("--popover")
    root.style.removeProperty("--popover-foreground")
    root.style.removeProperty("--sidebar")
    root.style.removeProperty("--sidebar-foreground")
    root.style.removeProperty("--border")
    root.style.removeProperty("--muted")
    root.style.removeProperty("--muted-foreground")
    root.style.removeProperty("--color-primary")
    root.style.removeProperty("--color-secondary")
    root.style.removeProperty("--color-accent")
  }

  const handleCancel = () => {
    // Reset to default theme
    resetToDefaultTheme()
    setSelectedTheme("default")
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
              <Image className="w-12 h-12 mx-auto mb-4 opacity-50" alt="Background icon" />
              <p>Background customization coming soon</p>
            </div>
          </div>
        )
      case "shortcuts":
        return (
          <div className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Link className="w-12 h-12 mx-auto mb-4 opacity-50" alt="Shortcuts icon" />
              <p>Shortcuts customization coming soon</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <Image className="w-4 h-4" alt="Background" />
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
                <Link className="w-4 h-4" alt="Shortcuts" />
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