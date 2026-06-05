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
import { Badge } from "@/components/ui/badge";
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

import { CheckCircle2, XCircle, Eye, Calendar, FileImage, RefreshCw, CircleDollarSign } from "lucide-react";

import {
  adminUSDTDepositApi,
  depositProofUrl,
  type AdminUSDTDepositRequest,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
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
    return formatDateTimeInIST(s);
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
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const { filterFeatureOptions } = useManagerPermissions();
  const { isAdmin, isManager, can } = useModuleCapabilities("transaction");

  const depositStatusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", DEPOSIT_STATUS_OPTIONS),
    [filterFeatureOptions]
  );

  const allowedStatusValues = useMemo(
    () => depositStatusFeatureOptions.map((opt) => opt.value),
    [depositStatusFeatureOptions]
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
    [isAdmin, isManager, allowedStatusesSet]
  );

  const [depositRows, setDepositRows] = useState<AdminUSDTDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [depositTypeFilter, setDepositTypeFilter] = useState<"all" | "bank" | "usdt">("all");

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingDepositRequest, setViewingDepositRequest] = useState<AdminUSDTDepositRequest | null>(null);
  const [proofBlobUrl, setProofBlobUrl] = useState<string>("");
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState(false);
  const [verifyDecision, setVerifyDecision] = useState<"approve" | "reject">("approve");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDeposits = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      const searchTerm = search && search.length >= 3 ? search : undefined;
      const res = await adminUSDTDepositApi.listAll(page, perPage, token, searchTerm);
      const requests = res?.data?.deposits ?? [];
      setDepositRows(requests);

      if (res?.data?.pagination) {
        setTotalPages(res.data.pagination.totalPages || res.data.pagination.total_pages || 1);
      }
    } catch (e: unknown) {
      console.error(e);
      setLoadError(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, {
          resource: "deposit requests",
          action: "load",
        })
      );
      setDepositRows([]);
    }
  }, [token, page, perPage, search]);

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
    const proofUrl = viewingDepositRequest?.payment_proof_url;
    if (!viewDialogOpen || !proofUrl || !token) {
      setProofBlobUrl("");
      setProofError(false);
      return;
    }

    let cancelled = false;
    const fullUrl = depositProofUrl(proofUrl);
    setProofLoading(true);
    setProofError(false);

    fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setProofBlobUrl(objectUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setProofError(true);
        setProofBlobUrl("");
      })
      .finally(() => {
        if (!cancelled) setProofLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [viewDialogOpen, viewingDepositRequest, token]);

  useEffect(() => {
    return () => {
      if (proofBlobUrl) URL.revokeObjectURL(proofBlobUrl);
    };
  }, [proofBlobUrl]);

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
      depositStatusFeatureOptions[0].value
    );
    if (nextFilter !== statusFilter) {
      setStatusFilter(nextFilter);
    }
  }, [isManager, depositStatusFeatureOptions, allowedStatusValues, statusFilter]);

  const filteredRows = useMemo(() => {
    let nextRows: AdminUSDTDepositRequest[] = depositRows;

    if (isAdmin || !isManager) {
      if (["pending", "approved", "rejected"].includes(statusFilter)) {
        nextRows = depositRows.filter((row) => row.status === statusFilter);
      }
    } else if (!depositStatusFeatureOptions.length || statusFilter === "none") {
      nextRows = [];
    } else if (statusFilter === "all") {
      nextRows = depositRows.filter((row) => allowedStatusesSet.has((row.status || "").toLowerCase()));
    } else {
      const selectedOption = depositStatusFeatureOptions.find((opt) => opt.value === statusFilter);
      const allowedForFilter = new Set(
        (selectedOption?.statuses || []).map((status) => status.toLowerCase())
      );
      nextRows = depositRows.filter((row) => allowedForFilter.has((row.status || "").toLowerCase()));
    }

    if (depositTypeFilter === "all") {
      return nextRows;
    }

    return nextRows.filter(
      (row) =>
        ((row.deposit_type || "").toLowerCase() === depositTypeFilter)
    );
  }, [
    depositRows,
    statusFilter,
    depositTypeFilter,
    isAdmin,
    isManager,
    depositStatusFeatureOptions,
    allowedStatusesSet,
  ]);

  const showAllStatusOption = isAdmin || !isManager || depositStatusFeatureOptions.length > 1;

  const handleViewDetails = useCallback(
    (request: AdminUSDTDepositRequest) => {
      if (!assertCan(canViewStatus(request.status), "You do not have permission to view this request", toast.error)) {
        return;
      }
      setViewingDepositRequest(request);
      setViewDialogOpen(true);
    },
    [canViewStatus]
  );

  const resetVerifyState = useCallback(() => {
    setAdminNotes("");
    setVerifyDecision("approve");
  }, []);

  const submitVerify = async () => {
    if (!token || !viewingDepositRequest) return;
    if (!assertCan(canTakeDepositAction, "You do not have permission to update this deposit", toast.error)) {
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
        token
      );

      toast.success(
        res?.message ||
          `Deposit request ${verifyDecision === "approve" ? "approve" : "reject"} successfully`
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
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const depositColumns: ColumnDef<AdminUSDTDepositRequest>[] = useMemo(
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
        id: "transaction_reference",
        header: "Reference",
        accessorKey: "transaction_reference",
        cell: ({ row }) => {
          const reference = row.original.transaction_reference || row.original.transaction_hash;
          if (!reference) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="font-mono text-xs max-w-[200px] truncate block" title={reference}>
              {reference}
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
    [handleViewDetails]
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

  if (loading && depositRows.length === 0) {
    return (

        <ListPageSkeleton
          actionCount={1}
          columnCount={6}
          rowCount={10}
          filterPillCount={4}
        />

    );
  }

  if (loadError && depositRows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
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

      <div className="container mx-auto p-6 space-y-6">
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
              placeholder="Search by user, email, amount, or reference"
              minimumLength={3}
              delay={300}
            />

            {(!isManager || depositStatusFeatureOptions.length > 0) && (
              <div className="flex items-center gap-2">
                <label htmlFor="deposit-status-filter" className="text-sm font-medium">
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
                    {showAllStatusOption && <SelectItem value="all">All</SelectItem>}
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
              <label htmlFor="deposit-type-filter" className="text-sm font-medium">
                Filter by Type:
              </label>
              <Select
                value={depositTypeFilter}
                onValueChange={(value) =>
                  setDepositTypeFilter(value as "all" | "bank" | "usdt")
                }
              >
                <SelectTrigger id="deposit-type-filter" className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AppDataTable<AdminUSDTDepositRequest>
            data={filteredRows}
            columns={depositColumns}
            pageCount={totalPages}
          />
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
              <DialogDescription>View complete details of the deposit request</DialogDescription>
            </DialogHeader>

            {viewingDepositRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Request Information</p>
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
                        <span className="text-muted-foreground">Deposit Type: </span>
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
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">User Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingDepositRequest.user ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">
                              {viewingDepositRequest.user.first_name || viewingDepositRequest.user.last_name
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
                        <span className="text-muted-foreground">No user information available</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Payment Proof
                  </p>
                  {viewingDepositRequest.payment_proof_url ? (
                    <div className="rounded-md border bg-background p-4 flex items-center justify-center min-h-[120px]">
                      {proofLoading && !proofBlobUrl && (
                        <Spinner className="h-6 w-6" />
                      )}
                      {proofError && (
                        <span className="text-sm text-muted-foreground">
                          Unable to load payment proof.
                        </span>
                      )}
                      {proofBlobUrl && (
                        <img
                          src={proofBlobUrl}
                          alt="Payment proof"
                          className="max-h-96 w-auto object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-muted/30 p-4 flex flex-col items-center justify-center gap-1 min-h-[120px] text-center">
                      <FileImage className="h-8 w-8 text-muted-foreground opacity-60" />
                      <span className="text-sm font-medium text-muted-foreground">
                        No deposit image provided
                      </span>
                      <span className="text-xs text-muted-foreground">
                        The user has not uploaded a payment proof for this deposit request.
                      </span>
                    </div>
                  )}
                </div>

                {(viewingDepositRequest.admin_notes || viewingDepositRequest.approved_by || viewingDepositRequest.approved_at) && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Admin Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingDepositRequest.admin_notes && (
                        <div>
                          <span className="text-muted-foreground">Admin Notes: </span>
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            {viewingDepositRequest.admin_notes}
                          </div>
                        </div>
                      )}
                      {viewingDepositRequest.approved_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Approved At: </span>
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
                  const canVerify =
                    canTakeDepositAction && isPending && canViewStatus("pending");
                  if (!canVerify) return null;

                  return (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Verification Decision</Label>
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
                          <Label htmlFor="admin-notes" className="text-sm font-semibold">
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
              {viewingDepositRequest &&
                canTakeDepositAction &&
                viewingDepositRequest.status === "pending" &&
                canViewStatus("pending") && (
                  <Button
                    type="button"
                    onClick={submitVerify}
                    disabled={submitting || (verifyDecision === "reject" && !adminNotes.trim())}
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
