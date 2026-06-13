"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import dynamic from "next/dynamic"

const AppSidebarV2 = dynamic(() => import("@/components/app-sidebar-v2").then((m) => ({ default: m.AppSidebarV2 })), { ssr: false })
const AppSidebarV3 = dynamic(() => import("@/components/app-sidebar-v3").then((m) => ({ default: m.AppSidebarV3 })), { ssr: false })
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useEffect } from "react"
import { useClientCustomization } from "@/contexts/client-customization-context"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarId: selectedSidebar } = useClientCustomization();

  useEffect(() => {
    if (selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel") {
      document.cookie = "sidebar_state=false; path=/; max-age=0";
    }
  }, [selectedSidebar]);

  return (
    <SidebarProvider
      defaultOpen={selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel" ? false : true}
      open={selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel" ? false : undefined}
      style={
        selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel"
          ? {
              "--sidebar-width": selectedSidebar === "expanded-panel" ? "400px" : "350px",
            } as React.CSSProperties
          : {
              "--sidebar-width": "20rem",
            } as React.CSSProperties
      }
    >
      {selectedSidebar === "two-panel" ? (
        <AppSidebarV2 className="hidden md:flex" />
      ) : selectedSidebar === "expanded-panel" ? (
        <AppSidebarV3 className="hidden md:flex" />
      ) : (
        <AppSidebar className="hidden md:flex flex-shrink-0" />
      )}
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-5 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
} 
