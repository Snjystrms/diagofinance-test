"use client"

import { Sidebar, SidebarContent } from "@/components/ui/sidebar"
import { IbDashboardSidebar } from "@/components/ib-dashboard-sidebar"

interface IbDashboardSidebarWrapperProps {
  className?: string
}

export function IbDashboardSidebarWrapper({ className }: IbDashboardSidebarWrapperProps) {
  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarContent>
        <IbDashboardSidebar />
      </SidebarContent>
    </Sidebar>
  )
}




