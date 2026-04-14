"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import dynamic from "next/dynamic"

const AppSidebarV2 = dynamic(() => import("@/components/app-sidebar-v2").then((m) => ({ default: m.AppSidebarV2 })), { ssr: false })
const AppSidebarV3 = dynamic(() => import("@/components/app-sidebar-v3").then((m) => ({ default: m.AppSidebarV3 })), { ssr: false })
import { RegistrationFeeModal } from "@/components/registration-fee-modal"
import { useAuth } from "@/contexts/auth-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useState, useEffect } from "react"
import { useClientCustomization } from "@/contexts/client-customization-context"

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const { sidebarId: selectedSidebar } = useClientCustomization();

  // Check if user needs to pay registration fee
  useEffect(() => {
    if (user && user.type === 'user' && user.is_account_active === false) {
      setShowRegistrationModal(true);
    }
  }, [user]);

  // Clear sidebar cookie when switching to two-panel or expanded-panel to ensure it starts collapsed
  useEffect(() => {
    if (selectedSidebar === "two-panel" || selectedSidebar === "expanded-panel") {
      // Clear the sidebar state cookie to force collapsed state
      document.cookie = "sidebar_state=false; path=/; max-age=0";
    }
  }, [selectedSidebar]);

  // If user needs to pay registration fee, show modal and disable sidebar
  if (user && user.type === 'user' && user.is_account_active === false) {
    return (
      <div className="min-h-screen bg-background">
        <RegistrationFeeModal 
          isOpen={showRegistrationModal} 
          onClose={() => setShowRegistrationModal(false)} 
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center p-8">
            <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Account Activation Required
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
              Your account is currently inactive. Please complete the one-time registration fee payment to activate your account and access all features.
            </p>
            <button
              onClick={() => setShowRegistrationModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Pay Registration Fee
            </button>
          </div>
        </div>
      </div>
    );
  }

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
