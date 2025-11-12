"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
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

import { CheckCircle2, XCircle, Eye, Calendar, FileImage, RefreshCw } from "lucide-react";

import {
  adminUSDTDepositApi,
  API_BASE_URL,
  depositProofUrl,
  type AdminUSDTDepositRequest,
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

const TRANSACTION_STATUS_OPTIONS: TransactionStatusOption[] = [
  { value: "pending", label: "Pending", featureKey: "pendingDepositList", statuses: ["pending"] },
  { value: "approved", label: "Approved", featureKey: "approveDepositList", statuses: ["approved"] },
  { value: "rejected", label: "Rejected", featureKey: "rejectDepositList", statuses: ["rejected"] },
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

  const statusFeatureOptions = useMemo(
    () => filterFeatureOptions("transaction", TRANSACTION_STATUS_OPTIONS),
    [filterFeatureOptions]
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

  const [rows, setRows] = useState<AdminUSDTDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AdminUSDTDepositRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View details dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<AdminUSDTDepositRequest | null>(null);

  const loadList = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await adminUSDTDepositApi.listAll(page, perPage, token);
      const requests = res?.data?.requests ?? [];
      setRows(requests);
      
      // Update pagination if available
      if (res?.data?.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load deposit requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage]);

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
    (request: AdminUSDTDepositRequest) => {
      if (!canTakeAction) {
        toast.error("You do not have permission to approve deposits");
        return;
      }
      setSelectedRequest(request);
      setActionType("approve");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeAction]
  );

  const handleReject = useCallback(
    (request: AdminUSDTDepositRequest) => {
      if (!canTakeAction) {
        toast.error("You do not have permission to reject deposits");
        return;
      }
      setSelectedRequest(request);
      setActionType("reject");
      setAdminNotes("");
      setActionDialogOpen(true);
    },
    [canTakeAction]
  );

  const handleViewDetails = useCallback(
    (request: AdminUSDTDepositRequest) => {
      if (!canViewStatus(request.status)) {
        toast.error("You do not have permission to view this request");
        return;
      }
      setViewingRequest(request);
      setViewDialogOpen(true);
    },
    [canViewStatus]
  );

  const submitAction = async () => {
    if (!token || !selectedRequest || !actionType) return;

    try {
      setSubmitting(true);
      const res = await adminUSDTDepositApi.verify(
        {
          request_id: selectedRequest.id,
          action: actionType,
          admin_notes: adminNotes.trim() || undefined,
        },
        token
      );

      toast.success(
        res.message ||
          `Deposit request ${actionType === "approve" ? "approved" : "rejected"} successfully`
      );

      await loadList();

      setActionDialogOpen(false);
      setSelectedRequest(null);
      setActionType(null);
      setAdminNotes("");
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.message || `Failed to ${actionType === "approve" ? "approve" : "reject"} deposit request`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<AdminUSDTDepositRequest>[] = useMemo(
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
            <h1 className="text-2xl font-semibold tracking-tight">USDT Deposit Transactions</h1>
            <p className="text-sm text-muted-foreground">
              Manage and review USDT deposit requests
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
          {/* Status Filter */}
          {(!isManager || statusFeatureOptions.length > 0) && (
            <div className="mb-4 flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium">
                Filter by Status:
              </label>
              <Select
                value={statusFilter === "none" ? undefined : statusFilter}
                onValueChange={setStatusFilter}
                disabled={statusSelectDisabled}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {showAllStatusOption && (
                    <SelectItem value="all">All</SelectItem>
                  )}
                  {statusFeatureOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AppDataTable<AdminUSDTDepositRequest>
            data={filteredRows}
            columns={columns}
            pageCount={totalPages}
          />
        </div>

        {/* Action Dialog (Approve/Reject) */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : "Reject"} Deposit Request
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "Approve this deposit request. You can add optional notes."
                  : "Reject this deposit request. Please provide a reason for rejection."}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Request ID:</span>
                      <div className="font-medium">{selectedRequest.id}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <div className="font-medium">{formatAmount(selectedRequest.amount)} USDT</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">User:</span>
                      <div className="font-medium">
                        {selectedRequest.user
                          ? `${selectedRequest.user.first_name || ""} ${selectedRequest.user.last_name || ""}`.trim() ||
                            selectedRequest.user.email
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transaction Hash:</span>
                      <div className="font-mono text-xs truncate">
                        {selectedRequest.transaction_hash || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="admin-notes" className="text-sm font-medium">
                    Admin Notes {actionType === "reject" && "(Recommended)"}
                  </label>
                  <Textarea
                    id="admin-notes"
                    rows={4}
                    placeholder={
                      actionType === "approve"
                        ? "Add optional notes (e.g., Looks valid.)"
                        : "Add reason for rejection (e.g., Invalid proof.)"
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
                  setSelectedRequest(null);
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
              <DialogTitle>Deposit Request Details</DialogTitle>
              <DialogDescription>View complete details of the deposit request</DialogDescription>
            </DialogHeader>

            {viewingRequest && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Request Information</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID: </span>
                        <span className="font-medium">{viewingRequest.id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status: </span>
                        {statusBadge(viewingRequest.status)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount: </span>
                        <span className="font-medium">{formatAmount(viewingRequest.amount)} USDT</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transaction Hash: </span>
                        <div className="font-mono text-xs break-all">
                          {viewingRequest.transaction_hash || "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">User Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingRequest.user ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">
                              {viewingRequest.user.first_name || viewingRequest.user.last_name
                                ? `${viewingRequest.user.first_name || ""} ${viewingRequest.user.last_name || ""}`.trim()
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Email: </span>
                            <span className="font-medium">{viewingRequest.user.email}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User ID: </span>
                            <span className="font-medium">{viewingRequest.user.id}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No user information available</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Proof */}
                {viewingRequest.payment_proof_url && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      Payment Proof
                    </p>
                    <div className="rounded-md border bg-background p-4 flex items-center justify-center">
                      <img
                        src={depositProofUrl(viewingRequest.payment_proof_url)}
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

                {/* Admin Notes & Approval Info */}
                {(viewingRequest.admin_notes || viewingRequest.approved_by || viewingRequest.approved_at) && (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-2">Admin Information</p>
                    <div className="space-y-2 text-sm">
                      {viewingRequest.admin_notes && (
                        <div>
                          <span className="text-muted-foreground">Admin Notes: </span>
                          <div className="mt-1 p-2 bg-muted rounded-md">
                            {viewingRequest.admin_notes}
                          </div>
                        </div>
                      )}
                      {viewingRequest.approved_by && (
                        <div>
                          <span className="text-muted-foreground">Approved By: </span>
                          <span className="font-mono text-xs">{viewingRequest.approved_by}</span>
                        </div>
                      )}
                      {viewingRequest.approved_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Approved At: </span>
                          <span>{fmtDateTime(viewingRequest.approved_at)}</span>
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
                      <span>{fmtDateTime(viewingRequest.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated: </span>
                      <span>{fmtDateTime(viewingRequest.updated_at)}</span>
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

