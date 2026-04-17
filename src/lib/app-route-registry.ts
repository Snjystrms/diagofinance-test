import {
  Award,
  BarChart3,
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
  Home,
  LifeBuoy,
  Mail,
  Package,
  Settings2,
  Shield,
  TrendingUp,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { GroupedPermissions } from "@/lib/api";
import type { NavItem, Permission, UserType } from "@/types/permissions";

export type AppAudience = "shared" | "client" | "backoffice" | "admin" | "manager";
export type AppRole = UserType;

type SidebarSectionId =
  | "dashboard"
  | "wallet"
  | "accounts"
  | "funds"
  | "profile"
  | "become-partner"
  | "help-support"
  | "user-management"
  | "transaction-management"
  | "bonus-management"
  | "manager-management"
  | "email-management"
  | "ib-management"
  | "account-management"
  | "support"
  | "notification"
  | "notification-management"
  | "reports"
  | "marketing-management"
  | "news-management"
  | "reward-management"
  | "settings-management";

export interface AppRouteDefinition {
  path: string;
  audience: AppAudience;
  roles: AppRole[];
  sidebarSection?: SidebarSectionId;
  navLabel?: string;
  icon?: LucideIcon;
  managerCategories?: string[];
  activeMatch?: string[];
}

interface SidebarSectionDefinition {
  id: SidebarSectionId;
  title: string;
  url: string;
  icon: LucideIcon;
  audience: AppAudience;
  roles: AppRole[];
  managerCategories?: string[];
  directLink?: boolean;
}

interface SidebarContext {
  isIbUser?: boolean;
  managerPermissions?: GroupedPermissions[];
  subadminPermissions?: Permission[];
}

const SHARED_ROLES: AppRole[] = ["admin", "manager", "user", "subadmin"];
const CLIENT_ROLES: AppRole[] = ["user"];
const BACKOFFICE_ROLES: AppRole[] = ["admin", "manager"];

export const crmData = {
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
};

const SIDEBAR_SECTIONS: SidebarSectionDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    audience: "shared",
    roles: SHARED_ROLES,
  },
  {
    id: "wallet",
    title: "My wallet",
    url: "/my-wallet",
    icon: DollarSign,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "accounts",
    title: "My Accounts",
    url: "/my_accounts",
    icon: Award,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "funds",
    title: "Funds",
    url: "/funds",
    icon: Wallet,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "profile",
    title: "My profile",
    url: "/profile",
    icon: Mail,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "become-partner",
    title: "Become Partner",
    url: "/become-partner",
    icon: UserPlus,
    audience: "client",
    roles: CLIENT_ROLES,
    directLink: true,
  },
  {
    id: "help-support",
    title: "Help & Support",
    url: "/help-support",
    icon: LifeBuoy,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "user-management",
    title: "User Management",
    url: "/users",
    icon: Users,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["User Management"],
  },
  {
    id: "transaction-management",
    title: "Transaction Management",
    url: "/transactions",
    icon: CreditCard,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Transaction"],
  },
  {
    id: "bonus-management",
    title: "Bonus Management",
    url: "/bonus-management",
    icon: Gift,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Bonus"],
  },
  {
    id: "manager-management",
    title: "Manager Management",
    url: "/manager",
    icon: UserPlus,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Sub Admin"],
  },
  {
    id: "email-management",
    title: "E-Mail Management",
    url: "/email-management",
    icon: Mail,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["E-Mail Management"],
  },
  {
    id: "ib-management",
    title: "IB Management",
    url: "/ib-management",
    icon: UserCheck,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["IB Management"],
  },
  {
    id: "account-management",
    title: "Account Management",
    url: "/packages",
    icon: Package,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Group Management"],
  },
  {
    id: "support",
    title: "Support & Tickets",
    url: "/support",
    icon: LifeBuoy,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Ticket Management"],
  },
  {
    id: "notification",
    title: "Notification",
    url: "/notification",
    icon: Bell,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Notification"],
  },
  {
    id: "notification-management",
    title: "Notification Management",
    url: "/notification-management",
    icon: Bell,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Notification"],
  },
  {
    id: "reports",
    title: "All Reports",
    url: "/report-management",
    icon: BarChart3,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Report Management"],
  },
  {
    id: "marketing-management",
    title: "Marketing Management",
    url: "/marketing-management",
    icon: TrendingUp,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Marketing Management"],
  },
  {
    id: "news-management",
    title: "News Management",
    url: "/news-management",
    icon: FileText,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["News Management"],
  },
  {
    id: "reward-management",
    title: "Reward Management",
    url: "/reward-management",
    icon: Trophy,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Rewards Management"],
  },
  {
    id: "settings-management",
    title: "Settings Management",
    url: "/settings-management",
    icon: Settings2,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Settings Management"],
  },
];

const ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    path: "/dashboard",
    audience: "shared",
    roles: SHARED_ROLES,
    sidebarSection: "dashboard",
    navLabel: "Overview",
  },
  {
    path: "/test-registration-fee",
    audience: "shared",
    roles: SHARED_ROLES,
  },
  {
    path: "/my-wallet/wallet-overview",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "wallet",
    navLabel: "Wallet Overview",
  },
  {
    path: "/my-wallet/transactions-history",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "wallet",
    navLabel: "Transactions History",
  },
  {
    path: "/my_accounts/open-trading-account",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "accounts",
    navLabel: "Open Trading Account",
  },
  {
    path: "/my_accounts/manage-accounts",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "accounts",
    navLabel: "Manage Accounts",
  },
  {
    path: "/my_accounts/accounts-overview",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "accounts",
    navLabel: "Accounts Overview",
  },
  {
    path: "/funds/deposit",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "Deposit Funds",
  },
  {
    path: "/funds/my_deposit",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "My Deposit",
  },
  {
    path: "/funds/withdrawal-request",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "Withdraw Funds",
  },
  {
    path: "/funds/withdraw",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "Withdraw List",
  },
  {
    path: "/funds/internal-transfer",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "Internal Funds Transfer",
  },
  {
    path: "/profile",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/profile/kyc-verification",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "profile",
    navLabel: "KYC Verification",
  },
  {
    path: "/profile/view_profile",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "profile",
    navLabel: "View Profile",
  },
  {
    path: "/become-partner",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "become-partner",
    navLabel: "Become Partner",
  },
  {
    path: "/raise-ticket",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "help-support",
    navLabel: "Raise Ticket",
  },
  {
    path: "/ib-dashboard",
    audience: "client",
    roles: CLIENT_ROLES,
    activeMatch: ["/ib-dashboard"],
  },
  {
    path: "/ticket-history",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/withdrawal-history",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/purchased-history",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/My-Package",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/usdt-wallet",
    audience: "client",
    roles: CLIENT_ROLES,
    activeMatch: ["/usdt-wallet"],
  },
  {
    path: "/USDT-Wallet-Statement",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/settings",
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    path: "/new-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "All Users",
    managerCategories: ["User Management"],
  },
  {
    path: "/all-users-mt5-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "All Users MT5 Accounts",
    managerCategories: ["User Management"],
  },
  {
    path: "/user-verification",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "User Verification",
    managerCategories: ["User Management"],
  },
  {
    path: "/usdt-transactions",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "USDT Transactions",
    managerCategories: ["Transaction"],
  },
  {
    path: "/bonus-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "bonus-management",
    navLabel: "Bonus",
    managerCategories: ["Bonus"],
  },
  {
    path: "/all-managers",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "manager-management",
    navLabel: "All Managers",
    managerCategories: ["Sub Admin"],
  },
  {
    path: "/email-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "email-management",
    navLabel: "E-Mail Management",
    managerCategories: ["E-Mail Management"],
  },
  {
    path: "/all-ib",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "All IB",
    managerCategories: ["IB Management"],
  },
  {
    path: "/ib-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB User",
    managerCategories: ["IB Management"],
  },
  {
    path: "/set-ib-commission",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "Set IB Commission",
    managerCategories: ["IB Management"],
    activeMatch: ["/set-ib-commission"],
  },
  {
    path: "/all-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "account-management",
    navLabel: "All Accounts",
    managerCategories: ["Group Management"],
  },
  {
    path: "/package-sales",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "account-management",
    navLabel: "Package Sales",
    managerCategories: ["Group Management"],
  },
  {
    path: "/package-analytics",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "account-management",
    navLabel: "Package Analytics",
    managerCategories: ["Group Management"],
  },
  {
    path: "/all-tickets",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "support",
    navLabel: "All Tickets",
    managerCategories: ["Ticket Management"],
  },
  {
    path: "/ticket-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "support",
    navLabel: "Ticket Management",
    managerCategories: ["Ticket Management"],
  },
  {
    path: "/support-analytics",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "support",
    navLabel: "Support Analytics",
    managerCategories: ["Ticket Management"],
  },
  {
    path: "/all-notifications",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "notification",
    navLabel: "All Notifications",
  },
  {
    path: "/notification-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "notification-management",
    navLabel: "Notification Management",
    managerCategories: ["Notification"],
  },
  {
    path: "/report-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Deposit Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/report-management/withdrawal-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Withdrawal Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/report-management/ib-withdrawal-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "IB Withdrawal Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/report-management/internal-transfer-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Internal Transfer Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/report-management/login-activity-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Login Activity Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/marketing-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "marketing-management",
    navLabel: "Marketing Management",
    managerCategories: ["Marketing Management"],
  },
  {
    path: "/news-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "news-management",
    navLabel: "News Management",
    managerCategories: ["News Management"],
  },
  {
    path: "/reward-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reward-management",
    navLabel: "Reward Management",
    managerCategories: ["Rewards Management"],
  },
  {
    path: "/settings-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings-management",
    navLabel: "Settings Management",
    managerCategories: ["Settings Management"],
  },
  {
    path: "/ib-plans",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["IB Management"],
  },
  {
    path: "/user-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Group Management"],
  },
];

const DEFAULT_ROLE_NAVIGATION: Record<Exclude<AppRole, "manager" | "subadmin">, NavItem[]> = {
  admin: buildNavigationForRole("admin"),
  user: buildNavigationForRole("user"),
};

function cloneNavItems(items: NavItem[]): NavItem[] {
  return items.map((item) => ({
    ...item,
    items: item.items?.map((subItem) => ({ ...subItem })),
  }));
}

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isManagerCategoryAllowed(
  categories: Set<string>,
  requiredCategories?: string[]
) {
  if (!requiredCategories || requiredCategories.length === 0) {
    return true;
  }

  return requiredCategories.some((category) => categories.has(category));
}

function getManagerCategorySet(groupedPermissions?: GroupedPermissions[]) {
  return new Set(
    (groupedPermissions ?? []).map((group) => group.category).filter(Boolean)
  );
}

function getSectionById(sectionId: SidebarSectionId) {
  return SIDEBAR_SECTIONS.find((section) => section.id === sectionId);
}

function buildNavigationForRole(role: "admin" | "user"): NavItem[] {
  return SIDEBAR_SECTIONS.filter((section) => section.roles.includes(role)).flatMap((section) => {
    const sectionRoutes = ROUTE_DEFINITIONS.filter(
      (route) => route.sidebarSection === section.id && route.roles.includes(role)
    );

    if (section.directLink) {
      return [
        {
          title: section.title,
          url: sectionRoutes[0]?.path ?? section.url,
          icon: section.icon,
        },
      ];
    }

    return [
      {
        title: section.title,
        url: section.url,
        icon: section.icon,
        isActive: section.id === "dashboard",
        items: sectionRoutes.map((route) => ({
          title: route.navLabel ?? route.path,
          url: route.path,
        })),
      },
    ];
  });
}

export function getAdminNavigation(): NavItem[] {
  return cloneNavItems(DEFAULT_ROLE_NAVIGATION.admin);
}

export function getUserNavigation(isIbUser = false): NavItem[] {
  const items = cloneNavItems(DEFAULT_ROLE_NAVIGATION.user);

  if (!isIbUser) {
    return items;
  }

  return items.map((item) =>
    item.title === "Become Partner"
      ? {
          ...item,
          title: "IB dashboard",
          url: "/ib-dashboard",
        }
      : item
  );
}

export function getManagerNavigation(groupedPermissions?: GroupedPermissions[]): NavItem[] {
  const categories = getManagerCategorySet(groupedPermissions);

  return SIDEBAR_SECTIONS.filter((section) => {
    if (!section.roles.includes("manager")) {
      return false;
    }

    return isManagerCategoryAllowed(categories, section.managerCategories);
  }).flatMap((section) => {
    const sectionRoutes = ROUTE_DEFINITIONS.filter((route) => {
      if (route.sidebarSection !== section.id || !route.roles.includes("manager")) {
        return false;
      }

      return isManagerCategoryAllowed(categories, route.managerCategories);
    });

    if (sectionRoutes.length === 0 && section.id !== "dashboard") {
      return [];
    }

    return [
      {
        title: section.title,
        url: section.url,
        icon: section.icon,
        isActive: section.id === "dashboard",
        items: section.directLink
          ? undefined
          : sectionRoutes.map((route) => ({
              title: route.navLabel ?? route.path,
              url: route.path,
            })),
      },
    ];
  });
}

export function getSidebarNavigation(
  user?: Pick<SidebarContext, "isIbUser" | "managerPermissions" | "subadminPermissions"> & {
    type?: UserType;
  }
): NavItem[] {
  switch (user?.type) {
    case "admin":
      return getAdminNavigation();
    case "manager":
      return getManagerNavigation(user.managerPermissions);
    case "user":
      return getUserNavigation(user.isIbUser);
    default:
      return getUserNavigation();
  }
}

export function getRouteDefinitions() {
  return ROUTE_DEFINITIONS;
}

export function isRouteAllowedForRole(
  pathname: string,
  role: UserType,
  options?: Pick<SidebarContext, "managerPermissions">
) {
  const matchingRoute = ROUTE_DEFINITIONS.find((route) => {
    const prefixes = [route.path, ...(route.activeMatch ?? [])];
    return matchesPrefix(pathname, prefixes);
  });

  if (!matchingRoute) {
    return role === "admin";
  }

  if (!matchingRoute.roles.includes(role)) {
    if (role === "subadmin") {
      return matchingRoute.audience !== "client";
    }

    return false;
  }

  if (role === "subadmin") {
    return matchingRoute.audience !== "client";
  }

  if (role !== "manager") {
    return true;
  }

  const categories = getManagerCategorySet(options?.managerPermissions);
  return isManagerCategoryAllowed(categories, matchingRoute.managerCategories);
}

export function getSectionLabelForRole(role?: UserType) {
  if (role === "admin" || role === "manager" || role === "subadmin") {
    return "Administration";
  }

  return "Platform";
}
