import {
  Award,
  BarChart3,
  Bell,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
  History,
  Home,
  LifeBuoy,
  Mail,
  Megaphone,
  Package,
  Settings2,
  Shield,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { GroupedPermissions } from "@/lib/api";
import {
  getManagerPermissionNames,
  normalizeManagerPermissionName,
} from "@/lib/manager-permissions";
import type { NavItem, Permission, UserType } from "@/types/permissions";

export type AppAudience = "shared" | "client" | "backoffice" | "admin" | "manager";
export type AppRole = UserType;

type SidebarSectionId =
  | "dashboard"
  | "wallet"
  | "accounts"
  | "funds"
  | "trade-history"
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
  | "group-management"
  | "support"
  | "announcements"
  | "notification"
  | "reports"
  // | "marketing-management"
  | "news-management"
  | "promotion-management"
  | "settings"
  | "ib-plans-management";

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

export interface AppBreadcrumbItem {
  title: string;
  url?: string;
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

/** Manager routes: `managerCategories` unions legacy labels with `/permissions/permissions` categories. Some sections (e.g. Promotion, PSP) may gain API categories later—keep existing strings until backend parity. */

export const crmData = {
  user: {
    name: "Admin User",
    email: "admin@affiliatecrm.com",
    avatar: "/avatars/admin.svg",
  },
  teams: [
    {
      name: "Forex CRM Platform",
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
    directLink: true,
  },
  {
    id: "wallet",
    title: "My wallet",
    url: "/my-wallet/wallet-overview",
    icon: DollarSign,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "accounts",
    title: "My Accounts",
    url: "/my_accounts/open-trading-account",
    icon: Award,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "funds",
    title: "Funds",
    url: "/funds/deposit",
    icon: Wallet,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "trade-history",
    title: "Trade History",
    url: "/trade-history/all-trades",
    icon: History,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "profile",
    title: "My profile",
    url: "/profile/view_profile",
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
    url: "/raise-ticket",
    icon: LifeBuoy,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "announcements",
    title: "Announcements",
    url: "/announcements",
    icon: Megaphone,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "user-management",
    title: "User Management",
    url: "/new-users",
    icon: Users,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["User Management"],
  },
  {
    id: "transaction-management",
    title: "Transaction Management",
    url: "/usdt-transactions",
    icon: CreditCard,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Transaction"],
  },
  {
    id: "ib-management",
    title: "IB Management",
    url: "/all-ib",
    icon: UserCheck,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["IB Management"],
  }, 
  {
    id: "ib-plans-management",
    title: "IB Plans Management",
    url: "/ib-plans-management",
    icon: UserCheck,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["IB Plans Management"],
  },
  {
    id: "account-management",
    title: "Account Management",
    url: "/all-accounts",
    icon: Package,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Group Management"],
  },
 {
    id: "group-management",
    title: "Group Management",
    url: "/all-groups",
    icon: Package,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Group Management"],
  },
    {
    id: "manager-management",
    title: "Manager Management",
    url: "/all-managers",
    icon: UserPlus,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Sub Admin"],
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
    id: "support",
    title: "Support & Tickets",
    url: "/all-tickets",
    icon: LifeBuoy,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Ticket Management"],
  },
  {
    id: "notification",
    title: "Notification",
    url: "/all-notifications",
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
    id: "email-management",
    title: "E-Mail Management",
    url: "/email-management",
    icon: Mail,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["E-Mail Management", "Email Management"],
  },


  // {
  //   id: "marketing-management",
  //   title: "Marketing Management",
  //   url: "/marketing-management",
  //   icon: TrendingUp,
  //   audience: "backoffice",
  //   roles: BACKOFFICE_ROLES,
  //   managerCategories: ["Marketing Management"],
  // },
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
    id: "promotion-management",
    title: "Promotion Management",
    url: "/promotion-management",
    icon: Gift,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Promotion Management"],
  },
  {
    id: "settings",
    title: "Settings",
    url: "/user-2fa",
    icon: Settings2,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: [
      "Settings",
      "Manager 2fa",
      "Deposit Bank Details",
      "Setting Management",
      "PSP Setting",
      "Currency Management",
    ],
  },
];

const ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    path: "/dashboard",
    audience: "shared",
    roles: SHARED_ROLES,
    sidebarSection: "dashboard",
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
    path: "/trade-history/all-trades",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "trade-history",
    navLabel: "All Trades",
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
    path: "/user-news",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "announcements",
    navLabel: "News",
  },
  {
    path: "/user-promotions",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "announcements",
    navLabel: "Promotions",
  },
  {
    path: "/ib-dashboard",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "IB Dashboard",
    activeMatch: ["/ib-dashboard"],
  },
  {
    path: "/ib-dashboard/wallet",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "IB Wallet",
  },
  {
    path: "/ib-dashboard/clients",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "IB Clients",
  },
  {
    path: "/ib-dashboard/transfer",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "IB Transfer",
  },
  {
    path: "/ib-dashboard/commissions",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Commissions Table",
  },
  {
    path: "/ticket-history",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Ticket History",
  },
  {
    path: "/withdrawal-history",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Withdrawal History",
  },
  {
    path: "/purchased-history",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Purchased History",
  },
  {
    path: "/My-Package",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "My Package",
  },
  {
    path: "/usdt-wallet",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "USDT Wallet",
    activeMatch: ["/usdt-wallet"],
  },
  {
    path: "/usdt-wallet/deposit-history",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "USDT Deposit History",
  },
  {
    path: "/usdt-wallet/statement",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "USDT Wallet Statement",
  },
  {
    path: "/USDT-Wallet-Statement",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "USDT Wallet Statement",
  },
  {
    path: "/settings",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Settings",
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
    navLabel: "MT5 Accounts",
    managerCategories: ["User Management"],
  },
  {
    path: "/user-verification",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "User KYC",
    managerCategories: ["User Management"],
  },
  {
    path: "/add-bank-details",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "Add Bank Details",
    managerCategories: ["User Management"],
  },
  {
    path: "/usdt-transactions",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "All Transactions",
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
    managerCategories: ["E-Mail Management", "Email Management"],
  },
  {
    path: "/all-ib",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB Request",
    managerCategories: ["IB Management"],
  },
  {
    path: "/ib-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB Users",
    managerCategories: ["IB Management"],
  },
  // {
  //   path: "/set-ib-commission",
  //   audience: "backoffice",
  //   roles: BACKOFFICE_ROLES,
  //   sidebarSection: "ib-management",
  //   navLabel: "Set IB Commission",
  //   managerCategories: ["IB Management"],
  //   activeMatch: ["/set-ib-commission"],
  // },
  {
    path: "/ib-plans-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-plans-management",
    navLabel: "IB Plans",
    managerCategories: ["IB Plans Management"],
    activeMatch: ["/ib-plans-management"],
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
    path: "/all-groups",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "group-management",
    navLabel: "All Groups",
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
    path: "/all-notifications",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "notification",
    navLabel: "All Notifications",
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
    path: "/report-management/trading-history-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Trading History Report",
    managerCategories: ["Report Management"],
  },
  // {
  //   path: "/marketing-management",
  //   audience: "backoffice",
  //   roles: BACKOFFICE_ROLES,
  //   sidebarSection: "marketing-management",
  //   navLabel: "Marketing Management",
  //   managerCategories: ["Marketing Management"],
  // },
  {
    path: "/news-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "news-management",
    navLabel: "News Management",
    managerCategories: ["News Management"],
  },
  {
    path: "/promotion-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "promotion-management",
    navLabel: "Promotion Management",
    managerCategories: ["Promotion Management"],
  },
  {
    path: "/user-2fa",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "User 2FA",
    managerCategories: ["Settings", "Setting Management"],
  },
  {
    path: "/manager-2fa",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Manager 2FA",
    managerCategories: ["Settings", "Manager 2fa", "Setting Management"],
  },
  {
    path: "/psp-setting",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "PSP Setting",
    managerCategories: ["Settings", "PSP Setting", "Setting Management"],
  },
    {
    path: "/currency-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Currency Management",
    managerCategories: ["Settings", "Currency Management", "Setting Management"],
  },
  {
    path: "/bank-details",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Deposit Bank Details",
    managerCategories: ["Settings", "Deposit Bank Details", "Setting Management"],
  },
  {
    path: "/ib-plans",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    navLabel: "IB Plans",
    managerCategories: ["IB Management"],
  },
  {
    path: "/user-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    navLabel: "User Accounts",
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

function getManagerPermissionNameSet(groupedPermissions?: GroupedPermissions[]) {
  const set = new Set<string>();
  (groupedPermissions ?? []).forEach((group) => {
    (group.permissions ?? []).forEach((permission) => {
      if (permission?.name) {
        set.add(normalizeManagerPermissionName(permission.name));
      }
    });
  });
  return set;
}

function hasManagerFeature(
  permissionNames: Set<string>,
  moduleKey: "account-types" | "reportManagement",
  featureKey: string
) {
  const requiredNames = getManagerPermissionNames(moduleKey, featureKey);
  if (requiredNames.length === 0) return false;
  return requiredNames.some((name) => permissionNames.has(name));
}

function hasAnyReportFeature(permissionNames: Set<string>) {
  return (
    hasManagerFeature(permissionNames, "reportManagement", "depositReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "withdrawReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "ibWithdrawReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "internalTransferReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "loginActivity") ||
    hasManagerFeature(permissionNames, "reportManagement", "historyReport")
  );
}

function isManagerRouteFeatureAllowed(path: string, permissionNames: Set<string>) {
  if (path === "/all-accounts") {
    return hasManagerFeature(permissionNames, "account-types", "accountTypesList");
  }
  if (path === "/report-management") {
    return hasManagerFeature(permissionNames, "reportManagement", "depositReport");
  }
  if (path === "/report-management/withdrawal-report") {
    return hasManagerFeature(permissionNames, "reportManagement", "withdrawReport");
  }
  if (path === "/report-management/ib-withdrawal-report") {
    return hasManagerFeature(permissionNames, "reportManagement", "ibWithdrawReport");
  }
  if (path === "/report-management/internal-transfer-report") {
    return hasManagerFeature(permissionNames, "reportManagement", "internalTransferReport");
  }
  if (path === "/report-management/login-activity-report") {
    return hasManagerFeature(permissionNames, "reportManagement", "loginActivity");
  }
  if (path === "/report-management/trading-history-report") {
    return hasManagerFeature(permissionNames, "reportManagement", "historyReport");
  }
  return true;
}

function getSectionById(sectionId: SidebarSectionId) {
  return SIDEBAR_SECTIONS.find((section) => section.id === sectionId);
}

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

function formatSegmentLabel(segment: string) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function findBestRoute(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  return [...ROUTE_DEFINITIONS]
    .sort((left, right) => right.path.length - left.path.length)
    .find((route) => {
      const prefixes = [route.path, ...(route.activeMatch ?? [])];
      return matchesPrefix(normalizedPathname, prefixes);
    });
}

export function getBreadcrumbItems(pathname: string, role?: UserType): AppBreadcrumbItem[] {
  const normalizedPathname = normalizePathname(pathname);
  const route = findBestRoute(normalizedPathname);

  if (
    route &&
    role &&
    !route.roles.includes(role) &&
    !(role === "subadmin" && route.audience !== "client")
  ) {
    return [];
  }

  if (normalizedPathname === "/dashboard") {
    return [{ title: "Dashboard" }];
  }

  const breadcrumbs: AppBreadcrumbItem[] = [{ title: "Dashboard", url: "/dashboard" }];

  if (route?.sidebarSection) {
    const section = getSectionById(route.sidebarSection);
    if (section && section.id !== "dashboard") {
      const routeTitle = route.navLabel ?? section.title;
      if (section.directLink || routeTitle === section.title) {
        breadcrumbs.push({ title: routeTitle });
        return breadcrumbs;
      }

      breadcrumbs.push({ title: section.title });
      breadcrumbs.push({ title: routeTitle });
      return breadcrumbs;
    }
  }

  if (route?.navLabel) {
    breadcrumbs.push({ title: route.navLabel });
    return breadcrumbs;
  }

  const segments = normalizedPathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    breadcrumbs.push({ title: formatSegmentLabel(lastSegment) });
  }

  return breadcrumbs;
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
          title: "Login to IB Portal",
          url: "/ib-dashboard",
          icon: BarChart3,
        }
      : item
  );
}

export function getManagerNavigation(groupedPermissions?: GroupedPermissions[]): NavItem[] {
  const categories = getManagerCategorySet(groupedPermissions);
  const permissionNames = getManagerPermissionNameSet(groupedPermissions);
  const reportRouteFeatureMap: Array<{
    path: string;
    featureKey:
      | "depositReport"
      | "withdrawReport"
      | "ibWithdrawReport"
      | "internalTransferReport"
      | "loginActivity"
      | "historyReport";
  }> = [
    { path: "/report-management", featureKey: "depositReport" },
    { path: "/report-management/withdrawal-report", featureKey: "withdrawReport" },
    { path: "/report-management/ib-withdrawal-report", featureKey: "ibWithdrawReport" },
    { path: "/report-management/internal-transfer-report", featureKey: "internalTransferReport" },
    { path: "/report-management/login-activity-report", featureKey: "loginActivity" },
    { path: "/report-management/trading-history-report", featureKey: "historyReport" },
  ];

  return SIDEBAR_SECTIONS.filter((section) => {
    if (!section.roles.includes("manager")) {
      return false;
    }

    if (section.id === "account-management") {
      return hasManagerFeature(permissionNames, "account-types", "accountTypesList");
    }
    if (section.id === "reports") {
      return hasAnyReportFeature(permissionNames);
    }

    return isManagerCategoryAllowed(categories, section.managerCategories);
  }).flatMap((section) => {
    let sectionRoutes = ROUTE_DEFINITIONS.filter((route) => {
      if (route.sidebarSection !== section.id || !route.roles.includes("manager")) {
        return false;
      }

      if (!isManagerRouteFeatureAllowed(route.path, permissionNames)) {
        return false;
      }

      return isManagerCategoryAllowed(categories, route.managerCategories);
    });

    if (section.id === "reports") {
      sectionRoutes = sectionRoutes.filter((route) => {
        const match = reportRouteFeatureMap.find((entry) => entry.path === route.path);
        if (!match) return false;
        return hasManagerFeature(permissionNames, "reportManagement", match.featureKey);
      });
    }

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

/** Flat links for compact UI (e.g. header dropdown). Omits `/dashboard`; max 2 items; empty when manager has no real sections. */
export function getManagerHeaderQuickLinks(
  groupedPermissions?: GroupedPermissions[]
): { title: string; url: string }[] {
  const nav = getManagerNavigation(groupedPermissions);
  const out: { title: string; url: string }[] = [];
  const seen = new Set<string>();

  const push = (title: string, url: string) => {
    if (!url || url === "#" || !url.startsWith("/")) return;
    if (url === "/dashboard") return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push({ title, url });
  };

  for (const item of nav) {
    if (item.items?.length) {
      for (const sub of item.items) {
        push(sub.title, sub.url);
      }
    } else {
      push(item.title, item.url);
    }
  }

  return out.slice(0, 2);
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

  const permissionNames = getManagerPermissionNameSet(options?.managerPermissions);
  if (!isManagerRouteFeatureAllowed(matchingRoute.path, permissionNames)) {
    return false;
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
