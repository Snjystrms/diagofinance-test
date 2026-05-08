"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/contexts/auth-context"
import { generateSubadminNavigation } from "@/lib/permission-nav-mapper"
import {
  crmData,
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
    if (user?.type === "subadmin") {
      return generateSubadminNavigation(user.permissions || []);
    }

    return getSidebarNavigation({
      type: user?.type,
      isIbUser: user?.is_ib_user,
      managerPermissions: user?.managerPermissions,
    });
  }, [user]);

  // Check if user needs to pay registration fee
  const isAccountInactive = user && user.type === 'user' && user.is_account_active === false;

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-sidebar-border bg-sidebar shadow-[8px_0_40px_rgba(15,23,42,0.03)]"
      )}
      {...props}
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <TeamSwitcher
          teams={crmData.teams}
          variant="enterprise"
          roleLabel={
            user?.type === "manager"
              ? "Manager Console"
              : user?.type === "subadmin"
                ? "Subadmin Console"
                : user?.type === "admin"
                  ? "Admin Console"
                  : "Client Workspace"
          }
        />
      </SidebarHeader>
      <SidebarContent className="gap-0 px-1.5 py-3">
        {isAccountInactive ? (
          <div className="p-4 text-center">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Account activation required
            </p>
            <div className="text-xs text-muted-foreground">
              Pay registration fee to unlock all features
            </div>
          </div>
        ) : (
          <>
            <NavMain
              items={navItems}
              variant="enterprise"
              sectionLabel={getSectionLabelForRole(user?.type)}
            />
            {/* <NavProjects projects={crmData.projects} /> */}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <SidebarLogoutButton />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
