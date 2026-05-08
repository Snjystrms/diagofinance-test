"use client";

import { LogOut } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSessionLogout } from "@/hooks/use-session-logout";
import { useAuth } from "@/contexts/auth-context";

export function SidebarLogoutButton() {
  const { user } = useAuth();
  const sessionLogout = useSessionLogout();

  if (!user) return null;

  return (
    <div className="rounded-2xl border border-sidebar-border/50 bg-sidebar-accent/20 p-1.5">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Log out"
            className="group/logout h-9 rounded-xl text-sidebar-foreground/60 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive justify-center"
            onClick={() => void sessionLogout()}
          >
            <LogOut className="size-4 transition-transform duration-200 group-hover/logout:-translate-x-0.5" />
            <span className="font-medium">Log out</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}
