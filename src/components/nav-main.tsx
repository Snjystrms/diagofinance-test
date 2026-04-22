"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  variant = "default",
  sectionLabel = "Platform",
}: {
  items: {
    title: string
    url: string
    icon?: React.ComponentType<Record<string, unknown>> | React.ReactElement | null
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
  variant?: "default" | "enterprise"
  sectionLabel?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const isEnterprise = variant === "enterprise"

  React.useEffect(() => {
    const urls = items.flatMap((item) => [item.url, ...(item.items?.map((subItem) => subItem.url) ?? [])]);
    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

    const prefetchRoutes = () => {
      uniqueUrls.forEach((url) => {
        router.prefetch(url)
      })
    }

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => prefetchRoutes())
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = globalThis.setTimeout(prefetchRoutes, 300)
    return () => globalThis.clearTimeout(timeoutId)
  }, [items, router])

  return (
    <SidebarGroup className={cn(isEnterprise && "px-3 pb-5 pt-3")}>
      <SidebarGroupLabel
        className={cn(
          isEnterprise
            ? "mb-3 h-auto px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#98a2b3]"
            : "text-sm"
        )}
      >
        {sectionLabel}
      </SidebarGroupLabel>
      <SidebarMenu className={cn(isEnterprise && "gap-1.5")}>
        {items.map((item) => {
          const isDirectActive = pathname === item.url || pathname.startsWith(item.url + '/')
          const hasSubItems = item.items && item.items.length > 0
          const hasActiveSubItem = item.items?.some(
            (subItem) => pathname === subItem.url || pathname.startsWith(subItem.url + "/")
          ) ?? false
          const isActive = isDirectActive || hasActiveSubItem
          const topLevelButtonClass = isEnterprise
            ? cn(
                "group h-11 rounded-xl px-3.5 text-[15px] font-medium tracking-[-0.01em] text-[#344054] transition-all duration-300 hover:bg-[#f6f8fc] hover:text-[#111827] hover:shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)] data-[state=open]:bg-[#f6f8fc] data-[state=open]:text-[#172033] [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-[#98a2b3]",
                hasActiveSubItem && !isDirectActive && "bg-[#f7f9fc] text-[#172033] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)] [&>svg]:text-[#667085]",
                isDirectActive && "bg-[#edf4ff] text-[#2563eb] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.16)] [&>svg]:text-[#2563eb]",
                isCollapsed && "justify-center px-0"
              )
            : isActive
              ? "bg-[#ffffff0f] text-sidebar-accent-foreground font-semibold border-l-[3px] border-sidebar-primary [&>span]:font-semibold [&>svg]:opacity-100 [&>svg]:size-6"
              : "[&>svg]:size-6"
          
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive || (item.items?.some(subItem => pathname === subItem.url) ?? false)}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    asChild={!hasSubItems}
                    size="default"
                    isActive={isActive}
                    className={topLevelButtonClass}
                  >
                    {hasSubItems ? (
                      <>
                        {item.icon &&
                          (React.isValidElement(item.icon) ? (
                            item.icon
                          ) : (
                            <item.icon
                              className={cn(
                                "transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                                isEnterprise ? "size-[18px]" : "size-6"
                              )}
                            />
                          ))}
                        {!isCollapsed && (
                          <span
                            className={cn(
                              "animate-in fade-in-0 slide-in-from-left-2 duration-500",
                              isEnterprise ? "text-[15px] font-medium" : "text-base"
                            )}
                          >
                            {item.title}
                          </span>
                        )}
                        {!isCollapsed && (
                          <ChevronRight
                            className={cn(
                              "ml-auto transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=open]/collapsible:rotate-90",
                              isEnterprise ? "size-4 text-[#98a2b3]" : "size-6"
                            )}
                          />
                        )}
                      </>
                    ) : (
                      <Link href={item.url} className="flex items-center w-full gap-3">
                        {item.icon &&
                          (React.isValidElement(item.icon) ? (
                            item.icon
                          ) : (
                            <item.icon
                              className={cn(
                                "transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                                isEnterprise ? "size-[18px]" : "size-6"
                              )}
                            />
                          ))}
                        {!isCollapsed && (
                          <span
                            className={cn(
                              "animate-in fade-in-0 slide-in-from-left-2 duration-500",
                              isEnterprise ? "text-[15px] font-medium" : "text-base"
                            )}
                          >
                            {item.title}
                          </span>
                        )}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {hasSubItems && (
                  <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-500">
                    <SidebarMenuSub
                      className={cn(
                        isEnterprise &&
                          "mx-0 mt-1 ml-6 translate-x-0 gap-1 border-l border-[#edf1f7] py-1 pl-4 pr-0"
                      )}
                    >
                      {item.items?.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.url || pathname.startsWith(subItem.url + "/")
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton 
                              asChild
                              size="md"
                              isActive={isSubActive}
                              className={cn(
                                isEnterprise
                                  ? "h-9 rounded-lg px-3 text-[14px] font-medium tracking-[-0.01em] text-[#667085] transition-all duration-300 hover:bg-[#f6f8fc] hover:text-[#172033]"
                                  : "text-sm",
                                isEnterprise &&
                                  isSubActive &&
                                  "bg-[#edf4ff] text-[#2563eb] shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
                              )}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
