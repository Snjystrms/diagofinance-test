"use client"

import * as React from "react"
import {
  Home,
  Users,
  Building2,
  CreditCard,
  Calendar,
  BarChart3,
  Mail,
  Phone,
  FileText,
  User,
  Settings2,
  Package,
  Shield,
  Wallet,
  DollarSign,
  Award,
  Gift,
  TrendingUp,
  Trophy,
  LifeBuoy,
  Database,
  BarChart,
  Cog,
  UserCheck,
  UserPlus,
  Activity
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { useAuth } from "@/contexts/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// Admin Navigation Data
const adminNavData = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
      },
      {
        title: "Analytics",
        url: "/analytics",
      },
    ],
  },
  {
    title: "User Management",
    url: "/users",
    icon: Users,
    items: [
      {
        title: "All Users",
        url: "/new-users",
      },
      {
        title: "User Verification",
        url: "/user-verification",
      },
      {
        title: "User Status",
        url: "/user-status",
      },
    ],
  },
  {
    title: "Transaction Management",
    url: "/transactions",
    icon: CreditCard,
    items: [
      {
        title: "USDT Transactions",
        url: "/usdt-transactions",
      },
      {
        title: "Transaction Verification",
        url: "/transaction-verification",
      },
      {
        title: "Payment History",
        url: "/payment-history",
      },
    ],
  },
  {
    title: "System Analytics",
    url: "/system-analytics",
    icon: BarChart,
    items: [
      {
        title: "Revenue Analytics",
        url: "/revenue-analytics",
      },
      {
        title: "User Analytics",
        url: "/user-analytics",
      },
      {
        title: "Performance Metrics",
        url: "/performance-metrics",
      },
    ],
  },
  {
    title: "Package Management",
    url: "/packages",
    icon: Package,
    items: [
      {
        title: "All Packages",
        url: "/all-packages",
      },
      {
        title: "Package Sales",
        url: "/package-sales",
      },
      {
        title: "Package Analytics",
        url: "/package-analytics",
      },
    ],
  },
  {
    title: "Support & Tickets",
    url: "/support",
    icon: LifeBuoy,
    items: [
      {
        title: "All Tickets",
        url: "/all-tickets",
      },
      {
        title: "Ticket Management",
        url: "/ticket-management",
      },
      {
        title: "Support Analytics",
        url: "/support-analytics",
      },
    ],
  },
  {
    title: "System Settings",
    url: "/settings",
    icon: Cog,
    items: [
      {
        title: "General Settings",
        url: "/settings",
      },
      {
        title: "Security Settings",
        url: "/security-settings",
      },
      {
        title: "System Configuration",
        url: "/system-config",
      },
    ],
  },
  {
    title: "Registration Management",
    url: "/test-registration-fee",
    icon: Shield,
    items: [
      {
        title: "Test Registration Fee",
        url: "/test-registration-fee",
      },
    ],
  },
]

// User Navigation Data
const userNavData = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    isActive: true,
    // items: [
    //   {
    //     title: "Overview",
    //     url: "/dashboard",
    //   },
    //   {
    //     title: "Analytics",
    //     url: "/analytics",
    //   },
    // ],
  },
  {
    title: "My wallet",
    url: "/my_wallet",
    icon: DollarSign,
    items: [
      {
        title: "Wallet Overview",
        url: "/my_wallet/wallet_overview",
      },
      {
        title: "Transactions History",
        url: "/my_wallet/transactions_history",
      },
    ],
  },
  {
    title: "My Accounts",
    url: "/my_accounts",
    icon: Award,
    items: [
      {
        title: "Open Trading Account",
        url: "/my_accounts/open-trading-account",
      },
      {
        title: "Manage Accounts",
        url: "/my_accounts/manage-accounts",
      },
      {
        title: "Accounts Overview",
        url: "/my_accounts/accounts-overview",
      },
      
    ],
  },
  {
    title: "Funds",
    url: "/funds",
    icon: Wallet,
    items: [
    {
      title: "Deposit Funds",
      url: "/funds/deposit",
    },
    {
      title: "Withdraw Funds",
      url: "/funds/withdraw",
    },
    {
      title: "Internal Funds Transfer",
      url: "/funds/internal-transfer",
    }
    ],
  },
  {
    title: "Social Trading",
    url: "/social-trading",
    icon: Users,
    items: [
      {
        title: "Copy Trading",
        url: "/social-trading/copy-trading",
      },
    ],
  },
  {
    title: "Trading Platforms",
    url: "/trading_platforms",
    icon: Building2,
    
  },
 

  {
    title: "My profile",
    url: "/profile",
    icon: Mail,
    items: [
    {
      title: "KYC Verification",
      url: "/profile/kyc-verification",
    },
    {
      title: "View Profile",
      url: "/profile/view_profile",
    },
    {
      title: "Update Password",
      url: "/profile/update-password",
    }
    ],
  },
  {
    title: "Trading Central",
    url: "/trading-central",
    icon: Package,
    items: [
    {
      title: "Analysis Views",
      url: "/trading-central/analysis-views",
    },
    {
      title: "Featured Ideas",
      url: "/trading-central/featured-ideas",
    },
    {
      title: "Economic Calendar",
      url: "/trading-central/economic-calendar",
    },
    ],
  },
  {
    title: "Help & Support",
    url: "/help-support",
    icon: LifeBuoy,
    items: [
      {
        title: "Raise Ticket",
        url: "/raise-ticket",
      },
      {
        title: "Ticket History",
        url: "/ticket-history",
      },
    ],
  }
]

// CRM Navigation Data
const crmData = {
  user: {
    name: "Admin User",
    email: "admin@affiliatecrm.com",
    avatar: "/avatars/admin.svg",
  },
  teams: [
    {
      name: "Affiliate CRM Platform",
      logo: Shield,
      plan: "Enterprise",
    },
  ],
  projects: [
    {
      name: "Sales Pipeline",
      url: "/deals",
      icon: CreditCard,
    },
    {
      name: "Customer Analytics",
      url: "/analytics",
      icon: BarChart3,
    },
    {
      name: "Task Management",
      url: "/tasks",
      icon: Calendar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  
  // Get navigation items based on user type
  const getNavItems = () => {
    if (!user) return userNavData; // Default to user nav if no user
    
    switch (user.type) {
      case 'admin':
        return adminNavData;
      case 'user':
        return userNavData;
      default:
        return userNavData;
    }
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (!user) return crmData.user;
    
    return {
      name: user.name || user.email || "User",
      email: user.email,
      avatar: user.type === 'admin' ? "/avatars/admin.svg" : "/avatars/admin.jpg",
    };
  };

  const navItems = getNavItems();
  const userDisplayInfo = getUserDisplayInfo();

  // Check if user needs to pay registration fee
  const isAccountInactive = user && user.type === 'user' && user.is_account_active === false;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={crmData.teams} />
      </SidebarHeader>
      <SidebarContent>
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
            <div className="text-xs text-muted-foreground">
              Pay registration fee to unlock all features
            </div>
          </div>
        ) : (
          <>
            <NavMain items={navItems} />
            <NavProjects projects={crmData.projects} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userDisplayInfo} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}