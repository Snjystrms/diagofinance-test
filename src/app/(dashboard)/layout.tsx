"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { IbDashboardSidebarWrapper } from "@/components/ib-dashboard-sidebar-wrapper"
import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useClientCustomization } from "@/contexts/client-customization-context"
import Image from "next/image"

const AppSidebarV2 = dynamic(() => import("@/components/app-sidebar-v2").then((m) => ({ default: m.AppSidebarV2 })), { ssr: false })
const AppSidebarV3 = dynamic(() => import("@/components/app-sidebar-v3").then((m) => ({ default: m.AppSidebarV3 })), { ssr: false })

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { sidebarId: selectedSidebar, themeMode } = useClientCustomization();
  const isIbPortal =
    user?.type === "user" &&
    Boolean(user?.is_ib_user) &&
    pathname.startsWith("/ib-dashboard");
  const usesClientCustomization = !isIbPortal;

  // Clear sidebar cookie when switching to two-panel or expanded-panel to ensure it starts collapsed
  useEffect(() => {
    if (
      usesClientCustomization &&
      (selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel")
    ) {
      // Clear the sidebar state cookie to force collapsed state
      document.cookie = "sidebar_state=false; path=/; max-age=0";
    }
  }, [selectedSidebar, usesClientCustomization]);

  return (
    <ProtectedRoute>
      <SidebarProvider
        defaultOpen={
          isIbPortal
            ? true
            : selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel"
              ? false
              : true
        }
        open={
          isIbPortal
            ? undefined
            : selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel"
              ? false
              : undefined
        }
        style={
          isIbPortal
            ? ({
                "--sidebar-width": "22rem",
                "--sidebar-width-icon": "5.25rem",
              } as React.CSSProperties)
            : selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel"
            ? {
                "--sidebar-width": selectedSidebar === "expanded-panel" ? "400px" : "350px",
              } as React.CSSProperties
            : {
                "--sidebar-width": "20rem",
          } as React.CSSProperties
        }
      >
        {isIbPortal ? (
          <IbDashboardSidebarWrapper className="hidden md:flex flex-shrink-0" />
        ) : selectedSidebar === "two-panel" ? (
          <AppSidebarV2 className="hidden md:flex" />
        ) : selectedSidebar === "expanded-panel" ? (
          <AppSidebarV3 className="hidden md:flex" />
        ) : (
          <AppSidebar className="hidden md:flex flex-shrink-0 " />
        )}
        <SidebarInset>
          <Header />
          <DashboardBreadcrumbs />
          <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background p-3 sm:p-4 lg:p-6">
            <div className="pointer-events-none fixed bottom-4 right-4 z-0 h-48 w-48 opacity-[0.4] dark:opacity-[0.4]">
              <Image src={themeMode === "bright" ? "/vinnexia-logo.svg" : "/vinnexia-logo-dark.svg"} alt="" width={192} height={192} className="object-contain" />
            </div>
            <div className="relative z-1 w-full max-w-none">
              {children}
</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
