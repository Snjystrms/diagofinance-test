"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
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
import { ApiRequestError } from "@/lib/api-core";
import {
  adminUsersApi,
  type AdminPaginatedApiData,
  type AdminUserActivityLogItem,
  type AdminUserBankDetailItem,
  type AdminUserMt5AccountItem,
  type AdminUserMt5TabDetailsApiData,
  type AdminUserMt5TabDetailsData,
  type AdminUserReferralItem,
  type AdminUserTransactionItem,
  type AdminUserWalletHistoryItem,
  type PaginationMeta,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

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

interface CrudUserDetails {
  id: number;
  uuid: string;
  sponsor_id?: string | null;
  sponsor_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  status?: number | string | null;
  is_approved?: number | string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  referral_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface KycData {
  verification_status: string;
  kyc_status: string;
  documents?: Record<string, number>;
  document_files?: Record<string, string | null>;
  document_urls?: Record<string, string | null>;
  rejection_comments?: Record<string, string>;
}

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

/** HTTP status when the API surfaced an error response (see ApiRequestError). */
function getErrorHttpStatus(error: unknown): number | undefined {
  if (error instanceof ApiRequestError) return error.status;
  if (error && typeof error === "object" && "status" in error) {
    const n = (error as { status: unknown }).status;
    return typeof n === "number" ? n : undefined;
  }
  return undefined;
}

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

const isCentAccountTypeName = (value: unknown) => String(value ?? "").trim().toLowerCase() === "cent";

const formatValueWithCurrency = (value: unknown, currency?: unknown) => {
  const formatted = formatNumericValue(value);
  if (formatted === "-") return formatted;
  const suffix = String(currency ?? "").trim();
  return suffix ? `${formatted} ${suffix}` : formatted;
};

const getUserMt5BalanceCurrency = (account: AdminUserMt5AccountItem) =>
  isCentAccountTypeName(account.account_type_name) ? "USC" : "USD";

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

const getPaginatedSerialNumber = (index: number, pagination: PaginationMeta | null): number => {
  const currentPage = pagination?.current_page ?? pagination?.page ?? 1;
  const pageSize = pagination?.per_page ?? pagination?.limit ?? DEFAULT_PAGE_SIZE;
  return (Math.max(1, currentPage) - 1) * Math.max(1, pageSize) + index + 1;
};

const extractCrudUserFromDetailPayload = (payload: unknown): CrudUserDetails | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (data.user && typeof data.user === "object") return data.user as CrudUserDetails;
    if (typeof (data as unknown as CrudUserDetails).id === "number") return data as unknown as CrudUserDetails;
  }
  if (record.user && typeof record.user === "object") return record.user as CrudUserDetails;
  if (typeof (record as unknown as CrudUserDetails).id === "number") return record as unknown as CrudUserDetails;
  return null;
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

const resolveUuidFromDetailPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.uuid === "string" && record.uuid) return record.uuid;
  if (record.user && typeof record.user === "object") {
    const user = record.user as Record<string, unknown>;
    if (typeof user.uuid === "string" && user.uuid) return user.uuid;
  }
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.uuid === "string" && data.uuid) return data.uuid;
    if (data.user && typeof data.user === "object") {
      const user = data.user as Record<string, unknown>;
      if (typeof user.uuid === "string" && user.uuid) return user.uuid;
    }
  }
  return null;
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
  const params = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof idParam === "string" ? decodeURIComponent(idParam) : "";

  const [activeTab, setActiveTab] = useState<TabKey>("deposits");
  const [userUuid, setUserUuid] = useState<string>("");
  const [crudUser, setCrudUser] = useState<CrudUserDetails | null>(null);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [mt5Summary, setMt5Summary] = useState<AdminUserMt5TabDetailsData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<unknown | null>(null);
  const [profileReloadToken, setProfileReloadToken] = useState(0);

  const [decryptedPassword, setDecryptedPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  const [depositsState, setDepositsState] = useState(() => createPaginatedState<AdminUserTransactionItem>());
  const [withdrawalsState, setWithdrawalsState] = useState(() => createPaginatedState<AdminUserTransactionItem>());
  const [bankDetailsState, setBankDetailsState] = useState(() => createPaginatedState<AdminUserBankDetailItem>());
  const [activityState, setActivityState] = useState(() => createPaginatedState<AdminUserActivityLogItem>());
  const [referrer, setReferrer] = useState<AdminUserReferralItem | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<unknown | null>(null);
  const [referralLoaded, setReferralLoaded] = useState(false);
  const [walletHistoryState, setWalletHistoryState] = useState(() => createPaginatedState<AdminUserWalletHistoryItem>());
  const [mt5AccountsState, setMt5AccountsState] = useState(() => createCollectionState<AdminUserMt5AccountItem>());

  const loadDepositsPage = useCallback(async (page = 1) => {
    if (!token || !userUuid) return;
    try {
      setDepositsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.deposits(userUuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setDepositsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load deposits for user ${id}:`, error);
      setDepositsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "user deposits", action: "load" }));
    }
  }, [profileReloadToken, token, userUuid, id]);

  const loadWithdrawalsPage = useCallback(async (page = 1) => {
    if (!token || !userUuid) return;
    try {
      setWithdrawalsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.withdrawals(userUuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setWithdrawalsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load withdrawals for user ${id}:`, error);
      setWithdrawalsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "user withdrawals", action: "load" }));
    }
  }, [token, userUuid, id]);

  const loadBankDetailsPage = useCallback(async (page = 1) => {
    if (!token || !userUuid) return;
    try {
      setBankDetailsState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.bankDetails(userUuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setBankDetailsState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load bank details for user ${id}:`, error);
      setBankDetailsState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "bank details", action: "load" }));
    }
  }, [token, userUuid, id]);

  const loadActivityPage = useCallback(async (page = 1) => {
    if (!token || !userUuid) return;
    try {
      setActivityState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.activityLog(userUuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data);
      setActivityState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load activity log for user ${id}:`, error);
      setActivityState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "activity log", action: "load" }));
    }
  }, [token, userUuid, id]);

  const loadReferral = useCallback(async () => {
    if (!token || !userUuid) return;
    try {
      setReferralLoading(true);
      setReferralError(null);
      const response = await adminUsersApi.referralBy(userUuid, token, 1, DEFAULT_PAGE_SIZE);
      const data = response?.data as Record<string, unknown> | undefined;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        setReferrer(data as unknown as AdminUserReferralItem);
      } else {
        setReferrer(null);
      }
    } catch (error) {
      console.error(`Failed to load referral data for user ${id}:`, error);
      setReferralError(error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "referral details", action: "load" }));
    } finally {
      setReferralLoading(false);
      setReferralLoaded(true);
    }
  }, [token, userUuid, id]);

  const loadWalletHistoryPage = useCallback(async (page = 1) => {
    if (!token || !userUuid) return;
    try {
      setWalletHistoryState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await adminUsersApi.walletHistory(userUuid, token, page, DEFAULT_PAGE_SIZE);
      const normalized = normalizePaginatedRows(response.data, response.pagination ?? null);
      setWalletHistoryState({
        rows: normalized.rows,
        pagination: withFallbackPagination(normalized.pagination, page, normalized.rows.length),
        loading: false,
        error: null,
        loaded: true,
      });
    } catch (error) {
      console.error(`Failed to load wallet history for user ${id}:`, error);
      setWalletHistoryState((prev) => ({ ...prev, loading: false, error, loaded: true }));
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "wallet history", action: "load" }));
    }
  }, [token, userUuid, id]);

  const handleDecryptPassword = useCallback(async () => {
    if (!token || !id) return;
    
    try {
      setLoadingPassword(true);
      const response = await adminUsersApi.decryptPassword(id, token);
      setDecryptedPassword(response.data?.password || null);
      setShowPassword(true);
      toast.success("Password decrypted successfully");
    } catch (error) {
      console.error(`Failed to decrypt password for user ${id}:`, error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "user password", action: "decrypt" }));
    } finally {
      setLoadingPassword(false);
    }
  }, [token, id]);

  useEffect(() => {
    setActiveTab("deposits");
    setUserUuid("");
    setCrudUser(null);
    setMt5Summary(null);
    setKycData(null);
    setProfileError(null);
    setDepositsState(createPaginatedState<AdminUserTransactionItem>());
    setWithdrawalsState(createPaginatedState<AdminUserTransactionItem>());
    setBankDetailsState(createPaginatedState<AdminUserBankDetailItem>());
    setActivityState(createPaginatedState<AdminUserActivityLogItem>());
    setReferrer(null);
    setReferralError(null);
    setReferralLoading(false);
    setReferralLoaded(false);
    setWalletHistoryState(createPaginatedState<AdminUserWalletHistoryItem>());
    setMt5AccountsState(createCollectionState<AdminUserMt5AccountItem>());

    if (!id) {
      setLoadingProfile(false);
      setProfileError(new Error("User ID is missing from the route."));
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

        const detailResponse = await adminUsersApi.detail(id, token);
        const resolvedUuid = resolveUuidFromDetailPayload(detailResponse?.data);

        if (!resolvedUuid) {
          throw new Error("Could not resolve user UUID from detail response.");
        }

        if (cancelled) return;

        const crudUserData = extractCrudUserFromDetailPayload(detailResponse?.data);
        if (!crudUserData) {
          throw new Error("User profile payload is empty.");
        }

        setUserUuid(resolvedUuid);
        setCrudUser(crudUserData);

        try {
          const detailPayload = detailResponse?.data as Record<string, unknown> | undefined;
          const kycPayload = detailPayload?.kyc as KycData | undefined;
          if (kycPayload) {
            setKycData(kycPayload);
          }
        } catch {
          // KYC data is optional
        }

        try {
          const mt5Response = await adminUsersApi.mt5TabDetails(resolvedUuid, token);
          if (cancelled) return;

          const normalizedMt5 = normalizeMt5TabDetails(mt5Response.data ?? null);
          setMt5Summary(normalizedMt5);
          setMt5AccountsState({
            rows: normalizedMt5?.mt5Accounts ?? [],
            loading: false,
            error: null,
            loaded: true,
          });
        } catch (mt5Error) {
          if (cancelled) return;
          console.error(`Failed to load MT5 tab details for user ${resolvedUuid}:`, mt5Error);
          setMt5Summary(null);
          setMt5AccountsState({
            rows: [],
            loading: false,
            error: mt5Error,
            loaded: true,
          });
        }
      } catch (error) {
        if (cancelled) return;
        console.error(`Failed to load user profile for ID ${id}:`, error);
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
  }, [token, id, profileReloadToken]);

  useEffect(() => {
    if (!token || !userUuid || loadingProfile) return;

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
        if (!referralLoaded && !referralLoading) {
          void loadReferral();
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
    loadReferral,
    loadWalletHistoryPage,
    loadWithdrawalsPage,
    loadingProfile,
    referralLoading,
    referralLoaded,
    token,
    userUuid,
    walletHistoryState.loaded,
    walletHistoryState.loading,
    withdrawalsState.loaded,
    withdrawalsState.loading,
  ]);

  const summaryCards = useMemo(
    () => [
      {
        title: "MT5 Accounts",
        value: formatNumericValue(mt5Summary?.totalMt5Account ?? 0),
        description: "Trading accounts linked to this user",
        icon: ShieldCheck,
      },
      {
        title: "Total MT5 Deposit",
        value: formatNumericValue(mt5Summary?.totalDeposit ?? 0),
        description: "Cumulative deposits across MT5 accounts",
        icon: ShieldCheck,
      },
      {
        title: "Total MT5 Withdraw",
        value: formatNumericValue(mt5Summary?.totalWithdraw ?? 0),
        description: "Cumulative withdrawals across MT5 accounts",
        icon: ShieldCheck,
      },
    ],
    [mt5Summary?.totalMt5Account, mt5Summary?.totalDeposit, mt5Summary?.totalWithdraw],
  );

  if (profileError && !crudUser) {
    const isManagerPermissionDenied =
      user?.type === "manager" && getErrorHttpStatus(profileError) === 401;

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
            title={isManagerPermissionDenied ? "Insufficient permissions" : undefined}
            unauthorizedMessage={
              isManagerPermissionDenied
                ? "Your manager role does not include access to this user profile. Ask an administrator if you need it."
                : undefined
            }
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
    errorResource: string,
    content: ReactNode,
  ) => {
    if (state.loading && !state.loaded) {
      return <TableSectionSkeleton columnCount={5} rowCount={5} />;
    }

    if (state.error) {
      const isManagerPermissionDenied =
        user?.type === "manager" && getErrorHttpStatus(state.error) === 401;

      return (
        <ApiErrorState
          error={state.error}
          audience="admin"
          variant="panel"
          resource={errorResource}
          action="load"
          onRetry={retry}
          title={isManagerPermissionDenied ? "Insufficient permissions" : undefined}
          unauthorizedMessage={
            isManagerPermissionDenied
              ? "Your manager role does not include access to this section. Ask an administrator if you need it."
              : undefined
          }
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

          {loadingProfile && !crudUser ? (
            <div className="space-y-4">
              <TableSectionSkeleton columnCount={5} rowCount={3} />
              <TableSectionSkeleton columnCount={4} rowCount={4} />
            </div>
          ) : (
            <>
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardContent className="relative overflow-hidden p-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_36%),radial-gradient(circle_at_right,rgba(245,158,11,0.12),transparent_28%)]" />
                  <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr),320px]">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          <UserRound className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                              {[crudUser?.first_name, crudUser?.last_name].filter(Boolean).join(" ") || "Unknown User"}
                            </h2>
                            {/* {statusBadge(crudUser?.status, "profile")} */}
                            {/* {normalizeBooleanLabel(crudUser?.is_approved) === "Yes" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Approved</Badge>
                            ) : (
                              <Badge variant="secondary">Pending Approval</Badge>
                            )} */}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {crudUser?.email || "-"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {crudUser?.mobile || "-"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              {crudUser?.country || "-"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {[crudUser?.city, crudUser?.state].filter(Boolean).join(", ") || "Location not shared"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailItem
                          label={crudUser?.sponsor_id ? "IB ID" : "Type"}
                          value={crudUser?.sponsor_id ?? "Client"}
                        />
                        <DetailItem label="Registered" value={formatDateTime(crudUser?.created_at)} />
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm sm:col-span-2">
                          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Password
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {decryptedPassword ? (
                              <>
                                <div className="flex-1 text-sm font-medium text-foreground">
                                  {showPassword ? decryptedPassword : "••••••••"}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="h-8 w-8 p-0"
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDecryptPassword}
                                disabled={loadingPassword}
                                className="h-8"
                              >
                                {loadingPassword ? (
                                  <>
                                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                                    Decrypting...
                                  </>
                                ) : (
                                  <>
                                    <Eye className="mr-2 h-3 w-3" />
                                    Show Password
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Card className="border-border/70 bg-background/80 shadow-none">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Account Status</CardTitle>
                        {/* <CardDescription>Approval state recorded in CRM</CardDescription> */}
                      </CardHeader>
                      <CardContent className="grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium">{statusBadge(crudUser?.status, "profile")}</span>
                        </div>
                        {/* <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Is Approved</span>
                          <span className="font-medium">{normalizeBooleanLabel(crudUser?.is_approved)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Approved By</span>
                          <span className="truncate text-right font-medium">{crudUser?.approved_by || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Approved At</span>
                          <span className="font-medium">{formatDateTime(crudUser?.approved_at)}</span>
                        </div> */}
                        {crudUser?.rejection_reason ? (
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Rejection</span>
                            <span className="max-w-[180px] text-right font-medium text-rose-600 dark:text-rose-400">
                              {crudUser.rejection_reason}
                            </span>
                          </div>
                        ) : null}
                        {kycData ? (
                          <>
                            <div className="my-1 border-t border-border/40" />
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">KYC Status</span>
                              <span className="font-medium capitalize">{kycData.kyc_status}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">Verification</span>
                              <span className="font-medium capitalize">{kycData.verification_status}</span>
                            </div>
                            {kycData.document_urls && (
                              <div className="my-1 border-t border-border/40" />
                            )}
                            {kycData.document_urls?.poi_front_file && (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">POI (Front)</span>
                                <a href={kycData.document_urls.poi_front_file} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={kycData.document_urls.poi_front_file}
                                    alt="POI Front"
                                    className="h-12 w-16 rounded border border-border/60 object-cover hover:opacity-80"
                                  />
                                </a>
                              </div>
                            )}
                            {kycData.document_urls?.poa_front_file && (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">POA (Front)</span>
                                <a href={kycData.document_urls.poa_front_file} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={kycData.document_urls.poa_front_file}
                                    alt="POA Front"
                                    className="h-12 w-16 rounded border border-border/60 object-cover hover:opacity-80"
                                  />
                                </a>
                              </div>
                            )}
                            {kycData.document_urls?.poa_back_file && (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">POA (Back)</span>
                                <a href={kycData.document_urls.poa_back_file} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={kycData.document_urls.poa_back_file}
                                    alt="POA Back"
                                    className="h-12 w-16 rounded border border-border/60 object-cover hover:opacity-80"
                                  />
                                </a>
                              </div>
                            )}
                            {kycData.document_urls?.other_file && (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Other</span>
                                <a href={kycData.document_urls.other_file} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={kycData.document_urls.other_file}
                                    alt="Other Document"
                                    className="h-12 w-16 rounded border border-border/60 object-cover hover:opacity-80"
                                  />
                                </a>
                              </div>
                            )}
                          </>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {mt5AccountsState.error ? (
                <ApiErrorState
                  error={mt5AccountsState.error}
                  audience="admin"
                  variant="panel"
                  resource="MT5 account summary"
                  action="load"
                  onRetry={() => setProfileReloadToken((value) => value + 1)}
                  title={
                    user?.type === "manager" && getErrorHttpStatus(mt5AccountsState.error) === 401
                      ? "Insufficient permissions"
                      : undefined
                  }
                  unauthorizedMessage={
                    user?.type === "manager" && getErrorHttpStatus(mt5AccountsState.error) === 401
                      ? "Your manager role does not include access to MT5 totals for this user. Ask an administrator if you need it."
                      : undefined
                  }
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
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
              )}

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
                        "deposits",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sr. No.</TableHead>
                                <TableHead>Amount (USD)</TableHead>
                                <TableHead>Transaction Hash</TableHead>
                                <TableHead>Deposit Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {depositsState.rows.map((item, index) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    <SerialNumberCell serialNumber={getPaginatedSerialNumber(index, walletHistoryState.pagination)} />
                                  </TableCell>
                                  <TableCell>{formatNumericValue(item.amount)}</TableCell>
                                  <TableCell className="max-w-[200px] truncate">{item.transaction_hash || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] truncate">{item.deposit_type || "-"}</TableCell>
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
                        "withdrawals",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sr. No.</TableHead>
                                <TableHead>Amount (USD)</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Payment Details</TableHead>
                                <TableHead>User Comment</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {withdrawalsState.rows.map((item, index) => {
                                const raw = item as Record<string, unknown>;
                                const isCrypto = item.payment_method?.type === "local";
                                const isBank = item.payment_method?.type === "bank_transfer";
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                      <SerialNumberCell serialNumber={index + 1} />
                                    </TableCell>
                                    <TableCell>{formatNumericValue(item.amount)}</TableCell>
                                    <TableCell>{item.payment_method?.name || "-"}</TableCell>
                                    <TableCell className="max-w-[220px] whitespace-normal text-xs">
                                      {isCrypto ? (
                                        <div className="space-y-0.5">
                                          <div className="break-all"><span className="text-muted-foreground">Wallet: </span>{String(raw.wallet_address ?? "-")}</div>
                                          <div><span className="text-muted-foreground">Chain: </span>{String(raw.chain_id ?? "-")}</div>
                                        </div>
                                      ) : isBank ? (
                                        (() => {
                                          const bd = raw.bank_detail as Record<string, unknown> | null | undefined;
                                          return bd ? (
                                            <div className="space-y-0.5">
                                              <div><span className="text-muted-foreground">Bank: </span>{String(bd.bank_name ?? "-")}</div>
                                              <div><span className="text-muted-foreground">Holder: </span>{String(bd.account_holder_name ?? "-")}</div>
                                              <div><span className="text-muted-foreground">A/c: </span>{String(bd.account_number ?? "-")}</div>
                                              <div><span className="text-muted-foreground">IFSC: </span>{String(bd.swift_ifsc_code ?? bd.iban_number ?? "-")}</div>
                                            </div>
                                          ) : "-";
                                        })()
                                      ) : (
                                        "-"
                                      )}
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate">{item.user_comment || "-"}</TableCell>
                                    <TableCell>{statusBadge(item.status, "transaction")}</TableCell>
                                    <TableCell>{formatDateTime(item.created_at)}</TableCell>
                                  </TableRow>
                                );
                              })}
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
                        "MT5 accounts",
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <DetailItem label="Total Deposit" value={formatNumericValue(mt5Summary?.totalDeposit ?? 0)} />
                            <DetailItem label="Total Withdraw" value={formatNumericValue(mt5Summary?.totalWithdraw ?? 0)} />
                            <DetailItem label="Accounts" value={formatNumericValue(mt5Summary?.totalMt5Account ?? 0)} />
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sr. No.</TableHead>
                                <TableHead>MT5 Login</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead>Balance</TableHead>
                                {/* <TableHead>Investor Password</TableHead>
                                <TableHead>Main Password</TableHead> */}
                                <TableHead>Created</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mt5AccountsState.rows.map((item, index) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    <SerialNumberCell serialNumber={index + 1} />
                                  </TableCell>
                                  
                                  <TableCell>{item.mt5_id || "-"}</TableCell>
                                  <TableCell className="max-w-[220px] truncate">{item.group_name || "-"}</TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {formatValueWithCurrency(item.balance, getUserMt5BalanceCurrency(item))}
                                  </TableCell>
                                  {/* <TableCell className="font-mono text-xs">{item.investor_password || "-"}</TableCell>
                                  <TableCell className="font-mono text-xs">{item.main_password || "-"}</TableCell> */}
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
                        "bank details",
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
                                <TableHead>Status</TableHead>
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
                                  <TableCell>
                                    <Badge variant={item.status === "active" ? "default" : "secondary"}>
                                      {item.status || "-"}
                                    </Badge>
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
                        "activity log",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sr. No.</TableHead>
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
                                  <TableCell>
                                    <SerialNumberCell serialNumber={index + 1} className="" />
                                  </TableCell>
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
                      {referralLoading && !referrer ? (
                        <TableSectionSkeleton columnCount={4} rowCount={1} />
                      ) : referralError ? (
                        <ApiErrorState
                          error={referralError}
                          audience="admin"
                          variant="panel"
                          resource="referral details"
                          action="load"
                          onRetry={() => void loadReferral()}
                          title={
                            user?.type === "manager" && getErrorHttpStatus(referralError) === 401
                              ? "Insufficient permissions"
                              : undefined
                          }
                          unauthorizedMessage={
                            user?.type === "manager" && getErrorHttpStatus(referralError) === 401
                              ? "Your manager role does not include access to referral details. Ask an administrator if you need it."
                              : undefined
                          }
                        />
                      ) : !referrer ? (
                        <EmptySectionState
                          title="No referrer found"
                          description="This user was not referred by anyone."
                        />
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <DetailItem label="Name" value={referrer.name} />
                          <DetailItem label="Email" value={referrer.email} />
                          <DetailItem label="Mobile" value={referrer.mobile} />
                          <DetailItem label="IB ID" value={String((referrer as Record<string, unknown>).sponsor_id ?? referrer.referral_code ?? "-")} />
                          <DetailItem label="Since" value={formatDateTime(referrer.created_at)} />
                        </div>
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
                        "wallet history",
                        <div className="space-y-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Sr. No.</TableHead>
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
                              {walletHistoryState.rows.map((item, index) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                   <SerialNumberCell serialNumber={getPaginatedSerialNumber(index, walletHistoryState.pagination)} />
                                  </TableCell>
                                  <TableCell className="font-medium">{item.payment_type || "-"}</TableCell>
                                  <TableCell className={["withdrawal", "transfer_out"].includes(String(item.payment_type ?? "").toLowerCase()) || Number(item.amount ?? 0) < 0 ? "text-rose-600" : "text-emerald-700 dark:text-emerald-300"}>
                                    {[
                                      formatSignedValue(["withdrawal", "transfer_out"].includes(String(item.payment_type ?? "").toLowerCase()) ? -Math.abs(Number(item.amount ?? 0)) : item.amount),
                                      item.currency,
                                    ].filter(Boolean).join(" ")}
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
