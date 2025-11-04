"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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

import { Eye, CheckCircle2, XCircle, Calendar, FileText } from "lucide-react";

import { adminKycApi, API_BASE_URL, kycFileUrl } from "@/lib/api";
// If you already have auth context, import it. Fallback to localStorage token.
import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";

/* ---------------- Types (based on your response) ---------------- */
type DocStatusNum = 0 | 1 | 2; // 0 pending, 1 approved, 2 rejected
type DocKey = "poi_front_file_status" | "poa_front_file_status" | "poa_back_file_status" | "other_file_status";

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
    kyc_status: string; // keep for backward compat
  };
  submitted_at: string;
  summary: any;
  documents: Record<
    DocKey,
    {
      status: DocStatusNum;
      comment: string;
      file: string;
    }
  >;
  rejection_comments?: Partial<Record<DocKey, string>>;
  kyc_status?: string; // <-- NEW: top-level kyc_status from API
};


/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
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

const numToWord = (n: DocStatusNum) => (n === 1 ? "approved" : n === 2 ? "rejected" : "pending");

const wordToNum = (w: string): DocStatusNum => (w === "approved" ? 1 : w === "rejected" ? 2 : 0);

/* ---------------- Page ---------------- */
export default function UserVerificationPage() {
  const { token: ctxToken } = useAuth?.() ?? { token: undefined };
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("token") || "" : "");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | number>("attention"); // default to "attention"

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

  const loadList = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Use the status filter value for API call
      const res = await adminKycApi.listPending(statusFilter, token);
      const items = (res?.data as any)?.items ?? [];
      setRows(items as ListRow[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load KYC list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = useCallback(
    async (user_uuid: string) => {
      if (!token) return;
      setOpen(true);
      setDetailLoading(true);
      setDetail(null);
      try {
        const res = await adminKycApi.getUserKyc(user_uuid, token);
        const d = (res.data || {}) as UserKycDetail;
        setDetail(d);
        // seed local states
        const init: Record<DocKey, DocStatusNum> = {
          poi_front_file_status: d.documents?.poi_front_file_status?.status ?? 0,
          poa_front_file_status: d.documents?.poa_front_file_status?.status ?? 0,
          poa_back_file_status: d.documents?.poa_back_file_status?.status ?? 0,
          other_file_status: d.documents?.other_file_status?.status ?? 0,
        };
        setDocStatuses(init);
        const initC: Partial<Record<DocKey, string>> = {
          poi_front_file_status: d.documents?.poi_front_file_status?.comment || "",
          poa_front_file_status: d.documents?.poa_front_file_status?.comment || "",
          poa_back_file_status: d.documents?.poa_back_file_status?.comment || "",
          other_file_status: d.documents?.other_file_status?.comment || "",
        };
        setDocComments(initC);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Failed to load user KYC");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const columns: ColumnDef<ListRow>[] = useMemo(
    () => [
      {
        id: "uuid",
        header: "UUID",
        accessorKey: "uuid",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.uuid}</span>,
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
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="View"
            onClick={() => openDetail(row.original.uuid)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [openDetail]
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

  const docs: Record<string, any> = {};

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
    const payload = buildReviewPayload();
    if (!payload || Object.keys(payload.documents).length === 0) {
      toast("No changes to submit.");
      return;
    }
    try {
      const res = await adminKycApi.review(payload as any, token);
      toast.success(res.message || "Review updated");
      // Optimistic refresh
      await loadList();
      refreshRowInList(detail.user.uuid, {
        kyc_status: (res.data as any)?.summary?.kyc_status ?? detail.user.kyc_status,
      });
      setOpen(false);
      setDetail(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to submit review");
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (newStatus: string) => {
    // Map string values to API values
    let statusValue: string | number = "attention";
    if (newStatus === "pending") statusValue = 0;
    else if (newStatus === "approved") statusValue = 1;
    else if (newStatus === "rejected") statusValue = 2;
    
    setStatusFilter(statusValue);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <MainLayout>
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Verification (KYC)</h1>
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
            value={statusFilter === "attention" ? "attention" : 
                   statusFilter === 0 ? "pending" : 
                   statusFilter === 1 ? "approved" : "rejected"}
            onValueChange={handleStatusFilterChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="attention">All (Pending + Rejected)</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <AppDataTable<ListRow> data={rows} columns={columns} pageCount={1} advanced />
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
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle className="flex items-center justify-between w-full">
          <span>KYC Details</span>
          {detail ? statusPill(String(detail.kyc_status)) : null}
          </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center h-40">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !detail ? (
            <div className="text-sm text-muted-foreground">No data.</div>
          ) : (
            <div className="space-y-6">
              {/* User summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">User</p>
                  <div className="mt-1 text-sm">
                    <div><span className="text-muted-foreground">Name: </span>{detail.user.name || "—"}</div>
                    <div><span className="text-muted-foreground">Email: </span>{detail.user.email}</div>
                    <div><span className="text-muted-foreground">UUID: </span><span className="font-mono">{detail.user.uuid}</span></div>
                  </div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{fmtDateTime(detail.submitted_at)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents grid with Approve/Reject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(docLabel) as DocKey[]).map((k) => {
                  const doc = detail.documents?.[k];
                  const url = kycFileUrl(doc?.file);
                  const current = docStatuses[k];
                  return (
                    <div key={k} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{docLabel[k]}</div>
                        <div className="text-xs text-muted-foreground">
                          Current: {numToWord(doc?.status ?? 0)}
                        </div>
                      </div>

                      <div className="rounded-md border bg-background p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {url ? (
                          <img src={url} alt={doc?.file} className="max-h-60 w-auto object-contain" />
                        ) : (
                          <span className="text-sm text-muted-foreground">No file</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className={current === 1 ? "bg-green-600 hover:bg-green-700" : ""}
                          variant={current === 1 ? "default" : "outline"}
                          onClick={() => setDocStatuses((s) => ({ ...s, [k]: 1 }))}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant={current === 2 ? "destructive" : "outline"}
                          onClick={() => setDocStatuses((s) => ({ ...s, [k]: 2 }))}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant={current === 0 ? "default" : "outline"}
                          onClick={() => setDocStatuses((s) => ({ ...s, [k]: 0 }))}
                        >
                          Set Pending
                        </Button>
                      </div>

                      {/* Comment (only needed for reject, but allow always) */}
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Comment (required if rejecting)
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Add a reason if rejected (e.g. Blurry document)"
                          value={docComments[k] || ""}
                          onChange={(e) =>
                            setDocComments((c) => ({ ...c, [k]: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Button onClick={submitReview}>Save Review</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MainLayout>
  );
}