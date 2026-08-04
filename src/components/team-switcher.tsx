"use client";

import * as React from "react";
import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function TeamSwitcher({
  variant = "default",
}: {
  variant?: "default" | "enterprise";
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const isEnterprise = variant === "enterprise";

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenuButton
          size="default"
          className={cn(
            isEnterprise
              ? "h-auto min-h-0 rounded-2xl px-2 py-1 text-sidebar-foreground transition-all duration-200 hover:opacity-90 hover:bg-transparent group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-0!"
              : "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
          )}
        >
          <div
            className={cn(
              "flex w-full items-center gap-1.5",
              isCollapsed ? "justify-center gap-0" : "justify-center",
            )}
          >
            <Image
              src="/diagofinancelogo.svg"
              alt="Diagofinance"
              width={239}
              height={63}
              className="h-16 w-auto object-contain"
            />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
