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
    title: "Income Management",
    url: "/income",
    icon: DollarSign,
    items: [
      {
        title: "Daily Allegiance Income",
        url: "/daily-allegiance-income",
      },
      {
        title: "Royalty Income",
        url: "/royalty-income",
      },
    ],
  },
  {
    title: "Reward Management",
    url: "/rewards",
    icon: Award,
    items: [
      {
        title: "Direct Reward",
        url: "/direct-reward",
      },
      {
        title: "Rank Reward",
        url: "/rank-reward",
      },
    ],
  },
  {
    title: "USDT Wallet",
    url: "/usdt-wallet",
    icon: Wallet,
    items: [
      {
        title: "USDT Deposit",
        url: "/USDT-Deposit",
      },
      {
        title: "USDT Deposit History",
        url: "/USDT-Deposit-History",
      },
      {
        title: "USDT Wallet Statement",
        url: "/USDT-Wallet-Statement",
      },
    ],
  },
  {
    title: "Customer Management",
    url: "/customers",
    icon: Users,
    items: [
      {
        title: "All Customers",
        url: "/customers",
      },
      {
        title: "Add Customer",
        url: "/customers/add",
      },
    ],
  },
  {
    title: "Company Management",
    url: "/companies",
    icon: Building2,
    items: [
      {
        title: "All Companies",
        url: "/companies",
      },
      {
        title: "Add Company",
        url: "/companies/add",
      },
    ],
  },
  {
    title: "Deals & Sales",
    url: "/deals",
    icon: CreditCard,
    items: [
      {
        title: "All Deals",
        url: "/deals",
      },
      {
        title: "Create Deal",
        url: "/deals/create",
      },
    ],
  },
  {
    title: "Task Management",
    url: "/tasks",
    icon: Calendar,
    items: [
      {
        title: "All Tasks",
        url: "/tasks",
      },
      {
        title: "Create Task",
        url: "/tasks/create",
      },
    ],
  },
  {
    title: "Communication",
    url: "/emails",
    icon: Mail,
    items: [
      {
        title: "Emails",
        url: "/emails",
      },
      {
        title: "Calls",
        url: "/calls",
      },
    ],
  },
  {
    title: "Packages",
    url: "/packages",
    icon: Package,
    items: [
      {
        title: "My Packages",
        url: "/My-Package",
      },
      {
        title: "Purchased Packages",
        url: "/Purchased-Package",
      },
      {
        title: "Purchased History",
        url: "/purchased-history",
      },
    ],
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
    items: [
      {
        title: "All Documents",
        url: "/documents",
      },
      {
        title: "Upload Document",
        url: "/documents/upload",
      },
    ],
  },
  {
    title: "My Team",
    url: "/my-team",
    icon: Users,
    items: [
      {
        title: "Direct Referral",
        url: "/direct-referral",
      },
      {
        title: "My All Team",
        url: "/my-all-team",
      },
      {
        title: "Level Wise Business",
        url: "/level-wise-business",
      },
    ],
  },
  {
    title: "Kingship Details",
    url: "/kingship-details",
    icon: Shield,
    items: [
      {
        title: "KCR Income History",
        url: "/kcr-income-history",
      },
      {
        title: "KCR Income Eligibility",
        url: "/kcr-income-eligibility",
      },
    ],
  },
  {
    title: "Withdrawal Management",
    url: "/withdrawal",
    icon: Wallet,
    items: [
      {
        title: "Withdrawal Request",
        url: "/withdrawal-request",
      },
      {
        title: "Withdrawal History",
        url: "/withdrawal-history",
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
  },
  {
    title: "Account Activation",
    url: "/test-registration-fee",
    icon: Shield,
    items: [
      {
        title: "Registration Fee",
        url: "/test-registration-fee",
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
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
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

