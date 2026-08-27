"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  RefreshCw,
  TrendingDown,
  AlertCircle,
  Plus,
  Search,
  X,
} from "lucide-react";

import { adminIbWithdrawalApi, type AdminIbWithdrawalRequest, adminUsersApi, type PendingUser, adminBankDetailsApi, type AdminBankDetailItem } from "@/lib/api";
import { adminMT5AccountsApi, type AdminMT5Account } from "@/lib/api-trading-ib";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  assertCan,
  sanitizeFilterValue,
  useModuleCapabilities,
} from "@/hooks/use-permission-capabilities";
import {
  IB_WITHDRAWAL_STATUS_OPTIONS,
  IB_WITHDRAWAL_DESTINATION_OPTIONS,
  fmtDateTime,
  formatAmount,
  statusBadge,
} from "../_lib/transaction-format";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

/* ---------------- Page ---------------- */
export function IbWithdrawalRequestsPageContent() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || ""
      : "");

  const { filterFeatureOptions } = useManagerPermissions();
  const { isAdmin, isManager, can } = useModuleCapabilities("transaction");

  const withdrawalStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", IB_WITHDRAWAL_STATUS_OPTIONS),
    [filterFeatureOptions],
  );

  const allowedStatusValues = useMemo(
    () => withdrawalStatusFeatureOptions.map((opt) => opt.value),
    [withdrawalStatusFeatureOptions],
  );

  const allowedStatusesSet = useMemo(() => {
    const set = new Set<string>();
    withdrawalStatusFeatureOptions.forEach((opt) => {
      opt.statuses.forEach((status) => set.add(status.toLowerCase()));
    });
    return set;
  }, [withdrawalStatusFeatureOptions]);

  const canTakeWithdrawalAction = can("approveIbWithdrawal");
  const canViewWithdrawals = can("viewIbWithdrawals");

  const canViewStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedStatusesSet],
  );

  const [withdrawalRows, setWithdrawalRows] = useState<
    AdminIbWithdrawalRequest[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [destinationFilter, setDestinationFilter] = useQueryState(
    "destination",
    parseAsString.withDefault("all"),
  );

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingWithdrawalRequest, setViewingWithdrawalRequest] =
    useState<AdminIbWithdrawalRequest | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"approve" | "reject">(
    "approve",
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Create IB withdrawal dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createDestination, setCreateDestination] = useState<"bank" | "mt5">("bank");
  const [createAmount, setCreateAmount] = useState("");
  const [createComment, setCreateComment] = useState("");
  const [createBankDetailId, setCreateBankDetailId] = useState("");
  const [createMt5AccountId, setCreateMt5AccountId] = useState("");

  // MT5 accounts and bank details for dropdowns
  const [mt5Accounts, setMt5Accounts] = useState<AdminMT5Account[]>([]);
  const [loadingMt5Accounts, setLoadingMt5Accounts] = useState(false);
  const [bankDetails, setBankDetails] = useState<AdminBankDetailItem[]>([]);
  const [loadingBankDetails, setLoadingBankDetails] = useState(false);

  // User search for create dialog
  const [createSearchQuery, setCreateSearchQuery] = useState("");
  const [createUsers, setCreateUsers] = useState<PendingUser[]>([]);
  const [createSearching, setCreateSearching] = useState(false);
  const [createSelectedUser, setCreateSelectedUser] = useState<PendingUser | null>(null);
  const [createShowResults, setCreateShowResults] = useState(false);
  const createSearchRef = useRef<HTMLDivElement>(null);
  const createSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWithdrawals = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      const status =
        statusFilter !== "all" && statusFilter !== "none"
          ? statusFilter
          : undefined;
      const destination =
        destinationFilter !== "all" && destinationFilter !== "none"
          ? destinationFilter
          : undefined;
      const searchTerm = search && search.length >= 3 ? search : undefined;
      const res = (await adminIbWithdrawalApi.listAll(page, perPage, token, {
        status,
        search: searchTerm,
        destination,
      })) as {
        data?:
          | unknown[]
          | {
              withdrawals?: unknown[];
              data?: unknown[];
              requests?: unknown[];
              pagination?: { totalPages?: number; total_pages?: number };
            };
        meta?: { total?: number; limit?: number };
        pagination?: { totalPages?: number; total_pages?: number };
        withdrawals?: unknown[];
        requests?: unknown[];
      };
      let withdrawals: AdminIbWithdrawalRequest[] = [];
      if (Array.isArray(res?.data)) {
        withdrawals = res.data as AdminIbWithdrawalRequest[];
      } else if (res?.data && typeof res.data === "object") {
        withdrawals = (res.data.withdrawals ??
          res.data.data ??
          res.data.requests ??
          []) as AdminIbWithdrawalRequest[];
      } else {
        withdrawals = (res?.withdrawals ??
          res?.requests ??
          []) as AdminIbWithdrawalRequest[];
      }
      setWithdrawalRows(withdrawals);

      if (res?.meta) {
        const total = res.meta.total || 0;
        const limit = res.meta.limit || perPage;
        setTotalPages(Math.ceil(total / limit) || 1);
      } else if (
        res?.data &&
        typeof res.data === "object" &&
        !Array.isArray(res.data) &&
        res.data.pagination
      ) {
        setTotalPages(
          res.data.pagination.totalPages ||
            res.data.pagination.total_pages ||
            1,
        );
      } else if (res?.pagination) {
        setTotalPages(
          res.pagination.totalPages || res.pagination.total_pages || 1,
        );
      }
    } catch (e: unknown) {
      console.error(e);
      setLoadError(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "IB withdrawal requests",
          action: "load",
        }),
      );
      setWithdrawalRows([]);
    }
  }, [token, page, perPage, statusFilter, search, destinationFilter]);

  const loadList = useCallback(async () => {
    if (!token) return;
    if (!canViewWithdrawals) return;
    setLoading(true);
    try {
      await loadWithdrawals();
    } finally {
      setLoading(false);
    }
  }, [token, canViewWithdrawals, loadWithdrawals]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  useEffect(() => {
    if (!isManager) return;
    if (!withdrawalStatusFeatureOptions.length) {
      if (statusFilter !== "none") {
        setStatusFilter("none");
      }
      return;
    }
    if (statusFilter === "none") {
      setStatusFilter(withdrawalStatusFeatureOptions[0].value);
      return;
    }
    if (statusFilter === "all") {
      if (withdrawalStatusFeatureOptions.length <= 1) {
        setStatusFilter(withdrawalStatusFeatureOptions[0].value);
      }
      return;
    }
    const nextFilter = sanitizeFilterValue(
      statusFilter,
      allowedStatusValues,
      withdrawalStatusFeatureOptions[0].value,
    );
    if (nextFilter !== statusFilter) {
      setStatusFilter(nextFilter);
    }
  }, [
    isManager,
    withdrawalStatusFeatureOptions,
    allowedStatusValues,
    statusFilter,
  ]);

  const filteredRows = useMemo(() => {
    let nextRows: AdminIbWithdrawalRequest[] = withdrawalRows;

    if (isAdmin || !isManager) {
      if (["pending", "approved", "rejected"].includes(statusFilter)) {
        nextRows = withdrawalRows.filter((row) => row.status === statusFilter);
      }
    } else if (
      !withdrawalStatusFeatureOptions.length ||
      statusFilter === "none"
    ) {
      nextRows = [];
    } else if (statusFilter === "all") {
      nextRows = withdrawalRows.filter((row) =>
        allowedStatusesSet.has((row.status || "").toLowerCase()),
      );
    } else {
      const selectedOption = withdrawalStatusFeatureOptions.find(
        (opt) => opt.value === statusFilter,
      );
      const allowedForFilter = new Set(
        (selectedOption?.statuses || []).map((status) => status.toLowerCase()),
      );
      nextRows = withdrawalRows.filter((row) =>
        allowedForFilter.has((row.status || "").toLowerCase()),
      );
    }

    return nextRows;
  }, [
    withdrawalRows,
    statusFilter,
    isAdmin,
    isManager,
    withdrawalStatusFeatureOptions,
    allowedStatusesSet,
  ]);

  const showAllStatusOption =
    isAdmin || !isManager || withdrawalStatusFeatureOptions.length > 1;

  const handleViewDetails = useCallback(
    (request: AdminIbWithdrawalRequest) => {
      if (
        !assertCan(
          canViewStatus(request.status),
          "You do not have permission to view this request",
          toast.error,
        )
      ) {
        return;
      }
      setViewingWithdrawalRequest(request);
      setViewDialogOpen(true);
    },
    [canViewStatus],
  );

  const resetVerifyState = useCallback(() => {
    setAdminNotes("");
    setVerifyDecision("approve");
  }, []);

  const submitAction = async () => {
    if (!token || !viewingWithdrawalRequest) return;
    if (
      !assertCan(
        canTakeWithdrawalAction,
        "You do not have permission to update this withdrawal",
        toast.error,
      )
    ) {
      return;
    }
    if (verifyDecision === "reject" && !adminNotes.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminIbWithdrawalApi.decision(
        viewingWithdrawalRequest.id,
        {
          decision: verifyDecision,
          action: verifyDecision,
          admin_notes: adminNotes.trim() || undefined,
          remarks: adminNotes.trim() || undefined,
        },
        token,
      );

      toast.success(
        res?.message ||
          `IB withdrawal request ${verifyDecision === "approve" ? "approved" : "rejected"} successfully`,
      );

      await loadList();

      setViewDialogOpen(false);
      setViewingWithdrawalRequest(null);
      resetVerifyState();
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "IB withdrawal requests",
          action: "update",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Create IB withdrawal - user search
  const searchCreateUsers = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!token || trimmed.length < 3) {
      setCreateUsers([]);
      return;
    }
    try {
      setCreateSearching(true);
      const res = await adminUsersApi.list({ token, search: trimmed, limit: 10 });
      const list = (res.data as { users?: PendingUser[] })?.users ?? [];
      setCreateUsers(list);
      setCreateShowResults(true);
    } catch {
      setCreateUsers([]);
    } finally {
      setCreateSearching(false);
    }
  }, [token]);

  const handleCreateSearchChange = (value: string) => {
    setCreateSearchQuery(value);
    setCreateSelectedUser(null);
    if (createSearchTimerRef.current !== null) clearTimeout(createSearchTimerRef.current);
    if (value.trim().length >= 3) {
      createSearchTimerRef.current = setTimeout(() => searchCreateUsers(value), 300);
    } else {
      setCreateUsers([]);
      setCreateShowResults(false);
    }
  };

  const handleCreateSelectUser = (user: PendingUser) => {
    setCreateSelectedUser(user);
    setCreateSearchQuery(user.name || user.first_name || user.email || String(user.id));
    setCreateShowResults(false);
    setCreateUsers([]);
  };

  const handleCreateClearUser = () => {
    setCreateSelectedUser(null);
    setCreateSearchQuery("");
    setCreateShowResults(false);
    setCreateUsers([]);
  };

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (createSearchRef.current && !createSearchRef.current.contains(e.target as Node)) {
        setCreateShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset create dialog on close
  useEffect(() => {
    if (!createDialogOpen) {
      setCreateSelectedUser(null);
      setCreateSearchQuery("");
      setCreateUsers([]);
      setCreateShowResults(false);
      setCreateDestination("bank");
      setCreateAmount("");
      setCreateComment("");
      setCreateBankDetailId("");
      setCreateMt5AccountId("");
      setCreateSubmitting(false);
    }
  }, [createDialogOpen]);

  // Fetch MT5 accounts when user is selected and destination is MT5
  useEffect(() => {
    if (!createSelectedUser || createDestination !== "mt5" || !token) {
      setMt5Accounts([]);
      return;
    }
    let cancelled = false;
    setLoadingMt5Accounts(true);
    adminMT5AccountsApi
      .list({ token, user_id: createSelectedUser.id, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const responseData = res.data as Record<string, unknown> | AdminMT5Account[] | undefined;
        let accounts: AdminMT5Account[] = [];
        if (Array.isArray(responseData)) {
          accounts = responseData;
        } else if (responseData && typeof responseData === "object") {
          const obj = responseData as Record<string, unknown>;
          accounts =
            (obj.accounts as AdminMT5Account[]) ??
            (obj.items as AdminMT5Account[]) ??
            (obj.data as AdminMT5Account[]) ??
            (obj.mt5_accounts as AdminMT5Account[]) ??
            [];
        }
        setMt5Accounts(accounts);
      })
      .catch(() => {
        if (!cancelled) setMt5Accounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingMt5Accounts(false);
      });
    return () => { cancelled = true; };
  }, [createSelectedUser, createDestination, token]);

  // Fetch bank details when user is selected and destination is bank
  useEffect(() => {
    if (!createSelectedUser || createDestination !== "bank" || !token) {
      setBankDetails([]);
      return;
    }
    let cancelled = false;
    setLoadingBankDetails(true);
    adminBankDetailsApi
      .list(token, null, 1, 100)
      .then((res) => {
        if (cancelled) return;
        const responseData = res.data;
        const rows = responseData?.rows ?? [];
        const userBanks = rows.filter(
          (b: AdminBankDetailItem) => b.user_id === createSelectedUser?.id,
        );
        setBankDetails(userBanks);
      })
      .catch(() => {
        if (!cancelled) setBankDetails([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBankDetails(false);
      });
    return () => { cancelled = true; };
  }, [createSelectedUser, createDestination, token]);

  const submitCreateAction = async () => {
    if (!token) return;
    if (!createSelectedUser) {
      toast.error("Please select a user");
      return;
    }
    const numAmount = parseFloat(createAmount);
    if (!createAmount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (createDestination === "bank" && !createBankDetailId) {
      toast.error("Please enter a bank detail ID");
      return;
    }
    if (createDestination === "mt5" && !createMt5AccountId) {
      toast.error("Please enter an MT5 account ID");
      return;
    }

    try {
      setCreateSubmitting(true);
      const payload: {
        user_id: number;
        amount: number;
        destination: "bank" | "mt5";
        bank_detail_id?: number;
        mt5_account_id?: string;
        comment?: string;
      } = {
        user_id: createSelectedUser.id,
        amount: numAmount,
        destination: createDestination,
      };

      if (createDestination === "bank") {
        payload.bank_detail_id = parseInt(createBankDetailId, 10);
      } else {
        payload.mt5_account_id = createMt5AccountId;
      }

      if (createComment.trim()) {
        payload.comment = createComment.trim();
      }

      const res = await adminIbWithdrawalApi.create(payload, token);
      toast.success(res?.message || "IB withdrawal created successfully");
      setCreateDialogOpen(false);
      await loadList();
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "IB withdrawal",
          action: "create",
        }),
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    return fmtDateTime(dateString);
  };

  const withdrawalColumns: ColumnDef<AdminIbWithdrawalRequest>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell
            row={row}
            table={table}
            className="font-mono text-sm"
          />
        ),
      },
      {
        id: "user",
        header: "User",
        accessorKey: "user",
        cell: ({ row }) => {
          const userInfo = row.original.user;
          if (!userInfo)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <Link
                href={`/new-users/${userInfo.id ?? ""}`}
                className="font-medium hover:underline"
              >
                {userInfo.first_name || userInfo.last_name
                  ? `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim()
                  : "—"}
              </Link>
              <div className="text-xs text-muted-foreground">
                {userInfo.email}
              </div>
            </div>
          );
        },
      },
      {
        id: "destination",
        header: "Destination",
        accessorKey: "destination",
        cell: ({ row }) => {
          const dest = row.original.destination;
          if (dest === "mt5") {
            return (
              <span className="font-medium">
                MT5 — {row.original.mt5_account?.mt5_login ?? "—"}
              </span>
            );
          }
          return <span className="font-medium">Bank</span>;
        },
      },
      {
        id: "amount",
        header: "Amount (USD)",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {formatAmount(row.original.amount)}
          </span>
        ),
      },
      {
        id: "initiated_by",
        header: "Initiated By",
        accessorKey: "initiated_by",
        cell: ({ row }) => (
          <span className="font-medium capitalize">
            {row.original.initiated_by || "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "processed_by",
        accessorKey: "processed_by",
        header: "Processed By",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-normal">
              {row.original.approved_by || "-"}{" "}
            </div>
            <div className="font-normal">
              {formatDateTime(row.original.approved_at)}{" "}
            </div>
          </div>
        ),
      },
      {
        id: "admin_notes",
        header: "Admin Note",
        accessorKey: "admin_notes",
        cell: ({ row }) => (
          <span className="font-normal">
            {row.original.admin_notes || "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const request = row.original;

          return (
            <Button
              variant="ghost"
              size="icon"
              aria-label="View Details"
              onClick={() => handleViewDetails(request)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [handleViewDetails],
  );

  if (!canViewWithdrawals) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          You do not have permission to view IB withdrawal requests.
        </p>
      </div>
    );
  }

  if (loading && withdrawalRows.length === 0) {
    return (
      <ListPageSkeleton
        actionCount={1}
        columnCount={6}
        rowCount={10}
        filterPillCount={4}
      />
    );
  }

  if (loadError && withdrawalRows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="IB withdrawal requests"
          action="load"
          onRetry={() => {
            void loadList();
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <TrendingDown className="h-6 w-6 text-primary" />
            IB Withdrawal List
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and review all IB withdrawal requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create IB Withdrawal
          </Button>
          <Button variant="outline" onClick={loadList} disabled={loading}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ApiSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(value) => {
              void setSearch(value || null);
            }}
            placeholder="Search by user, email, amount, or wallet"
            minimumLength={3}
            delay={300}
          />

          {(!isManager || withdrawalStatusFeatureOptions.length > 0) && (
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Filter by Status:
              </label>
              <Select
                value={statusFilter === "none" ? undefined : statusFilter}
                onValueChange={setStatusFilter}
                disabled={isManager && !withdrawalStatusFeatureOptions.length}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {showAllStatusOption && (
                    <SelectItem value="all">All</SelectItem>
                  )}
                  {withdrawalStatusFeatureOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label
              htmlFor="destination-filter"
              className="text-sm font-medium"
            >
              Filter by Destination:
            </label>
            <Select
              value={destinationFilter === "all" ? undefined : destinationFilter}
              onValueChange={(v) => setDestinationFilter(v || "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {IB_WITHDRAWAL_DESTINATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <AppDataTable<AdminIbWithdrawalRequest>
          data={filteredRows}
          columns={withdrawalColumns}
          pageCount={totalPages}
        />
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(o) => {
          setViewDialogOpen(o);
          if (!o) {
            setViewingWithdrawalRequest(null);
            resetVerifyState();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>IB Withdrawal Request Details</DialogTitle>
            <DialogDescription>
              View complete details of the IB withdrawal request
            </DialogDescription>
          </DialogHeader>

          {viewingWithdrawalRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Request Information
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      {statusBadge(
                        viewingWithdrawalRequest.status || "pending",
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-medium">
                        {formatAmount(viewingWithdrawalRequest.amount || "0")}{" "}
                        USD
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Destination:{" "}
                      </span>
                      <span className="font-medium">
                        {viewingWithdrawalRequest.destination === "mt5"
                          ? `MT5 — ${viewingWithdrawalRequest.mt5_account?.mt5_login ?? "—"}`
                          : "Bank"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Initiated By:{" "}
                      </span>
                      <span className="font-medium capitalize">
                        {viewingWithdrawalRequest.initiated_by || "—"}
                      </span>
                    </div>
                    {viewingWithdrawalRequest.note && (
                      <div>
                        <span className="text-muted-foreground">Note: </span>
                        <span className="font-medium">
                          {viewingWithdrawalRequest.note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    User Information
                  </p>
                  <div className="space-y-2 text-sm">
                    {viewingWithdrawalRequest.user ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">
                            {viewingWithdrawalRequest.user.first_name ||
                            viewingWithdrawalRequest.user.last_name
                              ? `${viewingWithdrawalRequest.user.first_name || ""} ${viewingWithdrawalRequest.user.last_name || ""}`.trim()
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium">
                            {viewingWithdrawalRequest.user.email}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        No user information available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Payment Information
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Destination:{" "}
                    </span>
                    <span className="font-medium capitalize">
                      {viewingWithdrawalRequest.destination}
                    </span>
                  </div>
                  {viewingWithdrawalRequest.destination === "bank" &&
                  viewingWithdrawalRequest.bank_detail ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">
                          Account Holder:{" "}
                        </span>
                        <span className="font-medium">
                          {
                            viewingWithdrawalRequest.bank_detail
                              .account_holder_name
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Account Number:{" "}
                        </span>
                        <span className="font-medium font-mono">
                          {viewingWithdrawalRequest.bank_detail.account_number}
                        </span>
                      </div>
                      {viewingWithdrawalRequest.bank_detail.iban_number && (
                        <div>
                          <span className="text-muted-foreground">IBAN: </span>
                          <span className="font-medium font-mono text-xs">
                            {viewingWithdrawalRequest.bank_detail.iban_number}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">
                          Bank Name:{" "}
                        </span>
                        <span className="font-medium">
                          {viewingWithdrawalRequest.bank_detail.bank_name}
                        </span>
                      </div>
                      {viewingWithdrawalRequest.bank_detail.swift_ifsc_code && (
                        <div>
                          <span className="text-muted-foreground">
                            SWIFT/IFSC:{" "}
                          </span>
                          <span className="font-medium">
                            {
                              viewingWithdrawalRequest.bank_detail
                                .swift_ifsc_code
                            }
                          </span>
                        </div>
                      )}
                      {viewingWithdrawalRequest.bank_detail.address && (
                        <div>
                          <span className="text-muted-foreground">
                            Address:{" "}
                          </span>
                          <span className="font-medium">
                            {viewingWithdrawalRequest.bank_detail.address}
                          </span>
                        </div>
                      )}
                      {viewingWithdrawalRequest.bank_detail.country && (
                        <div>
                          <span className="text-muted-foreground">
                            Country:{" "}
                          </span>
                          <span className="font-medium">
                            {viewingWithdrawalRequest.bank_detail.country}
                          </span>
                        </div>
                      )}
                    </>
                  ) : viewingWithdrawalRequest.destination === "mt5" &&
                    viewingWithdrawalRequest.mt5_account ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">
                          MT5 Account ID:{" "}
                        </span>
                        <span className="font-medium font-mono">
                          {viewingWithdrawalRequest.mt5_account.account_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          MT5 Login:{" "}
                        </span>
                        <span className="font-medium">
                          {viewingWithdrawalRequest.mt5_account.mt5_login}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">
                      No payment details available
                    </span>
                  )}
                </div>
              </div>

              {(viewingWithdrawalRequest.admin_notes ||
                viewingWithdrawalRequest.approved_by ||
                viewingWithdrawalRequest.approved_at) && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Admin Information
                  </p>
                  <div className="space-y-2 text-sm">
                    {viewingWithdrawalRequest.admin_notes && (
                      <div>
                        <span className="text-muted-foreground">
                          Admin Notes:{" "}
                        </span>
                        <div className="mt-1 p-2 bg-muted rounded-md">
                          {viewingWithdrawalRequest.admin_notes}
                        </div>
                      </div>
                    )}
                    {viewingWithdrawalRequest.approved_by && (
                      <div>
                        <span className="text-muted-foreground">
                          Approved By:{" "}
                        </span>
                        <span className="font-medium">
                          {viewingWithdrawalRequest.approved_by}
                        </span>
                      </div>
                    )}
                    {viewingWithdrawalRequest.approved_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Approved At:{" "}
                        </span>
                        <span>
                          {fmtDateTime(viewingWithdrawalRequest.approved_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground mb-2">Timestamps</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created: </span>
                    <span>
                      {fmtDateTime(viewingWithdrawalRequest.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {(() => {
                const isPending = viewingWithdrawalRequest.status === "pending";
                const isApproved =
                  viewingWithdrawalRequest.status === "approved";
                const canVerify =
                  canTakeWithdrawalAction &&
                  isPending &&
                  canViewStatus("pending");
                const canRejectApproved =
                  canTakeWithdrawalAction &&
                  isApproved &&
                  canViewStatus("approved");

                if (!canVerify && !canRejectApproved) return null;

                return (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {viewingWithdrawalRequest.status === "approved" && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">
                                One-time Reversal
                              </p>
                              <p className="text-xs mt-1">
                                This withdrawal was already approved. You can
                                reject it once in case of accidental approval.
                                This action cannot be undone.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          {viewingWithdrawalRequest.status === "approved"
                            ? "Reversal Decision"
                            : "Verification Decision"}
                        </Label>
                        <Tabs
                          value={verifyDecision}
                          onValueChange={(value) => {
                            if (value === "approve" || value === "reject") {
                              setVerifyDecision(value);
                            }
                          }}
                          className="w-full"
                        >
                          <TabsList
                            className={`grid h-auto w-full ${viewingWithdrawalRequest.status === "approved" ? "grid-cols-1" : "grid-cols-2"} rounded-2xl bg-muted/50 p-1`}
                          >
                            {viewingWithdrawalRequest.status !== "approved" && (
                              <TabsTrigger
                                value="approve"
                                className="rounded-xl"
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                              </TabsTrigger>
                            )}
                            <TabsTrigger
                              value="reject"
                              className="rounded-xl"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {viewingWithdrawalRequest.status === "approved"
                                ? "Reject (Reverse Approval)"
                                : "Reject"}
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="admin-notes"
                          className="text-sm font-semibold"
                        >
                          Admin Notes{" "}
                          {verifyDecision === "reject" && (
                            <span className="text-destructive">*</span>
                          )}
                        </Label>
                        <Textarea
                          id="admin-notes"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder={
                            verifyDecision === "reject"
                              ? viewingWithdrawalRequest.status === "approved"
                                ? "Please provide a detailed reason for reversing this approval..."
                                : "Please provide a reason for rejection..."
                              : "Optional notes about this verification..."
                          }
                          className="min-h-[100px]"
                        />
                        {verifyDecision === "reject" && (
                          <p className="text-xs text-muted-foreground">
                            {viewingWithdrawalRequest.status === "approved"
                              ? "Reversal reason is required and will be logged"
                              : "Rejection reason is required"}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            {viewingWithdrawalRequest &&
              canTakeWithdrawalAction &&
              ((viewingWithdrawalRequest.status === "pending" &&
                canViewStatus("pending")) ||
                (viewingWithdrawalRequest.status === "approved" &&
                  canViewStatus("approved"))) && (
                <Button
                  type="button"
                  onClick={submitAction}
                  disabled={
                    submitting ||
                    (verifyDecision === "reject" && !adminNotes.trim())
                  }
                  className={`w-full sm:w-auto ${
                    verifyDecision === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Processing...
                    </>
                  ) : verifyDecision === "approve" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      {viewingWithdrawalRequest.status === "approved"
                        ? "Reject (Reverse)"
                        : "Reject"}
                    </>
                  )}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create IB Withdrawal Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create IB Withdrawal</DialogTitle>
            <DialogDescription>
              Initiate a new IB withdrawal request for a user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="create-user-search">User *</Label>
              <div className="relative" ref={createSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="create-user-search"
                    placeholder="Search by name or email..."
                    value={createSearchQuery}
                    onChange={(e) => handleCreateSearchChange(e.target.value)}
                    className="pl-10"
                    disabled={!!createSelectedUser}
                  />
                  {createSelectedUser && (
                    <button
                      type="button"
                      onClick={handleCreateClearUser}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {createSearching && (
                    <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                      <Spinner className="h-4 w-4" />
                    </div>
                  )}
                </div>
                {createShowResults && createUsers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                    {createUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-muted flex flex-col"
                        onClick={() => handleCreateSelectUser(user)}
                      >
                        <span className="font-medium">
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {createShowResults && createUsers.length === 0 && !createSearching && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg p-4 text-center text-muted-foreground">
                    No users found
                  </div>
                )}
              </div>
              {createSelectedUser && (
                <div className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{createSelectedUser.email}</span>
                </div>
              )}
            </div>

            {/* Destination */}
            <div className="space-y-2">
              <Label>Destination *</Label>
              <Select
                value={createDestination}
                onValueChange={(v) => {
                  setCreateDestination(v as "bank" | "mt5");
                  setCreateBankDetailId("");
                  setCreateMt5AccountId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="mt5">MT5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Detail ID or MT5 Account ID */}
            {createDestination === "bank" ? (
              <div className="space-y-2">
                <Label>Bank Detail *</Label>
                <Select
                  value={createBankDetailId}
                  onValueChange={setCreateBankDetailId}
                  disabled={!createSelectedUser || loadingBankDetails}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingBankDetails
                          ? "Loading bank details..."
                          : !createSelectedUser
                            ? "Select a user first"
                            : "Select bank detail"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {bankDetails.length === 0 && !loadingBankDetails && (
                      <SelectItem value="__none" disabled>
                        No bank details found
                      </SelectItem>
                    )}
                    {bankDetails.map((bank) => (
                      <SelectItem key={bank.id} value={String(bank.id)}>
                        {bank.bank_name} — {bank.account_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bankDetails.length === 0 && !loadingBankDetails && createSelectedUser && (
                  <p className="text-xs text-muted-foreground">
                    No bank details found for this user
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>MT5 Account *</Label>
                <Select
                  value={createMt5AccountId}
                  onValueChange={setCreateMt5AccountId}
                  disabled={!createSelectedUser || loadingMt5Accounts}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingMt5Accounts
                          ? "Loading MT5 accounts..."
                          : !createSelectedUser
                            ? "Select a user first"
                            : "Select MT5 account"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {mt5Accounts.length === 0 && !loadingMt5Accounts && (
                      <SelectItem value="__none" disabled>
                        No MT5 accounts found
                      </SelectItem>
                    )}
                    {mt5Accounts.map((account) => (
                      <SelectItem
                        key={account.id ?? account.account_id}
                        value={String(account.account_id ?? account.id ?? account.mt5_id)}
                      >
                        {account.account_id ?? account.mt5_id} — {account.name || account.first_name || "Account"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mt5Accounts.length === 0 && !loadingMt5Accounts && createSelectedUser && (
                  <p className="text-xs text-muted-foreground">
                    No MT5 accounts found for this user
                  </p>
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="create-amount">Amount (USD) *</Label>
              <Input
                id="create-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
              />
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="create-comment">Comment</Label>
              <Textarea
                id="create-comment"
                placeholder="Optional comment for this withdrawal"
                value={createComment}
                onChange={(e) => setCreateComment(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={createSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitCreateAction}
              disabled={createSubmitting || !createSelectedUser}
              className="w-full sm:w-auto"
            >
              {createSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Withdrawal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
