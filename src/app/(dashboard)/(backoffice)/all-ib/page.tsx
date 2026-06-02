"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  CheckCircle2,
  Eye,
  Loader2,
  RefreshCw,
  UserCheck,
  XCircle,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { adminIbPlansApi, adminIbRequestsApi, type AdminIbPlanItem, type AdminIbRequest } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "0" },
  { label: "Approved", value: "1" },
  { label: "Rejected", value: "2" },
];

type IbPlanOption = {
  id: string;
  name: string;
  status: string;
};

const normalizeIbPlanOption = (plan: AdminIbPlanItem): IbPlanOption => ({
  id: String(plan.id),
  name: plan.name ?? `IB Plan ${plan.id}`,
  status: String(plan.status ?? ""),
});

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
  return formatDateTimeInIST(value);
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

const deriveIbPlanId = (request: AdminIbRequest) => {
  const req = request as AdminIbRequest & Record<string, unknown>;
  const candidates = [
    req.ib_plan_id,
    req.ibPlanId,
    req.plan_id,
    req.planId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return "";
};

export default function IbManagementPage() {
  const { token } = useAuth();

  const [requests, setRequests] = useState<AdminIbRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total_pages: 1,
    total: 0,
  });

  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "review">("approve");
  const [selectedDecision, setSelectedDecision] = useState<"approve" | "reject">("approve");
  const [actionRequest, setActionRequest] = useState<AdminIbRequest | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [ibPlans, setIbPlans] = useState<IbPlanOption[]>([]);
  const [loadingIbPlans, setLoadingIbPlans] = useState(false);
  const [selectedIbPlanId, setSelectedIbPlanId] = useState("");

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

  const loadRequests = useCallback(async () => {
    if (!token) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

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
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB requests", action: "load" })
      );
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, search]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const loadIbPlans = useCallback(async () => {
    if (!token) {
      setIbPlans([]);
      return;
    }

    try {
      setLoadingIbPlans(true);
      const response = await adminIbPlansApi.list({ token });
      const plans = Array.isArray(response?.data) ? response.data : [];
      setIbPlans(plans.map(normalizeIbPlanOption));
    } catch (error: unknown) {
      console.error("Failed to load IB plans:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB plans", action: "load" })
      );
      setIbPlans([]);
    } finally {
      setLoadingIbPlans(false);
    }
  }, [token]);

  useEffect(() => {
    void loadIbPlans();
  }, [loadIbPlans]);

  const openActionDialog = useCallback(
    (request: AdminIbRequest, type: "approve" | "reject" | "review") => {
      setActionType(type);
      setActionRequest(request);
      setProcessingId(null);

      const statusCode = asStatusCode(request);
      const nextDecision = type === "review" ? (statusCode === 2 ? "reject" : "approve") : type;
      setSelectedDecision(nextDecision);

      if (type === "reject") {
        setActionComment("");
        setSelectedIbPlanId("");
        return;
      }

      setActionComment(deriveAdminComment(request) ?? "");
      const existingPlanId = deriveIbPlanId(request);
      setSelectedIbPlanId(existingPlanId || ibPlans[0]?.id || "");
    },
    [ibPlans],
  );

  const closeActionDialog = useCallback(() => {
    setActionRequest(null);
    setSelectedDecision("approve");
    setActionComment("");
    setSelectedIbPlanId("");
    setProcessingId(null);
  }, []);

  const performStatusUpdate = useCallback(async (nextAction: "approve" | "reject") => {
    if (!token || !actionRequest) {
      return;
    }

    const identifier = deriveRequestId(actionRequest);

    if (identifier === null) {
      toast.error("Unable to determine the request identifier.");
      return;
    }

    const comment = actionComment.trim();
    const resolvedIbNameRaw = actionRequest.ib_name ?? deriveFullName(actionRequest);
    const ibName = resolvedIbNameRaw === "—" ? "" : String(resolvedIbNameRaw).trim();
    const ibPlanId = selectedIbPlanId.trim();

    if (nextAction === "approve" && !ibPlanId) {
      toast.error("Please select an IB plan");
      return;
    }

    try {
      setProcessingId(identifier);

      const body =
        nextAction === "approve"
          ? {
              status: 1,
              ib_name: ibName,
              admin_comment: comment || undefined,
              ib_plan_id: Number(ibPlanId),
            }
          : {
              status: 2,
              admin_comment: comment,
            };

      await adminIbRequestsApi.updateStatus(
        identifier,
        body,
        token,
      );

      toast.success(
        nextAction === "approve"
          ? "IB request approved successfully."
          : "IB request rejected successfully.",
      );

      closeActionDialog();
      await loadRequests();
    } catch (error: unknown) {
      console.error("Failed to update IB request:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB requests", action: "update" })
      );
    } finally {
      setProcessingId(null);
    }
  }, [
    token,
    actionRequest,
    actionComment,
    selectedIbPlanId,
    closeActionDialog,
    loadRequests,
  ]);

  const handleActionSubmit = useCallback(async () => {
    await performStatusUpdate(selectedDecision);
  }, [performStatusUpdate, selectedDecision]);

  const columns: ColumnDef<AdminIbRequest>[] = useMemo(
    () => [
      {
        id: "request",
        header: "Sr. No.",
        accessorFn: (_row, index) => index + 1,
        cell: ({ row }) => {
          const request = row.original;
          const ibName = request.ib_name;

          return (
            <div className="space-y-1"> 
              <div className="font-medium">
                {(row.index ?? 0) + 1}
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
          const request = row.original as Record<string, unknown>;
          
          const createdAt =
            request.created_at_ist ??
            request.created_at ??
            request.createdAt ??
            request.submitted_at ??
            request.requested_at ??
            null;

          return (
            <div className="text-sm text-muted-foreground">
              {formatDateTime(createdAt as string | null)}
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
          const identifier = deriveRequestId(request);
          const isProcessing = processingId !== null && identifier === processingId;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openActionDialog(request, "review")}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Review
            </Button>
          );
        },
      },
    ],
    [processingId, openActionDialog],
  );

  const currentStatusCode = actionRequest ? asStatusCode(actionRequest) : null;
  const isReviewMode = actionType === "review";
  const isApproveDecision = selectedDecision === "approve";
  const dialogTitle =
    isReviewMode
      ? currentStatusCode === 1
        ? "Review Approved IB"
        : "Review Rejected IB"
      : "Update IB Request";
  const dialogDescription =
    isReviewMode
      ? "Use the decision selector to move this IB request between approved and rejected states."
      : "Choose the final decision inside the modal, then save it.";

  const renderTableSection = () => {
    if (loadError && requests.length === 0) {
      return (
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="IB requests"
          action="load"
          onRetry={() => {
            void loadRequests();
          }}
        />
      );
    }

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
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <UserCheck className="h-6 w-6 text-primary" />
                IB Requests
              </h1>
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
              <ApiSearchBar
                value={search ?? ""}
                onChange={(value) => setSearch(value)}
                onSearch={(value) => {
                  void setPage(1);
                  void setSearch(value.trim() ? value : null);
                }}
                placeholder="Search by name, email, or phone"
                minimumLength={3}
                delay={300}
              />

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
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
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
                {/* <div className="text-xs text-muted-foreground">
                  Request ID: {deriveRequestId(actionRequest) ?? "—"}
                </div> */}
              </div>

              {isReviewMode ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2.5 text-sm">
                  <span className="font-medium text-foreground">Current decision</span>
                  {getStatusBadge(currentStatusCode ?? 0)}
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Decision</label>
                <Tabs
                  value={selectedDecision}
                  onValueChange={(value) => {
                    if (value === "approve" || value === "reject") {
                      setSelectedDecision(value);
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
                <label htmlFor="admin-comment" className="text-sm font-medium">
                  {isApproveDecision ? "Admin Comment (optional)" : "Rejection Comment (optional)"}
                </label>
                <Textarea
                  id="admin-comment"
                  value={actionComment}
                  onChange={(event) => setActionComment(event.target.value)}
                  rows={4}
                  placeholder={
                    isApproveDecision
                      ? "Add any internal notes (optional)"
                      : "Explain why this request is being rejected (optional)"
                  }
                />
                {!isApproveDecision ? (
                  <p className="text-xs text-muted-foreground">
                    Leave this empty if you do not want to send a rejection note.
                  </p>
                ) : null}
              </div>

              {isApproveDecision ? (
                <div className="space-y-2">
                  <label htmlFor="ib-plan-id" className="text-sm font-medium">
                    IB Plan
                  </label>
                  <Select
                    value={selectedIbPlanId}
                    onValueChange={setSelectedIbPlanId}
                    disabled={loadingIbPlans || ibPlans.length === 0}
                  >
                    <SelectTrigger id="ib-plan-id">
                      <SelectValue placeholder={loadingIbPlans ? "Loading plans..." : "Select IB plan"} />
                    </SelectTrigger>
                    <SelectContent>
                      {ibPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!loadingIbPlans && ibPlans.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No IB plans available.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-3 pt-2 sm:justify-end">
            <Button variant="outline" onClick={closeActionDialog} className="px-5">
              Cancel
            </Button>
            <Button
              variant={isApproveDecision ? "default" : "destructive"}
              onClick={handleActionSubmit}
              className="px-5"
              disabled={processingId !== null || (isApproveDecision && !selectedIbPlanId)}
            >
              {processingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isApproveDecision ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Save as Approved
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Save as Rejected
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
