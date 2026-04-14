"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { adminIbRequestsApi, type AdminIbRequest } from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "0" },
  { label: "Approved", value: "1" },
  { label: "Rejected", value: "2" },
];

const asStatusCode = (request: AdminIbRequest): number => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const candidates = [
    request.status,
    req.request_status,
    req.current_status,
    req.state,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && !Number.isNaN(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const trimmed = candidate.trim().toLowerCase();
      if (/^\d+$/.test(trimmed)) {
        return Number(trimmed);
      }
      if (trimmed === "pending") return 0;
      if (trimmed === "approved") return 1;
      if (trimmed === "rejected") return 2;
    }
  }

  return 0;
};

const getStatusBadge = (status: number) => {
  switch (status) {
    case 1:
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Approved
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Pending
        </Badge>
      );
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const deriveUser = (request: AdminIbRequest) => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const user =
    request.user ??
    request.User ??
    (req.applicant as Record<string, unknown> | undefined) ??
    (req.member as Record<string, unknown> | undefined) ??
    (req.customer as Record<string, unknown> | undefined) ??
    null;
  return (user ?? {}) as Record<string, unknown>;
};

const deriveFullName = (request: AdminIbRequest) => {
  const user = deriveUser(request);
  const pieces = [
    user?.name,
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim(),
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim(),
  ].filter((name) => typeof name === "string" && name.trim().length > 0);

  if (pieces.length > 0) {
    return pieces[0] as string;
  }

  const req = request as AdminIbRequest & Record<string, unknown>;
  const fallback =
    request.ib_name ??
    (req.full_name as string | undefined) ??
    (req.owner_name as string | undefined) ??
    "";
  return fallback || "—";
};

const deriveEmail = (request: AdminIbRequest) => {
  const user = deriveUser(request);
  const req = request as AdminIbRequest & Record<string, unknown>;
  return (
    (user?.email as string | undefined) ??
    (user?.mail as string | undefined) ??
    (req.email as string | undefined) ??
    (req.user_email as string | undefined) ??
    "—"
  );
};

const derivePhone = (request: AdminIbRequest) => {
  const user = deriveUser(request);
  const req = request as AdminIbRequest & Record<string, unknown>;
  return (
    (user?.mobile as string | undefined) ??
    (user?.phone as string | undefined) ??
    (user?.contact as string | undefined) ??
    (req.mobile as string | undefined) ??
    (req.phone as string | undefined) ??
    (req.contact_number as string | undefined) ??
    "—"
  );
};

const deriveRequestId = (request: AdminIbRequest) => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const candidates = [
    request.id,
    request.uuid,
    req.ib_request_id,
    req.request_id,
    req.request_uuid,
  ];

  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
};

const deriveUserNotes = (request: AdminIbRequest) => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const candidate =
    request.notes ??
    (req.user_notes as string | undefined) ??
    (req.request_notes as string | undefined) ??
    (req.comment as string | undefined) ??
    null;
  return candidate && String(candidate).trim().length > 0
    ? String(candidate)
    : null;
};

const deriveAdminComment = (request: AdminIbRequest) => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const candidate =
    request.admin_comment ??
    (req.adminComment as string | undefined) ??
    (req.review_comment as string | undefined) ??
    null;
  return candidate && String(candidate).trim().length > 0
    ? String(candidate)
    : null;
};

export default function IbManagementPage() {
  const { token } = useAuth();

  const [requests, setRequests] = useState<AdminIbRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_pages: 1,
    total: 0,
  });

  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [actionRequest, setActionRequest] = useState<AdminIbRequest | null>(null);
  const [actionIbName, setActionIbName] = useState("");
  const [actionComment, setActionComment] = useState("");

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(20));
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  const [searchInput, setSearchInput] = useState(search ?? "");

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    void setPage(1);
    void setSearch(value.trim() ? value : null);
  }, 500);

  const loadRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await adminIbRequestsApi.list({
        token,
        page,
        perPage,
        status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        search: search?.trim() ? search : undefined,
      });

      const payload = response?.data;

      const extractItems = (data: unknown): AdminIbRequest[] => {
        const dataObj = data as Record<string, unknown>;
        if (!data) return [];
        if (Array.isArray(data)) return data as AdminIbRequest[];
        if (Array.isArray(dataObj.items)) return dataObj.items as AdminIbRequest[];
        if (Array.isArray(dataObj.requests)) return dataObj.requests as AdminIbRequest[];
        if (Array.isArray(dataObj.data)) return dataObj.data as AdminIbRequest[];
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).items)) {
          return ((dataObj.data as Record<string, unknown>).items as AdminIbRequest[]);
        }
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).data)) {
          return ((dataObj.data as Record<string, unknown>).data as AdminIbRequest[]);
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as AdminIbRequest[];
        return [];
      };

      const items = extractItems(payload);
      setRequests(items);

      const payloadObj = payload as Record<string, unknown>;
      const paginationSource =
        ((payload && (payloadObj.pagination as Record<string, unknown> | undefined)) ??
        (payload && ((payloadObj.meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)) ??
        ((payload &&
          payloadObj.data &&
          !Array.isArray(payloadObj.data)) ? 
          (((payloadObj.data as Record<string, unknown>).pagination as Record<string, unknown> | undefined) ?? 
          ((payloadObj.data as Record<string, unknown>).meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined) :
          undefined));

      const total =
        (paginationSource?.total as number | undefined) ??
        (paginationSource?.total_items as number | undefined) ??
        (paginationSource?.totalRequests as number | undefined) ??
        (payload?.total as number | undefined) ??
        items.length;

      const perPageValue =
        (paginationSource?.per_page as number | undefined) ??
        (paginationSource?.perPage as number | undefined) ??
        (paginationSource?.limit as number | undefined) ??
        perPage;

      const totalPages =
        (paginationSource?.total_pages as number | undefined) ??
        (paginationSource?.last_page as number | undefined) ??
        (perPageValue ? Math.max(1, Math.ceil(total / perPageValue)) : 1);

      setPagination({
        current_page:
          (paginationSource?.current_page as number | undefined) ??
          (paginationSource?.page as number | undefined) ??
          page,
        per_page: perPageValue,
        total_pages: totalPages,
        total,
      });
    } catch (error: unknown) {
      console.error("Failed to load IB requests:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load IB requests";
      toast.error(errorMessage);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, search]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const openActionDialog = useCallback(
    (request: AdminIbRequest, type: "approve" | "reject") => {
      setActionType(type);
      setActionRequest(request);
      setProcessingId(null);

      const defaultIbName = request.ib_name ?? deriveFullName(request);
      setActionIbName(defaultIbName === "—" ? "" : defaultIbName);
      setActionComment(
        type === "reject"
          ? ""
          : deriveAdminComment(request) ?? "",
      );
    },
    [],
  );

  const closeActionDialog = useCallback(() => {
    setActionRequest(null);
    setActionComment("");
    setActionIbName("");
    setProcessingId(null);
  }, []);

  const handleActionSubmit = useCallback(async () => {
    if (!token || !actionRequest) {
      return;
    }

    const identifier = deriveRequestId(actionRequest);

    if (identifier === null) {
      toast.error("Unable to determine the request identifier.");
      return;
    }

    const comment = actionComment.trim();
    const ibName = actionIbName.trim();

    if (actionType === "approve" && !ibName) {
      toast.error("IB name is required to approve the request.");
      return;
    }

    if (actionType === "reject" && comment.length < 5) {
      toast.error("Please provide a rejection comment (minimum 5 characters).");
      return;
    }

    try {
      setProcessingId(identifier);

      await adminIbRequestsApi.updateStatus(
        identifier,
        {
          status: actionType === "approve" ? 1 : 2,
          ib_name: ibName || undefined,
          admin_comment: comment || undefined,
        },
        token,
      );

      toast.success(
        actionType === "approve"
          ? "IB request approved successfully."
          : "IB request rejected successfully.",
      );

      closeActionDialog();
      await loadRequests();
    } catch (error: unknown) {
      console.error("Failed to update IB request:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update request status";
      toast.error(errorMessage);
    } finally {
      setProcessingId(null);
    }
  }, [
    token,
    actionRequest,
    actionType,
    actionComment,
    actionIbName,
    closeActionDialog,
    loadRequests,
  ]);

  const columns: ColumnDef<AdminIbRequest>[] = useMemo(
    () => [
      {
        id: "request",
        header: "Request",
        accessorFn: (row) => deriveRequestId(row) ?? "—",
        cell: ({ row }) => {
          const request = row.original;
          const identifier = deriveRequestId(request);
          const ibName = request.ib_name;

          return (
            <div className="space-y-1">
              <div className="font-medium">
                {identifier !== null ? `#${identifier}` : "—"}
              </div>
              {ibName ? (
                <div className="text-sm text-muted-foreground">{ibName}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "applicant",
        header: "Applicant",
        cell: ({ row }) => {
          const request = row.original;
          const fullName = deriveFullName(request);
          const email = deriveEmail(request);
          const phone = derivePhone(request);

          return (
            <div className="space-y-1 text-sm">
              <div className="font-medium">{fullName}</div>
              <div className="text-xs text-muted-foreground">{email}</div>
              <div className="text-xs text-muted-foreground">{phone}</div>
            </div>
          );
        },
      },
      {
        id: "notes",
        header: "Notes",
        cell: ({ row }) => {
          const request = row.original;
          const userNotes = deriveUserNotes(request);
          const adminComment = deriveAdminComment(request);

          if (!userNotes && !adminComment) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }

          return (
            <div className="space-y-2 text-sm leading-relaxed">
              {userNotes ? (
                <div>
                  <span className="font-medium text-foreground">User:</span>{" "}
                  <span className="text-muted-foreground">{userNotes}</span>
                </div>
              ) : null}
              {adminComment ? (
                <div>
                  <span className="font-medium text-foreground">Admin:</span>{" "}
                  <span className="text-muted-foreground">{adminComment}</span>
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => asStatusCode(row),
        cell: ({ row }) => {
          const request = row.original;
          const statusCode = asStatusCode(request);
          return getStatusBadge(statusCode);
        },
      },
      {
        id: "created_at",
        header: "Created",
        cell: ({ row }) => {
          const request = row.original;
          const req = request as AdminIbRequest & Record<string, unknown>;
          const createdAt =
            request.created_at ??
            (req.createdAt as string | undefined) ??
            (req.submitted_at as string | undefined) ??
            (req.requested_at as string | undefined) ??
            null;

          return (
            <div className="text-sm text-muted-foreground">
              {formatDateTime(createdAt)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const request = row.original;
          const statusCode = asStatusCode(request);
          const identifier = deriveRequestId(request);
          const isProcessing = processingId !== null && identifier === processingId;

          if (statusCode !== 0) {
            return (
              <span className="text-sm text-muted-foreground">
                {statusCode === 1 ? "Approved" : "Rejected"}
              </span>
            );
          }

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => openActionDialog(request, "approve")}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openActionDialog(request, "reject")}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [processingId, openActionDialog],
  );

  const renderTableSection = () => {
    if (loading && requests.length === 0) {
      return <TableSectionSkeleton columnCount={6} rowCount={9} />;
    }

    if (!loading && requests.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No IB Requests
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no Introducing Broker requests matching your filters. Adjust the
            filters or refresh to check for new submissions.
          </p>
          <Button variant="outline" onClick={loadRequests} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <AppDataTable<AdminIbRequest>
        data={requests}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => {
          const identifier =
            deriveRequestId(row) ??
            row.uuid ??
            ((row as AdminIbRequest & Record<string, unknown>).request_uuid as string | number | undefined) ??
            `${row.created_at ?? row.ib_name ?? Math.random().toString(36).slice(2)}`;
          return String(identifier);
        }}
      />
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">IB Requests</h1>
              <p className="text-sm text-muted-foreground">
                Review and process Introducing Broker applications submitted by users.
              </p>
            </div>
            <Button variant="outline" onClick={loadRequests} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);
                    debouncedApplySearch(value);
                  }}
                  placeholder="Search by name, email, or phone"
                  className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                {searchInput ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      void setSearch(null);
                      void setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

              <Select
                value={statusFilter ?? "all"}
                onValueChange={(value) => {
                  void setStatusFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing page {pagination.current_page} of {pagination.total_pages} •{" "}
              {pagination.total} total requests
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {renderTableSection()}
          </div>
        </div>
      </div>

      <Dialog open={Boolean(actionRequest)} onOpenChange={(open) => (open ? null : closeActionDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve IB Request" : "Reject IB Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Confirm the IB name and optionally add an internal note before approving this request."
                : "Provide a reason that will be shared with the applicant about why the request is rejected."}
            </DialogDescription>
          </DialogHeader>

          {actionRequest ? (
            <div className="space-y-6">
              <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium text-foreground">
                  {deriveFullName(actionRequest)}
                </div>
                <div className="text-muted-foreground">
                  {deriveEmail(actionRequest)} • {derivePhone(actionRequest)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Request ID: {deriveRequestId(actionRequest) ?? "—"}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="ib-name" className="text-sm font-medium">
                  IB Name {actionType === "approve" ? "*" : "(optional)"}
                </label>
                <Input
                  id="ib-name"
                  value={actionIbName}
                  onChange={(event) => setActionIbName(event.target.value)}
                  placeholder="Enter the display name for this IB"
                />
                {actionType === "approve" ? (
                  <p className="text-xs text-muted-foreground">
                    This name will be stored on the partner profile after approval.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="admin-comment" className="text-sm font-medium">
                  {actionType === "approve" ? "Admin Comment (optional)" : "Rejection Comment *"}
                </label>
                <Textarea
                  id="admin-comment"
                  value={actionComment}
                  onChange={(event) => setActionComment(event.target.value)}
                  rows={4}
                  placeholder={
                    actionType === "approve"
                      ? "Add any internal notes (optional)"
                      : "Explain why this request is being rejected"
                  }
                />
                {actionType === "reject" ? (
                  <p className="text-xs text-muted-foreground">
                    Minimum 5 characters. This message is shared with the applicant.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeActionDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleActionSubmit}
              disabled={
                processingId !== null ||
                (actionType === "approve" && !actionIbName.trim()) ||
                (actionType === "reject" && actionComment.trim().length < 5)
              }
            >
              {processingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Request
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
