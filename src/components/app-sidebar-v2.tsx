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
import { Label } from "@/components/ui/label"
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/contexts/auth-context"
import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import { generateManagerNavigation } from "@/lib/permission-nav-mapper"
import { adminNavData, userNavData, crmData } from "@/components/app-sidebar"
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

export function AppSidebarV2({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const { setOpen, state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = React.useState<string | null>(null);
  const lastActiveItemRef = React.useRef<string | null>(null);
  const isCollapsed = state === "collapsed";

  // Ensure sidebar starts collapsed on mount
  React.useEffect(() => {
    // Force collapsed state on mount
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Get navigation items based on user type
  const navItems = React.useMemo(() => {
    if (!user) return userNavData;

    switch (user.type) {
      case "admin":
        return adminNavData;
      case "manager":
        return generateManagerNavigation(user.managerPermissions || []);
      case "user":
      default:
        return userNavData;
    }
  }, [user]);

  const handleItemClick = (item: NavItem) => {
    // Only set active item if it has sub-items, otherwise navigate directly
    if (item.items && item.items.length > 0) {
      setActiveItem(item.title);
      setOpen(true);
      lastActiveItemRef.current = item.title;
    } else {
      // Navigate directly if no sub-items using Next.js router
      router.push(item.url);
    }
  };

  // Toggle nested sidebar when triggered globally
  React.useEffect(() => {
    const getFirstNavWithChildren = () => {
      const firstWithChildren = navItems.find(
        (item) => item.items && item.items.length > 0
      );
      return firstWithChildren?.title ?? null;
    };

    const handleToggleEvent = () => {
      setActiveItem((prev) => {
        if (prev) {
          return null;
        }

        const next =
          lastActiveItemRef.current ||
          getFirstNavWithChildren();

        if (next) {
          lastActiveItemRef.current = next;
        }

        return next;
      });
    };

    window.addEventListener('toggle-nested-sidebar', handleToggleEvent);

    return () => {
      window.removeEventListener('toggle-nested-sidebar', handleToggleEvent);
    };
  }, [navItems]);

  const isAccountInactive = user && user.type === 'user' && user.is_account_active === false;

  return (
    <div className="flex h-full w-full" style={{ display: 'contents', flexDirection: 'row' }}>
      {/* First sidebar - Icon sidebar */}
      <Sidebar
        collapsible="icon"
        className="border-r flex-shrink-0"
        {...props}
      >
        <SidebarHeader>
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
                          isActive={activeItem === item.title}
                          className={`${isCollapsed ? 'justify-center px-0' : 'px-3 gap-3'}`}
                          size="lg"
                          asChild={!hasSubItems}
                        >
                          {hasSubItems ? (
                            <>
                              {item.icon && (React.isValidElement(item.icon) ? item.icon : <item.icon className="size-5 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" />)}
                              {!isCollapsed && <span className="animate-in fade-in-0 slide-in-from-left-2 duration-500">{item.title}</span>}
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
              email: user.email || "user@example.com",
              avatar: "/avatars/01.png"
            }} />
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar - Content sidebar */}
      {!isAccountInactive && activeItem && (() => {
        const activeNavItem = navItems.find((item: { title: string; items?: Array<{ title: string; url: string }> }) => item.title === activeItem);
        
        if (!activeNavItem?.items || activeNavItem.items.length === 0) {
          return null;
        }
        
        return (
          <Sidebar 
            collapsible="none" 
            className="w-64 border-l border-r flex-shrink-0 hidden md:flex transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] animate-in slide-in-from-left h-screen sticky top-0" 
          >
            <div className="flex h-full flex-col">
              <SidebarHeader className="gap-2 border-b p-4 bg-sidebar-accent/50">
                <div className="flex items-center gap-2">
                  {activeNavItem.icon && (
                    React.isValidElement(activeNavItem.icon) ? activeNavItem.icon : <activeNavItem.icon className="h-4 w-4 text-sidebar-primary" />
                  )}
                  <div className="text-foreground text-sm font-semibold">
                    {activeItem}
                  </div>
                </div>
                <SidebarInput placeholder="Type to search..." className="h-8 text-sm mt-2" />
              </SidebarHeader>
              <SidebarContent className="flex-1 overflow-y-auto">
                <SidebarGroup className="px-2 py-2">
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
                                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" 
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              }
                              transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                              rounded-md
                              mb-1
                            `}
                          >
                            <Link href={subItem.url} className="flex items-center gap-3 w-full py-2.5 px-3">
                              <SubIcon className={`
                                h-4 w-4 flex-shrink-0
                                ${isSubActive 
                                  ? "text-sidebar-primary" 
                                  : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                                }
                                transition-colors duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                              `} />
                              <span className="text-sm flex-1 transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]">{subItem.title}</span>
                              {isSubActive && (
                                <ChevronRight className="h-3 w-3 text-sidebar-primary" />
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

