"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { 
  Command, 
  Home, 
  Users, 
  CreditCard, 
  Gift, 
  UserPlus, 
  Mail, 
  UserCheck, 
  Package, 
  Database, 
  LifeBuoy, 
  Settings2, 
  BarChart3,
  FileText,
  Wallet,
  DollarSign,
  TrendingUp,
  Award,
  Ticket,
  Bell,
  ChevronRight,
  Circle,
  Menu,
  TrendingDown,
  List,
  ArrowLeftRight,
  User,
  Calendar,
  Lightbulb,
  History,
  Shield,
  Activity,
  Briefcase,
  Building2
} from "lucide-react"
import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { generateSubadminNavigation } from "@/lib/permission-nav-mapper"
import { getSidebarNavigation } from "@/lib/app-route-registry"
import type { NavItem } from "@/types/permissions"

// Helper function to get icon for sub-items based on title
const getSubItemIcon = (title: string) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    // Dashboard sub-items
    "Overview": Home,
    "Analytics": BarChart3,
    
    // User Management sub-items
    "All Users": Users,
    "All Users MT5 Accounts": Database,
    "User Verification": Shield,
    "User Status": Activity,
    
    // Transaction Management sub-items
    "USDT Transactions": DollarSign,
    "Transaction Verification": FileText,
    "Payment History": Wallet,
    
    // Manager Management sub-items
    "All Managers": Briefcase,
    
    // IB Management sub-items
    "All IB": UserCheck,
    "IB Plans": Award,
    
    // Account Management sub-items
    "All Accounts": Package,
    "Package Sales": TrendingUp,
    "Package Analytics": BarChart3,
    
    // MT5 Account Management sub-items
    "User Accounts": Database,
    
    // User Navigation - My wallet sub-items
    "Wallet Overview": Wallet,
    "Transactions History": History,
    
    // User Navigation - My Accounts sub-items
    "Open Trading Account": Package,
    "Manage Accounts": Settings2,
    "Accounts Overview": BarChart3,
    
    // User Navigation - Funds sub-items
    "Deposit Funds": TrendingUp,
    "My Deposit": Wallet,
    "Withdraw Funds": TrendingDown,
    "Withdraw List": List,
    "Internal Funds Transfer": ArrowLeftRight,
    
    // User Navigation - My profile sub-items
    "KYC Verification": Shield,
    "View Profile": User,
    
    // User Navigation - Trading Central sub-items
    "Analysis Views": BarChart3,
    "Featured Ideas": Lightbulb,
    "Economic Calendar": Calendar,
    
    // User Navigation - Help & Support sub-items
    "Raise Ticket": Ticket,
    "Ticket History": History,
    
    // Legacy/Commented items
    "Bonus": Gift,
    "E-Mail Management": Mail,
    "All Tickets": Ticket,
    "Ticket Management": LifeBuoy,
    "Settings": Settings2,
    "Notifications": Bell,
  };
  
  // Try exact match first
  if (iconMap[title]) {
    return iconMap[title];
  }
  
  // Try partial matches as fallback
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("overview") || lowerTitle.includes("dashboard")) return Home;
  if (lowerTitle.includes("analytics") || lowerTitle.includes("report") || lowerTitle.includes("analysis")) return BarChart3;
  if (lowerTitle.includes("user") && !lowerTitle.includes("verification")) return Users;
  if (lowerTitle.includes("verification") || lowerTitle.includes("verify") || lowerTitle.includes("kyc")) return Shield;
  if (lowerTitle.includes("status") || lowerTitle.includes("activity")) return Activity;
  if (lowerTitle.includes("transaction") && !lowerTitle.includes("history")) return DollarSign;
  if (lowerTitle.includes("payment") || lowerTitle.includes("deposit") || lowerTitle.includes("wallet")) return Wallet;
  if (lowerTitle.includes("history") || lowerTitle.includes("list")) return History;
  if (lowerTitle.includes("withdraw")) return TrendingDown;
  if (lowerTitle.includes("transfer") || lowerTitle.includes("internal")) return ArrowLeftRight;
  if (lowerTitle.includes("account") && !lowerTitle.includes("mt5")) return Package;
  if (lowerTitle.includes("mt5") || lowerTitle.includes("database")) return Database;
  if (lowerTitle.includes("ticket")) return Ticket;
  if (lowerTitle.includes("support") || lowerTitle.includes("help")) return LifeBuoy;
  if (lowerTitle.includes("email") || lowerTitle.includes("mail")) return Mail;
  if (lowerTitle.includes("bonus") || lowerTitle.includes("reward")) return Gift;
  if (lowerTitle.includes("setting") || lowerTitle.includes("config") || lowerTitle.includes("manage")) return Settings2;
  if (lowerTitle.includes("notification")) return Bell;
  if (lowerTitle.includes("manager") || lowerTitle.includes("partner")) return Briefcase;
  if (lowerTitle.includes("ib") || lowerTitle.includes("plan")) return Award;
  if (lowerTitle.includes("profile")) return User;
  if (lowerTitle.includes("calendar")) return Calendar;
  if (lowerTitle.includes("idea") || lowerTitle.includes("featured")) return Lightbulb;
  if (lowerTitle.includes("sales") || lowerTitle.includes("trending")) return TrendingUp;
  
  return Circle; // Default icon
};

export function AppSidebarV3({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { setOpen, state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = React.useState<string | null>(null);
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
  const isCollapsed = state === "collapsed";

  // Ensure sidebar starts collapsed on mount
  React.useEffect(() => {
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get navigation items based on user type
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

  React.useEffect(() => {
    const urls = navItems.flatMap((item) => [item.url, ...(item.items?.map((subItem) => subItem.url) ?? [])]);
    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));

    const prefetchRoutes = () => {
      uniqueUrls.forEach((url) => {
        router.prefetch(url);
      });
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => prefetchRoutes());
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetchRoutes, 300);
    return () => globalThis.clearTimeout(timeoutId);
  }, [navItems, router]);

  // Auto-expand item if current path matches
  React.useEffect(() => {
    navItems.forEach((item) => {
      if (item.items && item.items.some(subItem => pathname === subItem.url || pathname.startsWith(subItem.url + '/'))) {
        setActiveItem(item.title);
        setExpandedItems(prev => new Set(prev).add(item.title));
      }
    });
  }, [pathname, navItems]);

  const handleItemClick = (item: NavItem) => {
    if (item.items && item.items.length > 0) {
      setActiveItem(item.title);
      setExpandedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.title)) {
          newSet.delete(item.title);
          if (activeItem === item.title) {
            setActiveItem(null);
          }
        } else {
          newSet.add(item.title);
        }
        return newSet;
      });
    } else {
      router.push(item.url);
    }
  };

  // Toggle nested sidebar when triggered globally
  React.useEffect(() => {
    const handleToggleEvent = () => {
      if (activeItem) {
        setActiveItem(null);
        setExpandedItems(new Set());
      } else {
        // Find first item with sub-items
        const firstWithChildren = navItems.find(
          (item) => item.items && item.items.length > 0
        );
        if (firstWithChildren) {
          setActiveItem(firstWithChildren.title);
          setExpandedItems(new Set([firstWithChildren.title]));
        }
      }
    };

    window.addEventListener('toggle-nested-sidebar', handleToggleEvent);

    return () => {
      window.removeEventListener('toggle-nested-sidebar', handleToggleEvent);
    };
  }, [activeItem, navItems]);

  const isAccountInactive = user && user.type === 'user' && user.is_account_active === false;

  return (
    <div className="flex h-full w-full" style={{ display: 'contents', flexDirection: 'row' }}>
      {/* First sidebar - Icon sidebar */}
      <Sidebar
        collapsible="icon"
        className="border-r border-[#e9edf5] bg-white shadow-[8px_0_40px_rgba(15,23,42,0.03)] flex-shrink-0"
        {...props}
      >
        <SidebarHeader className="border-b border-[#e9edf5] p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                size="lg" 
                asChild 
                className={`md:h-12 md:p-0 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
              >
                <Link href="/dashboard" className={`flex items-center w-full ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg shrink-0 mx-auto">
                    <Command className="size-5" />
                  </div>
                  {!isCollapsed && (
                    <div className="grid flex-1 text-left text-sm leading-tight animate-in fade-in-0 slide-in-from-left-2 duration-500">
                      <span className="truncate font-medium">CRM</span>
                      <span className="truncate text-xs">Enterprise</span>
                    </div>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className={isCollapsed ? "px-0" : "px-2 md:px-2"}>
              <SidebarMenu>
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
                  </div>
                ) : (
                  navItems.map((item) => {
                    const hasSubItems = item.items && item.items.length > 0;
                    const isExpanded = expandedItems.has(item.title);
                    const isActive = activeItem === item.title;
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          tooltip={item.title}
                          onClick={(e) => {
                            if (hasSubItems) {
                              e.preventDefault();
                              handleItemClick(item);
                            }
                          }}
                          isActive={isActive}
                          className={`${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'} ${isActive ? 'bg-sidebar-accent' : ''}`}
                          size="lg"
                          asChild={!hasSubItems}
                        >
                          {hasSubItems ? (
                            <>
                              {item.icon && (React.isValidElement(item.icon) ? item.icon : <item.icon className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />)}
                              {!isCollapsed && <span className="animate-in fade-in-0 slide-in-from-left-2 duration-500">{item.title}</span>}
                              {!isCollapsed && (
                                <ChevronRight className={`ml-auto h-5 w-5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'rotate-90' : ''}`} />
                              )}
                            </>
                          ) : (
                            <Link href={item.url}>
                              {item.icon && (React.isValidElement(item.icon) ? item.icon : <item.icon className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />)}
                              {!isCollapsed && <span className="animate-in fade-in-0 slide-in-from-left-2 duration-500">{item.title}</span>}
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {user && (
            <NavUser user={{
              name: user.name || "User",
              email: user.email || "user@example.com"
            }} />
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar - Content sidebar (always visible when item is expanded) */}
      {!isAccountInactive && activeItem && (() => {
        const activeNavItem = navItems.find((item: { title: string; items?: Array<{ title: string; url: string }> }) => item.title === activeItem);
        
        if (!activeNavItem?.items || activeNavItem.items.length === 0) {
          return null;
        }
        
        return (
          <Sidebar 
            collapsible="none" 
            className="w-72 border-l border-r border-[#e9edf5] bg-white flex-shrink-0 hidden md:flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-in slide-in-from-left h-screen sticky top-0" 
          >
            <div className="flex h-full flex-col">
              <SidebarHeader className="gap-2 border-b border-[#e9edf5] p-4 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {activeNavItem.icon && (
                      <div className="p-2 rounded-lg bg-sidebar-primary/10">
                        {React.isValidElement(activeNavItem.icon) ? activeNavItem.icon : <activeNavItem.icon className="h-5 w-5 text-sidebar-primary" />}
                      </div>
                    )}
                    <div className="text-foreground text-base font-bold">
                      {activeItem}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setActiveItem(null);
                      setExpandedItems(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(activeItem);
                        return newSet;
                      });
                    }}
                  >
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </Button>
                </div>
                <SidebarInput placeholder="Search in this section..." className="h-9 text-sm mt-3" />
              </SidebarHeader>
              <SidebarContent className="flex-1 overflow-y-auto">
                <SidebarGroup className="px-3 py-3">
                  <SidebarMenu>
                    {activeNavItem.items.map((subItem: { title: string; url: string }, index: number) => {
                      const SubIcon = getSubItemIcon(subItem.title);
                      const isSubActive = pathname === subItem.url || pathname.startsWith(subItem.url + '/');
                      
                      return (
                        <SidebarMenuItem key={`${subItem.title}-${index}`}>
                          <SidebarMenuSubButton 
                            asChild
                            size="sm"
                            className={`
                              group relative
                              ${isSubActive 
                                ? "bg-[#edf4ff] text-[#2563eb] font-semibold shadow-sm" 
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                              }
                              transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                              rounded-lg
                              mb-1.5
                              pl-4
                            `}
                          >
                            <Link href={subItem.url} className="flex items-center gap-3 w-full py-3 px-3">
                              <div className={`
                                p-1.5 rounded-md
                                ${isSubActive 
                                  ? "bg-sidebar-primary/20 text-sidebar-primary" 
                                  : "bg-sidebar-accent/50 text-sidebar-foreground/60 group-hover:bg-sidebar-primary/10 group-hover:text-sidebar-primary"
                                }
                                transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                              `}>
                                <SubIcon className="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />
                              </div>
                              <span className="text-sm flex-1 font-medium transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">{subItem.title}</span>
                              {isSubActive && (
                                <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
            </div>
          </Sidebar>
        );
      })()}
    </div>
  )
}

