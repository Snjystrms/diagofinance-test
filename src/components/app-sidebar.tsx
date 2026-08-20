"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/contexts/auth-context"
import {
  getSectionLabelForRole,
  getSidebarNavigation,
} from "@/lib/app-route-registry"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { SidebarLogoutButton } from "@/components/sidebar-logout-button"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const navItems = React.useMemo(() => {
    return getSidebarNavigation({
      type: user?.type,
      isIbUser: user?.is_ib_user,
      managerPermissions: user?.managerPermissions,
    });
  }, [user]);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-sidebar-border bg-sidebar shadow-[8px_0_40px_rgba(15,23,42,0.03)]"
      )}
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-3 group-data-[collapsible=icon]:py-3">
        <TeamSwitcher variant="enterprise" />
      </SidebarHeader>
      <SidebarContent className="gap-0 px-1.5 py-3">
        <NavMain
          items={navItems}
          variant="enterprise"
          sectionLabel={getSectionLabelForRole(user?.type)}
        />
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:pl-2 group-data-[collapsible=icon]:pr-4 group-data-[collapsible=icon]:py-2">
        <SidebarLogoutButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
