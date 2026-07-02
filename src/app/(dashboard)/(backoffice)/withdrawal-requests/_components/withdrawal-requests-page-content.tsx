"use client";

import Link from "next/link";
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
} from "lucide-react";

import { adminWithdrawalApi, type AdminWithdrawalRequest } from "@/lib/api";
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
    (typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || ""
      : "");

  const { filterFeatureOptions } = useManagerPermissions();
  const { isAdmin, isManager, can } = useModuleCapabilities("transaction");

  const withdrawalStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", WITHDRAWAL_STATUS_OPTIONS),
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

  const canTakeWithdrawalAction = can("approveWithdrawal");
  const canViewWithdrawals = can("viewWithdrawals");

  const canViewStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedStatusesSet],
  );

  const [withdrawalRows, setWithdrawalRows] = useState<
    AdminWithdrawalRequest[]
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

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingWithdrawalRequest, setViewingWithdrawalRequest] =
    useState<AdminWithdrawalRequest | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"approve" | "reject">(
    "approve",
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadWithdrawals = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      const status =
        statusFilter !== "all" && statusFilter !== "none"
          ? statusFilter
          : undefined;
      const searchTerm = search && search.length >= 3 ? search : undefined;
      const res = (await adminWithdrawalApi.listAll(
        page,
        perPage,
        token,
        status,
        searchTerm,
      )) as {
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
      let withdrawals: AdminWithdrawalRequest[] = [];
      if (Array.isArray(res?.data)) {
        withdrawals = res.data as AdminWithdrawalRequest[];
      } else if (res?.data && typeof res.data === "object") {
        withdrawals = (res.data.withdrawals ??
          res.data.data ??
          res.data.requests ??
          []) as AdminWithdrawalRequest[];
      } else {
        withdrawals = (res?.withdrawals ??
          res?.requests ??
          []) as AdminWithdrawalRequest[];
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
          resource: "withdrawal requests",
          action: "load",
        }),
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
    let nextRows: AdminWithdrawalRequest[] = withdrawalRows;

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
    (request: AdminWithdrawalRequest) => {
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
      const res = await adminWithdrawalApi.decision(
        viewingWithdrawalRequest.id,
        {
          action: verifyDecision,
          remarks: adminNotes.trim() || undefined,
        },
        token,
      );

      toast.success(
        res?.message ||
          `Withdrawal request ${verifyDecision === "approve" ? "approved" : "rejected"} successfully`,
      );

      await loadList();

      setViewDialogOpen(false);
      setViewingWithdrawalRequest(null);
      resetVerifyState();
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "withdrawal requests",
          action: "update",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    return fmtDateTime(dateString);
  };

  const withdrawalColumns: ColumnDef<AdminWithdrawalRequest>[] = useMemo(
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
        id: "payment_method",
        header: "Payment Type",
        accessorKey: "payment_method",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.payment_method.name || "—"}
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
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
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
        </div>

        <AppDataTable<AdminWithdrawalRequest>
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
            <DialogTitle>Withdrawal Request Details</DialogTitle>
            <DialogDescription>
              View complete details of the withdrawal request
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
                      Payment Method:{" "}
                    </span>
                    <span className="font-medium">
                      {viewingWithdrawalRequest.payment_method?.name || "—"}
                    </span>
                  </div>
                  {viewingWithdrawalRequest.wallet_address ? (
                    <>
                      <div>
                        <span className="text-muted-foreground">
                          Wallet Address:{" "}
                        </span>
                        <span className="font-medium break-all font-mono text-xs">
                          {viewingWithdrawalRequest.wallet_address}
                        </span>
                      </div>
                      {viewingWithdrawalRequest.chain_id && (
                        <div>
                          <span className="text-muted-foreground">Chain: </span>
                          <span className="font-medium">
                            {viewingWithdrawalRequest.chain_id}
                          </span>
                        </div>
                      )}
                    </>
                  ) : viewingWithdrawalRequest.bank_detail ? (
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
                  ) : (
                    <span className="text-muted-foreground">
                      No payment details available
                    </span>
                  )}
                </div>
              </div>

              {(viewingWithdrawalRequest.remarks ||
                viewingWithdrawalRequest.approved_by ||
                viewingWithdrawalRequest.approved_at) && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Admin Information
                  </p>
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
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated: </span>
                    <span>
                      {fmtDateTime(viewingWithdrawalRequest.updated_at)}
                    </span>
                  </div>
                </div>
              </div>

              {(() => {
                const isPending = viewingWithdrawalRequest.status === "pending";
                const canVerify =
                  canTakeWithdrawalAction &&
                  isPending &&
                  canViewStatus("pending");
                if (!canVerify) return null;

                return (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          Verification Decision
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
                          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
                            <TabsTrigger value="approve" className="rounded-xl">
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </TabsTrigger>
                            <TabsTrigger value="reject" className="rounded-xl">
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
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
                              ? "Please provide a reason for rejection..."
                              : "Optional notes about this verification..."
                          }
                          className="min-h-[100px]"
                        />
                        {verifyDecision === "reject" && (
                          <p className="text-xs text-muted-foreground">
                            Rejection reason is required
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
              viewingWithdrawalRequest.status === "pending" &&
              canViewStatus("pending") && (
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
                      Reject
                    </>
                  )}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
