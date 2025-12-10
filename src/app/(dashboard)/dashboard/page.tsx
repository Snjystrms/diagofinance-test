'use client';

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActiveProjects } from "@/components/active-projects"
import { AccentCard } from "@/components/AccentCard"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ACCENT_COLORS } from "@/utils/accent"
import { ActivityTimeline, type ActivityTimelineItem } from "@/components/activity-timeline"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardTrendChart } from "@/components/dashboard-trend-chart"
import { DashboardGrid, type DashboardWidget } from "@/components/dashboard-grid"
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Activity,
  Target,
  BarChart3,
  PieChart,
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
  MoreVertical,
  LayoutGrid,
  Grid3x3
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog"
import { authApi, ibRequestsApi, type TradingAccountSummaryItem, type TradingAccountsSummaryResponse, type UserDashboardData, type IbWalletResponse } from "@/lib/api"
import toast from "react-hot-toast"

const formatCurrency = (value?: number, currency: string = "USD") =>
  typeof value === "number" ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}` : `0.00 ${currency}`

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

export default function DashboardPage() {
  const auth = useAuth();
  const { user, token } = auth;
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }>>([]);

  const isUser = user?.type === "user";
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [tradingSummary, setTradingSummary] = useState<TradingAccountsSummaryResponse | null>(null);
  const [ibWalletData, setIbWalletData] = useState<IbWalletResponse | null>(null);
  const [depositsStatistics, setDepositsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [withdrawalsStatistics, setWithdrawalsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(isUser);
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [statisticsPeriod, setStatisticsPeriod] = useState<7 | 30>(30);
  const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo' | 'mt4-live' | 'mt4-demo'>('mt5-live');
  const [isCustomDashboard, setIsCustomDashboard] = useState<'normal' | 'custom'>('normal');

  // Load dashboard mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(`dashboard_mode_${user?.id || 'default'}`);
    if (savedMode === 'custom' || savedMode === 'normal') {
      setIsCustomDashboard(savedMode);
    }
  }, [user?.id]);

  // Save dashboard mode preference
  const handleDashboardModeChange = (mode: 'normal' | 'custom') => {
    setIsCustomDashboard(mode);
    localStorage.setItem(`dashboard_mode_${user?.id || 'default'}`, mode);
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

  // Initial dashboard data load (only once on mount or when token changes)
  useEffect(() => {
    if (!isUser || !token) {
      setIsDashboardLoading(false);
      return;
    }

    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        const [dashboardResponse, tradingResponse, ibWalletResponse] = await Promise.all([
          authApi.getUserDashboard(token),
          authApi.getTradingAccountsSummary(token),
          ibRequestsApi.getIbWallet(token).catch((err) => {
            // Silently fail if user is not IB - this is expected for non-IB users
            console.log("IB Wallet not available (user may not be IB):", err);
            return null;
          }),
        ]);

        if (!isMounted) return;

        if (dashboardResponse.success) {
          setDashboardData(dashboardResponse.data ?? null);
        }

        if (tradingResponse.success) {
          setTradingSummary(tradingResponse.data ?? null);
        }

        // Always set IB wallet data if response exists, even if it's null
        if (ibWalletResponse?.success) {
          setIbWalletData(ibWalletResponse);
        } else {
          // Clear IB wallet data if not available
          setIbWalletData(null);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch dashboard data:", error);
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Unable to load dashboard";
          setDashboardError(message);
          toast.error(message);
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
  }, [isUser, token]);

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
          const message = error instanceof Error ? error.message : "Unable to load statistics";
          toast.error(message);
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

  // Helper function to get tab title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'mt4-live':
        return 'MT4 Live Accounts';
      case 'mt4-demo':
        return 'MT4 Demo Accounts';
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
    const allAccounts: Array<{
      id: number;
      account_id: string;
      account_mode: string;
      balance: number;
      leverage: string | number;
      accountType?: { account_type_name: string; currency: string };
      equity?: number;
      free_margin?: number;
    }> = [];

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
      const isMT4 = activeTab.startsWith('mt4');
      const isMT5 = activeTab.startsWith('mt5');
      const isLive = activeTab.includes('live');
      const isDemoTab = activeTab.includes('demo');

      if (isMT4) {
        // For now, we'll assume all accounts are MT5 since we don't have platform info
        // This can be adjusted when platform data is available
        return false;
      }

      if (isMT5) {
        if (isLive) {
          return !isDemo;
        }
        if (isDemoTab) {
          return isDemo;
        }
      }

      return false;
    });
  };

  const currentAccounts = getCurrentAccounts();
  
  // Dashboard widgets - must be at top level to follow Rules of Hooks
  const dashboardWidgets = useMemo((): DashboardWidget[] => {
    if (!isUser || !dashboardData) {
      return [];
    }

    const widgets: DashboardWidget[] = [
      // Total Deposits Widget
      {
        id: 'total-deposits',
        title: 'Total Deposits',
        component: (
          <div className="relative overflow-hidden border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-3xl group h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Total Deposits
                    </p>
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
              <div className="pt-3 border-t border-indigo-500/20 mt-auto">
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
          <div className="relative overflow-hidden border-2 border-amber-500/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-3xl group h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Total Withdrawals
                    </p>
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
              <div className="pt-3 border-t border-amber-500/20 mt-auto">
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
          <div className="relative overflow-hidden border-2 border-violet-500/30 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent rounded-3xl group h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                      Trading Accounts
                    </p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                      {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              <div className="pt-3 border-t border-violet-500/20 mt-auto">
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
          <div className="relative overflow-hidden border-none shadow-2xl text-primary-foreground bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group h-full">
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -left-20 -top-20 w-60 h-60 bg-primary-foreground/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute right-10 top-10 w-40 h-40 bg-primary-foreground/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            <div className="relative z-10 pb-3 px-6 pt-6 h-full flex flex-col">
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
              <div className="mt-auto pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-primary-foreground text-sm font-semibold mb-1">Your Safe Wallet</p>
                      <p className="text-primary-foreground/80 text-xs leading-relaxed">
                        Securely manage balances across deposits and transfers.
                      </p>
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
                    </div>
                  </div>
                </div>
                      </div>
        ),
        defaultLayout: { x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      },
      // Partner Wallet Widget (only show if IB wallet data exists)
      ...(ibWalletData?.data ? [{
        id: 'partner-wallet',
        title: 'Partner Wallet',
        component: (
          <div className="relative overflow-hidden border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-3xl group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Partner Wallet
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(
                      ibWalletData.data.wallet_balance.amount,
                      ibWalletData.data.wallet_balance.currency
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
                      ibWalletData.data.client_wallet.amount,
                      ibWalletData.data.client_wallet.currency
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Earned:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(
                      ibWalletData.data.earning_summary.total_earned,
                      ibWalletData.data.earning_summary.currency
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
        defaultLayout: { x: ibWalletData?.data ? 8 : 4, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
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
          <div className="relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 group h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="pt-6 pb-6 relative z-10 h-full flex flex-col items-center justify-center text-center space-y-4">
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
  
  // Static Dashboard for Admin/Manager
  const StaticDashboard = () => (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Projects */}
        <div>
          <ActiveProjects />
        </div>

        {/* Additional Cards */}
        <div className="space-y-4">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <CardDescription>Track your recent activities and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Activity feed will appear here</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Analytics</CardTitle>
              </div>
              <CardDescription>View detailed analytics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Analytics dashboard coming soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

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
          {/* Header Section - Enhanced */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-3xl -z-10" />
              <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-75"></div>
                  <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
                    <BarChart3 className="h-8 w-8" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                    Dashboard
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Welcome back! Here&apos;s what&apos;s happening with your account today.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Dashboard Mode Toggle */}
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 border border-border/50">
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
                <Badge variant="outline" className="px-4 py-2 text-xs font-semibold border-primary/30 bg-primary/5">
                  <Activity className="h-3 w-3 mr-1.5 text-primary" />
                  Live Data
                </Badge>
              </div>
            </div>
          </div>

          {isDashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
            </div>
          </div>
        ) : dashboardError ? (
          <div className="flex items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">Error loading dashboard</p>
                  <p className="text-xs text-muted-foreground">{dashboardError}</p>
                </div>
              </CardContent>
            </Card>
          </div>
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Total Deposits
                        </p>
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Total Withdrawals
                        </p>
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
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                          Trading Accounts
                        </p>
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
                {ibWalletData?.data && (
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
                          {formatAmount(ibWalletData.data.wallet_balance.amount)}
                        </span>
                        <span className="text-lg font-bold text-blue-600/80 dark:text-blue-400/80">
                          {ibWalletData.data.wallet_balance.currency}
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
                                  ibWalletData.data.client_wallet.amount,
                                  ibWalletData.data.client_wallet.currency
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Total Earned:</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(
                                  ibWalletData.data.earning_summary.total_earned,
                                  ibWalletData.data.earning_summary.currency
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
                storageKey={`user_${user?.id || 'default'}`}
                cols={12}
                rowHeight={100}
              />
            )
          )}

          {/* Trading Accounts Grid */}
          {(mtAccountSummary.length > 0 || dashboardData?.mt5_users?.length) && (
            <div className="space-y-6">
              {/* Platform Tabs */}
              <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
                <CardContent className="px-4 py-4">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
                    <TabsList className="w-full bg-muted/50 p-1 rounded-lg grid grid-cols-4 h-auto">
                      <TabsTrigger 
                        value="mt5-live" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-green-100 text-green-800 rounded text-xs font-bold flex items-center justify-center">
                            5
                          </div>
                          <span className="hidden sm:inline text-xs">MT5 Live</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mt5-demo" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 text-blue-800 rounded text-xs font-bold flex items-center justify-center">
                            5
                          </div>
                          <span className="hidden sm:inline text-xs">MT5 Demo</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mt4-live" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-purple-100 text-purple-800 rounded text-xs font-bold flex items-center justify-center">
                            4
                          </div>
                          <span className="hidden sm:inline text-xs">MT4 Live</span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="mt4-demo" 
                        className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-blue-100 text-blue-800 rounded text-xs font-bold flex items-center justify-center">
                            4
                          </div>
                          <span className="hidden sm:inline text-xs">MT4 Demo</span>
                        </div>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{getTabTitle()}</h2>
                  <p className="text-muted-foreground">
                    {currentAccounts.length} account{currentAccounts.length !== 1 ? 's' : ''} found
                  </p>
                </div>
              </div>

              {/* Accounts Grid */}
              {currentAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {currentAccounts.map((account) => {
                      const isDemo = account.account_mode?.toLowerCase().includes('demo');
                      const isMT4 = activeTab.startsWith('mt4');
                      const platformConfig = {
                        icon: isMT4 ? '4' : '5',
                        gradient: isDemo 
                          ? 'from-blue-500 to-cyan-500' 
                          : isMT4
                          ? 'from-purple-500 to-indigo-500'
                          : 'from-green-500 to-emerald-500',
                        bgGradient: isDemo
                          ? 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20'
                          : isMT4
                          ? 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20'
                          : 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
                        borderColor: isDemo
                          ? 'border-blue-200 dark:border-blue-800'
                          : isMT4
                          ? 'border-purple-200 dark:border-purple-800'
                          : 'border-green-200 dark:border-green-800'
                      };

                      return (
                        <Card key={account.id} className={`border-2 border-border/50 bg-gradient-to-br from-card to-muted/30 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl transition-all duration-300 group`}>
                          <CardContent className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${platformConfig.gradient} text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                                  <Image
                                    src={isMT4 ? "/metatrader-4.svg" : "/metatrader-5.svg"}
                                    alt={isMT4 ? "MetaTrader 4" : "MetaTrader 5"}
                                    width={48}
                                    height={48}
                                    className="object-contain w-full h-full p-1.5"
                                    priority
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg text-foreground">
                                      {account.accountType?.account_type_name || 'Trading Account'}
                                    </h3>
                                    <Badge className="bg-primary/10 text-primary border-0">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs border-border">
                                      {isDemo ? 'DEMO' : 'LIVE'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {account.accountType?.currency || 'USD'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Account ID */}
                            <div className="mb-4">
                              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                Account ID
                              </label>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 font-mono text-sm bg-muted/50 rounded-lg px-3 py-2 text-foreground">
                                  {account.account_id}
                                </code>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(account.account_id.toString());
                                    toast.success('Account ID copied to clipboard!');
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Account Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Leverage</span>
                                <div className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-primary" />
                                  <span className="font-semibold text-sm text-foreground">{account.leverage || '1:100'}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Platform</span>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3 text-primary" />
                                  <span className="font-semibold text-sm text-foreground">{isMT4 ? 'MT4' : 'MT5'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Financial Metrics */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border/50">
                                <span className="text-sm font-medium text-foreground">Balance</span>
                                <span className="font-bold text-primary">
                                  {formatCurrency(account.balance, account.accountType?.currency || 'USD')}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-muted/20 rounded border border-border/30">
                                  <div className="text-xs text-muted-foreground">Equity</div>
                                  <div className="font-semibold text-sm text-foreground">{formatCurrency(account.equity, account.accountType?.currency || 'USD')}</div>
                                </div>
                                <div className="text-center p-2 bg-muted/20 rounded border border-border/30">
                                  <div className="text-xs text-muted-foreground">Free Margin</div>
                                  <div className="font-semibold text-sm text-foreground">{formatCurrency(account.free_margin, account.accountType?.currency || 'USD')}</div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground">
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Trade
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 border-border hover:bg-accent hover:text-accent-foreground">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                  })}
                </div>
              ) : (
                <Card className="border-dashed border-2 border-border">
                  <CardContent className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Settings className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-foreground">No {getTabTitle()} Found</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      You don&apos;t have any {getTabTitle().toLowerCase()} yet. Create a new account to get started.
                    </p>
                    <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground">
                      <Link href="/my_accounts/open-trading-account">
                        Open {getTabTitle()}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
          )}
        </div>
      ) : (
        <StaticDashboard />
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