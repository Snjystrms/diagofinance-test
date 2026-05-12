"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Eye, CheckCircle2, XCircle, Calendar, FileText, User, Mail, Hash, Clock, AlertCircle, Shield, Image as ImageIcon } from "lucide-react";

import { adminKycApi, kycFileUrl } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
// If you already have auth context, import it. Fallback to localStorage token.
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

/* ---------------- Types (based on your response) ---------------- */
type DocStatusNum = 0 | 1 | 2; // 0 pending, 1 approved, 2 rejected
type DocKey = "poi_front_file_status" | "poa_front_file_status" | "poa_back_file_status" | "other_file_status";
type DocFileKey = "poi_front_file" | "poa_front_file" | "poa_back_file" | "other_file";

type ListRow = {
  uuid: string;
  name: string;
  email: string;
  kyc_status: "none" | "full-verified" | "semi-verified" | "pending" | "approved" | "rejected" | string;
  submitted_at: string;
  documents: Record<
    DocKey,
    {
      status: DocStatusNum;
      comment: string;
      file: string;
      url?: string;
    }
  >;
};

type UserKycDetail = {
  user: {
    uuid: string;
    name: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    kyc_status?: string; // keep for backward compat
    verification_status?: string;
  };
  submitted_at: string;
  summary: Record<string, unknown>;
  documents: Record<
    DocKey,
    {
      status: DocStatusNum;
      comment: string;
      file: string;
      url?: string;
    }
  >;
  document_files?: Partial<Record<DocFileKey, string>>;
  document_urls?: Partial<Record<DocFileKey, string>>;
  rejection_comments?: Partial<Record<DocKey, string>>;
  kyc_status?: string; // <-- NEW: top-level kyc_status from API
};

type KycStatusOption = {
  value: string;
  label: string;
  featureKey: string | string[];
  statuses: string[];
};

const KYC_STATUS_OPTIONS: KycStatusOption[] = [
  {
    value: "0",
    label: "Pending",
    featureKey: "pendingDocumentsList",
    statuses: ["pending"],
  },
  {
    value: "1",
    label: "Approved",
    featureKey: "approveDocumentsList",
    statuses: ["approved", "full-verified", "semi-verified"],
  },
  {
    value: "2",
    label: "Rejected",
    featureKey: "rejectDocumentList",
    statuses: ["rejected"],
  },
];


/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try {
    return formatDateTimeInIST(s);
  } catch {
    return s;
  }
};

const formatStatusLabel = (v: string) => {
  switch (v) {
    case "full-verified":
      return "full-verified";
    case "semi-verified":
      return "semi-verified";
    case "pending":
      return "pending";
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "none":
    default:
      return "none";
  }
};

const statusPill = (v: string) => {
  const label = formatStatusLabel(v);
  switch (v) {
    case "full-verified":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          {label}
        </Badge>
      );
    case "semi-verified":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          {label}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          {label}
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          {label}
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {label}
        </Badge>
      );
    case "none":
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
};

const docLabel: Record<DocKey, string> = {
  poi_front_file_status: "POI (Front)",
  poa_front_file_status: "POA (Front)",
  poa_back_file_status: "POA (Back)",
  other_file_status: "Other",
};

const docFileKeyByStatusKey: Record<DocKey, DocFileKey> = {
  poi_front_file_status: "poi_front_file",
  poa_front_file_status: "poa_front_file",
  poa_back_file_status: "poa_back_file",
  other_file_status: "other_file",
};

const numToWord = (n: DocStatusNum) => (n === 1 ? "approved" : n === 2 ? "rejected" : "pending");

const wordToNum = (w: string): DocStatusNum => (w === "approved" ? 1 : w === "rejected" ? 2 : 0);

const normalizeDocStatus = (value: unknown): DocStatusNum => {
  if (value === 1 || value === "1" || value === "approved") return 1;
  if (value === 2 || value === "2" || value === "rejected") return 2;
  return 0;
};

const normalizeKycDetail = (raw: UserKycDetail): UserKycDetail => {
  const normalizedDocuments = {} as UserKycDetail["documents"];

  (Object.keys(docLabel) as DocKey[]).forEach((docKey) => {
    const fileKey = docFileKeyByStatusKey[docKey];
    const rawEntry = raw.documents?.[docKey] as
      | { status?: unknown; comment?: string; file?: string | null; url?: string | null }
      | DocStatusNum
      | null
      | undefined;
    const nestedEntry =
      rawEntry && typeof rawEntry === "object" ? rawEntry : undefined;
    const file = nestedEntry?.file ?? raw.document_files?.[fileKey] ?? "";
    const url =
      nestedEntry?.url ??
      raw.document_urls?.[fileKey] ??
      (file ? kycFileUrl(file) : undefined);

    normalizedDocuments[docKey] = {
      status: normalizeDocStatus(nestedEntry?.status ?? rawEntry),
      comment: nestedEntry?.comment ?? raw.rejection_comments?.[docKey] ?? "",
      file,
      url,
    };
  });

  return {
    ...raw,
    user: {
      ...raw.user,
      kyc_status:
        raw.user?.kyc_status ??
        raw.user?.verification_status ??
        raw.kyc_status ??
        "none",
    },
    kyc_status: raw.kyc_status ?? raw.user?.verification_status ?? raw.user?.kyc_status ?? "none",
    documents: normalizedDocuments,
  };
};

/* ---------------- Page ---------------- */
export default function UserVerificationPage() {
  const { token: ctxToken } = useAuth?.() ?? { token: undefined };
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");

  const { isAdmin, isManager, hasFeature, filterFeatureOptions } = useManagerPermissions();

  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("1");

  // modal
  const [open, setOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<UserKycDetail | null>(null);

  // local edit state for per-doc status + comment
  const [docStatuses, setDocStatuses] = useState<Record<DocKey, DocStatusNum>>({
    poi_front_file_status: 0,
    poa_front_file_status: 0,
    poa_back_file_status: 0,
    other_file_status: 0,
  });
  const [docComments, setDocComments] = useState<Partial<Record<DocKey, string>>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const statusFeatureOptions = useMemo(
    () =>
      filterFeatureOptions("userManagement", KYC_STATUS_OPTIONS).map((opt) => ({
        ...opt,
        normalizedStatuses: opt.statuses.map((status) => status.toLowerCase()),
      })),
    [filterFeatureOptions]
  );

  const allowedStatusValues = useMemo(
    () => statusFeatureOptions.map((opt) => opt.value),
    [statusFeatureOptions]
  );

  const allowedKycStatusesSet = useMemo(() => {
    const set = new Set<string>();
    statusFeatureOptions.forEach((opt) => {
      opt.normalizedStatuses.forEach((status) => set.add(status));
    });
    return set;
  }, [statusFeatureOptions]);

  const canReview = useMemo(
    () => hasFeature("userManagement", "approveRejectKyc"),
    [hasFeature]
  );

  const canViewKycStatus = useCallback(
    (status: string) => {
      if (isAdmin || !isManager) return true;
      return allowedKycStatusesSet.has((status || "").toLowerCase());
    },
    [isAdmin, isManager, allowedKycStatusesSet]
  );

  const loadList = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setLoadError(null);
      const res = await adminKycApi.listPending(Number(statusFilter), token);
      const data = res?.data as { items?: ListRow[] } | undefined;
      const items = data?.items ?? [];
      setRows(items);
    } catch (e: unknown) {
      console.error(e);
      setLoadError(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "KYC submissions", action: "load" })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

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
    if (!allowedStatusValues.includes(statusFilter)) {
      setStatusFilter(statusFeatureOptions[0].value);
    }
  }, [isManager, statusFeatureOptions, allowedStatusValues, statusFilter]);

  const filteredRows = useMemo(() => {
    if (!isManager) return rows;
    if (!statusFeatureOptions.length || statusFilter === "none") {
      return [];
    }
    const option = statusFeatureOptions.find((opt) => opt.value === statusFilter);
    if (!option) {
      return rows.filter((row) => allowedKycStatusesSet.has((row.kyc_status || "").toLowerCase()));
    }
    const allowedSet = new Set(option.normalizedStatuses);
    return rows.filter((row) => allowedSet.has((row.kyc_status || "").toLowerCase()));
  }, [rows, isManager, statusFeatureOptions, statusFilter, allowedKycStatusesSet]);

  const statusSelectDisabled = isManager && !statusFeatureOptions.length;
  const statusSelectValue = statusFilter === "none" ? undefined : statusFilter;

  const openDetail = useCallback(
    async (user_uuid: string) => {
      if (!token) return;
      setOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await adminKycApi.getUserKyc(user_uuid, token);
        const d = normalizeKycDetail((res.data || {}) as UserKycDetail);
        setDetail(d);
        // seed local states
        const init: Record<DocKey, DocStatusNum> = {
          poi_front_file_status: d.documents.poi_front_file_status.status,
          poa_front_file_status: d.documents.poa_front_file_status.status,
          poa_back_file_status: d.documents.poa_back_file_status.status,
          other_file_status: d.documents.other_file_status.status,
        };
        setDocStatuses(init);
        const initC: Partial<Record<DocKey, string>> = {
          poi_front_file_status: d.documents.poi_front_file_status.comment || "",
          poa_front_file_status: d.documents.poa_front_file_status.comment || "",
          poa_back_file_status: d.documents.poa_back_file_status.comment || "",
          other_file_status: d.documents.other_file_status.comment || "",
        };
        setDocComments(initC);
      } catch (e: unknown) {
        console.error(e);
        toast.error(
          getAdminFriendlyErrorMessage(e, { resource: "KYC details", action: "load" })
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const columns: ColumnDef<ListRow>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
        enableSorting: false,
      },
      {
        id: "name",
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">{row.original.name || "—"}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      },
      {
        id: "kyc_status",
        header: "KYC Status",
        accessorKey: "kyc_status",
        cell: ({ row }) => statusPill(String(row.original.kyc_status)),
        meta: {
          label: "KYC Status",
          variant: "select",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" }
          ]
        },
        filterFn: (row, id, value) => {
          // Custom filter function if needed
          return true;
        }
      },
      {
        id: "submitted_at",
        header: "Submitted",
        accessorKey: "submitted_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{fmtDateTime(row.original.submitted_at)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const canView = canViewKycStatus(row.original.kyc_status);
          return (
            <Button
              variant="ghost"
              size="icon"
              aria-label="View"
              onClick={() => {
                if (canView) openDetail(row.original.uuid);
              }}
              disabled={!canView}
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
        },
      },
    ],
    [openDetail, canViewKycStatus]
  );

  const refreshRowInList = (user_uuid: string, next?: Partial<ListRow>) => {
    setRows((r) =>
      r.map((it) => (it.uuid === user_uuid ? { ...it, ...next } as ListRow : it))
    );
  };

const buildReviewPayload = () => {
  if (!detail?.user?.uuid) {
    toast.error("User UUID missing for this review");
    return null;
  }

  const docs: Record<string, "pending" | "approved" | "rejected" | { status: "pending" | "approved" | "rejected"; comment?: string }> = {};

  (Object.keys(docStatuses) as DocKey[]).forEach((k) => {
    const nowNum = docStatuses[k];
    const nowWord = numToWord(nowNum);
    const comment = (docComments[k] || "").trim();

    if (nowWord === "rejected" && !comment) {
      toast.error(`Please add a comment for ${docLabel[k]} (rejected)`);
      return;
    }

    // include if explicitly changed or has rejection comment
    docs[k] = comment ? { status: nowWord, comment } : nowWord;
  });

  return {
    user_uuid: detail.user.uuid,
    documents: docs,
  };
};


  const submitReview = async () => {
    if (!token || !detail) return;
    if (!canReview) {
      toast.error("You do not have permission to update KYC status");
      return;
    }
    const payload = buildReviewPayload();
    if (!payload || Object.keys(payload.documents).length === 0) {
      toast("No changes to submit.");
      return;
    }
    try {
      const res = await adminKycApi.review(payload, token);
      toast.success(res.message || "Review updated");
      // Optimistic refresh
      await loadList();
      refreshRowInList(detail.user.uuid, {
        kyc_status: ((res.data as { summary?: { kyc_status?: string } })?.summary?.kyc_status) ?? detail.user.kyc_status,
      });
      setOpen(false);
      setDetail(null);
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "KYC review", action: "submit" })
      );
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
  };

  if (!isAdmin && isManager && !statusFeatureOptions.length) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          audience="admin"
          variant="panel"
          title="Access restricted"
          message="Your account does not have permission to view KYC submissions."
        />
        </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="KYC submissions"
          action="load"
          onRetry={() => {
            void loadList();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      
        <ListPageSkeleton
          actionCount={1}
          columnCount={4}
          rowCount={10}
          filterPillCount={2}
        />
      
    );
  }

  return (
    
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Shield className="h-6 w-6 text-primary" />
            User Verification (KYC)
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadList}>Refresh</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        {/* Status Filter Dropdown */}
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium">
            Filter by Status:
          </label>
          <Select
            value={statusSelectValue}
            onValueChange={handleStatusFilterChange}
            disabled={statusSelectDisabled}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {statusFeatureOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <AppDataTable<ListRow> data={filteredRows} columns={columns} pageCount={1} advanced />
      </div>

      {/* Detail / Review Modal */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setDetail(null);
            setDocComments({});
          }
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="flex items-center justify-between w-full text-xl">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                KYC Verification Details
              </span>
              {detail ? statusPill(String(detail.kyc_status)) : null}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <BackofficeDetailDialogSkeleton fieldCount={8} sectionCount={2} className="py-2" />
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No KYC data available.</p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* User summary - Enhanced */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/40">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">User Information</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="text-sm font-medium">{detail.user.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium break-all">{detail.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">UUID</p>
                        <p className="text-sm font-mono font-medium">{detail.user.uuid}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Submission Details</p>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Submitted At</p>
                        <p className="text-sm font-medium">{fmtDateTime(detail.submitted_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1">
                          {statusPill(String(detail.kyc_status))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Documents grid with Approve/Reject - Enhanced */}
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Verification
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Review and approve or reject each submitted document
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(docLabel) as DocKey[]).map((k) => {
                    const doc = detail.documents?.[k];
                    const url = doc?.url || (doc?.file ? kycFileUrl(doc.file) : null);
                    const current = docStatuses[k];
                    const statusWord = numToWord(doc?.status ?? 0);
                    const isApproved = current === 1;
                    const isRejected = current === 2;
                    const isPending = current === 0;
                    
                    return (
                      <div 
                        key={k} 
                        className={`rounded-lg border-2 p-4 space-y-4 transition-all ${
                          isApproved 
                            ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" 
                            : isRejected
                            ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                            : "border-gray-200 dark:border-gray-700 bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${
                              isApproved 
                                ? "bg-green-100 dark:bg-green-950/40" 
                                : isRejected
                                ? "bg-red-100 dark:bg-red-950/40"
                                : "bg-gray-100 dark:bg-gray-800"
                            }`}>
                              <ImageIcon className={`h-4 w-4 ${
                                isApproved 
                                  ? "text-green-600 dark:text-green-400" 
                                  : isRejected
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-gray-600 dark:text-gray-400"
                              }`} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{docLabel[k]}</div>
                              <div className="text-xs text-muted-foreground">
                                Current: <span className="font-medium capitalize">{statusWord}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-center min-h-[200px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {url || doc?.url ? (
                            <img 
                              src={doc?.url || url || ''} 
                              alt={doc?.file || ''} 
                              className="max-h-64 w-auto object-contain rounded-md shadow-sm cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => {
                                const imageUrl = doc?.url || url;
                                if (imageUrl) {
                                  setPreviewImage({
                                    url: imageUrl,
                                    label: docLabel[k]
                                  });
                                }
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ImageIcon className="h-12 w-12 opacity-50" />
                              <span className="text-sm">No document uploaded</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            className={`${
                              isApproved 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "hover:bg-green-50 dark:hover:bg-green-950/20"
                            }`}
                            variant={isApproved ? "default" : "outline"}
                            onClick={() => setDocStatuses((s) => ({ ...s, [k]: 1 }))}
                            disabled={!canReview}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className={`${
                              isRejected 
                                ? "bg-red-600 hover:bg-red-700 text-white" 
                                : "hover:bg-red-50 dark:hover:bg-red-950/20"
                            }`}
                            variant={isRejected ? "destructive" : "outline"}
                            onClick={() => setDocStatuses((s) => ({ ...s, [k]: 2 }))}
                            disabled={!canReview}
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className={`${
                              isPending 
                                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                                : "hover:bg-orange-50 dark:hover:bg-orange-950/20"
                            }`}
                            variant={isPending ? "default" : "outline"}
                            onClick={() => setDocStatuses((s) => ({ ...s, [k]: 0 }))}
                            disabled={!canReview}
                          >
                            <Clock className="h-4 w-4 mr-1.5" />
                            Pending
                          </Button>
                        </div>

                        {/* Comment section - Enhanced */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Review Comment {isRejected && <span className="text-red-600 dark:text-red-400">*</span>}
                          </label>
                          <Textarea
                            rows={3}
                            placeholder={isRejected ? "Required: Add rejection reason (e.g., Blurry document, Invalid ID)" : "Add any comments or notes about this document..."}
                            value={docComments[k] || ""}
                            onChange={(e) =>
                              setDocComments((c) => ({ ...c, [k]: e.target.value }))
                            }
                            disabled={!canReview}
                            className={`${
                              isRejected && !docComments[k] 
                                ? "border-red-300 dark:border-red-700 focus:border-red-500" 
                                : ""
                            }`}
                          />
                          {isRejected && !docComments[k] && (
                            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Comment is required when rejecting a document
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {canReview && (
                <Button 
                  onClick={submitReview} 
                  disabled={!canReview || detailLoading}
                  className="min-w-[120px]"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Review
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewImage?.label}</DialogTitle>
            <DialogDescription>
              Click outside or press ESC to close
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="flex items-center justify-center p-4">
              <img
                src={previewImage.url}
                alt={previewImage.label}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-border"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    
  );
}
