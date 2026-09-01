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
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  LayoutDashboard,
  LayoutDashboardIcon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { GroupedPermissions } from "@/lib/api";
import {
  getManagerPermissionNames,
  normalizeManagerPermissionName,
} from "@/lib/manager-permissions";
import type { NavItem, Permission, UserType } from "@/types/permissions";

export type AppAudience =
  | "shared"
  | "client"
  | "backoffice"
  | "admin"
  | "manager";
export type AppRole = UserType;

type SidebarSectionId =
  | "dashboard"
  | "managementdashboard"
  | "wallet"
  | "accounts"
  | "funds"
  | "trade-history"
  | "profile"
  | "become-partner"
  | "help-support"
  | "user-reports"
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
  /**
   * Concrete permission names (ANY-of) required for a manager/subadmin to see
   * this route in the sidebar or open it directly. When set, it takes
   * precedence over the legacy per-path feature checks. Names are matched
   * case-insensitively against the permissions returned by the API.
   */
  managerPermissions?: string[];
  activeMatch?: string[];
  /**
   * When true, this route is only shown to (and only accessible by) IB users.
   * Non-IB users won't see it in the sidebar nor be allowed to navigate to it.
   */
  isIbUserOnly?: boolean;
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
      name: "Diago Finance",
      logoBright: "/diagologo.svg",
      logoDark: "/diagologo.svg",
      plan: "BUILD YOUR FUTURE",
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
    id: "managementdashboard",
    title: "Management Dashboard",
    url: "/management-dashboard",
    icon: LayoutDashboard,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    directLink: true,
  },
  // {
  //   id: "wallet",
  //   title: "My wallet",
  //   url: "/my-wallet/wallet-overview",
  //   icon: DollarSign,
  //   audience: "client",
  //   roles: CLIENT_ROLES,
  // },
  {
    id: "accounts",
    title: "My MT5 Accounts",
    url: "/my_accounts/open-trading-account",
    icon: Award,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "funds",
    title: "My Funds",
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
    title: "Request to Become IB",
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
    id: "user-reports",
    title: "My Reports",
    url: "/user-reports",
    icon: BarChart3,
    audience: "client",
    roles: CLIENT_ROLES,
  },
  {
    id: "announcements",
    title: "Announcements",
    url: "/user-news",
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
  // {
  //   id: "ib-plans-management",
  //   title: "Partner Plans Management",
  //   url: "/ib-plans-management",
  //   icon: UserCheck,
  //   audience: "backoffice",
  //   roles: BACKOFFICE_ROLES,
  //   managerCategories: ["IB Plans Management"],
  // },
  {
    id: "account-management",
    title: "Group Management",
    url: "/all-accounts",
    icon: Package,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    // UI label is "Group Management"; login response sends the category under
    // either "Account Management" or "Group Management" — accept both.
    managerCategories: ["Account Management", "Group Management"],
  },
  //  {
  //     id: "group-management",
  //     title: "Group Management",
  //     url: "/all-groups",
  //     icon: Package,
  //     audience: "backoffice",
  //     roles: BACKOFFICE_ROLES,
  //     managerCategories: ["Group Management"],
  //   },
    {
    id: "manager-management",
    title: "Sub-Admin Management",
    url: "/all-managers",
    icon: UserPlus,
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    managerCategories: ["Sub Admin", "Subadmin Management"],
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
    managerCategories: ["Promotion Management", "Promotion Mgmt"],
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
      "Sub-admin 2FA",
      "Deposit Bank Details",
      "Deposit Crypto Details",
      "Setting Management",
      "PSP Setting",
      "Audit Logs",
      "Currency Management",
      "Default Settings"
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
  // {
  //   path: "/my-wallet/wallet-overview",
  //   audience: "client",
  //   roles: CLIENT_ROLES,
  //   sidebarSection: "wallet",
  //   navLabel: "Wallet Overview",
  // },

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
  // {
  //   path: "/my_accounts/accounts-overview",
  //   audience: "client",
  //   roles: CLIENT_ROLES,
  //   sidebarSection: "accounts",
  //   navLabel: "Accounts Overview",
  // },
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
    path: "/funds/transactions-history",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "funds",
    navLabel: "Transactions History",
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
    navLabel: "Request to Become IB",
  },
  {
    path: "/raise-ticket",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "help-support",
    navLabel: "Raise Ticket",
  },
  {
    path: "/user-deposit-report",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "user-reports",
    navLabel: "Deposit Report",
  },
  {
    path: "/user-withdraw-report",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "user-reports",
    navLabel: "Withdraw Report",
  },
  {
    path: "/user-ib-withdraw-report",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "user-reports",
    navLabel: "IB Withdraw Report",
    isIbUserOnly: true,
  },
  {
    path: "/user-internal-transfer-report",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "user-reports",
    navLabel: "Internal Transfer Report",
  },
  {
    path: "/user-deal-report",
    audience: "client",
    roles: CLIENT_ROLES,
    sidebarSection: "user-reports",
    navLabel: "Deal Report",
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
    path: "/ib-dashboard/team",
    audience: "client",
    roles: CLIENT_ROLES,
    navLabel: "Team Tree",
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
    path: "/management-dashboard",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "managementdashboard",
    navLabel: "Management Dashboard",
  },
  {
    path: "/new-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "All Users",
    managerCategories: ["User Management"],
    managerPermissions: [
      "User List",
      "Add User",
      "Edit User",
      "View User",
      "Delete User",
      "Move Client to IB",
    ],
  },
  {
    path: "/temp-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "Lead Management",
    managerCategories: ["User Management"],
    managerPermissions: ["Temp Users List"],
  },
  {
    path: "/all-users-mt5-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "MT5 Accounts",
    managerCategories: ["User Management"],
    managerPermissions: [
      "MT5 User List",
      "Create MT5 Account",
      "Update MT5 Details",
      "Delete MT5 account",
      "Resend MT5 Data Mail",
    ],
  },
  {
    path: "/user-verification",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "User KYC",
    managerCategories: ["User Management"],
    managerPermissions: [
      "Pending Documents List",
      "Approve Document List",
      "Reject Document List",
      "Approve/Reject KYC",
      "Upload User Documents",
    ],
  },
  {
    path: "/add-bank-details",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "User Bank Details",
    managerCategories: ["User Management"],
    managerPermissions: [
      "Bank Details List",
      "Add Bank Details",
      "Update Bank Details",
      "Delete Bank details",
      "Verify Bank Details",
    ],
  },
  {
    path: "/add-existing-clients",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "user-management",
    navLabel: "Add Existing Clients",
    managerCategories: ["User Management"],
    managerPermissions: ["Add Existing Client"],
  },
  {
    path: "/admin-transaction",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "Admin Transaction",
    managerCategories: ["Transaction"],
    managerPermissions: [
      "Deposit List",
      "Withdrawal List",
      "Approve/Reject Deposit",
      "Approve/Reject Withdrawal",
      "IB Withdrawal List",
      "Approve/Reject IB Withdrawal",
      "Client Deposit",
      "Client Withdrawal",
      "Internal Transfer",
      "Wallet Deposit",
      "Wallet Withdrawal",
    ],
  },
  {
    path: "/usdt-transactions",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "Pending Deposit",
    managerCategories: ["Transaction"],
    managerPermissions: ["Deposit List", "Approve/Reject Deposit"],
  },
  {
    path: "/withdrawal-requests",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "Pending Withdrawal",
    managerCategories: ["Transaction"],
    managerPermissions: ["Withdrawal List", "Approve/Reject Withdrawal"],
  },
  {
    path: "/ib-withdrawal-requests",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "transaction-management",
    navLabel: "Pending IB Withdrawal",
    managerCategories: ["Transaction"],
    managerPermissions: ["IB Withdrawal List", "Approve/Reject IB Withdrawal"],
  },
  {
    path: "/bonus-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "bonus-management",
    navLabel: "Manage Bonus",
    managerCategories: ["Bonus"],
    managerPermissions: ["Bonus List", "Give Bonus", "Remove Bonus"],
  },
  {
    path: "/all-managers",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "manager-management",
    navLabel: "Sub-Admin List",
    managerCategories: ["Sub Admin", "Subadmin Management"],
    managerPermissions: [
      "Subadmin List",
      "Create Subadmin",
      "Add Subadmin Permission",
      "Edit Subadmin Permission",
    ],
  },
  {
    path: "/email-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "email-management",
    navLabel: "Manage E-Mail",
    managerCategories: ["E-Mail Management", "Email Management"],
    managerPermissions: [
      "Get Client Emails",
      "Send Email",
      "Create Broadcast Email",
      "Broadcast Email History",
      "Manage Email Exclusions",
    ],
  },
  {
    path: "/all-ib",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB Request",
    managerCategories: ["IB Management"],
    managerPermissions: ["IB Requests", "Approve/Reject IB Req"],
  },
  {
    path: "/ib-users",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB List",
    managerCategories: ["IB Management"],
    managerPermissions: [
      "IB Users",
      "View Commission",
      "Edit IB Commission",
      "View Level / Tree chart",
    ],
  },
   {
    path: "/ib-plans",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "IB Plans",
    managerCategories: ["IB Management"],
    managerPermissions: ["IB Plan", "Add IB Plan"],
  },
   {
    path: "/commission-group",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "Commission Group",
    managerCategories: ["IB Management"],
    managerPermissions: [
      "Commission Group",
      "Add Commission Group",
      "Edit Commission Group",
    ],
  },
  {
    path: "/set-ib-commission",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-management",
    navLabel: "Set IB Commission",
    managerCategories: ["IB Management"],
    managerPermissions: ["Set IB Commission", "Add IB Commission", "Edit IB Commission"],
    activeMatch: ["/set-ib-commission"],
  },
  {
    path: "/ib-plans-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "ib-plans-management",
    navLabel: "IB Plans",
    managerCategories: ["IB Plans Management", "IB Management"],
    managerPermissions: ["View / Create IB Plan", "Edit / Delete IB Plan"],
    activeMatch: ["/ib-plans-management"],
  },
  {
    path: "/all-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "account-management",
    navLabel: "All Groups",
    managerCategories: ["Account Management", "Group Management"],
    managerPermissions: [
      "Account Types List",
      "Group List",
      "Add Group",
      "Edit Group",
      "Delete Group",
    ],
  },
  {
    path: "/all-groups",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "group-management",
    navLabel: "All Groups",
    managerCategories: ["Group Management"],
    managerPermissions: [
      "Group List",
      "Add Group",
      "Edit Group",
      "Delete Group",
      "Account Types List",
    ],
  },
  {
    path: "/all-tickets",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "support",
    navLabel: "All Tickets",
    managerCategories: ["Ticket Management"],
    managerPermissions: ["Tickets"],
  },
  {
    path: "/all-notifications",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "notification",
    navLabel: "All Notifications",
    managerCategories: ["Notification"],
    managerPermissions: ["Unread Notification", "Read Notification"],
  },
  {
    path: "/report-management/all-transaction-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "All Transaction Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["All Transaction Report"],
  },
  {
    path: "/report-management/daily-summary-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Daily Summary Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Daily Summary Report"],
  },
  {
    path: "/report-management/wallet-history-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Wallet History Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Wallet History Report", "Main Wallet History Report"],
  },
  {
    path: "/report-management/all-partners-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Partner Users Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Partner Users Report", "IB Users Report"],
  },
  {
    path: "/report-management/deposit-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Deposit Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Deposit Report"],
  },
  {
    path: "/report-management/withdrawal-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Withdrawal Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Withdraw Report"],
  },
  {
    path: "/report-management/ib-withdrawal-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Partner Withdrawal Report",
    managerCategories: ["Report Management"],
  },
  {
    path: "/report-management/ib-commission-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "IB Commission Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Partner Commission Report", "Commission Report"],
  },
  {
    path: "/report-management/internal-transfer-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Internal Transfer Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Internal Transfer Report"],
  },
  {
    path: "/report-management/login-activity-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Login Activity Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Login Activity"],
  },
  {
    path: "/report-management/trading-history-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Trading History Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Trading History Report", "History Report"],
  },
  {
    path: "/report-management/ib-commission-withdrawal-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "IB Commission Withdrawal Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["IB Commission Withdraw Report"],
  },
  {
    path: "/report-management/main-wallet-history-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Main Wallet History Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Main Wallet History Report"],
  },
  {
    path: "/report-management/position-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "Position Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["Position Report"],
  },
  {
    path: "/report-management/history-report",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "reports",
    navLabel: "History Report",
    managerCategories: ["Report Management"],
    managerPermissions: ["History Report"],
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
    navLabel: "Manage News",
    managerCategories: ["News Management"],
    managerPermissions: ["News List", "Add News", "Edit News", "Delete News"],
  },
  {
    path: "/promotion-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "promotion-management",
    navLabel: "Manage Promotion",
    managerCategories: ["Promotion Management", "Promotion Mgmt"],
    managerPermissions: ["Manager Promotion", "Promotion List"],
  },
  {
    path: "/user-2fa",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "User 2FA",
    managerCategories: ["Settings", "Setting Management"],
    managerPermissions: [
      "User 2FA",
      "User 2FA List",
      "Enabled/Disabled User 2FA",
    ],
  },
  {
    path: "/manager-2fa",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Sub-admin 2FA",
    managerCategories: ["Settings", "Manager 2fa", "Setting Management"],
    managerPermissions: [
      "Sub-admin 2FA",
      "Subadmin 2FA List",
      "Enabled/Disabled Subadmin 2FA",
    ],
  },
  {
    path: "/psp-setting",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "PSP Setting",
    managerCategories: ["Settings", "PSP Setting", "Setting Management"],
    managerPermissions: [
      "PSP Setting",
      "Payment Method List",
      "Edit Payment Methods",
      "Delete Payment Methods",
    ],
  },
  {
    path: "/audit-logs",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Audit Logs",
    managerCategories: ["Settings", "Audit Logs", "Setting Management"],
    managerPermissions: ["Audit Logs"],
  },
  {
    path: "/currency-management",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Currency Management",
    managerCategories: [
      "Settings",
      "Currency Management",
      "Setting Management",
    ],
    managerPermissions: ["Currency Management"],
  },
   {
    path: "/default-settings",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Default Settings",
    managerCategories: [
      "Settings",
      "Default Settings",
      "Setting Management",
    ],
  },
  {
    path: "/bank-details",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Deposit Bank Details",
    managerCategories: [
      "Settings",
      "Deposit Bank Details",
      "Setting Management",
    ],
    managerPermissions: [
      "Deposit Bank Details",
      "Broker Deposit Account List",
      "Create Broker Deposit Account",
      "Edit Broker Deposit Account",
      "Delete Broker Deposit Account",
    ],
  },
  {
    path: "/deposit-crypto-details",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    sidebarSection: "settings",
    navLabel: "Deposit Crypto Details",
    managerCategories: [
      "Settings",
      "Deposit Crypto Details",
      "Setting Management",
    ],
    managerPermissions: [
      "Deposit Crypto Details",
      "Broker Crypto Wallet List",
      "Create Broker Crypto Wallet",
      "Edit Broker Crypto Wallet",
      "Delete Broker Crypto Wallet",
    ],
  },
   {
    path: "/ib-plans",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    navLabel: "Partner Plans",
    managerCategories: ["IB Management"],
    managerPermissions: ["IB Plan", "Add IB Plan"],
  },
  {
    path: "/user-accounts",
    audience: "backoffice",
    roles: BACKOFFICE_ROLES,
    navLabel: "User Accounts",
    managerCategories: ["Group Management"],
  },
];

const DEFAULT_ROLE_NAVIGATION: Record<
  Exclude<AppRole, "manager" | "subadmin">,
  NavItem[]
> = {
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
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isManagerCategoryAllowed(
  categories: Set<string>,
  requiredCategories?: string[],
) {
  if (!requiredCategories || requiredCategories.length === 0) {
    return true;
  }

  return requiredCategories.some((category) => categories.has(category));
}

/**
 * Route-level permission gate: the manager needs AT LEAST ONE of the listed
 * permission names for the route to be visible/reachable. This is what hides
 * e.g. "Lead Management" from managers without "Temp Users List".
 */
function hasAnyManagerPermission(
  permissionNames: Set<string>,
  required?: string[],
) {
  if (!required || required.length === 0) {
    return true;
  }

  return required.some((name) =>
    permissionNames.has(normalizeManagerPermissionName(name)),
  );
}

function getManagerCategorySet(groupedPermissions?: GroupedPermissions[]) {
  return new Set(
    (groupedPermissions ?? []).map((group) => group.category).filter(Boolean),
  );
}

function getManagerPermissionNameSet(
  groupedPermissions?: GroupedPermissions[],
) {
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
  featureKey: string,
) {
  const requiredNames = getManagerPermissionNames(moduleKey, featureKey);
  if (requiredNames.length === 0) return false;
  return requiredNames.some((name) => permissionNames.has(name));
}

function hasAnyReportFeature(permissionNames: Set<string>) {
  return (
    hasManagerFeature(permissionNames, "reportManagement", "depositReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "ibUsersReport") ||
    hasManagerFeature(permissionNames, "reportManagement", "withdrawReport") ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibWithdrawReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibCommissionReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "internalTransferReport",
    ) ||
    hasManagerFeature(permissionNames, "reportManagement", "loginActivity") ||
    hasManagerFeature(permissionNames, "reportManagement", "historyReport") ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "tradingHistoryReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "walletHistoryReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "mainWalletHistoryReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "positionReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibCommissionWithdrawReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "allTransactionReport",
    ) ||
    hasManagerFeature(
      permissionNames,
      "reportManagement",
      "dailySummaryReport",
    )
  );
}

function isManagerRouteFeatureAllowed(
  path: string,
  permissionNames: Set<string>,
) {
  if (path === "/all-accounts") {
    return hasManagerFeature(
      permissionNames,
      "account-types",
      "accountTypesList",
    );
  }
  if (path === "/report-management") {
    return hasAnyReportFeature(permissionNames);
  }
  if (path === "/report-management/all-transaction-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "allTransactionReport",
    );
  }
  if (path === "/report-management/daily-summary-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "dailySummaryReport",
    );
  }
  if (path === "/report-management/all-partners-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibUsersReport",
    );
  }
  if (path === "/report-management/withdrawal-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "withdrawReport",
    );
  }
  if (path === "/report-management/ib-withdrawal-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibWithdrawReport",
    );
  }
  if (path === "/report-management/ib-commission-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "ibCommissionReport",
    );
  }
  if (path === "/report-management/internal-transfer-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "internalTransferReport",
    );
  }
  if (path === "/report-management/login-activity-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "loginActivity",
    );
  }
  if (path === "/report-management/trading-history-report") {
    return hasManagerFeature(
      permissionNames,
      "reportManagement",
      "historyReport",
    );
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

export function getBreadcrumbItems(
  pathname: string,
  role?: UserType,
): AppBreadcrumbItem[] {
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

  const breadcrumbs: AppBreadcrumbItem[] = [
    { title: "Dashboard", url: "/dashboard" },
  ];

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
  return SIDEBAR_SECTIONS.filter((section) =>
    section.roles.includes(role),
  ).flatMap((section) => {
    const sectionRoutes = ROUTE_DEFINITIONS.filter(
      (route) =>
        route.sidebarSection === section.id && route.roles.includes(role),
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

  console.log("[getUserNavigation] isIbUser:", isIbUser);

  if (!isIbUser) {
    // Hide IB-only routes (e.g. IB Withdraw Report) from non-IB users.
    const ibOnlyPaths = new Set(
      ROUTE_DEFINITIONS.filter((route) => route.isIbUserOnly).map(
        (route) => route.path,
      ),
    );
    return items
      .map((item) => {
        if (item.items?.length) {
          return {
            ...item,
            items: item.items.filter((child) => !ibOnlyPaths.has(child.url)),
          };
        }
        return item;
      })
      .filter((item) => !ibOnlyPaths.has(item.url));
  }

  return items.map((item) =>
    item.title === "Request to Become IB"
      ? {
          ...item,
          title: "Login to IB Portal",
          url: "/ib-dashboard",
          icon: LayoutDashboardIcon,
        }
      : item,
  );
}

export function getManagerNavigation(
  groupedPermissions?: GroupedPermissions[],
): NavItem[] {
  const categories = getManagerCategorySet(groupedPermissions);
  const permissionNames = getManagerPermissionNameSet(groupedPermissions);
  const reportRouteFeatureMap: Array<{
    path: string;
    featureKey:
      | "depositReport"
      | "allTransactionReport"
      | "dailySummaryReport"
      | "ibUsersReport"
      | "withdrawReport"
      | "ibWithdrawReport"
      | "ibCommissionReport"
      | "internalTransferReport"
      | "loginActivity"
      | "historyReport";
  }> = [
    {
      path: "/report-management/all-transaction-report",
      featureKey: "allTransactionReport",
    },
    {
      path: "/report-management/daily-summary-report",
      featureKey: "dailySummaryReport",
    },
    {
      path: "/report-management/all-partners-report",
      featureKey: "ibUsersReport",
    },
    {
      path: "/report-management/withdrawal-report",
      featureKey: "withdrawReport",
    },
    {
      path: "/report-management/ib-withdrawal-report",
      featureKey: "ibWithdrawReport",
    },
    {
      path: "/report-management/ib-commission-report",
      featureKey: "ibCommissionReport",
    },
    {
      path: "/report-management/internal-transfer-report",
      featureKey: "internalTransferReport",
    },
    {
      path: "/report-management/login-activity-report",
      featureKey: "loginActivity",
    },
    {
      path: "/report-management/trading-history-report",
      featureKey: "historyReport",
    },
  ];

  return SIDEBAR_SECTIONS.filter((section) => {
    if (!section.roles.includes("manager")) {
      return false;
    }

    // Management Dashboard is admin-portal only; never show it to
    // managers/subadmins.
    if (section.id === "managementdashboard") {
      return false;
    }

    if (section.id === "account-management") {
      return hasManagerFeature(
        permissionNames,
        "account-types",
        "accountTypesList",
      );
    }
    if (section.id === "reports") {
      return hasAnyReportFeature(permissionNames);
    }

    return isManagerCategoryAllowed(categories, section.managerCategories);
  }).flatMap((section) => {
    let sectionRoutes = ROUTE_DEFINITIONS.filter((route) => {
      if (
        route.sidebarSection !== section.id ||
        !route.roles.includes("manager")
      ) {
        return false;
      }

      if (route.managerPermissions?.length) {
        return hasAnyManagerPermission(
          permissionNames,
          route.managerPermissions,
        );
      }

      if (!isManagerRouteFeatureAllowed(route.path, permissionNames)) {
        return false;
      }

      return isManagerCategoryAllowed(categories, route.managerCategories);
    });

    if (section.id === "reports") {
      sectionRoutes = sectionRoutes.filter((route) => {
        // Routes with explicit permission lists are already fully decided
        // above; only legacy feature-map routes need this extra check.
        if (route.managerPermissions?.length) return true;
        const match = reportRouteFeatureMap.find(
          (entry) => entry.path === route.path,
        );
        if (!match) return false;
        return hasManagerFeature(
          permissionNames,
          "reportManagement",
          match.featureKey,
        );
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
  groupedPermissions?: GroupedPermissions[],
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
  user?: Pick<
    SidebarContext,
    "isIbUser" | "managerPermissions" | "subadminPermissions"
  > & {
    type?: UserType;
  },
): NavItem[] {
  switch (user?.type) {
    case "admin":
      return getAdminNavigation();
    case "manager":
    case "subadmin":
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
  options?: Pick<SidebarContext, "managerPermissions" | "isIbUser">,
) {
  const matchingRoute = ROUTE_DEFINITIONS.find((route) => {
    const prefixes = [route.path, ...(route.activeMatch ?? [])];
    return matchesPrefix(pathname, prefixes);
  });

  if (!matchingRoute) {
    return role === "admin";
  }

  // Subadmins are equivalent to managers: the same permission model and
  // routes apply, so treat them identically for route gating.
  const effectiveRole: UserType =
    role === "subadmin" ? "manager" : role;

  if (!matchingRoute.roles.includes(effectiveRole)) {
    return false;
  }

  // IB-only routes require the user to actually be an IB user.
  if (matchingRoute.isIbUserOnly && !options?.isIbUser) {
    return false;
  }

  // Management Dashboard is admin-portal only.
  if (
    effectiveRole === "manager" &&
    matchingRoute.sidebarSection === "managementdashboard"
  ) {
    return false;
  }

  if (effectiveRole !== "manager") {
    return true;
  }

  const permissionNames = getManagerPermissionNameSet(
    options?.managerPermissions,
  );
  if (matchingRoute.managerPermissions?.length) {
    if (
      !hasAnyManagerPermission(
        permissionNames,
        matchingRoute.managerPermissions,
      )
    ) {
      return false;
    }
  } else if (
    !isManagerRouteFeatureAllowed(matchingRoute.path, permissionNames)
  ) {
    return false;
  }

  const categories = getManagerCategorySet(options?.managerPermissions);
  return isManagerCategoryAllowed(categories, matchingRoute.managerCategories);
}

export function getSectionLabelForRole(role?: UserType) {
  if (role === "admin" || role === "manager" || role === "subadmin") {
    return "Administration";
  }

  if (role === "user" || role === "client") {
    return "Client Portal";
  }

  return "Platform";
}
