import {
  Users,
  Shield,
  CreditCard,
  Package,
  Gift,
  Award,
  LifeBuoy,
  Settings2,
  BarChart3,
  BarChart,
  UserCheck,
  Wallet,
  DollarSign,
  TrendingUp,
} from "lucide-react";
// import { Permission, NavItem } from '@/types/permissions';
import { Permission, NavItem, ManagerPermissionCategory } from "@/types/permissions";
// import { getAllowedModules, hasPermission } from '@/lib/permissions';
import { getAllowedModules, hasPermission } from "./permissions";
import { GroupedPermissions } from "@/lib/api";

// Permission-based navigation mapping - Updated to match actual API module names
const PERMISSION_NAV_MAPPING: Record<string, NavItem> = {
  registration_fee: {
    title: "Registration Fees",
    url: "/registration-approval",
    icon: DollarSign,
    items: [
      {
        title: "Registration Approval",
        url: "/Registration-approval",
      },
    ],
  },
  usdt_transaction: {
    title: "USDT Transactions",
    url: "/usdt-transactions",
    icon: CreditCard,
    items: [
      {
        title: "USDT Transactions",
        url: "/usdt-transactions",
      }
    ],
  },
//   subadmin: {
//     title: "Admin Management",
//     url: "/admin-management",
//     icon: Shield,
//     items: [
//       {
//         title: "Manage Admins",
//         url: "/admin-management",
//       },
//       {
//         title: "Manage Permissions",
//         url: "/manage-permissions",
//       },
//     ],
//   },
  package: {
    title: "Package Management",
    url: "/package-management",
    icon: Package,
    items: [
      {
        title: "All Packages",
        url: "/all-packages",
      }
    ],
  },
  roi: {
      title: "Allegiance System",
        url: "/allegiance-income",
        icon: Users,
        items: [
          {
            title: "Allegiance System",
            url: "/allegiance-income",
          }
        ],
  },
  kcr: {
    title: "KCR System",
    url: "/kcr-system",
    icon: TrendingUp,
    items: [
      {
        title: "Manage KCR Levels",
        url: "/kcr-system",
      }
    ],
  },
  royalty: {
    title: "Royalty System",
    url: "/royalty-system",
    icon: Gift,
    items: [
      {
        title: "Manage Royalty",
        url: "/royalty-system",
      }
    ],
  },
  rank: {
    title: "Rank System",
    url: "/rank-system",
    icon: Award,
    items: [
      {
        title: "Manage Ranks",
        url: "/rank-system",
      }
    ],
  },
  sponser: {
    title: "Sponsor Management",
    url: "/sponsor-management",
    icon: Users,
    items: [
      {
        title: "Sponsor Income",
        url: "/sponsor-income",
      },
      {
        title: "Level Business",
        url: "/level-wise-business",
      },
    ],
  },
  kyc: {
    title: "KYC Management",
    url: "/kyc-management",
    icon: UserCheck,
    items: [
      {
        title: "KYC Verification",
        url: "/kyc-management",
      }
    ],
  },
  audit_logs: {
    title: "Audit Logs",
    url: "/audit-logs",
    icon: BarChart3,
   items: [
      {
        title: "Audit Logs",
        url: "/audit-logs",
      },
       {
        title: "Audit By Users",
        url: "/audit-by-users",
      }
    ],
  },
  ticket: {
    title: "Support & Tickets",
    url: "/support",
    icon: LifeBuoy,
    items: [
      {
        title: "Ticket Management",
        url: "/ticket-management",
      },
    ],
  },
  withdrawal: {
    title: "Withdrawal Management",
    url: "/withdrawal-management",
    icon: Wallet,
    items: [
      {
        title: "Withdrawal Approval",
        url: "/withdrawal-approval",
      }
    ],
  },
};

// Generate navigation items based on permissions
export function generateSubadminNavigation(permissions: Permission[]): NavItem[] {
  const allowedModules = getAllowedModules(permissions);
  const navItems: NavItem[] = [];
  
  // Add Dashboard (always available for subadmin)
  navItems.push({
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
    isActive: true,
    items: [
      {
        title: "Overview",
        url: "/dashboard",
      },
    ],
  });

  // Process each allowed module
  allowedModules.forEach(module => {
    const navConfig = PERMISSION_NAV_MAPPING[module];
    
    if (navConfig) {
      // Filter menu items based on specific permissions
      const filteredItems = navConfig.items?.filter(item => {
        // Check if user has read permission for this specific functionality
        return hasPermission(permissions, module, 'read');
      });

      if (filteredItems && filteredItems.length > 0) {
        navItems.push({
          ...navConfig,
          items: filteredItems,
        });
      }
    }
  });

  return navItems;
}

// ---------- Manager navigation (category-based) ----------

const MANAGER_PERMISSION_NAV_MAPPING: Record<string, NavItem> = {
  Bonus: {
    title: "Bonus Management",
    url: "/bonus-management",
    icon: BarChart,
    items: [
      { title: "Bonus", url: "/bonus-management" },
    ],
  },
  "E-Mail Management": {
    title: "E-Mail Management",
    url: "/email-management",
    icon: Users,
    items: [
      { title: "E-Mail Management", url: "/email-management" },
    ],
  },
  "Group Management": {
    title: "Account Management",
    url: "/packages",
    icon: Package,
    items: [
      { title: "All Accounts", url: "/all-accounts" },
      { title: "Package Sales", url: "/package-sales" },
      { title: "Package Analytics", url: "/package-analytics" },
    ],
  },
  "IB Management": {
    title: "IB Management",
    url: "/ib-management",
    icon: Users,
    items: [
      { title: "All IB", url: "/ib-management" },
    ],
  },
  "Marketing Management": {
    title: "Marketing Management",
    url: "/marketing-management",
    icon: Shield,
    items: [
      { title: "Marketing Management", url: "/marketing-management" },
    ],
  },
  "News Management": {
    title: "News Management",
    url: "/news-management",
    icon: Shield,
    items: [
      { title: "News Management", url: "/news-management" },
    ],
  },
  Notification: {
    title: "Notification Management",
    url: "/notification-management",
    icon: Shield,
    items: [
      { title: "Notification Management", url: "/notification-management" },
    ],
  },
  "Report Management": {
    title: "Report Management",
    url: "/report-management",
    icon: Shield,
    items: [
      { title: "Report Management", url: "/report-management" },
    ],
  },
  "Rewards Management": {
    title: "Reward Management",
    url: "/reward-management",
    icon: Shield,
    items: [
      { title: "Reward Management", url: "/reward-management" },
    ],
  },
  "Settings Management": {
    title: "Settings Management",
    url: "/settings-management",
    icon: Shield,
    items: [
      { title: "Settings Management", url: "/settings-management" },
    ],
  },
  "Sub Admin": {
    title: "Manager Management",
    url: "/manager",
    icon: Users,
    items: [
      { title: "All Managers", url: "/all-managers" },
    ],
  },
  "Ticket Management": {
    title: "Ticket Management",
    url: "/ticket-management",
    icon: Shield,
    items: [
      { title: "Ticket Management", url: "/ticket-management" },
    ],
  },
  Transaction: {
    title: "Transaction Management",
    url: "/transactions",
    icon: CreditCard,
    items: [
      { title: "USDT Transactions", url: "/usdt-transactions" },
      { title: "Transaction Verification", url: "/transaction-verification" },
      { title: "Payment History", url: "/payment-history" },
    ],
  },
  "User Management": {
    title: "User Management",
    url: "/users",
    icon: Users,
    items: [
      { title: "All Users", url: "/new-users" },
      { title: "User Verification", url: "/user-verification" },
      { title: "User Status", url: "/user-status" },
    ],
  },
};

const cloneNavItem = (item: NavItem): NavItem => ({
  ...item,
  items: item.items ? item.items.map((sub) => ({ ...sub })) : undefined,
});

export function generateManagerNavigation(
  groupedPermissions?: GroupedPermissions[] | ManagerPermissionCategory[]
): NavItem[] {
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: BarChart3,
      isActive: true,
      items: [
        {
          title: "Overview",
          url: "/dashboard",
        },
      ],
    },
  ];

  if (!groupedPermissions) {
    return navItems;
  }

  const seen = new Set<string>();

  groupedPermissions.forEach((group) => {
    const category = group.category;
    if (!category || seen.has(category)) return;

    const navConfig = MANAGER_PERMISSION_NAV_MAPPING[category];
    if (navConfig) {
      navItems.push(cloneNavItem(navConfig));
      seen.add(category);
    }
  });

  return navItems;
}

// Check if user has permission to access a specific route
export function canAccessRoute(permissions: Permission[], route: string): boolean {
  // Route to permission mapping - Updated to match actual API module names
  const ROUTE_PERMISSION_MAP: Record<string, { module: string; action: string }> = {
    '/Registration-approval': { module: 'registration_fee', action: 'read' },
    '/usdt-transactions': { module: 'usdt_transaction', action: 'read' },
    '/USDT-Deposit-History': { module: 'usdt_transaction', action: 'read' },
    '/admin-management': { module: 'subadmin', action: 'read' },
    '/manage-permissions': { module: 'subadmin', action: 'write' },
    '/all-packages': { module: 'package', action: 'read' },
    '/package-sales': { module: 'package', action: 'read' },
    '/ROI-Income': { module: 'roi', action: 'read' },
    '/daily-roi': { module: 'roi', action: 'read' },
    '/kcr-system': { module: 'kcr', action: 'read' },
    '/kcr-income': { module: 'kcr', action: 'read' },
    '/royalty-system': { module: 'royalty', action: 'read' },
    '/royalty-income': { module: 'royalty', action: 'read' },
    '/rank-system': { module: 'rank', action: 'read' },
    '/rank-history': { module: 'rank', action: 'read' },
    '/sponsor-income': { module: 'sponser', action: 'read' },
    '/level-wise-business': { module: 'sponser', action: 'read' },
    '/kyc-management': { module: 'kyc', action: 'read' },
    '/kyc-status': { module: 'kyc', action: 'read' },
    '/audit-logs': { module: 'audit', action: 'read' },
    '/audit-by-users': { module: 'audit', action: 'read' },
    '/activity-logs': { module: 'audit', action: 'read' },
    '/all-tickets': { module: 'ticket', action: 'read' },
    '/ticket-management': { module: 'ticket', action: 'read' },
    '/withdrawal-requests': { module: 'withdrawal', action: 'read' },
    '/withdrawal-history': { module: 'withdrawal', action: 'read' },
  };

  const requiredPermission = ROUTE_PERMISSION_MAP[route];
  if (!requiredPermission) {
    return true; // Allow access to unmapped routes (like dashboard)
  }

  return hasPermission(permissions, requiredPermission.module, requiredPermission.action);
}