"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function TeamSwitcher({
  teams,
  variant = "default",
  roleLabel,
}: {
  teams: {
    name: string
    logo: React.ElementType | string
    plan: string
  }[]
  variant?: "default" | "enterprise"
  roleLabel?: string
}) {
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [activeTeam, setActiveTeam] = React.useState(teams[0])
  const isEnterprise = variant === "enterprise"

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="default"
              className={cn(
                isEnterprise
                  ? "h-auto min-h-0 rounded-2xl border border-sidebar-border bg-sidebar-accent/45 px-3 py-2 text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:px-0! group-data-[collapsible=icon]:py-0!"
                  : "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              )}
            >
              <div
                className={cn(
                  "flex w-full items-center gap-3",
                  isCollapsed && "justify-center gap-0"
                )}
              >
{/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-primary/10 text-sidebar-primary"> */}
                  {typeof activeTeam.logo === "string" ? (
                    <Image src={activeTeam.logo} alt={activeTeam.name} width={60} height={60} className="size-10 object-contain" />
                  ) : (
                    <activeTeam.logo className="size-10" />
                  )}
                {/* </div> */}
                {!isCollapsed && (
                  <>
                    <div className="grid flex-1 gap-0.5 text-left leading-tight">
                      {isEnterprise && (
                        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">
                          {roleLabel ?? "Workspace"}
                        </span>
                      )}
                      <span className="truncate text-sm font-semibold text-sidebar-foreground">
                        {activeTeam.name}
                      </span>
                      <span className="truncate text-[12px] text-sidebar-foreground/65">
                        {activeTeam.plan}
                      </span>
                    </div>
                    <ChevronsUpDown className="size-4 text-sidebar-foreground/55" />
                  </>
                )}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Teams
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  {typeof team.logo === "string" ? (
                    <Image src={team.logo} alt={team.name} width={12} height={12} className="size-3 shrink-0 object-contain" />
                  ) : (
                    <team.logo className="size-3 shrink-0" />
                  )}
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
