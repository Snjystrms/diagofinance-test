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
  sectionLabel = "Overview",
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
            ? "mb-3 h-auto px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/55"
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
                "group h-11 rounded-xl px-3.5 text-[15px] font-medium tracking-[-0.01em] text-sidebar-foreground transition-all duration-300 [&>svg]:size-[18px] [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground/55",
                !isActive && "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                hasActiveSubItem && !isDirectActive && "bg-sidebar-primary/[0.08] text-sidebar-foreground [&>svg]:text-sidebar-primary/70 hover:bg-sidebar-primary/15",
                isDirectActive && "bg-sidebar-primary/20 text-sidebar-primary font-semibold ring-1 ring-inset ring-sidebar-primary/50 shadow-lg shadow-sidebar-primary/25 [&>svg]:text-sidebar-primary hover:bg-sidebar-primary/30 hover:text-sidebar-primary",
                isCollapsed && "justify-center px-0"
              )
            : isActive
              ? "bg-sidebar-primary/10 text-sidebar-foreground font-semibold border-l-[3px] border-sidebar-primary [&>span]:font-semibold [&>svg]:text-sidebar-primary [&>svg]:opacity-100 [&>svg]:size-6"
              : "[&>svg]:size-6 [&>svg]:text-sidebar-foreground/55"
          
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
                              isEnterprise ? "size-4 text-sidebar-foreground/55" : "size-6"
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
                          "mx-0 mt-1 ml-6 translate-x-0 gap-1 border-l border-sidebar-border py-1 pl-4 pr-0"
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
                              className={cn(
                                isEnterprise
                                  ? "h-9 rounded-lg px-3 text-[14px] font-medium tracking-[-0.01em] text-sidebar-foreground/70 transition-all duration-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                  : cn(
                                      "text-sm transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                      isSubActive && "bg-sidebar-primary/10 font-semibold text-sidebar-primary [&>span]:font-semibold"
                                    ),
                                isEnterprise &&
                                  isSubActive &&
                                  "bg-sidebar-primary/20 text-sidebar-primary font-semibold ring-1 ring-inset ring-sidebar-primary/40 shadow-md shadow-sidebar-primary/20 hover:bg-sidebar-primary/25"
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
