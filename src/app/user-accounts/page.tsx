"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, XCircle, Calendar, RefreshCw } from "lucide-react";

import { adminMT5RequestApi, type MT5Request } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Approved
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    case 0:
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          Pending
        </Badge>
      );
  }
};

/* ---------------- Page ---------------- */
export default function UserAccountsPage() {
  const { token } = useAuth();

  const [rows, setRows] = useState<MT5Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_requests: 0,
    per_page: 10,
  });
  
  // Use URL query params for pagination (synced with data table)
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MT5Request | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await adminMT5RequestApi.getPending(page, perPage, token);
      if (res.success && res.data) {
        setRows(res.data.requests || []);
        setPagination(res.data.pagination || pagination);
      }
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to load MT5 requests";
      toast.error(errorMessage);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (request: MT5Request) => {
    if (!token) return;
    try {
      setProcessing(request.uuid);
      await adminMT5RequestApi.process(
        {
          id: request.uuid,
          status: 1, // Approve
        },
        token
      );
      toast.success("MT5 request approved successfully");
      await loadRequests();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to approve request";
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectClick = (request: MT5Request) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!token || !selectedRequest) return;

    if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
      toast.error("Please provide a rejection reason (minimum 10 characters)");
      return;
    }

    try {
      setProcessing(selectedRequest.uuid);
      await adminMT5RequestApi.process(
        {
          id: selectedRequest.uuid,
          status: 2, // Reject
          rejection_reason: rejectionReason.trim(),
        },
        token
      );
      toast.success("MT5 request rejected successfully");
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
      await loadRequests();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to reject request";
      toast.error(errorMessage);
    } finally {
      setProcessing(null);
    }
  };

  const columns: ColumnDef<MT5Request>[] = useMemo(
    () => [
      {
        id: "uuid",
        header: "Request ID",
        accessorKey: "uuid",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.uuid.substring(0, 8)}...</span>
        ),
      },
      {
        id: "user",
        header: "User",
        accessorKey: "User",
        cell: ({ row }) => {
          const user = row.original.User;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">
                {user.first_name} {user.last_name}
              </div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">Mobile: {user.mobile}</div>
            </div>
          );
        },
      },
      {
        id: "userDetail",
        header: "Location",
        accessorKey: "User.userDetail",
        cell: ({ row }) => {
          const detail = row.original.User.userDetail;
          return (
            <div className="text-sm">
              {detail.country || "—"}
              {detail.city && `, ${detail.city}`}
            </div>
          );
        },
      },
      {
        id: "account_details",
        header: "Account Details",
        cell: ({ row }) => {
          const req = row.original;
          return (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Mode: </span>
                <span className="font-medium">{req.account_mode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Leverage: </span>
                <span className="font-medium">{req.leverage}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Currency: </span>
                <span className="font-medium">{req.currency}</span>
              </div>
              {req.swap_free && (
                <Badge variant="outline" className="text-xs">
                  Swap Free
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => getStatusBadge(row.original.status),
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
          const isPending = request.status === 0;
          const isProcessing = processing === request.uuid;

          return (
            <div className="flex items-center gap-2">
              {isPending ? (
                <>
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApprove(request)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Spinner className="h-4 w-4 mr-1" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectClick(request)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Spinner className="h-4 w-4 mr-1" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {request.status === 1 ? "Approved" : "Rejected"}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [processing, handleApprove, handleRejectClick]
  );

  if (loading && rows.length === 0) {
    return (
      <MainLayout>
        <ListPageSkeleton
          actionCount={1}
          columnCount={6}
          rowCount={10}
          filterPillCount={2}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">MT5 Account Requests</h1>
            <p className="text-sm text-muted-foreground">
              Manage and process MT5 trading account requests
            </p>
          </div>
          <Button variant="outline" onClick={loadRequests} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <AppDataTable<MT5Request>
            data={rows}
            columns={columns}
            pageCount={pagination.total_pages}
            getRowId={(row) => row.uuid}
          />
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject MT5 Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request (minimum 10 characters).
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="rounded-lg border p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Request Details:</p>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">User: </span>
                      {selectedRequest.User.first_name} {selectedRequest.User.last_name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email: </span>
                      {selectedRequest.User.email}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Request ID: </span>
                      <span className="font-mono text-xs">{selectedRequest.uuid}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="rejection-reason" className="text-sm font-medium">
                    Rejection Reason *
                  </label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Enter rejection reason (minimum 10 characters)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {rejectionReason.length}/10 characters minimum
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={
                  processing === selectedRequest?.uuid ||
                  !rejectionReason.trim() ||
                  rejectionReason.trim().length < 10
                }
              >
                {processing === selectedRequest?.uuid ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  "Reject Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </MainLayout>
  );
}
