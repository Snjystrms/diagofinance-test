"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { AppSidebarV2 } from "@/components/app-sidebar-v2"
import { AppSidebarV3 } from "@/components/app-sidebar-v3"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { IbDashboardSidebarWrapper } from "@/components/ib-dashboard-sidebar-wrapper"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [selectedSidebar, setSelectedSidebar] = useState<string>("default");
  const pathname = usePathname();

  // Load saved sidebar from localStorage
  useEffect(() => {
    const savedSidebar = localStorage.getItem("selected-sidebar") || "default";
    setSelectedSidebar(savedSidebar);

    // Listen for sidebar changes
    const handleSidebarChange = (event: CustomEvent) => {
      setSelectedSidebar(event.detail.sidebarId);
    };

    window.addEventListener('sidebar-changed', handleSidebarChange as EventListener);
    return () => {
      window.removeEventListener('sidebar-changed', handleSidebarChange as EventListener);
    };
  }, []);

  // Clear sidebar cookie when switching to two-panel or expanded-panel to ensure it starts collapsed
  useEffect(() => {
    if (selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel") {
      // Clear the sidebar state cookie to force collapsed state
      document.cookie = "sidebar_state=false; path=/; max-age=0";
    }
  }, [selectedSidebar]);

  // Get and log the URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      console.log('Current URL:', url);
      console.log('Current Pathname:', pathname);
    }
  }, [pathname]);

  // Check if URL includes ib-dashboard
  const isIbDashboard = pathname?.includes('ib-dashboard') || false;

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
      {isIbDashboard ? (
        <>
          <IbDashboardSidebarWrapper className="hidden md:flex" />
          <SidebarInset>
            <Header />
            <main className="flex-1 overflow-y-auto bg-background">
              <div className="w-full max-w-none">
                {children}
              </div>
            </main>
          </SidebarInset>
        </>
      ) : (
        <>
          {selectedSidebar === "two-panel" ? (
            <AppSidebarV2 className="hidden md:flex" />
          ) : selectedSidebar === "expanded-panel" ? (
            <AppSidebarV3 className="hidden md:flex" />
          ) : (
            <AppSidebar className="hidden md:flex flex-shrink-0 " />
          )}
          <SidebarInset>
            <Header />
            <main className="flex-1 overflow-y-auto bg-background">
              <div className="w-full max-w-none">
                {children}
              </div>
            </main>
          </SidebarInset>
        </>
      )}
    </SidebarProvider>
  )
}