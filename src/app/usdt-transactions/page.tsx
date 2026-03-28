"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CheckCircle2, XCircle, Eye, Calendar, FileImage, RefreshCw } from "lucide-react";

import {
  adminUSDTDepositApi,
  adminWithdrawalApi,
  API_BASE_URL,
  depositProofUrl,
  type AdminUSDTDepositRequest,
  type AdminWithdrawalRequest,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

type TransactionStatusOption = {
  value: string;
  label: string;
  featureKey: string;
  statuses: string[];
};

const DEPOSIT_STATUS_OPTIONS: TransactionStatusOption[] = [
  { value: "pending", label: "Pending", featureKey: "pendingDepositList", statuses: ["pending"] },
  { value: "approved", label: "Approved", featureKey: "approveDepositList", statuses: ["approved"] },
  { value: "rejected", label: "Rejected", featureKey: "rejectDepositList", statuses: ["rejected"] },
];

const WITHDRAWAL_STATUS_OPTIONS: TransactionStatusOption[] = [
  { value: "pending", label: "Pending", featureKey: "pendingWithdrawalList", statuses: ["pending"] },
  { value: "approved", label: "Approved", featureKey: "approveWithdrawalList", statuses: ["approved"] },
  { value: "rejected", label: "Rejected", featureKey: "rejectWithdrawalList", statuses: ["rejected"] },
];

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const formatAmount = (amount: string) => {
  try {
    const num = parseFloat(amount);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  } catch {
    return amount;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          Pending
        </Badge>
      );
  }
};

/* ---------------- Page ---------------- */
export default function USDTTransactionsPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const user = authCtx?.user || null;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const { isAdmin, isManager, hasFeature, filterFeatureOptions } = useManagerPermissions();

  const [activeTab, setActiveTab] = useState<"deposits" | "withdrawals">("deposits");

  const depositStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", DEPOSIT_STATUS_OPTIONS),
    [filterFeatureOptions]
  );

  const withdrawalStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", WITHDRAWAL_STATUS_OPTIONS),
    [filterFeatureOptions]
  );

  const statusFeatureOptions = useMemo(
    () => activeTab === "deposits" ? depositStatusFeatureOptions : withdrawalStatusFeatureOptions,
    [activeTab, depositStatusFeatureOptions, withdrawalStatusFeatureOptions]
  );

  const allowedStatusValues = useMemo(
    () => statusFeatureOptions.map((opt) => opt.value),
    [statusFeatureOptions]
  );

  const allowedStatusesSet = useMemo(() => {
    const set = new Set<string>();
    statusFeatureOptions.forEach((opt) => {
      opt.statuses.forEach((status) => set.add(status.toLowerCase()));
    });
    return set;
  }, [statusFeatureOptions]);

  const canTakeAction = useMemo(
    () => hasFeature("transaction", "approveRejectDeposit"),
    [hasFeature]
  );

  const canViewStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedStatusesSet]
  );

  const [depositRows, setDepositRows] = useState<AdminUSDTDepositRequest[]>([]);
  const [withdrawalRows, setWithdrawalRows] = useState<AdminWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const rows = useMemo(
    () => activeTab === "deposits" ? depositRows : withdrawalRows,
    [activeTab, depositRows, withdrawalRows]
  );

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedDepositRequest, setSelectedDepositRequest] = useState<AdminUSDTDepositRequest | null>(null);
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState<AdminWithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDepositRequest, setViewingDepositRequest] = useState<AdminUSDTDepositRequest | null>(null);
  const [viewingWithdrawalRequest, setViewingWithdrawalRequest] = useState<AdminWithdrawalRequest | null>(null);

  const loadDeposits = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminUSDTDepositApi.listAll(page, perPage, token);
      const requests = res?.data?.requests ?? [];
      setDepositRows(requests);
      
      // Update pagination if available
      if (res?.data?.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load deposit requests";
      toast.error(errorMessage);
      setDepositRows([]);
    }
  }, [token, page, perPage]);

  const loadWithdrawals = useCallback(async () => {
    if (!token) return;
    try {
      const status = statusFilter !== "all" ? statusFilter : undefined;
      const res = await adminWithdrawalApi.listAll(page, perPage, token, status) as {
        data?: unknown[] | { withdrawals?: unknown[]; data?: unknown[]; requests?: unknown[]; pagination?: { totalPages?: number; total_pages?: number } };
        meta?: { total?: number; limit?: number };
        pagination?: { totalPages?: number; total_pages?: number };
        withdrawals?: unknown[];
        requests?: unknown[];
      };
      // Handle different response structures:
      // 1. {success: true, data: [...], meta: {...}} - data is array directly
      // 2. {success: true, data: {withdrawals: [...], pagination: {...}}} - nested structure
      let withdrawals: AdminWithdrawalRequest[] = [];
      if (Array.isArray(res?.data)) {
        withdrawals = res.data as AdminWithdrawalRequest[];
      } else if (res?.data && typeof res.data === 'object') {
        withdrawals = (res.data.withdrawals ?? res.data.data ?? res.data.requests ?? []) as AdminWithdrawalRequest[];
      } else {
        withdrawals = (res?.withdrawals ?? res?.requests ?? []) as AdminWithdrawalRequest[];
      }
      setWithdrawalRows(withdrawals);
      
      // Update pagination if available - check both meta and data.pagination
      if (res?.meta) {
        const total = res.meta.total || 0;
        const limit = res.meta.limit || perPage;
        setTotalPages(Math.ceil(total / limit) || 1);
      } else if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || res.data.pagination.total_pages || 1);
      } else if (res?.pagination) {
        setTotalPages(res.pagination.totalPages || res.pagination.total_pages || 1);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load withdrawal requests";
      toast.error(errorMessage);
      setWithdrawalRows([]);
    }
  }, [token, page, perPage, statusFilter]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeTab === "deposits") {
        await loadDeposits();
      } else {
        await loadWithdrawals();
      }
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, loadDeposits, loadWithdrawals]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!isManager) return;
    if (!statusFeatureOptions.length) {
      if (statusFilter !== "none") {
        setStatusFilter("none");
      }
      return;
    }
    if (statusFilter === "none") {
      setStatusFilter(statusFeatureOptions[0].value);
      return;
    }
    if (statusFilter === "all") {
      if (statusFeatureOptions.length <= 1) {
        setStatusFilter(statusFeatureOptions[0].value);
      }
      return;
    }
    if (!allowedStatusValues.includes(statusFilter)) {
      setStatusFilter(statusFeatureOptions[0].value);
    }
  }, [isManager, statusFeatureOptions, allowedStatusValues, statusFilter]);

  const filteredRows = useMemo(() => {
    if (isAdmin || !isManager) {
      if (statusFilter === "all") return rows;
      if (["pending", "approved", "rejected"].includes(statusFilter)) {
        return rows.filter((row) => row.status === statusFilter);
      }
      return rows;
    }
    if (!statusFeatureOptions.length || statusFilter === "none") {
      return [];
    }
    if (statusFilter === "all") {
      return rows.filter((row) => allowedStatusesSet.has((row.status || "").toLowerCase()));
    }
    const selectedOption = statusFeatureOptions.find((opt) => opt.value === statusFilter);
    const allowedForFilter = new Set(
      (selectedOption?.statuses || []).map((status) => status.toLowerCase())
    );
    return rows.filter((row) => allowedForFilter.has((row.status || "").toLowerCase()));
  }, [rows, statusFilter, isAdmin, isManager, statusFeatureOptions, allowedStatusesSet]);

  const showAllStatusOption = isAdmin || !isManager || statusFeatureOptions.length > 1;
  const statusSelectDisabled = isManager && !statusFeatureOptions.length;

  const handleApprove = useCallback(
    (request: AdminUSDTDepositRequest | AdminWithdrawalRequest) => {
      if (!canTakeAction) {
        toast.error(`You do not have permission to approve ${activeTab}`);
        return;
      }
      if (activeTab === "deposits") {
        setSelectedDepositRequest(request as AdminUSDTDepositRequest);
      } else {
        setSelectedWithdrawalRequest(request as AdminWithdrawalRequest);
      }
      setActionType("approve");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeAction, activeTab]
  );

  const handleReject = useCallback(
    (request: AdminUSDTDepositRequest | AdminWithdrawalRequest) => {
      if (!canTakeAction) {
        toast.error(`You do not have permission to reject ${activeTab}`);
        return;
      }
      if (activeTab === "deposits") {
        setSelectedDepositRequest(request as AdminUSDTDepositRequest);
      } else {
        setSelectedWithdrawalRequest(request as AdminWithdrawalRequest);
      }
      setActionType("reject");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeAction, activeTab]
  );

  const handleViewDetails = useCallback(
    (request: AdminUSDTDepositRequest | AdminWithdrawalRequest) => {
      if (!canViewStatus(request.status)) {
        toast.error("You do not have permission to view this request");
        return;
      }
      if (activeTab === "deposits") {
        setViewingDepositRequest(request as AdminUSDTDepositRequest);
      } else {
        setViewingWithdrawalRequest(request as AdminWithdrawalRequest);
      }
      setViewDialogOpen(true);
    },
    [canViewStatus, activeTab]
  );

  const submitAction = async () => {
    if (!token || !actionType) return;
    if (activeTab === "deposits" && !selectedDepositRequest) return;
    if (activeTab === "withdrawals" && !selectedWithdrawalRequest) return;

    try {
      setSubmitting(true);
      let res;
      
      if (activeTab === "deposits" && selectedDepositRequest) {
        res = await adminUSDTDepositApi.verify(
          {
            request_id: selectedDepositRequest.id,
            action: actionType,
            admin_notes: adminNotes.trim() || undefined,
          },
          token
        );
      } else if (activeTab === "withdrawals" && selectedWithdrawalRequest) {
        res = await adminWithdrawalApi.decision(
          selectedWithdrawalRequest.id,
          {
            action: actionType,
            remarks: adminNotes.trim() || undefined,
          },
          token
        );
      }

      toast.success(
        res?.message ||
          `${activeTab === "deposits" ? "Deposit" : "Withdrawal"} request ${actionType === "approve" ? "approved" : "rejected"} successfully`
      );

      await loadList();

      setActionDialogOpen(false);
      setSelectedDepositRequest(null);
      setSelectedWithdrawalRequest(null);
      setActionType(null);
      setAdminNotes("");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : `Failed to ${actionType === "approve" ? "approve" : "reject"} ${activeTab === "deposits" ? "deposit" : "withdrawal"} request`;
      toast.error(errorMessage);
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const depositColumns: ColumnDef<AdminUSDTDepositRequest>[] = useMemo(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
      },
      {
        id: "user",
        header: "User",
        accessorKey: "user",
        cell: ({ row }) => {
          const userInfo = row.original.user;
          if (!userInfo) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">
                {userInfo.first_name || userInfo.last_name
                  ? `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim()
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{userInfo.email}</div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount (USDT)",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium">{formatAmount(row.original.amount)}</span>
        ),
      },
      {
        id: "transaction_hash",
        header: "Transaction Hash",
        accessorKey: "transaction_hash",
        cell: ({ row }) => {
          const hash = row.original.transaction_hash;
          if (!hash) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="font-mono text-xs max-w-[200px] truncate block" title={hash}>
              {hash}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
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
          const isPending = request.status === "pending";
          const canActOnRequest = canTakeAction && isPending && canViewStatus("pending");

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="View Details"
                onClick={() => handleViewDetails(request)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canActOnRequest && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Approve"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(request)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reject"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(request)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [handleViewDetails, handleApprove, handleReject, canTakeAction, canViewStatus]
  );

  const withdrawalColumns: ColumnDef<AdminWithdrawalRequest>[] = useMemo(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.id}</span>,
      },
      {
        id: "user",
        header: "User",
        accessorKey: "user",
        cell: ({ row }) => {
          const userInfo = row.original.user;
          if (!userInfo) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">
                {userInfo.first_name || userInfo.last_name
                  ? `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim()
                  : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{userInfo.email}</div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount (USDT)",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium">{formatAmount(row.original.amount)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
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
          const isPending = request.status === "pending";
          const canActOnRequest = canTakeAction && isPending && canViewStatus("pending");

          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="View Details"
                onClick={() => handleViewDetails(request)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              {canActOnRequest && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Approve"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleApprove(request)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reject"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(request)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [handleViewDetails, handleApprove, handleReject, canTakeAction, canViewStatus]
  );

  const columns = useMemo(
    () => activeTab === "deposits" ? depositColumns : withdrawalColumns,
    [activeTab, depositColumns, withdrawalColumns]
  );

  if (!isAdmin && isManager && !statusFeatureOptions.length) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
            You do not have permission to view USDT deposit transactions.
          </p>
        </div>
      </MainLayout>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner className="h-8 w-8" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">USDT Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Manage and review USDT deposit and withdrawal requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadList} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "deposits" | "withdrawals")} className="space-y-6">
          <TabsList>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              {/* Status Filter */}
              {(!isManager || depositStatusFeatureOptions.length > 0) && (
                <div className="mb-4 flex items-center gap-2">
                  <label htmlFor="status-filter" className="text-sm font-medium">
                    Filter by Status:
                  </label>
                  <Select
                    value={statusFilter === "none" ? undefined : statusFilter}
                    onValueChange={setStatusFilter}
                    disabled={isManager && !depositStatusFeatureOptions.length}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(isAdmin || !isManager || depositStatusFeatureOptions.length > 1) && (
                        <SelectItem value="all">All</SelectItem>
                      )}
                      {depositStatusFeatureOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <AppDataTable<AdminUSDTDepositRequest>
                data={activeTab === "deposits" ? (filteredRows as AdminUSDTDepositRequest[]) : []}
                columns={depositColumns}
                pageCount={totalPages}
              />
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-6">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              {/* Status Filter */}
              {(!isManager || withdrawalStatusFeatureOptions.length > 0) && (
                <div className="mb-4 flex items-center gap-2">
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
                      {(isAdmin || !isManager || withdrawalStatusFeatureOptions.length > 1) && (
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

              <AppDataTable<AdminWithdrawalRequest>
                data={activeTab === "withdrawals" ? (filteredRows as AdminWithdrawalRequest[]) : []}
                columns={withdrawalColumns}
                pageCount={totalPages}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Dialog (Approve/Reject) */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : "Reject"} {activeTab === "deposits" ? "Deposit" : "Withdrawal"} Request
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Approve this ${activeTab === "deposits" ? "deposit" : "withdrawal"} request. You can add optional notes.`
                  : `Reject this ${activeTab === "deposits" ? "deposit" : "withdrawal"} request. Please provide a reason for rejection.`}
              </DialogDescription>
            </DialogHeader>

            {((activeTab === "deposits" && selectedDepositRequest) || (activeTab === "withdrawals" && selectedWithdrawalRequest)) && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Request ID:</span>
                      <div className="font-medium">
                        {activeTab === "deposits" ? selectedDepositRequest?.id : selectedWithdrawalRequest?.id}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">
                        {formatAmount(
                          activeTab === "deposits" 
                            ? selectedDepositRequest?.amount || "0" 
                            : selectedWithdrawalRequest?.amount || "0"
                        )} USDT
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User:</span>
                      <div className="font-medium">
                        {activeTab === "deposits" 
                          ? (selectedDepositRequest?.user
                              ? `${selectedDepositRequest.user.first_name || ""} ${selectedDepositRequest.user.last_name || ""}`.trim() ||
                                selectedDepositRequest.user.email
                              : "—")
                          : (selectedWithdrawalRequest?.user
                              ? `${selectedWithdrawalRequest.user.first_name || ""} ${selectedWithdrawalRequest.user.last_name || ""}`.trim() ||
                                selectedWithdrawalRequest.user.email
                              : "—")}
                      </div>
                    </div>
                    {activeTab === "deposits" && selectedDepositRequest && (
                      <div>
                        <span className="text-muted-foreground">Transaction Hash:</span>
                        <div className="font-mono text-xs truncate">
                          {selectedDepositRequest.transaction_hash || "—"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-notes" className="text-sm font-medium">
                    {activeTab === "deposits" ? "Admin Notes" : "Remarks"} {actionType === "reject" && "(Recommended)"}
                  </label>
                  <Textarea
                    id="admin-notes"
                    rows={4}
                    placeholder={
                      actionType === "approve"
                        ? `Add optional ${activeTab === "deposits" ? "notes" : "remarks"} (e.g., ${activeTab === "deposits" ? "Looks valid." : "Approved."})`
                        : `Add reason for rejection (e.g., ${activeTab === "deposits" ? "Invalid proof." : "Insufficient balance."})`
                    }
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setActionDialogOpen(false);
                  setSelectedDepositRequest(null);
                  setSelectedWithdrawalRequest(null);
                  setActionType(null);
                  setAdminNotes("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={submitAction}
                disabled={submitting}
                variant={actionType === "reject" ? "destructive" : "default"}
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  `${actionType === "approve" ? "Approve" : "Reject"} Request`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{activeTab === "deposits" ? "Deposit" : "Withdrawal"} Request Details</DialogTitle>
              <DialogDescription>View complete details of the {activeTab === "deposits" ? "deposit" : "withdrawal"} request</DialogDescription>
            </DialogHeader>

            {((activeTab === "deposits" && viewingDepositRequest) || (activeTab === "withdrawals" && viewingWithdrawalRequest)) && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Request Information</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID: </span>
                        <span className="font-medium">
                          {activeTab === "deposits" ? viewingDepositRequest?.id : viewingWithdrawalRequest?.id}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        {statusBadge(
                          activeTab === "deposits" 
                            ? viewingDepositRequest?.status || "pending"
                            : viewingWithdrawalRequest?.status || "pending"
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-medium">
                          {formatAmount(
                            activeTab === "deposits"
                              ? viewingDepositRequest?.amount || "0"
                              : viewingWithdrawalRequest?.amount || "0"
                          )} USDT
                        </span>
                      </div>
                      {activeTab === "deposits" && viewingDepositRequest && (
                        <div>
                          <span className="text-muted-foreground">Transaction Hash: </span>
                          <div className="font-mono text-xs break-all">
                            {viewingDepositRequest.transaction_hash || "—"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">User Information</p>
                    <div className="space-y-2 text-sm">
                      {((activeTab === "deposits" && viewingDepositRequest?.user) || 
                        (activeTab === "withdrawals" && viewingWithdrawalRequest?.user)) ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">
                              {activeTab === "deposits"
                                ? (viewingDepositRequest?.user?.first_name || viewingDepositRequest?.user?.last_name
                                    ? `${viewingDepositRequest.user.first_name || ""} ${viewingDepositRequest.user.last_name || ""}`.trim()
                                    : "—")
                                : (viewingWithdrawalRequest?.user?.first_name || viewingWithdrawalRequest?.user?.last_name
                                    ? `${viewingWithdrawalRequest.user.first_name || ""} ${viewingWithdrawalRequest.user.last_name || ""}`.trim()
                                    : "—")}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span className="font-medium">
                              {activeTab === "deposits"
                                ? viewingDepositRequest?.user?.email
                                : viewingWithdrawalRequest?.user?.email}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User ID: </span>
                            <span className="font-medium">
                              {activeTab === "deposits"
                                ? viewingDepositRequest?.user?.id
                                : viewingWithdrawalRequest?.user?.id}
                            </span>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No user information available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Proof - Only for deposits */}
                {activeTab === "deposits" && viewingDepositRequest?.payment_proof_url && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Payment Proof
                    </p>
                    <div className="rounded-md border bg-background p-4 flex items-center justify-center">
                      <img
                        src={depositProofUrl(viewingDepositRequest.payment_proof_url)}
                        alt="Payment proof"
                        className="max-h-96 w-auto object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Admin Notes/Remarks & Approval Info */}
                {((activeTab === "deposits" && (viewingDepositRequest?.admin_notes || viewingDepositRequest?.approved_by || viewingDepositRequest?.approved_at)) ||
                  (activeTab === "withdrawals" && (viewingWithdrawalRequest?.remarks || viewingWithdrawalRequest?.approved_by || viewingWithdrawalRequest?.approved_at))) && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Admin Information</p>
                    <div className="space-y-2 text-sm">
                      {activeTab === "deposits" && viewingDepositRequest?.admin_notes && (
                        <div>
                          <span className="text-muted-foreground">Admin Notes: </span>
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            {viewingDepositRequest.admin_notes}
                          </div>
                        </div>
                      )}
                      {activeTab === "withdrawals" && viewingWithdrawalRequest?.remarks && (
                        <div>
                          <span className="text-muted-foreground">Remarks: </span>
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            {viewingWithdrawalRequest.remarks}
                          </div>
                        </div>
                      )}
                      {((activeTab === "deposits" && viewingDepositRequest?.approved_by) ||
                        (activeTab === "withdrawals" && viewingWithdrawalRequest?.approved_by)) && (
                        <div>
                          <span className="text-muted-foreground">Approved By: </span>
                          <span className="font-mono text-xs">
                            {activeTab === "deposits"
                              ? viewingDepositRequest?.approved_by
                              : viewingWithdrawalRequest?.approved_by}
                          </span>
                        </div>
                      )}
                      {((activeTab === "deposits" && viewingDepositRequest?.approved_at) ||
                        (activeTab === "withdrawals" && viewingWithdrawalRequest?.approved_at)) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Approved At: </span>
                          <span>
                            {fmtDateTime(
                              activeTab === "deposits"
                                ? viewingDepositRequest?.approved_at
                                : viewingWithdrawalRequest?.approved_at
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">Timestamps</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created: </span>
                      <span>
                        {fmtDateTime(
                          activeTab === "deposits"
                            ? viewingDepositRequest?.created_at
                            : viewingWithdrawalRequest?.created_at
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated: </span>
                      <span>
                        {fmtDateTime(
                          activeTab === "deposits"
                            ? viewingDepositRequest?.updated_at
                            : viewingWithdrawalRequest?.updated_at
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

