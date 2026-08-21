"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { StatePreservingLink } from "@/components/state-preserving-link";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedDocumentViewer } from "@/components/authenticated-document-viewer";
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
  FileImage,
  RefreshCw,
  CircleDollarSign,
  AlertCircle,
} from "lucide-react";

import {
  adminUSDTDepositApi,
  depositProofUrl,
  type AdminUSDTDepositRequest,
} from "@/lib/api";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  assertCan,
  sanitizeFilterValue,
  useModuleCapabilities,
} from "@/hooks/use-permission-capabilities";
import { DEPOSIT_STATUS_OPTIONS } from "../_lib/transaction-format";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return formatApiDateTimeAsIST(s);
  } catch {
    return s;
  }
};

const formatAmount = (amount: string | number) => {
  try {
    const num = typeof amount === "number" ? amount : parseFloat(amount);
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
export function USDTTransactionsPageContent() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || ""
      : "");

  const { filterFeatureOptions } = useManagerPermissions();
  const { isAdmin, isManager, can } = useModuleCapabilities("transaction");

  const depositStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", DEPOSIT_STATUS_OPTIONS),
    [filterFeatureOptions],
  );

  const allowedStatusValues = useMemo(
    () => depositStatusFeatureOptions.map((opt) => opt.value),
    [depositStatusFeatureOptions],
  );

  const allowedStatusesSet = useMemo(() => {
    const set = new Set<string>();
    depositStatusFeatureOptions.forEach((opt) => {
      opt.statuses.forEach((status) => set.add(status.toLowerCase()));
    });
    return set;
  }, [depositStatusFeatureOptions]);

  const canTakeDepositAction = can("approveDeposit");
  const canViewDeposits = can("viewDeposits");

  const canViewStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedStatusesSet],
  );

  const [depositRows, setDepositRows] = useState<AdminUSDTDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState<string>(search ?? "");
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [depositTypeFilter, setDepositTypeFilter] = useQueryState(
    "deposit_type",
    parseAsString.withDefault("all"),
  );

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDepositRequest, setViewingDepositRequest] =
    useState<AdminUSDTDepositRequest | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"approve" | "reject">(
    "approve",
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef(0);

  const loadDeposits = useCallback(async () => {
    if (!token) return;
    const currentRequestId = ++requestIdRef.current;
    try {
      setLoadError(null);
      setDepositRows([]);
      const searchTerm =
        typeof search === "string" && search.trim().length >= 3
          ? search.trim()
          : undefined;
      const statusParam =
        statusFilter !== "all" && statusFilter !== "none"
          ? statusFilter
          : undefined;
      const depositTypeParam =
        depositTypeFilter !== "all" && depositTypeFilter !== "none"
          ? depositTypeFilter
          : undefined;
      const res = await adminUSDTDepositApi.listAll(
        page,
        perPage,
        token,
        searchTerm,
        statusParam,
        depositTypeParam,
      );
      if (currentRequestId !== requestIdRef.current) return;
      const requests = res?.data?.deposits ?? [];
      setDepositRows(requests);

      if (res?.data?.pagination) {
        setTotalPages(
          res.data.pagination.totalPages ||
            res.data.pagination.total_pages ||
            1,
        );
      }
    } catch (e: unknown) {
      if (currentRequestId !== requestIdRef.current) return;
      console.error(e);
      setLoadError(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "deposit requests",
          action: "load",
        }),
      );
      setDepositRows([]);
    }
  }, [token, page, perPage, search, statusFilter, depositTypeFilter]);

  const loadList = useCallback(async () => {
    if (!token) return;
    if (!canViewDeposits) return;
    setLoading(true);
    try {
      await loadDeposits();
    } finally {
      setLoading(false);
    }
  }, [token, canViewDeposits, loadDeposits]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  useEffect(() => {
    void setPage(1);
  }, [statusFilter, depositTypeFilter, setPage]);

  useEffect(() => {
    if (!isManager) return;
    if (!depositStatusFeatureOptions.length) {
      if (statusFilter !== "none") {
        setStatusFilter("none");
      }
      return;
    }
    if (statusFilter === "none") {
      setStatusFilter(depositStatusFeatureOptions[0].value);
      return;
    }
    if (statusFilter === "all") {
      if (depositStatusFeatureOptions.length <= 1) {
        setStatusFilter(depositStatusFeatureOptions[0].value);
      }
      return;
    }
    const nextFilter = sanitizeFilterValue(
      statusFilter,
      allowedStatusValues,
      depositStatusFeatureOptions[0].value,
    );
    if (nextFilter !== statusFilter) {
      setStatusFilter(nextFilter);
    }
  }, [
    isManager,
    depositStatusFeatureOptions,
    allowedStatusValues,
    statusFilter,
  ]);

  const showAllStatusOption =
    isAdmin || !isManager || depositStatusFeatureOptions.length > 1;

  const handleViewDetails = useCallback(
    (request: AdminUSDTDepositRequest) => {
      if (
        !assertCan(
          canViewStatus(request.status),
          "You do not have permission to view this request",
          toast.error,
        )
      ) {
        return;
      }
      setViewingDepositRequest(request);
      setViewDialogOpen(true);
    },
    [canViewStatus],
  );

  const resetVerifyState = useCallback(() => {
    setAdminNotes("");
    setVerifyDecision("approve");
  }, []);

  const submitVerify = async () => {
    if (!token || !viewingDepositRequest) return;
    if (
      !assertCan(
        canTakeDepositAction,
        "You do not have permission to update this deposit",
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
      const res = await adminUSDTDepositApi.verify(
        {
          deposit_type: viewingDepositRequest.deposit_type || "bank",
          request_id: viewingDepositRequest.id,
          action: verifyDecision,
          admin_notes: adminNotes.trim() || undefined,
        },
        token,
      );

      toast.success(
        res?.message ||
          `Deposit request ${verifyDecision === "approve" ? "approve" : "reject"} successfully`,
      );

      await loadList();

      setViewDialogOpen(false);
      setViewingDepositRequest(null);
      resetVerifyState();
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "deposit requests",
          action: "update",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "—";
    return formatApiDateTimeAsIST(dateString, "—");
  };

  const depositColumns: ColumnDef<AdminUSDTDepositRequest>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => {
          const pageIndex = table.getState().pagination.pageIndex ?? 0;
          const pageSize = table.getState().pagination.pageSize ?? 10;
          return (
            <span className="font-mono text-sm">
              {pageIndex * pageSize + row.index + 1}
            </span>
          );
        },
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
              <StatePreservingLink
                storageKey="usdt-transactions"
                href={`/new-users/${userInfo.id ?? ""}`}
                className="font-medium hover:underline"
              >
                {userInfo.first_name || userInfo.last_name
                  ? `${userInfo.first_name || ""} ${userInfo.last_name || ""}`.trim()
                  : "—"}
              </StatePreservingLink>
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
            {formatAmount(row.original.amount.toFixed(2))}
          </span>
        ),
      },
      {
        id: "transaction_reference",
        header: "Reference",
        accessorKey: "transaction_reference",
        cell: ({ row }) => {
          const reference =
            row.original.transaction_reference || row.original.transaction_hash;
          if (!reference)
            return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs max-w-[200px] truncate block"
              title={reference}
            >
              {reference}
            </span>
          );
        },
      },
      {
        id: "user_comment",
        header: "User Comment",
        accessorKey: "user_comment",
        cell: ({ row }) => {
          const comment = row.original.user_comment;
          if (!comment) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs max-w-[200px] truncate block"
              title={comment}
            >
              {comment}
            </span>
          );
        },
      },
      {
        id: "deposit_type",
        header: "Type",
        accessorKey: "deposit_type",
        cell: ({ row }) => (
          <span className="capitalize">{row.original.deposit_type || "—"}</span>
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
          <span className="capitalize">{row.original.admin_notes || "—"}</span>
        ),
      },
      {
        id: "created_at",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

  if (!canViewDeposits) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">
          You do not have permission to view USDT deposit transactions.
        </p>
      </div>
    );
  }

  if (loadError && depositRows.length === 0) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="deposit requests"
          action="load"
          onRetry={() => {
            void loadList();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <CircleDollarSign className="h-6 w-6 text-primary" />
            Deposit List
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and review all deposit requests
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

      {/* Filters */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ApiSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(value) => {
              void setSearch(value || null);
            }}
            placeholder="Search by user, email, amount, or reference"
            minimumLength={3}
            delay={300}
          />

          {(!isManager || depositStatusFeatureOptions.length > 0) && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="deposit-status-filter"
                className="text-sm font-medium"
              >
                Filter by Status:
              </label>
              <Select
                value={statusFilter === "none" ? undefined : statusFilter}
                onValueChange={setStatusFilter}
                disabled={isManager && !depositStatusFeatureOptions.length}
              >
                <SelectTrigger id="deposit-status-filter" className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {showAllStatusOption && (
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

          <div className="flex items-center gap-2">
            <label
              htmlFor="deposit-type-filter"
              className="text-sm font-medium"
            >
              Filter by Type:
            </label>
            <Select
              value={depositTypeFilter}
              onValueChange={(value) => setDepositTypeFilter(value)}
            >
              <SelectTrigger id="deposit-type-filter" className="w-[180px]">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="usd">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        {loading && depositRows.length === 0 ? (
          <TableSectionSkeleton columnCount={9} rowCount={10} />
        ) : (
          <AppDataTable<AdminUSDTDepositRequest>
            data={depositRows}
            columns={depositColumns}
            pageCount={totalPages}
            getRowId={(row) => String(row.id)}
          />
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onOpenChange={(o) => {
          setViewDialogOpen(o);
          if (!o) {
            setViewingDepositRequest(null);
            resetVerifyState();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deposit Request Details</DialogTitle>
            <DialogDescription>
              View complete details of the deposit request
            </DialogDescription>
          </DialogHeader>

          {viewingDepositRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Request Information
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status: </span>
                      {statusBadge(viewingDepositRequest.status || "pending")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount: </span>
                      <span className="font-medium">
                        {formatAmount(viewingDepositRequest.amount || "0")} USD
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Deposit Type:{" "}
                      </span>
                      <span className="font-medium capitalize">
                        {viewingDepositRequest.deposit_type || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reference: </span>
                      <div className="font-mono text-xs break-all">
                        {viewingDepositRequest.transaction_reference ||
                          viewingDepositRequest.transaction_hash ||
                          "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        User Comment:{" "}
                      </span>
                      <div className="font-mono text-xs break-all">
                        {viewingDepositRequest.user_comment || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    User Information
                  </p>
                  <div className="space-y-2 text-sm">
                    {viewingDepositRequest.user ? (
                      <>
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">
                            {viewingDepositRequest.user.first_name ||
                            viewingDepositRequest.user.last_name
                              ? `${viewingDepositRequest.user.first_name || ""} ${viewingDepositRequest.user.last_name || ""}`.trim()
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium">
                            {viewingDepositRequest.user.email}
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
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                  <FileImage className="h-4 w-4" />
                  Payment Proof
                </p>
                <AuthenticatedDocumentViewer
                  src={viewingDepositRequest.payment_proof_url ? depositProofUrl(viewingDepositRequest.payment_proof_url) : null}
                  label="Payment Proof"
                  mode="embedded"
                  previewClassName="min-h-[120px]"
                  emptyText="No deposit image provided"
                  allowDialog={true}
                />
              </div>

              {(viewingDepositRequest.admin_notes ||
                viewingDepositRequest.approved_by ||
                viewingDepositRequest.approved_at) && (
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Admin Information
                  </p>
                  <div className="space-y-2 text-sm">
                    {viewingDepositRequest.admin_notes && (
                      <div>
                        <span className="text-muted-foreground">
                          Admin Notes:{" "}
                        </span>
                        <div className="mt-1 p-2 bg-muted rounded-md">
                          {viewingDepositRequest.admin_notes}
                        </div>
                      </div>
                    )}
                    {viewingDepositRequest.approved_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Approved At:{" "}
                        </span>
                        <span>
                          {fmtDateTime(viewingDepositRequest.approved_at)}
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
                    <span>{fmtDateTime(viewingDepositRequest.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Updated: </span>
                    <span>{fmtDateTime(viewingDepositRequest.updated_at)}</span>
                  </div>
                </div>
              </div>

              {(() => {
                const isPending = viewingDepositRequest.status === "pending";
                const isApproved = viewingDepositRequest.status === "approved";
                const canVerify =
                  canTakeDepositAction && isPending && canViewStatus("pending");
                const canRejectApproved =
                  canTakeDepositAction && isApproved && canViewStatus("approved");
                
                if (!canVerify && !canRejectApproved) return null;

                return (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {isApproved && (
                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold">One-time Reversal</p>
                              <p className="text-xs mt-1">This deposit was already approved. You can reject it once in case of accidental approval. This action cannot be undone.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">
                          {isApproved ? "Reversal Decision" : "Verification Decision"}
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
                          <TabsList className={`grid h-auto w-full ${isApproved ? 'grid-cols-1' : 'grid-cols-2'} rounded-2xl bg-muted/50 p-1`}>
                            {!isApproved && (
                              <TabsTrigger value="approve" className="rounded-xl">
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                              </TabsTrigger>
                            )}
                            <TabsTrigger value="reject" className="rounded-xl">
                              <XCircle className="mr-2 h-4 w-4" />
                              {isApproved ? "Reject (Reverse Approval)" : "Reject"}
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
                              ? isApproved 
                                ? "Please provide a detailed reason for reversing this approval..."
                                : "Please provide a reason for rejection..."
                              : "Optional notes about this verification..."
                          }
                          className="min-h-[100px]"
                        />
                        {verifyDecision === "reject" && (
                          <p className="text-xs text-muted-foreground">
                            {isApproved ? "Reversal reason is required and will be logged" : "Rejection reason is required"}
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
            {viewingDepositRequest &&
              canTakeDepositAction &&
              ((viewingDepositRequest.status === "pending" && canViewStatus("pending")) ||
               (viewingDepositRequest.status === "approved" && canViewStatus("approved"))) && (
                <Button
                  type="button"
                  onClick={submitVerify}
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
                      {viewingDepositRequest.status === "approved" ? "Reject (Reverse)" : "Reject"}
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
