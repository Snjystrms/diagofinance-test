"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useEffect } from "react"
import dynamic from "next/dynamic"
import { useClientCustomization } from "@/contexts/client-customization-context"

const AppSidebarV2 = dynamic(() => import("@/components/app-sidebar-v2").then((m) => ({ default: m.AppSidebarV2 })), { ssr: false })
const AppSidebarV3 = dynamic(() => import("@/components/app-sidebar-v3").then((m) => ({ default: m.AppSidebarV3 })), { ssr: false })

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { sidebarId: selectedSidebar } = useClientCustomization();

  // Clear sidebar cookie when switching to two-panel or expanded-panel to ensure it starts collapsed
  useEffect(() => {
    if (selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel") {
      // Clear the sidebar state cookie to force collapsed state
      document.cookie = "sidebar_state=false; path=/; max-age=0";
    }
  }, [selectedSidebar]);

  return (
    <ProtectedRoute>
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
          <AppSidebar className="hidden md:flex flex-shrink-0 " />
        )}
        <SidebarInset>
          <Header />
          <DashboardBreadcrumbs />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
