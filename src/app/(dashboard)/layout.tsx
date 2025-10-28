import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"
import { SidebarProvider } from "@/components/ui/sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar className="hidden md:flex flex-shrink-0" />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="w-full max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}