"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"

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

export function NavMain({
  items,
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
}) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + '/')
          const hasSubItems = item.items && item.items.length > 0
          
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
                    size="sm"
                    className={isActive 
                      ? "bg-[#ffffff0f] text-sidebar-accent-foreground font-semibold  border-l-[3px] border-sidebar-primary [&>span]:font-semibold [&>svg]:opacity-100" 
                      : ""
                    }
                  >
                    {hasSubItems ? (
                      <>
                        {item.icon && (React.isValidElement(item.icon) ? item.icon : <item.icon className="transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />)}
                        {!isCollapsed && <span className="animate-in fade-in-0 slide-in-from-left-2 duration-500">{item.title}</span>}
                        {!isCollapsed && (
                          <ChevronRight className="ml-auto transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group-data-[state=open]/collapsible:rotate-90" />
                        )}
                      </>
                    ) : (
                      <Link href={item.url} className="flex items-center w-full">
                        {item.icon && (React.isValidElement(item.icon) ? item.icon : <item.icon className="transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />)}
                        {!isCollapsed && <span className="animate-in fade-in-0 slide-in-from-left-2 duration-500">{item.title}</span>}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                {hasSubItems && (
                  <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-500">
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const isSubActive = pathname === subItem.url
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton 
                              asChild
                              size="sm"
                              className={isSubActive 
                                ? "bg-[#ffffff0f] text-sidebar-accent-foreground font-semibold  border-l-[3px] border-sidebar-primary [&>span]:font-semibold" 
                                : ""
                              }
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
