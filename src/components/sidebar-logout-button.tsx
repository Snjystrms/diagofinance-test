"use client";

import { LogOut } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSessionLogout } from "@/hooks/use-session-logout";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export function SidebarLogoutButton() {
  const { user } = useAuth();
  const { state } = useSidebar();
  const sessionLogout = useSessionLogout();
  const isCollapsed = state === "collapsed";

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-sidebar-border/50 bg-sidebar-accent/20 p-1.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:w-fit group-data-[collapsible=icon]:justify-center">
      <SidebarMenu className="group-data-[collapsible=icon]:items-center">
        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          <SidebarMenuButton
            tooltip="Log out"
            className="group/logout h-9 rounded-xl text-sidebar-foreground/60 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive justify-center group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-0!"
            onClick={() => void sessionLogout()}
          >
            <LogOut className="size-4 transition-transform duration-200 group-hover/logout:-translate-x-0.5" />
            <span className={cn("font-medium", isCollapsed && "hidden")}>Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
