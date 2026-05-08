"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CircleDollarSign,
  CreditCard,
  Globe,
  History,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminUsersApi,
  type AdminPaginatedApiData,
  type AdminUserActivityLogItem,
  type AdminUserBankDetailItem,
  type AdminUserDetailsApiData,
  type AdminUserDetailsData,
  type AdminUserMt5AccountItem,
  type AdminUserMt5TabDetailsApiData,
  type AdminUserMt5TabDetailsData,
  type AdminUserReferralItem,
  type AdminUserTransactionItem,
  type AdminUserWalletHistoryItem,
  type PaginationMeta,
} from "@/lib/api";
import { formatDate, formatDateTimeInIST } from "@/lib/formatters";

const DEFAULT_PAGE_SIZE = 10;

type TabKey =
  | "deposits"
  | "withdrawals"
  | "mt5Accounts"
  | "bankDetails"
  | "activityLog"
  | "referralBy"
  | "walletHistory";

type PaginatedTabState<T> = {
  rows: T[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: unknown | null;
  loaded: boolean;
};

type CollectionState<T> = {
  rows: T[];
  loading: boolean;
  error: unknown | null;
  loaded: boolean;
};

type DeviceSnapshot = {
  browser_name?: string;
  browser_version?: string;
  device_name?: string;
  os_name?: string;
  userAgent?: string;
};

const createPaginatedState = <T,>(): PaginatedTabState<T> => ({
  rows: [],
  pagination: null,
  loading: false,
  error: null,
  loaded: false,
});

const createCollectionState = <T,>(): CollectionState<T> => ({
  rows: [],
  loading: false,
  error: null,
  loaded: false,
});

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  try {
    return formatDateTimeInIST(value, "-");
  } catch {
    return value;
  }
};

const formatNumericValue = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatSignedValue = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatNumericValue(numeric)}`;
};

const normalizeBooleanLabel = (value: unknown, positive = "Yes", negative = "No") => {
  if (value === null || value === undefined || value === "") return "-";
  const normalized = typeof value === "boolean" ? value : `${value}` === "1" || `${value}`.toLowerCase() === "true";
  return normalized ? positive : negative;
};

const statusBadge = (value: unknown, mode: "profile" | "transaction" | "activity" | "wallet" = "profile") => {
  const normalized = `${value ?? ""}`.trim().toLowerCase();

  if (mode === "profile") {
    if (normalized === "1" || normalized === "active") {
      return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active</Badge>;
    }
    if (normalized === "2" || normalized === "blocked") {
      return <Badge variant="destructive">Blocked</Badge>;
    }
    if (normalized === "0" || normalized === "pending") {
      return <Badge variant="secondary">Pending</Badge>;
    }
  }

  if (mode === "transaction") {
    if (normalized === "1" || normalized === "approved" || normalized === "completed") {
      return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Approved</Badge>;
    }
    if (normalized === "2" || normalized === "rejected") {
      return <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  }

  if (mode === "activity") {
    if (normalized === "1" || normalized === "success") {
      return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Successful</Badge>;
    }
    return <Badge variant="secondary">Recorded</Badge>;
  }

  if (mode === "wallet") {
    if (normalized === "1" || normalized === "completed") {
      return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Settled</Badge>;
    }
    if (normalized === "2" || normalized === "rejected") {
      return <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300">Rejected</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  }

  return <Badge variant="outline">{value ? String(value) : "Unknown"}</Badge>;
};

const signUpSourceLabel = (value: unknown) => {
  const normalized = `${value ?? ""}`.trim();
  switch (normalized) {
    case "1":
      return "Web CRM";
    case "2":
      return "Mobile App";
    case "3":
      return "Manager Panel";
    default:
      return normalized || "-";
  }
};

const parseDeviceJson = (value?: string | null): DeviceSnapshot | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as DeviceSnapshot;
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
};

const readPagination = (value: unknown): PaginationMeta | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const pagination: PaginationMeta = {
    page: typeof record.page === "number" ? record.page : undefined,
    current_page: typeof record.current_page === "number" ? record.current_page : undefined,
    per_page: typeof record.per_page === "number" ? record.per_page : undefined,
    limit: typeof record.limit === "number" ? record.limit : undefined,
    total: typeof record.total === "number" ? record.total : undefined,
    total_pages: typeof record.total_pages === "number" ? record.total_pages : undefined,
    last_page: typeof record.last_page === "number" ? record.last_page : undefined,
  };

  return Object.values(pagination).some((entry) => entry !== undefined) ? pagination : null;
};

const withFallbackPagination = (pagination: PaginationMeta | null, page: number, rowCount: number): PaginationMeta => {
  const perPage = pagination?.per_page ?? pagination?.limit ?? DEFAULT_PAGE_SIZE;
  const total = pagination?.total ?? rowCount;
  const lastPage =
    pagination?.last_page ??
    pagination?.total_pages ??
    Math.max(1, Math.ceil((total || rowCount || 1) / Math.max(1, perPage)));

  return {
    page: pagination?.page ?? page,
    current_page: pagination?.current_page ?? page,
    per_page: perPage,
    limit: pagination?.limit ?? perPage,
    total,
    total_pages: pagination?.total_pages ?? lastPage,
    last_page: lastPage,
  };
};

const normalizeUserDetails = (payload?: AdminUserDetailsApiData | null): AdminUserDetailsData | null => {
  if (!payload) return null;
  if ("data" in payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload as AdminUserDetailsData;
};

const normalizeMt5TabDetails = (payload?: AdminUserMt5TabDetailsApiData | null): AdminUserMt5TabDetailsData | null => {
  if (!payload) return null;
  if ("data" in payload && payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  return payload as AdminUserMt5TabDetailsData;
};

const normalizePaginatedRows = <T,>(
  payload?: AdminPaginatedApiData<T> | null,
  rootPagination?: PaginationMeta | null,
): { rows: T[]; pagination: PaginationMeta | null } => {
  if (!payload) {
    return { rows: [], pagination: rootPagination ?? null };
  }

  if (Array.isArray(payload)) {
    return { rows: payload, pagination: rootPagination ?? null };
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const directPagination = readPagination(record) ?? rootPagination ?? null;

    if (Array.isArray(record.data)) {
      return {
        rows: record.data as T[],
        pagination: directPagination,
      };
    }

    if (record.data && typeof record.data === "object") {
      const nested = record.data as Record<string, unknown>;
      return {
        rows: Array.isArray(nested.data) ? (nested.data as T[]) : [],
        pagination: readPagination(nested) ?? directPagination,
      };
    }
  }

  return { rows: [], pagination: rootPagination ?? null };
};

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value || "-"}</div>
    </div>
  );
}

function SummaryMetric({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardContent className="relative p-5">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-primary to-amber-500/80" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptySectionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PaginationControls({
  pagination,
  loading,
  onPageChange,
}: {
  pagination: PaginationMeta | null;
  loading: boolean;
  onPageChange: (page: number) => void;
}) {
  const currentPage = pagination?.current_page ?? pagination?.page ?? 1;
  const lastPage = pagination?.last_page ?? pagination?.total_pages ?? 1;
  const total = pagination?.total ?? 0;

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Page {currentPage} of {Math.max(1, lastPage)} {total ? `- ${total} records` : ""}
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || currentPage >= Math.max(1, lastPage)}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function NewUserDetailPage() {
  const params = useParams<{ uuid: string }>();
  const { token } = useAuth();
  const uuidParam = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;
  const uuid = typeof uuidParam === "string" ? decodeURIComponent(uuidParam) : "";

  const [activeTab, setActiveTab] = useState<TabKey>("deposits");
  const [profile, setProfile] = useState<AdminUserDetailsData | null>(null);
  const [mt5Summary, setMt5Summary] = useState<AdminUserMt5TabDetailsData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<unknown | null>(null);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

  const [depositsState, setDepositsState] = useState(() => createPaginatedState<AdminUserTransactionItem>());
  const [withdrawalsState, setWithdrawalsState] = useState(() => createPaginatedState<AdminUserTransactionItem>());
  const [bankDetailsState, setBankDetailsState] = useState(() => createPaginatedState<AdminUserBankDetailItem>());
  const [activityState, setActivityState] = useState(() => createPaginatedState<AdminUserActivityLogItem>());
  const [referralState, setReferralState] = useState(() => createPaginatedState<AdminUserReferralItem>());
  const [walletHistoryState, setWalletHistoryState] = useState(() => createPaginatedState<AdminUserWalletHistoryItem>());
  const [mt5AccountsState, setMt5AccountsState] = useState(() => createCollectionState<AdminUserMt5AccountItem>());

  const userDetails = profile?.userDetails ?? null;
  const deviceSnapshot = parseDeviceJson(userDetails?.device_json as string | null | undefined);

  const loadDepositsPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setDepositsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.deposits(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setDepositsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load deposits for ${uuid}:`, error);
      setDepositsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "user deposits", action: "load" }));
    }
  }, [profileReloadToken, token, uuid]);

  const loadWithdrawalsPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setWithdrawalsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.withdrawals(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setWithdrawalsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load withdrawals for ${uuid}:`, error);
      setWithdrawalsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "user withdrawals", action: "load" }));
    }
  }, [token, uuid]);

  const loadBankDetailsPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setBankDetailsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.bankDetails(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setBankDetailsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load bank details for ${uuid}:`, error);
      setBankDetailsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "bank details", action: "load" }));
    }
  }, [token, uuid]);

  const loadActivityPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setActivityState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.activityLog(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setActivityState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load activity log for ${uuid}:`, error);
      setActivityState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "activity log", action: "load" }));
    }
  }, [token, uuid]);

  const loadReferralPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setReferralState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.referralBy(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setReferralState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load referral data for ${uuid}:`, error);
      setReferralState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "referral details", action: "load" }));
    }
  }, [token, uuid]);

  const loadWalletHistoryPage = useCallback(async (page = 1) => {
    if (!token || !uuid) return;
    try {
      setWalletHistoryState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.walletHistory(uuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data, response.pagination ?? null);
      setWalletHistoryState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load wallet history for ${uuid}:`, error);
      setWalletHistoryState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "wallet history", action: "load" }));
    }
  }, [token, uuid]);

  useEffect(() => {
    setActiveTab("deposits");
    setProfile(null);
    setMt5Summary(null);
    setProfileError(null);
    setDepositsState(createPaginatedState<AdminUserTransactionItem>());
    setWithdrawalsState(createPaginatedState<AdminUserTransactionItem>());
    setBankDetailsState(createPaginatedState<AdminUserBankDetailItem>());
    setActivityState(createPaginatedState<AdminUserActivityLogItem>());
    setReferralState(createPaginatedState<AdminUserReferralItem>());
    setWalletHistoryState(createPaginatedState<AdminUserWalletHistoryItem>());
    setMt5AccountsState(createCollectionState<AdminUserMt5AccountItem>());

    if (!uuid) {
      setLoadingProfile(false);
      setProfileError(new Error("User UUID is missing from the route."));
      return;
    }

    if (!token) {
      setLoadingProfile(true);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        setProfileError(null);

        const [profileResponse, mt5Response] = await Promise.all([
          adminUsersApi.detail(uuid, token),
          adminUsersApi.mt5TabDetails(uuid, token),
        ]);

        if (cancelled) return;

        const normalizedProfile = normalizeUserDetails((profileResponse.data ?? null) as AdminUserDetailsApiData | null);
        if (!normalizedProfile) {
          throw new Error("User profile payload is empty.");
        }

        const normalizedMt5 = normalizeMt5TabDetails(mt5Response.data ?? null);

        setProfile(normalizedProfile);
        setMt5Summary(normalizedMt5);
        setMt5AccountsState({
          rows: normalizedMt5?.mt5Accounts ?? [],
          loading: false,
          error: null,
          loaded: true,
        });
      } catch (error) {
        if (cancelled) return;
        console.error(`Failed to load user profile for ${uuid}:`, error);
        setProfileError(error);
        toast.error(getAdminFriendlyErrorMessage(error, { resource: "user details", action: "load" }));
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token, uuid]);

  useEffect(() => {
    if (!token || !uuid || loadingProfile || profileError) return;

    switch (activeTab) {
      case "deposits":
        if (!depositsState.loaded && !depositsState.loading) {
          void loadDepositsPage(1);
        }
        break;
      case "withdrawals":
        if (!withdrawalsState.loaded && !withdrawalsState.loading) {
          void loadWithdrawalsPage(1);
        }
        break;
      case "bankDetails":
        if (!bankDetailsState.loaded && !bankDetailsState.loading) {
          void loadBankDetailsPage(1);
        }
        break;
      case "activityLog":
        if (!activityState.loaded && !activityState.loading) {
          void loadActivityPage(1);
        }
        break;
      case "referralBy":
        if (!referralState.loaded && !referralState.loading) {
          void loadReferralPage(1);
        }
        break;
      case "walletHistory":
        if (!walletHistoryState.loaded && !walletHistoryState.loading) {
          void loadWalletHistoryPage(1);
        }
        break;
      default:
        break;
    }
  }, [
    activeTab,
    activityState.loaded,
    activityState.loading,
    bankDetailsState.loaded,
    bankDetailsState.loading,
    depositsState.loaded,
    depositsState.loading,
    loadActivityPage,
    loadBankDetailsPage,
    loadDepositsPage,
    loadReferralPage,
    loadWalletHistoryPage,
    loadWithdrawalsPage,
    loadingProfile,
    profileError,
    referralState.loaded,
    referralState.loading,
    token,
    uuid,
    walletHistoryState.loaded,
    walletHistoryState.loading,
    withdrawalsState.loaded,
    withdrawalsState.loading,
  ]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Pending Deposits",
        value: formatNumericValue(profile?.totalPendingDeposit ?? 0),
        description: "Deposits awaiting approval",
        icon: CircleDollarSign,
      },
      {
        title: "Pending Withdrawals",
        value: formatNumericValue(profile?.totalPendingWithdraw ?? 0),
        description: "Withdrawals awaiting approval",
        icon: Wallet,
      },
      {
        title: "Rejected Deposits",
        value: formatNumericValue(profile?.totalRejectedDeposit ?? 0),
        description: "Deposits sent back to the user",
        icon: CreditCard,
      },
      {
        title: "Rejected Withdrawals",
        value: formatNumericValue(profile?.totalRejectedWithdraw ?? 0),
        description: "Withdrawals declined by the team",
        icon: History,
      },
      {
        title: "MT5 Accounts",
        value: formatNumericValue(mt5Summary?.totalMt5Account ?? 0),
        description: "Trading accounts linked to this user",
        icon: ShieldCheck,
      },
    ],
    [
      mt5Summary?.totalMt5Account,
      profile?.totalPendingDeposit,
      profile?.totalPendingWithdraw,
      profile?.totalRejectedDeposit,
      profile?.totalRejectedWithdraw,
    ],
  );

  if (profileError && !profile) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={profileError}
            audience="admin"
            variant="panel"
            resource="user details"
            action="load"
            onRetry={() => {
              setProfileError(null);
              setProfileReloadToken((value) => value + 1);
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  const renderSectionState = <T,>(
    state: PaginatedTabState<T> | CollectionState<T>,
    retry: () => void,
    emptyTitle: string,
    emptyDescription: string,
    content: ReactNode,
  ) => {
    if (state.loading && !state.loaded) {
      return <TableSectionSkeleton columnCount={5} rowCount={5} />;
    }

    if (state.error) {
      return (
        <ApiErrorState
          error={state.error}
          audience="admin"
          variant="panel"
          resource={emptyTitle.toLowerCase()}
          action="load"
          onRetry={retry}
        />
      );
    }

    if (!state.rows.length) {
      return <EmptySectionState title={emptyTitle} description={emptyDescription} />;
    }

    return content;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Button asChild variant="ghost" className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
                <Link href="/new-users">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to New Users
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">User Profile</h1>
                <p className="text-sm text-muted-foreground">
                  Review profile details, trading accounts, transactions, and operational history.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProfileReloadToken((value) => value + 1)}
              disabled={loadingProfile}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingProfile ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loadingProfile && !profile ? (
            <div className="space-y-4">
              <TableSectionSkeleton columnCount={5} rowCount={3} />
              <TableSectionSkeleton columnCount={4} rowCount={4} />
            </div>
          ) : (
            <>
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardContent className="relative overflow-hidden p-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_36%),radial-gradient(circle_at_right,rgba(245,158,11,0.12),transparent_28%)]" />
                  <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr),360px]">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          <UserRound className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                              {profile?.name || "Unknown User"}
                            </h2>
                            {statusBadge(userDetails?.status, "profile")}
                            {profile?.hasUserDetails ? (
                              <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-300">Profile Ready</Badge>
                            ) : (
                              <Badge variant="secondary">Profile Partial</Badge>
                            )}
                            {normalizeBooleanLabel(userDetails?.politically_exposed, "PEP", "Non-PEP") === "PEP" ? (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300">PEP</Badge>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {profile?.email || "-"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {userDetails?.country || "-"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {[userDetails?.city, userDetails?.state].filter(Boolean).join(", ") || "Location not shared"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailItem label="Client Type" value={userDetails?.client_type || "-"} />
                        <DetailItem label="Signup Source" value={signUpSourceLabel(userDetails?.sign_up_from)} />
                        <DetailItem label="Last Login" value={formatDateTime(userDetails?.last_login_at)} />
                        <DetailItem label="Referral Code" value={userDetails?.referral_code || "-"} />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <Card className="border-primary/15 bg-background/80 shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Device Snapshot</CardTitle>
                          <CardDescription>Most recent known sign-in device</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Browser</span>
                            <span className="font-medium">
                              {deviceSnapshot?.browser_name
                                ? `${deviceSnapshot.browser_name} ${deviceSnapshot.browser_version ?? ""}`.trim()
                                : "-"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Device</span>
                            <span className="font-medium">{deviceSnapshot?.device_name || "-"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">OS</span>
                            <span className="font-medium">{deviceSnapshot?.os_name || "-"}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/70 bg-background/80 shadow-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Account Controls</CardTitle>
                          <CardDescription>Operational flags recorded in CRM</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Self Wallet</span>
                            <span className="font-medium">{normalizeBooleanLabel(userDetails?.self_wallet)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">IB Wallet</span>
                            <span className="font-medium">{normalizeBooleanLabel(userDetails?.ib_wallet)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">IB User</span>
                            <span className="font-medium">{normalizeBooleanLabel(userDetails?.is_ib_user)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">IP Address</span>
                            <span className="font-medium">{userDetails?.ip_address || "-"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <SummaryMetric
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    description={card.description}
                    icon={card.icon}
                  />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Snapshot</CardTitle>
                    <CardDescription>Identity and residential details captured for this user.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="User UUID" value={profile?.uuid || "-"} />
                    <DetailItem label="Profile UUID" value={userDetails?.uuid || "-"} />
                    <DetailItem label="Country" value={userDetails?.country || "-"} />
                    <DetailItem label="State" value={userDetails?.state || "-"} />
                    <DetailItem label="City" value={userDetails?.city || "-"} />
                    <DetailItem label="Address" value={userDetails?.address || "-"} />
                    <DetailItem label="Date of Birth" value={userDetails?.dob ? formatDate(userDetails.dob) : "-"} />
                    <DetailItem label="Nationality" value={userDetails?.nationality || "-"} />
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance Snapshot</CardTitle>
                    <CardDescription>Source-of-funds and onboarding context available in the CRM.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <DetailItem label="Employment Status" value={userDetails?.employment_status || "-"} />
                    <DetailItem label="Annual Income" value={userDetails?.annual_income || "-"} />
                    <DetailItem label="Net Worth" value={userDetails?.estimated_net_worth || "-"} />
                    <DetailItem label="Source of Income" value={userDetails?.source_of_income || "-"} />
                    <DetailItem label="Opening Purpose" value={userDetails?.purpose_of_opening_account || "-"} />
                    <DetailItem label="Estimated Annual Amount" value={userDetails?.estimated_annual_amount || "-"} />
                    <DetailItem label="Passport / ID" value={userDetails?.passport_id_number || userDetails?.other_id_number || "-"} />
                    <DetailItem label="Tax Number" value={userDetails?.tax_number || "-"} />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/70 shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">Operational History</CardTitle>
                    <CardDescription>
                      Navigate between funding, banking, MT5, referral, and activity records for this user.
                    </CardDescription>
                  </div>
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="space-y-5">
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-1 md:grid-cols-4 xl:grid-cols-7">
                      <TabsTrigger value="deposits">Deposits</TabsTrigger>
                      <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                      <TabsTrigger value="mt5Accounts">MT5 Accounts</TabsTrigger>
                      <TabsTrigger value="bankDetails">Bank Details</TabsTrigger>
                      <TabsTrigger value="activityLog">Login Activity</TabsTrigger>
                      <TabsTrigger value="referralBy">Referral By</TabsTrigger>
                      <TabsTrigger value="walletHistory">Wallet History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="deposits" className="space-y-4">
                      {renderSectionState(
                        depositsState,
                        () => {
                          void loadDepositsPage(depositsState.pagination?.current_page ?? 1);
                        },
                        "No deposits found",
                        "This user does not have any deposit records yet.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Transaction Hash</TableHead>
                                <TableHead>User Comment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {depositsState.rows.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.id}</TableCell>
                                  <TableCell>{formatNumericValue(item.amount)}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{item.transaction_hash || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] truncate">{item.user_comment || "-"}</TableCell>
                                  <TableCell>{statusBadge(item.status, "transaction")}</TableCell>
                                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={depositsState.pagination}
                            loading={depositsState.loading}
                            onPageChange={(page) => {
                              void loadDepositsPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="withdrawals" className="space-y-4">
                      {renderSectionState(
                        withdrawalsState,
                        () => {
                          void loadWithdrawalsPage(withdrawalsState.pagination?.current_page ?? 1);
                        },
                        "No withdrawals found",
                        "This user does not have any withdrawal records yet.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Transaction Hash</TableHead>
                                <TableHead>User Comment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {withdrawalsState.rows.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.id}</TableCell>
                                  <TableCell>{formatNumericValue(item.amount)}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{item.transaction_hash || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] truncate">{item.user_comment || "-"}</TableCell>
                                  <TableCell>{statusBadge(item.status, "transaction")}</TableCell>
                                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={withdrawalsState.pagination}
                            loading={withdrawalsState.loading}
                            onPageChange={(page) => {
                              void loadWithdrawalsPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="mt5Accounts" className="space-y-4">
                      {renderSectionState(
                        mt5AccountsState,
                        () => {
                          setProfileReloadToken((value) => value + 1);
                        },
                        "No MT5 accounts found",
                        "No MT5 trading accounts are linked to this user.",
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <DetailItem label="Total Deposit" value={formatNumericValue(mt5Summary?.totalDeposit ?? 0)} />
                            <DetailItem label="Total Withdraw" value={formatNumericValue(mt5Summary?.totalWithdraw ?? 0)} />
                            <DetailItem label="Accounts" value={formatNumericValue(mt5Summary?.totalMt5Account ?? 0)} />
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Account ID</TableHead>
                                <TableHead>MT5 Login</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead>Investor Password</TableHead>
                                <TableHead>Main Password</TableHead>
                                <TableHead>Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mt5AccountsState.rows.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.account_id}</TableCell>
                                  <TableCell>{item.mt5_id || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] truncate">{item.group_name || "-"}</TableCell>
                                  <TableCell className="font-mono text-xs">{item.investor_password || "-"}</TableCell>
                                  <TableCell className="font-mono text-xs">{item.main_password || "-"}</TableCell>
                                  <TableCell>{formatDateTime(item.date)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="bankDetails" className="space-y-4">
                      {renderSectionState(
                        bankDetailsState,
                        () => {
                          void loadBankDetailsPage(bankDetailsState.pagination?.current_page ?? 1);
                        },
                        "No bank details found",
                        "The user has not added any withdrawal bank accounts yet.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Account Holder</TableHead>
                                <TableHead>Bank</TableHead>
                                <TableHead>Account Number</TableHead>
                                <TableHead>IBAN / IFSC</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Contact</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bankDetailsState.rows.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.account_holder_name || "-"}</TableCell>
                                  <TableCell>{item.bank_name || "-"}</TableCell>
                                  <TableCell>{item.account_number || "-"}</TableCell>
                                  <TableCell>{item.iban_number || item.swift_ifsc_code || "-"}</TableCell>
                                  <TableCell>{item.country || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] whitespace-normal">
                                    <div>{item.user?.email || "-"}</div>
                                    <div className="text-xs text-muted-foreground">{item.user?.mobile || "-"}</div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={bankDetailsState.pagination}
                            loading={bankDetailsState.loading}
                            onPageChange={(page) => {
                              void loadBankDetailsPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="activityLog" className="space-y-4">
                      {renderSectionState(
                        activityState,
                        () => {
                          void loadActivityPage(activityState.pagination?.current_page ?? 1);
                        },
                        "No activity found",
                        "No login activity has been recorded for this user yet.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Browser</TableHead>
                                <TableHead>Device</TableHead>
                                <TableHead>OS</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {activityState.rows.map((item, index) => (
                                <TableRow key={`${item.ip_address ?? "activity"}-${item.created_at ?? index}`}>
                                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                  <TableCell>{item.ip_address || "-"}</TableCell>
                                  <TableCell>{[item.browser_name, item.browser_version].filter(Boolean).join(" ") || "-"}</TableCell>
                                  <TableCell>{item.device_name || "-"}</TableCell>
                                  <TableCell>{item.os_name || "-"}</TableCell>
                                  <TableCell>{statusBadge(item.status, "activity")}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={activityState.pagination}
                            loading={activityState.loading}
                            onPageChange={(page) => {
                              void loadActivityPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="referralBy" className="space-y-4">
                      {renderSectionState(
                        referralState,
                        () => {
                          void loadReferralPage(referralState.pagination?.current_page ?? 1);
                        },
                        "No referrals found",
                        "This user does not currently have any downstream referrals.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Referral Code</TableHead>
                                <TableHead>Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {referralState.rows.map((item, index) => (
                                <TableRow key={`${item.uuid ?? item.email ?? "ref"}-${index}`}>
                                  <TableCell className="font-medium">{item.name || "-"}</TableCell>
                                  <TableCell>{item.email || "-"}</TableCell>
                                  <TableCell>{item.mobile || "-"}</TableCell>
                                  <TableCell>{item.referral_code || "-"}</TableCell>
                                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={referralState.pagination}
                            loading={referralState.loading}
                            onPageChange={(page) => {
                              void loadReferralPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>

                    <TabsContent value="walletHistory" className="space-y-4">
                      {renderSectionState(
                        walletHistoryState,
                        () => {
                          void loadWalletHistoryPage(walletHistoryState.pagination?.current_page ?? 1);
                        },
                        "No wallet history found",
                        "There are no wallet balance mutations recorded for this user yet.",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Payment Type</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Wallet</TableHead>
                                <TableHead>Before</TableHead>
                                <TableHead>After</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Remark</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {walletHistoryState.rows.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.payment_type || "-"}</TableCell>
                                  <TableCell className={Number(item.amount ?? 0) < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-300"}>
                                    {formatSignedValue(item.amount)}
                                  </TableCell>
                                  <TableCell>{item.wallet_type || "-"}</TableCell>
                                  <TableCell>{formatNumericValue(item.balance_before)}</TableCell>
                                  <TableCell>{formatNumericValue(item.balance_after)}</TableCell>
                                  <TableCell>{statusBadge(item.status, "wallet")}</TableCell>
                                  <TableCell className="max-w-[260px] truncate">{item.remark || "-"}</TableCell>
                                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <PaginationControls
                            pagination={walletHistoryState.pagination}
                            loading={walletHistoryState.loading}
                            onPageChange={(page) => {
                              void loadWalletHistoryPage(page);
                            }}
                          />
                        </div>,
                      )}
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
