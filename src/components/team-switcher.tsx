"use client"

import * as React from "react"
import Image from "next/image"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { cn } from "@/lib/utils"

export function TeamSwitcher({
  teams,
  variant = "default",
  roleLabel,
}: {
  teams: {
    name: string
    logo?: React.ElementType | string
    logoBright?: string
    logoDark?: string
    plan: string
  }[]
  variant?: "default" | "enterprise"
  roleLabel?: string
}) {
  const { state } = useSidebar()
  const { themeMode } = useClientCustomization()
  const isCollapsed = state === "collapsed"
  const [activeTeam] = React.useState(teams[0])
  const isEnterprise = variant === "enterprise"

  const resolvedLogo = React.useMemo(() => {
    if (!activeTeam) return null
    if (activeTeam.logoBright && activeTeam.logoDark) {
      return themeMode === "bright" ? activeTeam.logoBright : activeTeam.logoDark
    }
    return activeTeam.logo ?? null
  }, [activeTeam, themeMode])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <SidebarMenuButton
          size="default"
          className={cn(
            isEnterprise
              ? "h-auto min-h-0 rounded-2xl border px-3 py-2 text-sidebar-foreground transition-all duration-200 hover:opacity-90 group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-0! ib-portal-hero"
              : "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          )}
        >
          <div
            className={cn(
              "flex w-full items-center gap-3",
              isCollapsed && "justify-center gap-0"
            )}
          >
            {typeof resolvedLogo === "string" ? (
              <Image src={resolvedLogo} alt={activeTeam.name} width={60} height={60} className="size-10 object-contain" />
            ) : resolvedLogo ? (
              React.createElement(resolvedLogo as React.ElementType, { className: "size-10" })
            ) : null}
            {!isCollapsed && (
              <>
                <div className="grid flex-1 gap-0.5 text-left leading-tight">
                  {isEnterprise && (
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">
                      {roleLabel ?? "Workspace"}
                    </span>
                  )}
                  <span
                    className="truncate font-cinzel text-[11px] font-bold uppercase tracking-[0.2em] text-transparent [-webkit-text-stroke:0.5px_white] [text-shadow:0_0_4px_rgba(255,255,255,0.25)]"
                  >
                    {activeTeam.name}
                  </span>
                  <span className="truncate font-arvo text-[10px] font-bold tracking-wide text-[#FFB800]">
                    {activeTeam.plan}
                  </span>
                </div>
              </>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
