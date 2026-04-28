'use client';

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { AccountTypeCardGrid } from "@/components/accounts/account-type-card-grid"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiErrorState } from "@/components/errors/api-error-state"
import { ClientCardGridSkeleton } from "@/components/loading/client-page-skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ActivityTimelineItem } from "@/components/activity-timeline"
import { ClientMt5AccountDetailsDialog } from "@/components/accounts/client-mt5-account-details-dialog"
import { ProtectedRoute } from "@/components/protected-route"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardWidget } from "@/components/dashboard-grid"
import { AdminDashboardSkeleton, ClientDashboardSkeleton } from "./dashboard-skeletons"

const DashboardTrendChart = dynamic(() => import("@/components/dashboard-trend-chart").then((m) => ({ default: m.DashboardTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full" />,
})
const DashboardGrid = dynamic(() => import("@/components/dashboard-grid").then((m) => ({ default: m.DashboardGrid })), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
})
import { 
  Building2, 
  TrendingUp, 
  ArrowRight,
  Activity,
  Target,
  BarChart3,
  Settings,
  Scale,
  FileText,
  CheckCircle2,
  Clock,
  Wallet,
  Shield,
  Lock,
  TrendingDown,
  PlusCircle,
  ArrowLeftRight,
  Sparkles,
  Copy,
  Eye,
  Zap,
  LayoutGrid,
  Grid3x3
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog"
import { authApi, ibRequestsApi, adminDashboardApi, adminNotificationApi, type TradingAccountSummaryItem, type TradingAccountsSummaryResponse, type UserDashboardData, type IbWalletData, type AdminDashboardData } from "@/lib/api"
const AdminDashboardView = dynamic(() => import("../admin-dashboard-view").then((m) => ({ default: m.AdminDashboardView })), {
  ssr: false,
  loading: () => <AdminDashboardSkeleton />,
})
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"
import { useClientCustomization } from "@/contexts/client-customization-context"

import { formatCurrency } from "@/lib/formatters"
import { getFriendlyErrorMessage } from "@/lib/friendly-errors"
import { useActiveAccountTypes } from "@/hooks/use-active-account-types"
import { normalizeIbWalletData } from "@/lib/ib"

const formatAmount = (amount?: number) => {
  const numAmount = typeof amount === 'number' ? amount : 0
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  })
}

const formatLabel = (label?: string) => {
  if (!label) return "";
  return label
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

type DashboardTradingAccount = {
  id: number;
  account_id: string;
  account_mode: string;
  balance: number;
  leverage: string | number;
  accountType?: { account_type_name: string; currency: string };
  equity?: number;
  free_margin?: number;
  mt5_id?: string | null;
  name?: string | null;
  email?: string | null;
};

export function DashboardPageContent() {
  const auth = useAuth();
  const { user, token } = auth;
  const { canCustomizeDashboard, getDashboardMode, getDashboardPreset, setDashboardMode } =
    useClientCustomization();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }>>([]);

  const isUser = user?.type === "user";
  const isAdmin = user?.type === "admin" || user?.type === "subadmin" || user?.type === "manager";

  // Dashboard-only poller for admin/manager unread count.
  // Header reads this value from React Query cache without fetching.
  useQuery({
    queryKey: ["adminUnreadCount", token],
    queryFn: async () => {
      if (!token) return 0;
      const response = await adminNotificationApi.getUnreadCount(token);
      if (response.success && response.data) {
        return response.data.unread_count || 0;
      }
      return 0;
    },
    enabled: Boolean(token) && Boolean(isAdmin),
    // Call once when dashboard renders (no polling)
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // Share userDashboard data with header via the same React Query key.
  const { data: userDashboardResponse } = useQuery({
    queryKey: ["userDashboard", token],
    queryFn: () => authApi.getUserDashboard(token!),
    enabled: Boolean(token) && isUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [adminDashboardData, setAdminDashboardData] = useState<AdminDashboardData | null>(null);
  const [tradingSummary, setTradingSummary] = useState<TradingAccountsSummaryResponse | null>(null);
  const [ibWalletData, setIbWalletData] = useState<IbWalletData | null>(null);
  const [depositsStatistics, setDepositsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [withdrawalsStatistics, setWithdrawalsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(isUser || isAdmin);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<unknown | null>(null);
  const [statisticsPeriod, setStatisticsPeriod] = useState<7 | 30>(30);
  // MT4 dashboard tabs are intentionally hidden for now. Restore the original union when MT4 UI returns.
  // const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo' | 'mt4-live' | 'mt4-demo'>('mt5-live');
  const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo'>('mt5-live');
  const [selectedDashboardAccount, setSelectedDashboardAccount] = useState<DashboardTradingAccount | null>(null);
  const [isDashboardAccountDialogOpen, setIsDashboardAccountDialogOpen] = useState(false);
  const [dateRange] = useState<{ start_date?: string; end_date?: string }>({});
  const dashboardArea = isAdmin ? 'admin' : 'client';
  const isCustomDashboard = getDashboardMode(dashboardArea);
  const dashboardPreset = getDashboardPreset(dashboardArea);
  const hasIbWalletData = Boolean(
    ibWalletData?.wallet_balance &&
      ibWalletData?.client_wallet &&
      ibWalletData?.earning_summary
  );

  const handleDashboardModeChange = (mode: 'normal' | 'custom') => {
    setDashboardMode(dashboardArea, mode);
  };

  // Check for incomplete profile sections on mount
  useEffect(() => {
    const checkIncompleteSections = () => {
      const stored = sessionStorage.getItem('incomplete_profile_sections');
      if (stored) {
        try {
          const sections = JSON.parse(stored);
          if (Array.isArray(sections) && sections.length > 0) {
            setIncompleteSections(sections);
            setShowProfileDialog(true);
            sessionStorage.removeItem('incomplete_profile_sections');
          }
        } catch (error) {
          console.error('Error parsing incomplete sections:', error);
        }
      }
    };

    checkIncompleteSections();
    const timer = setTimeout(checkIncompleteSections, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Sync userDashboard React Query data into local state used by widgets.
  useEffect(() => {
    if (userDashboardResponse?.success && userDashboardResponse.data) {
      setDashboardData(userDashboardResponse.data ?? null);
    }
  }, [userDashboardResponse]);

  // Initial dashboard data load (trading summary + IB wallet; userDashboard is handled by React Query above)
  useEffect(() => {
    if (!isUser || !token) {
      if (!isAdmin) {
        setIsDashboardLoading(false);
      }
      return;
    }

    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        const [tradingResponse, ibWalletResponse] = await Promise.all([
          authApi.getTradingAccountsSummary(token),
          ibRequestsApi.getIbWallet(token).catch((err) => {
            console.log("IB Wallet not available (user may not be IB):", err);
            return null;
          }),
        ]);

        if (!isMounted) return;

        if (tradingResponse.success) {
          setTradingSummary(tradingResponse.data ?? null);
        }

        if (ibWalletResponse?.success && ibWalletResponse.data) {
          setIbWalletData(normalizeIbWalletData(ibWalletResponse.data));
        } else {
          setIbWalletData(null);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch dashboard data:", error);
        if (isMounted) {
          setDashboardError(error);
          toast.error(getFriendlyErrorMessage(error, {
            audience: "client",
            resource: "dashboard",
            action: "load",
          }));
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isUser, token, isAdmin]);

  // Admin dashboard data load
  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }

    let isMounted = true;
    const fetchAdminDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        const response = await adminDashboardApi.getDashboard({
          token,
          ...dateRange,
        });

        if (!isMounted) return;

        if (response.success && response.data) {
          setAdminDashboardData(response.data);
        } else {
          setDashboardError("Unable to load admin dashboard");
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDashboardError(error);
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchAdminDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, token, dateRange.start_date, dateRange.end_date]);

  // Separate effect for statistics (runs when period changes)
  useEffect(() => {
    if (!isUser || !token) {
      return;
    }

    let isMounted = true;
    const fetchStatistics = async () => {
      setIsStatisticsLoading(true);
      try {
        const [depositsStatsResponse, withdrawalsStatsResponse] = await Promise.all([
          authApi.getWalletStatistics(token, "deposits", statisticsPeriod),
          authApi.getWalletStatistics(token, "withdrawals", statisticsPeriod)
        ]);

        if (!isMounted) return;

        if (depositsStatsResponse.success && depositsStatsResponse.data) {
          setDepositsStatistics(depositsStatsResponse.data.statistics ?? []);
        }

        if (withdrawalsStatsResponse.success && withdrawalsStatsResponse.data) {
          setWithdrawalsStatistics(withdrawalsStatsResponse.data.statistics ?? []);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch statistics:", error);
        if (isMounted) {
          toast.error(getFriendlyErrorMessage(error, {
            audience: "client",
            resource: "statistics",
            action: "load",
          }));
        }
      } finally {
        if (isMounted) {
          setIsStatisticsLoading(false);
        }
      }
    };

    fetchStatistics();
    return () => {
      isMounted = false;
    };
  }, [isUser, token, statisticsPeriod]);

  const profileTimeline: ActivityTimelineItem[] = useMemo(() => {
    const checklist = dashboardData?.profile_status?.checklist;
    if (!checklist) return [];

    return Object.entries(checklist).map(([key, value]) => {
      const completed = value?.completed ?? false;
      return {
        id: key,
        title: value?.label || formatLabel(key),
        time: completed ? "Completed" : "Pending",
        status: completed ? "Completed" : "Pending",
        badgeVariant: completed ? "default" : "outline",
        description: completed ? "Details verified successfully." : "Action required to finish this section.",
        icon: completed ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />,
        iconColor: completed ? "bg-green-500" : "bg-amber-500"
      };
    });
  }, [dashboardData]);

  const mtAccountSummary: TradingAccountSummaryItem[] = tradingSummary?.summary ?? [];
  const overallAccounts = tradingSummary?.overall;
  const walletCurrency = dashboardData?.wallet?.currency ?? "USD";
  const depositsCurrency = dashboardData?.deposits?.currency ?? "USD";
  const withdrawalsCurrency = dashboardData?.withdrawals?.currency ?? "USD";
  const totalMt5Accounts = mtAccountSummary.reduce(
    (total, accountType) => total + (accountType.accounts?.length ?? 0),
    0
  );
  const hasAnyMt5Accounts =
    totalMt5Accounts > 0 || Boolean(dashboardData?.mt5_users?.length);

  const {
    data: activeAccountTypes = [],
    isLoading: isAccountTypesLoading,
    error: accountTypesError,
    refetch: refetchAccountTypes,
  } = useActiveAccountTypes({
    token,
    enabled: isUser && !isDashboardLoading && !dashboardError && !hasAnyMt5Accounts,
  });

  // Helper function to get tab title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'mt5-live':
        return 'MT5 Live Accounts';
      case 'mt5-demo':
        return 'MT5 Demo Accounts';
      default:
        return 'MT5 Live Accounts';
    }
  };

  // Helper function to get current accounts based on active tab
  const getCurrentAccounts = () => {
    const allAccounts: DashboardTradingAccount[] = [];

    // Collect accounts from mtAccountSummary
    mtAccountSummary.forEach((accountType) => {
      if (accountType.accounts && accountType.accounts.length > 0) {
        accountType.accounts.forEach((account) => {
          allAccounts.push({
            ...account,
            accountType: {
              account_type_name: accountType.account_type_name,
              currency: accountType.currency,
            },
          });
        });
      }
    });

    // Filter accounts based on active tab
    return allAccounts.filter((account) => {
      const isDemo = account.account_mode?.toLowerCase().includes('demo');
      const isLive = activeTab.includes('live');
      const isDemoTab = activeTab.includes('demo');

      if (isLive) {
        return !isDemo;
      }
      if (isDemoTab) {
        return isDemo;
      }

      return false;
    });
  };

  const currentAccounts = getCurrentAccounts();
  const createAccountMode = activeTab === "mt5-demo" ? "demo" : "live";
  const createAccountHref = `/my_accounts/open-trading-account?mode=${createAccountMode}`;
  const createAccountTitle =
    activeTab === "mt5-demo" ? "Create MT5 Demo Account" : "Create MT5 Live Account";
  const createAccountDescription =
    activeTab === "mt5-demo"
      ? "Spin up another demo login to test strategies, EAs, or fresh risk setups."
      : "Open an additional live MT5 account to separate strategies or funded capital.";

  const openDashboardAccountDetails = (account: DashboardTradingAccount) => {
    setSelectedDashboardAccount(account);
    setIsDashboardAccountDialogOpen(true);
  };
  
  // Dashboard widgets - must be at top level to follow Rules of Hooks
  const dashboardWidgets = useMemo((): DashboardWidget[] => {
    if (!isUser || !dashboardData) {
      return [];
    }

    const ibWallet = hasIbWalletData ? ibWalletData : null;

    const widgets: DashboardWidget[] = [
      // Total Deposits Widget
      {
        id: 'total-deposits',
        title: 'Total Deposits',
        component: (
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Total Deposits
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(
                      dashboardData?.deposits?.total ?? 0,
                      depositsCurrency
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">All time deposits</p>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Total Withdrawals Widget
      {
        id: 'total-withdrawals',
        title: 'Total Withdrawals',
        component: (
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Total Withdrawals
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(
                      dashboardData?.withdrawals?.total ?? 0,
                      withdrawalsCurrency
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <TrendingDown className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">All time withdrawals</p>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Trading Accounts Widget
      {
        id: 'trading-accounts',
        title: 'Trading Accounts',
        component: (
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Trading Accounts
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <Building2 className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Wallet Balance Widget
      {
        id: 'wallet-balance',
        title: 'Wallet Balance',
        component: (
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm h-full">
            <div className="pb-3 px-6 pt-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="uppercase tracking-wider text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet Balance
                </p>
                <div className="p-2 rounded-lg bg-muted/70 border border-border/50">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold leading-tight">
                  {formatAmount(dashboardData?.wallet?.balance)}
                </span>
                <span className="text-lg font-bold text-muted-foreground">
                  {walletCurrency}
                </span>
              </div>
              <div className="mt-auto pt-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-foreground text-sm font-semibold mb-1">Your Safe Wallet</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Securely manage balances across deposits and transfers.
                    </p>
                  </div>
                  <Link href="/funds/internal-transfer" className="inline-block mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-foreground border-border/50"
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Transfer Funds
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      },
      // Partner Wallet Widget (only show if IB wallet data exists)
      ...(ibWallet ? [{
        id: 'partner-wallet',
        title: 'Partner Wallet',
        component: (
          <div className="relative overflow-hidden border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-3xl group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Partner Wallet
                  </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(
                        ibWallet.wallet_balance.amount,
                        ibWallet.wallet_balance.currency
                      )}
                    </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="pt-3 border-t border-blue-500/20 mt-auto space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Client Wallet:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        ibWallet.client_wallet.amount,
                        ibWallet.client_wallet.currency
                      )}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Earned:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        ibWallet.earning_summary.total_earned,
                        ibWallet.earning_summary.currency
                      )}
                    </span>
                </div>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 4, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      }] : []),
      // Profile Status Widget
      {
        id: 'profile-status',
        title: 'Profile Status',
        component: (
          <div className="rounded-3xl h-full relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="flex flex-row items-center justify-between pb-3 pt-5 px-5 relative z-10 border-b bg-gradient-to-r from-transparent to-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Profile Status</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {dashboardData?.profile_status?.status === "Verified" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400">Verified</p>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-amber-500" />
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
            </div>
            <div className="px-5 pb-5 pt-4 relative z-10 h-full">
                  {profileTimeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">No profile status information</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {profileTimeline.slice(0, 3).map((activity) => (
                        <div key={activity.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors group/item">
                          <div
                            className={`size-7 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform group-hover/item:scale-110 ${
                              activity.iconColor ?? "bg-primary"
                            }`}
                          >
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold truncate">{activity.title}</h4>
                              <Badge 
                                variant={activity.badgeVariant ?? "secondary"} 
                                className={`text-[10px] px-2 py-0.5 font-semibold ${
                                  activity.status === "Completed" 
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" 
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}
                              >
                                {activity.status}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {profileTimeline.some(item => item.status === "Pending") && (
                    <Link href="/profile/view_profile" className="block mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs h-9 font-semibold border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                      >
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Complete Profile
                      </Button>
                    </Link>
                  )}
            </div>
          </div>
        ),
        defaultLayout: { x: hasIbWalletData ? 8 : 4, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      },
      // Deposits Chart Widget
      {
        id: 'deposits-chart',
        title: 'Deposits Chart',
        component: isStatisticsLoading ? (
          <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6 h-full">
                <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="relative flex flex-col gap-4 p-0">
                  <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-[225px] w-full rounded-lg" />
                </CardContent>
              </Card>
        ) : (
              <DashboardTrendChart
                title="Deposits"
                subtitle={
                  depositsStatistics.length
                    ? `${depositsCurrency} Deposits (Last ${statisticsPeriod} days)`
                    : "Deposits"
                }
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <g fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                      <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                    </g>
                  </svg>
                }
                stats={depositsStatistics}
                lineColor="#22c55e"
                primaryColor="#22c55e"
                emptyStateLabel="No deposit data available"
                formatValue={(value) => formatCurrency(value, depositsCurrency)}
                selectedPeriod={statisticsPeriod === 7 ? "7d" : "1m"}
                onPeriodChange={(period) => setStatisticsPeriod(period === "7d" ? 7 : 30)}
              />
        ),
        defaultLayout: { x: 0, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
      },
      // Withdrawals Chart Widget
      {
        id: 'withdrawals-chart',
        title: 'Withdrawals Chart',
        component: isStatisticsLoading ? (
          <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6 h-full">
            <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-4 p-0">
              <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-[225px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : (
              <DashboardTrendChart
                title="Withdrawals"
                subtitle={
                  withdrawalsStatistics.length
                    ? `${withdrawalsCurrency} Withdrawals (Last ${statisticsPeriod} days)`
                    : "Withdrawals"
                }
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <g fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                      <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                    </g>
                  </svg>
                }
                stats={withdrawalsStatistics}
                lineColor="#ef4444"
                primaryColor="#ef4444"
                emptyStateLabel="No withdrawal data available"
                formatValue={(value) => formatCurrency(value, withdrawalsCurrency)}
                selectedPeriod={statisticsPeriod === 7 ? "7d" : "1m"}
                onPeriodChange={(period) => setStatisticsPeriod(period === "7d" ? 7 : 30)}
              />
        ),
        defaultLayout: { x: 6, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
      },
    ];

    // Add Deposit Funds Card if wallet is empty
    if (!dashboardData?.wallet?.balance || dashboardData.wallet.balance === 0) {
      widgets.push({
        id: 'deposit-funds',
        title: 'Deposit Funds',
        component: (
          <div className="border border-dashed border-border/50 rounded-3xl bg-card h-full">
            <div className="pt-6 pb-6 h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/70">
                <Wallet className="h-8 w-8 text-foreground" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Wallet Empty</h3>
                <p className="text-sm text-muted-foreground">
                  Deposit funds to start your trading journey
                </p>
              </div>
              <Link href="/funds/deposit" className="w-full mt-2">
                <Button size="sm" className="w-full border border-border/50 text-foreground bg-muted/50 hover:bg-muted transition-all duration-200">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Deposit Funds
                </Button>
              </Link>
            </div>
          </div>
        ),
        defaultLayout: { x: 8, y: 3, w: 4, h: 5, minW: 4, minH: 4 },
      });
    }

    return widgets;
  }, [
    isUser,
    dashboardData,
    depositsCurrency,
    withdrawalsCurrency,
    overallAccounts,
    walletCurrency,
    profileTimeline,
    depositsStatistics,
    withdrawalsStatistics,
    statisticsPeriod,
    isStatisticsLoading,
    ibWalletData,
  ]);
  
  return (
    <ProtectedRoute>
      {/* Conditionally render User Dashboard or Static Dashboard */}
      {isUser ? (
        <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
          <style jsx>{`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3);
              border-radius: 2px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.5);
            }
          `}</style>
          {/* Header Section */}
          <div className="mb-8 rounded-3xl border border-border/50 bg-card p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold">Dashboard</h1>
                <p className="text-base text-muted-foreground max-w-2xl">
                  Welcome back! Here&apos;s what&apos;s happening with your account today.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canCustomizeDashboard ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-1">
                    <Button
                      variant={isCustomDashboard === 'normal' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleDashboardModeChange('normal')}
                      className="gap-2"
                    >
                      <Grid3x3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Normal</span>
                    </Button>
                    <Button
                      variant={isCustomDashboard === 'custom' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleDashboardModeChange('custom')}
                      className="gap-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Custom</span>
                    </Button>
                  </div>
                ) : null}
                <Badge variant="outline" className="px-4 py-2 text-xs font-semibold border-primary/30 bg-primary/5">
                  <Activity className="h-3 w-3 mr-1.5 text-primary" />
                  Live Data
                </Badge>
              </div>
            </div>
          </div>

          {isDashboardLoading ? (
          <ClientDashboardSkeleton />
        ) : dashboardError ? (
          <ApiErrorState
            error={dashboardError}
            audience="client"
            resource="dashboard"
            action="load"
            variant="panel"
          />
        ) : (
        <div className="space-y-6">
          {/* Normal Dashboard View */}
          {isCustomDashboard === 'normal' ? (
            <>
              {/* Key Metrics Summary Row */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {/* Total Deposits Card */}
                <Card className="relative overflow-hidden border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-3xl group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Total Deposits
                        </div>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {formatCurrency(
                            dashboardData?.deposits?.total ?? 0,
                            depositsCurrency
                          )}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-indigo-500/20">
                      <p className="text-xs text-muted-foreground">All time deposits</p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Total Withdrawals Card */}
                <Card className="relative overflow-hidden border-2 border-amber-500/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-3xl group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Total Withdrawals
                        </div>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {formatCurrency(
                            dashboardData?.withdrawals?.total ?? 0,
                            withdrawalsCurrency
                          )}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <TrendingDown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-amber-500/20">
                      <p className="text-xs text-muted-foreground">All time withdrawals</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Trading Accounts Card */}
                <Card className="relative overflow-hidden border-2 border-violet-500/30 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent rounded-3xl group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                          Trading Accounts
                        </div>
                        <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                          {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                        <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-violet-500/20">
                      <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Cards Row - Enhanced grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Wallet Balance Card - Enhanced */}
                <Card className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border-none shadow-2xl text-primary-foreground bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group">
                  <div className="absolute inset-0 opacity-60">
                    <div className="absolute -left-20 -top-20 w-60 h-60 bg-primary-foreground/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute right-10 top-10 w-40 h-40 bg-primary-foreground/15 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="uppercase tracking-wider text-xs font-bold text-primary-foreground/80 flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5" />
                        Wallet Balance
                      </p>
                      <div className="p-1.5 rounded-lg bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20">
                        <Shield className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-extrabold leading-tight drop-shadow-lg">
                        {formatAmount(dashboardData?.wallet?.balance)}
                      </span>
                      <span className="text-lg font-bold text-primary-foreground/80">
                        {walletCurrency}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-4 pb-6 px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-primary-foreground text-sm font-semibold mb-1">Your Safe Wallet</p>
                          <p className="text-primary-foreground/80 text-xs leading-relaxed">
                            Securely manage balances across deposits and transfers.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-primary-foreground/90 bg-primary-foreground/10 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-primary-foreground/20">
                          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                          <span className="font-medium">Instant transfers available</span>
                        </div>
                        <Link href="/funds/internal-transfer" className="inline-block mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 text-xs font-bold border border-primary-foreground/30 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                          >
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            Transfer Funds
                          </Button>
                        </Link>
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="p-4 rounded-2xl border-2 border-primary-foreground/30 bg-primary-foreground/10 backdrop-blur-md shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Lock className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <span className="text-[10px] font-semibold text-primary-foreground/90 uppercase tracking-wider">Protected</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Partner Wallet Card - Enhanced */}
                {hasIbWalletData && ibWalletData && (
                  <Card className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-3xl group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <p className="uppercase tracking-wider text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          <Wallet className="h-3.5 w-3.5" />
                          Partner Wallet
                        </p>
                        <div className="p-1.5 rounded-lg bg-blue-500/10 backdrop-blur-sm border border-blue-500/20">
                          <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-extrabold leading-tight drop-shadow-lg text-blue-600 dark:text-blue-400">
                          {formatAmount(ibWalletData.wallet_balance.amount)}
                        </span>
                        <span className="text-lg font-bold text-blue-600/80 dark:text-blue-400/80">
                          {ibWalletData.wallet_balance.currency}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-4 pb-6 px-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-foreground text-sm font-semibold mb-1">IB Partner Wallet</p>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              Your partner earnings and balance.
                            </p>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-blue-500/20">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Client Wallet:</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(
                                  ibWalletData.client_wallet.amount,
                                  ibWalletData.client_wallet.currency
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Total Earned:</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(
                                  ibWalletData.earning_summary.total_earned,
                                  ibWalletData.earning_summary.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Deposit Funds Card - Enhanced */}
                {(!dashboardData?.wallet?.balance || dashboardData.wallet.balance === 0) && (
                  <Card className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <CardContent className="pt-6 pb-6 relative z-10">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative w-24 h-24 flex items-center justify-center animate-pulse">
                          <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full animate-spin-slow" style={{ animation: 'spin 8s linear infinite' }}></div>
                          <div className="absolute inset-2 border-2 border-primary/20 rounded-full"></div>
                          <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
                            <Wallet className="h-8 w-8 text-primary" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 animate-bounce">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg border-2 border-background">
                              <PlusCircle className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <h3 className="text-lg font-bold text-foreground">Wallet Empty</h3>
                          <p className="text-sm text-muted-foreground">
                            Deposit funds to start your trading journey
                          </p>
                        </div>
                        <Link href="/funds/deposit" className="w-full mt-2">
                          <Button size="sm" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Deposit Funds
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Profile Status Card - Enhanced */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <Card className="rounded-3xl h-full relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 relative z-10 border-b bg-gradient-to-r from-transparent to-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold">Profile Status</CardTitle>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {dashboardData?.profile_status?.status === "Verified" ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                <p className="text-xs font-semibold text-green-600 dark:text-green-400">Verified</p>
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 text-amber-500" />
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-4 relative z-10">
                      {profileTimeline.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">No profile status information</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                          {profileTimeline.slice(0, 3).map((activity, index) => (
                            <div key={activity.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors group/item">
                              <div
                                className={`size-7 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform group-hover/item:scale-110 ${
                                  activity.iconColor ?? "bg-primary"
                                }`}
                              >
                                {activity.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold truncate">{activity.title}</h4>
                                  <Badge 
                                    variant={activity.badgeVariant ?? "secondary"} 
                                    className={`text-[10px] px-2 py-0.5 font-semibold ${
                                      activity.status === "Completed" 
                                        ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" 
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                    }`}
                                  >
                                    {activity.status}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {profileTimeline.some(item => item.status === "Pending") && (
                        <Link href="/profile/view_profile" className="block mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-9 font-semibold border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                          >
                            <Settings className="h-3.5 w-3.5 mr-2" />
                            Complete Profile
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Deposits and Withdrawals Charts */}
              {isStatisticsLoading ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {/* Skeleton for Deposits Chart */}
                  <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6">
                    <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative flex flex-col gap-4 p-0">
                      <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                      <Skeleton className="h-32 w-full rounded-lg" />
                      <Skeleton className="h-[225px] w-full rounded-lg" />
                      <div className="flex gap-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skeleton for Withdrawals Chart */}
                  <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6">
                    <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative flex flex-col gap-4 p-0">
                      <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                      <Skeleton className="h-32 w-full rounded-lg" />
                      <Skeleton className="h-[225px] w-full rounded-lg" />
                      <div className="flex gap-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  <DashboardTrendChart
                    title="Deposits"
                    subtitle={
                      depositsStatistics.length
                        ? `${depositsCurrency} Deposits (Last ${statisticsPeriod} days)`
                        : "Deposits"
                    }
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        className="size-5"
                        aria-hidden="true"
                      >
                        <g fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                          <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                        </g>
                      </svg>
                    }
                    stats={depositsStatistics}
                    lineColor="#22c55e"
                    primaryColor="#22c55e"
                    emptyStateLabel="No deposit data available"
                    formatValue={(value) => formatCurrency(value, depositsCurrency)}
                    selectedPeriod={statisticsPeriod === 7 ? "7d" : "1m"}
                    onPeriodChange={(period) => setStatisticsPeriod(period === "7d" ? 7 : 30)}
                  />

                  <DashboardTrendChart
                    title="Withdrawals"
                    subtitle={
                      withdrawalsStatistics.length
                        ? `${withdrawalsCurrency} Withdrawals (Last ${statisticsPeriod} days)`
                        : "Withdrawals"
                    }
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="1em"
                        height="1em"
                        viewBox="0 0 24 24"
                        className="size-5"
                        aria-hidden="true"
                      >
                        <g fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                          <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                        </g>
                      </svg>
                    }
                    stats={withdrawalsStatistics}
                    lineColor="#ef4444"
                    primaryColor="#ef4444"
                    emptyStateLabel="No withdrawal data available"
                    formatValue={(value) => formatCurrency(value, withdrawalsCurrency)}
                    selectedPeriod={statisticsPeriod === 7 ? "7d" : "1m"}
                    onPeriodChange={(period) => setStatisticsPeriod(period === "7d" ? 7 : 30)}
                  />
                </div>
              )}
            </>
          ) : (
            /* Custom Dashboard View with Drag and Drop */
            dashboardWidgets.length > 0 && (
              <DashboardGrid
                widgets={dashboardWidgets}
                storageKey={`${dashboardArea}_dashboard`}
                presetLayout={dashboardPreset?.layout}
                presetHiddenWidgets={dashboardPreset?.hiddenWidgets}
                editable={canCustomizeDashboard}
                cols={12}
                rowHeight={100}
              />
            )
          )}

          {/* Trading Accounts Grid */}
          <div className="space-y-6">
            {hasAnyMt5Accounts ? (
              <>
                {/* Platform Tabs */}
                <Card className="border-0 bg-card/70 shadow-xl backdrop-blur-sm">
                  <CardContent className="px-4 py-4">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
                      <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/50 p-1">
                        <TabsTrigger
                          value="mt5-live"
                          className="rounded-md px-2 py-2 text-sm transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                              5
                            </div>
                            <span className="hidden text-xs sm:inline">MT5 Live</span>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger
                          value="mt5-demo"
                          className="rounded-md px-2 py-2 text-sm transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                              5
                            </div>
                            <span className="hidden text-xs sm:inline">MT5 Demo</span>
                          </div>
                        </TabsTrigger>
                        {/* MT4 dashboard tabs intentionally hidden for now.
                            Restore mt4-live and mt4-demo triggers here when MT4 UI is re-enabled. */}
                      </TabsList>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{getTabTitle()}</h2>
                    <p className="text-muted-foreground">
                      {currentAccounts.length} account{currentAccounts.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {currentAccounts.map((account) => {
                    const isDemo = account.account_mode?.toLowerCase().includes('demo');

                    return (
                      <Card
                        key={account.id}
                        className="group h-full border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
                      >
                        <CardContent className="flex h-full flex-col p-5 sm:p-6">
                          <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-primary/10 text-lg font-bold text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
                              <Image
                                src="/metatrader-5.svg"
                                alt="MetaTrader 5"
                                width={48}
                                height={48}
                                className="h-full w-full object-contain p-1.5"
                                priority
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-start gap-2">
                                <h3 className="min-w-0 flex-1 text-lg font-bold leading-snug text-foreground">
                                  {account.accountType?.account_type_name || 'Trading Account'}
                                </h3>
                                <Badge className="shrink-0 border-0 bg-primary/10 text-primary">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-border text-xs">
                                  {isDemo ? 'DEMO' : 'LIVE'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {account.accountType?.currency || 'USD'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mb-5">
                            <label className="mb-2 block text-xs font-medium text-muted-foreground">
                              Account ID
                            </label>
                            <div className="flex min-w-0 items-center gap-2">
                              <code className="min-w-0 flex-1 truncate rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5 font-mono text-xs font-medium text-foreground sm:text-sm">
                                {account.account_id}
                              </code>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-xl border-border/70 bg-background/80"
                                onClick={() => {
                                  navigator.clipboard.writeText(account.account_id.toString());
                                  toast.success('Account ID copied to clipboard!');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mb-5 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-border/40 bg-muted/15 p-3">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Leverage</span>
                                <div className="flex items-center gap-1.5">
                                  <Zap className="h-3 w-3 text-primary" />
                                  <span className="text-sm font-semibold text-foreground">{account.leverage || '1:100'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-xl border border-border/40 bg-muted/15 p-3">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Platform</span>
                                <div className="flex items-center gap-1.5">
                                  <TrendingUp className="h-3 w-3 text-primary" />
                                  <span className="text-sm font-semibold text-foreground">MT5</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5">
                              <span className="text-sm font-medium text-foreground">Balance</span>
                              <span className="truncate text-right font-bold text-primary">
                                {formatCurrency(account.balance, account.accountType?.currency || 'USD')}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
                                <div className="text-xs text-muted-foreground">Equity</div>
                                <div className="text-sm font-semibold text-foreground">
                                  {formatCurrency(account.equity, account.accountType?.currency || 'USD')}
                                </div>
                              </div>
                              <div className="rounded-xl border border-border/30 bg-muted/20 p-3 text-center">
                                <div className="text-xs text-muted-foreground">Free Margin</div>
                                <div className="text-sm font-semibold text-foreground">
                                  {formatCurrency(account.free_margin, account.accountType?.currency || 'USD')}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto flex gap-2 pt-5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 flex-1 border-border bg-background hover:bg-accent hover:text-accent-foreground"
                              onClick={() => openDashboardAccountDetails(account)}
                            >
                              <Eye className="mr-1.5 h-4 w-4 shrink-0" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  <Card className="group h-full border border-dashed border-primary/35 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
                    <CardContent className="flex h-full flex-col p-5 sm:p-6">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                        <PlusCircle className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground">{createAccountTitle}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {currentAccounts.length === 0
                            ? `No ${getTabTitle().toLowerCase()} yet. ${createAccountDescription}`
                            : createAccountDescription}
                        </p>
                      </div>
                      <Button
                        asChild
                        className="mt-auto h-11 justify-between rounded-xl bg-primary/95 px-4 text-primary-foreground shadow-sm hover:bg-primary"
                      >
                        <Link href={createAccountHref}>
                          Open {activeTab === "mt5-demo" ? "Demo" : "Live"} Account
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Open Your First MT5 Account</h2>
                  <p className="max-w-2xl text-muted-foreground">
                    You don&apos;t have any MT5 accounts yet. Choose an account type below and create a live or demo login directly from the dashboard.
                  </p>
                </div>

                {accountTypesError ? (
                  <ApiErrorState
                    error={accountTypesError}
                    audience="client"
                    resource="account types"
                    action="load"
                    variant="inline"
                    onRetry={() => {
                      void refetchAccountTypes();
                    }}
                  />
                ) : isAccountTypesLoading ? (
                  <ClientCardGridSkeleton />
                ) : activeAccountTypes.length > 0 ? (
                  <AccountTypeCardGrid accountTypes={activeAccountTypes} />
                ) : (
                  <Card className="border-2 border-dashed border-border">
                    <CardContent className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Settings className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-foreground">No Account Types Available</h3>
                      <p className="mx-auto max-w-md text-muted-foreground">
                        There are no MT5 account types available right now.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          <ClientMt5AccountDetailsDialog
            open={isDashboardAccountDialogOpen}
            onOpenChange={setIsDashboardAccountDialogOpen}
            account={selectedDashboardAccount}
          />
        </div>
          )}
        </div>
      ) : (
        <>
          {isDashboardLoading ? (
            <AdminDashboardSkeleton />
          ) : dashboardError ? (
            <ApiErrorState
              error={dashboardError}
              audience="admin"
              resource="admin dashboard"
              action="load"
              variant="panel"
            />
          ) : (
            <AdminDashboardView adminDashboardData={adminDashboardData} />
          )}
        </>
      )}
      
      {/* Profile Completion Dialog - Only for users */}
      {isUser && (
        <ProfileCompletionDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          incompleteSections={incompleteSections.map(section => ({
            ...section,
            icon: section.key === 'personal_information' ? (
              <Settings className="h-5 w-5 text-orange-600" />
            ) : section.key === 'legal_information' ? (
              <Scale className="h-5 w-5 text-orange-600" />
            ) : (
              <FileText className="h-5 w-5 text-orange-600" />
            ),
          }))}
        />
      )}
    </ProtectedRoute>
  )
}
