"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Check, Layout } from "lucide-react"
import { cn } from "@/lib/utils"
import { useClientCustomization } from "@/contexts/client-customization-context"
import type { SidebarId } from "@/lib/client-presets"

interface SidebarOption {
  id: string
  name: string
  description: string
  preview: React.ReactNode
}

const sidebarOptions: SidebarOption[] = [
  {
    id: "default",
    name: "Default Sidebar",
    description: "Standard single-panel sidebar with collapsible navigation",
    preview: (
      <div className="w-full h-24 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-16 bg-blue-500 rounded"></div>
          <div className="w-24 h-16 bg-blue-400 dark:bg-blue-800 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "two-panel",
    name: "Two-Panel Sidebar",
    description: "Icon sidebar with expandable content panel",
    preview: (
      <div className="w-full h-24 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-16 bg-purple-500 rounded"></div>
          <div className="w-10 h-16 bg-purple-400 dark:bg-purple-800 rounded"></div>
          <div className="w-32 h-16 bg-purple-300 dark:bg-purple-700 rounded"></div>
        </div>
      </div>
    ),
  },
  {
    id: "expanded-panel",
    name: "Expanded Panel Sidebar",
    description: "Icon sidebar with always-visible expanded content panel and enhanced styling",
    preview: (
      <div className="w-full h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-2 h-16 bg-emerald-500 rounded"></div>
          <div className="w-10 h-16 bg-emerald-400 dark:bg-emerald-800 rounded"></div>
          <div className="w-40 h-16 bg-emerald-300 dark:bg-emerald-700 rounded"></div>
        </div>
      </div>
    ),
  },
]

interface SidebarSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SidebarSelector({ open, onOpenChange }: SidebarSelectorProps) {
  const { canCustomizeSidebar, sidebarId, setSidebarId } = useClientCustomization()
  const [selectedSidebar, setSelectedSidebar] = useState<SidebarId>(sidebarId)
  const [initialSidebar, setInitialSidebar] = useState<SidebarId>(sidebarId)

  useEffect(() => {
    if (!open) return
    setSelectedSidebar(sidebarId)
    setInitialSidebar(sidebarId)
  }, [open, sidebarId])

  const handleSidebarSelect = (sidebarId: SidebarId) => {
    if (!canCustomizeSidebar) return
    setSelectedSidebar(sidebarId)
    setSidebarId(sidebarId)
  }

  const handleDone = () => {
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedSidebar(initialSidebar)
    setSidebarId(initialSidebar)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        // closing: persist current selection as initial
        setInitialSidebar(selectedSidebar)
      }
      onOpenChange(o)
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Layout className="w-5 h-5" />
            Choose Sidebar Layout
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 pr-4">
            <div className="grid grid-cols-1 gap-4 py-4">
              {sidebarOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSidebarSelect(option.id as SidebarId)}
                  disabled={!canCustomizeSidebar}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
                    canCustomizeSidebar && "hover:scale-[1.02]",
                    selectedSidebar === option.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-sm">{option.name}</h3>
                        {selectedSidebar === option.id && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {option.description}
                      </p>
                      <div className="w-full">
                        {option.preview}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator className="my-4" />

        {/* Bottom Buttons */}
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleDone} disabled={!canCustomizeSidebar}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

