"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
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

import { CheckCircle2, XCircle, Eye, Calendar, RefreshCw, TrendingDown } from "lucide-react";

import {
  adminWithdrawalApi,
  type AdminWithdrawalRequest,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  assertCan,
  sanitizeFilterValue,
  useModuleCapabilities,
} from "@/hooks/use-permission-capabilities";
import {
  WITHDRAWAL_STATUS_OPTIONS,
  fmtDateTime,
  formatAmount,
  statusBadge,
} from "../_lib/transaction-format";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

/* ---------------- Page ---------------- */
export function WithdrawalRequestsPageContent() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const { filterFeatureOptions } = useManagerPermissions();
  const { isAdmin, isManager, can } = useModuleCapabilities("transaction");

  const withdrawalStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", WITHDRAWAL_STATUS_OPTIONS),
    [filterFeatureOptions]
  );

  const allowedStatusValues = useMemo(
    () => withdrawalStatusFeatureOptions.map((opt) => opt.value),
    [withdrawalStatusFeatureOptions]
  );

  const allowedStatusesSet = useMemo(() => {
    const set = new Set<string>();
    withdrawalStatusFeatureOptions.forEach((opt) => {
      opt.statuses.forEach((status) => set.add(status.toLowerCase()));
    });
    return set;
  }, [withdrawalStatusFeatureOptions]);

  const canTakeWithdrawalAction = can("approveWithdrawal");
  const canViewWithdrawals = can("viewWithdrawals");

  const canViewStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedStatusesSet]
  );

  const [withdrawalRows, setWithdrawalRows] = useState<AdminWithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] = useState<AdminWithdrawalRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingWithdrawalRequest, setViewingWithdrawalRequest] = useState<AdminWithdrawalRequest | null>(null);

  const loadWithdrawals = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      const status =
        statusFilter !== "all" && statusFilter !== "none" ? statusFilter : undefined;
      const searchTerm = search && search.length >= 3 ? search : undefined;
      const res = await adminWithdrawalApi.listAll(page, perPage, token, status, searchTerm) as {
        data?: unknown[] | { withdrawals?: unknown[]; data?: unknown[]; requests?: unknown[]; pagination?: { totalPages?: number; total_pages?: number } };
        meta?: { total?: number; limit?: number };
        pagination?: { totalPages?: number; total_pages?: number };
        withdrawals?: unknown[];
        requests?: unknown[];
      };
      let withdrawals: AdminWithdrawalRequest[] = [];
      if (Array.isArray(res?.data)) {
        withdrawals = res.data as AdminWithdrawalRequest[];
      } else if (res?.data && typeof res.data === 'object') {
        withdrawals = (res.data.withdrawals ?? res.data.data ?? res.data.requests ?? []) as AdminWithdrawalRequest[];
      } else {
        withdrawals = (res?.withdrawals ?? res?.requests ?? []) as AdminWithdrawalRequest[];
      }
      setWithdrawalRows(withdrawals);

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
      setLoadError(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "withdrawal requests",
          action: "load",
        })
      );
      setWithdrawalRows([]);
    }
  }, [token, page, perPage, statusFilter, search]);

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
      withdrawalStatusFeatureOptions[0].value
    );
    if (nextFilter !== statusFilter) {
      setStatusFilter(nextFilter);
    }
  }, [isManager, withdrawalStatusFeatureOptions, allowedStatusValues, statusFilter]);

  const filteredRows = useMemo(() => {
    let nextRows: AdminWithdrawalRequest[] = withdrawalRows;

    if (isAdmin || !isManager) {
      if (["pending", "approved", "rejected"].includes(statusFilter)) {
        nextRows = withdrawalRows.filter((row) => row.status === statusFilter);
      }
    } else if (!withdrawalStatusFeatureOptions.length || statusFilter === "none") {
      nextRows = [];
    } else if (statusFilter === "all") {
      nextRows = withdrawalRows.filter((row) => allowedStatusesSet.has((row.status || "").toLowerCase()));
    } else {
      const selectedOption = withdrawalStatusFeatureOptions.find((opt) => opt.value === statusFilter);
      const allowedForFilter = new Set(
        (selectedOption?.statuses || []).map((status) => status.toLowerCase())
      );
      nextRows = withdrawalRows.filter((row) => allowedForFilter.has((row.status || "").toLowerCase()));
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

  const showAllStatusOption = isAdmin || !isManager || withdrawalStatusFeatureOptions.length > 1;

  const handleApprove = useCallback(
    (request: AdminWithdrawalRequest) => {
      if (!assertCan(canTakeWithdrawalAction, "You do not have permission to approve withdrawals", toast.error)) {
        return;
      }
      setSelectedWithdrawalRequest(request);
      setActionType("approve");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeWithdrawalAction]
  );

  const handleReject = useCallback(
    (request: AdminWithdrawalRequest) => {
      if (!assertCan(canTakeWithdrawalAction, "You do not have permission to reject withdrawals", toast.error)) {
        return;
      }
      setSelectedWithdrawalRequest(request);
      setActionType("reject");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeWithdrawalAction]
  );

  const handleViewDetails = useCallback(
    (request: AdminWithdrawalRequest) => {
      if (!assertCan(canViewStatus(request.status), "You do not have permission to view this request", toast.error)) {
        return;
      }
      setViewingWithdrawalRequest(request);
      setViewDialogOpen(true);
    },
    [canViewStatus]
  );

  const submitAction = async () => {
    if (!token || !actionType || !selectedWithdrawalRequest) return;

    try {
      setSubmitting(true);
      const res = await adminWithdrawalApi.decision(
        selectedWithdrawalRequest.id,
        {
          action: actionType,
          remarks: adminNotes.trim() || undefined,
        },
        token
      );

      toast.success(
        res?.message ||
          `Withdrawal request ${actionType === "approve" ? "approved" : "rejected"} successfully`
      );

      await loadList();

      setActionDialogOpen(false);
      setSelectedWithdrawalRequest(null);
      setActionType(null);
      setAdminNotes("");
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "withdrawal requests",
          action: "update",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const withdrawalColumns: ColumnDef<AdminWithdrawalRequest>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
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
        header: "Amount (USD)",
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
          const canActOnRequest = canTakeWithdrawalAction && isPending && canViewStatus("pending");

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
    [handleViewDetails, handleApprove, handleReject, canTakeWithdrawalAction, canViewStatus]
  );

  if (!canViewWithdrawals) {
    return (

        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
            You do not have permission to view USDT withdrawal transactions.
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
          resource="withdrawal requests"
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
              Withdrawal List
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and review all withdrawal requests
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadList} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                    {showAllStatusOption && <SelectItem value="all">All</SelectItem>}
                    {withdrawalStatusFeatureOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <AppDataTable<AdminWithdrawalRequest>
            data={filteredRows}
            columns={withdrawalColumns}
            pageCount={totalPages}
          />
        </div>

        {/* Action Dialog (Approve/Reject) */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : "Reject"} Withdrawal Request
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "Approve this withdrawal request. You can add optional remarks."
                  : "Reject this withdrawal request. Please provide a reason for rejection."}
              </DialogDescription>
            </DialogHeader>

            {selectedWithdrawalRequest && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">
                        {formatAmount(selectedWithdrawalRequest.amount || "0")} USDT
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User:</span>
                      <div className="font-medium">
                        {selectedWithdrawalRequest.user
                          ? `${selectedWithdrawalRequest.user.first_name || ""} ${selectedWithdrawalRequest.user.last_name || ""}`.trim() ||
                            selectedWithdrawalRequest.user.email
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-notes" className="text-sm font-medium">
                    Remarks {actionType === "reject" && "(Recommended)"}
                  </label>
                  <Textarea
                    id="admin-notes"
                    rows={4}
                    placeholder={
                      actionType === "approve"
                        ? "Add optional remarks (e.g., Approved.)"
                        : "Add reason for rejection (e.g., Insufficient balance.)"
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
              <DialogTitle>Withdrawal Request Details</DialogTitle>
              <DialogDescription>View complete details of the withdrawal request</DialogDescription>
            </DialogHeader>

            {viewingWithdrawalRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Request Information</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        {statusBadge(viewingWithdrawalRequest.status || "pending")}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-medium">
                          {formatAmount(viewingWithdrawalRequest.amount || "0")} USDT
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">User Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingWithdrawalRequest.user ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">
                              {viewingWithdrawalRequest.user.first_name || viewingWithdrawalRequest.user.last_name
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
                        <span className="text-muted-foreground">No user information available</span>
                      )}
                    </div>
                  </div>
                </div>

                {(viewingWithdrawalRequest.remarks || viewingWithdrawalRequest.approved_by || viewingWithdrawalRequest.approved_at) && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Admin Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingWithdrawalRequest.remarks && (
                        <div>
                          <span className="text-muted-foreground">Remarks: </span>
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            {viewingWithdrawalRequest.remarks}
                          </div>
                        </div>
                      )}
                      {viewingWithdrawalRequest.approved_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Approved At: </span>
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
                      <span>{fmtDateTime(viewingWithdrawalRequest.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated: </span>
                      <span>{fmtDateTime(viewingWithdrawalRequest.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

  );
}
