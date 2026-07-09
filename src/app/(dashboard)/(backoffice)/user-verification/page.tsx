"use client";

import { useEffect, useMemo, useState, useCallback, type ChangeEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { AuthenticatedDocumentViewer } from "@/components/authenticated-document-viewer";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { SearchSelectField } from "@/components/search-select-field";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {   Eye, CheckCircle2, XCircle, Calendar, FileText, User, Mail, Clock, AlertCircle, Shield, Image as ImageIcon, Plus, Upload, Download, ChevronDown, RefreshCw } from "lucide-react";

import { adminKycApi, adminUsersApi, kycFileUrl, type AdminUsersListApiData, type PendingUser } from "@/lib/api";
import { formatDateTime, formatApiDateTimeAsIST } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
// If you already have auth context, import it. Fallback to localStorage token.
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { useModuleCapabilities } from "@/hooks/use-permission-capabilities";

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

type AdminUserOption = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  mobile: string;
};

type KycUploadFormState = {
  poi_front_file: File | null;
  poa_front_file: File | null;
  poa_back_file: File | null;
  other_file: File | null;
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
    return formatApiDateTimeAsIST(s);
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

const primaryDocKeys: DocKey[] = [
  "poi_front_file_status",
  "poa_front_file_status",
  "poa_back_file_status",
];

const numToWord = (n: DocStatusNum) => (n === 1 ? "approved" : n === 2 ? "rejected" : "pending");

const normalizeDocStatus = (value: unknown): DocStatusNum => {
  if (value === 1 || value === "1" || value === "approved") return 1;
  if (value === 2 || value === "2" || value === "rejected") return 2;
  return 0;
};

const createEmptyKycUploadForm = (): KycUploadFormState => ({
  poi_front_file: null,
  poa_front_file: null,
  poa_back_file: null,
  other_file: null,
});

const transformUser = (raw: Record<string, unknown>): PendingUser => {
  const email = String(raw.email ?? "");
  const username =
    String(raw.username ?? "").trim() ||
    (email.includes("@") ? email.split("@")[0] : "");

  return {
    id: typeof raw.id === "number" ? raw.id : Number(raw.id ?? 0) || 0,
    uuid: String(raw.uuid ?? ""),
    first_name: String(raw.first_name ?? ""),
    last_name: String(raw.last_name ?? ""),
    name:
      `${String(raw.first_name ?? "")} ${String(raw.last_name ?? "")}`.trim() ||
      String(raw.name ?? "-"),
    email,
    username,
    mobile: String(raw.mobile ?? ""),
    country: String(raw.country ?? ""),
    country_code: String(raw.country_code ?? ""),
    sponsor_id: String(raw.sponsor_id ?? ""),
    sponsor_by: raw.sponsor_by == null ? null : String(raw.sponsor_by),
    referral_code: String(raw.referral_code ?? ""),
    status: String(raw.status ?? ""),
    two_fa_enabled: raw.two_fa_enabled as boolean | number | string | undefined,
    email_verified:
      typeof raw.email_verified === "number"
        ? raw.email_verified
        : Number(raw.email_verified ?? 0) || 0,
    payment_verified:
      typeof raw.payment_verified === "number"
        ? raw.payment_verified
        : Number(raw.payment_verified ?? 0) || 0,
    created_at: String(raw.created_at ?? ""),
    approved_at: String(raw.approved_at ?? ""),
    approved_by: String(raw.approved_by ?? ""),
  };
};

const extractAdminUserOptions = (payload?: AdminUsersListApiData | null): AdminUserOption[] => {
  if (!payload) return [];

  const pick = (value: unknown) =>
    Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

  const directUsers = pick(payload.users);
  if (directUsers.length) {
    return directUsers.map((item) => {
      const user = transformUser(item);
      return {
        id: user.id,
        uuid: user.uuid ?? "",
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      };
    });
  }

  const directItems = pick(payload.items);
  if (directItems.length) {
    return directItems.map((item) => {
      const user = transformUser(item);
      return {
        id: user.id,
        uuid: user.uuid ?? "",
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      };
    });
  }

  if (Array.isArray(payload.data)) {
    return payload.data
      .map((item) => transformUser(item as unknown as Record<string, unknown>))
      .map((user) => ({
        id: user.id,
        uuid: user.uuid ?? "",
        name: user.name,
        email: user.email,
        mobile: user.mobile,
      }));
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>;
    const nestedUsers = pick(nested.users);
    if (nestedUsers.length) {
      return nestedUsers.map((item) => {
        const user = transformUser(item);
        return {
          id: user.id,
          uuid: user.uuid ?? "",
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        };
      });
    }

    const nestedItems = pick(nested.items);
    if (nestedItems.length) {
      return nestedItems.map((item) => {
        const user = transformUser(item);
        return {
          id: user.id,
          uuid: user.uuid ?? "",
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        };
      });
    }

    const nestedData = pick(nested.data);
    if (nestedData.length) {
      return nestedData.map((item) => {
        const user = transformUser(item);
        return {
          id: user.id,
          uuid: user.uuid ?? "",
          name: user.name,
          email: user.email,
          mobile: user.mobile,
        };
      });
    }
  }

  return [];
};

const validateKycUploadFile = (file: File | null) => {
  if (!file) return true;

  const normalizedName = file.name.toLowerCase();
  const okType =
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    file.type === "image/png" ||
    file.type === "application/pdf" ||
    normalizedName.endsWith(".jpg") ||
    normalizedName.endsWith(".jpeg") ||
    normalizedName.endsWith(".png") ||
    normalizedName.endsWith(".pdf");

  if (!okType) {
    toast.error("Only JPG, PNG, and PDF files are accepted.");
    return false;
  }

  const maxBytes = 15 * 1024 * 1024;
  if (file.size > maxBytes) {
    toast.error("Each file must be 15MB or less.");
    return false;
  }

  return true;
};

function KycUploadField({
  id,
  label,
  required = false,
  disabled = false,
  file,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  file: File | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </Label>
      <Input
        id={id}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        disabled={disabled}
        onChange={onChange}
      />
      <p className="text-xs text-muted-foreground">
        {file ? `Selected: ${file.name}` : "JPG, PNG, or PDF up to 15MB."}
      </p>
    </div>
  );
}

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

  const { isAdmin, isManager, filterFeatureOptions } = useManagerPermissions();
  const { can: canUserCapability } = useModuleCapabilities("userManagement");

  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault("0"));
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [paginationMeta, setPaginationMeta] = useState<{ current_page: number; per_page: number; total: number; total_pages: number } | null>(null);

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
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<KycUploadFormState>(createEmptyKycUploadForm);
  const [uploadTarget, setUploadTarget] = useState<AdminUserOption | null>(null);
  const [uploadUserSearch, setUploadUserSearch] = useState("");
  const [uploadUserOptions, setUploadUserOptions] = useState<AdminUserOption[]>([]);
  const [uploadUsersLoading, setUploadUsersLoading] = useState(false);
  const [uploadingKyc, setUploadingKyc] = useState(false);

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

  const canReview = useMemo(() => canUserCapability("kycReview"), [canUserCapability]);

  const canAddKyc = useMemo(() => isAdmin || canUserCapability("kycUpload"), [isAdmin, canUserCapability]);

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
      const searchTerm = search && search.length >= 3 ? search : undefined;
      const res = await adminKycApi.listPending(Number(statusFilter), token, searchTerm, page, perPage);
      const data = res?.data as { items?: ListRow[]; pagination?: { current_page: number; per_page: number; total: number; total_pages: number } } | undefined;
      const items = data?.items ?? [];
      setRows(items);
      setPaginationMeta(data?.pagination ?? null);
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
  }, [token, statusFilter, search, page, perPage]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

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
  }, [isManager, statusFeatureOptions, allowedStatusValues, statusFilter, setStatusFilter]);

  useEffect(() => {
    if (!uploadOpen || !token || !canAddKyc) return;
    if (!uploadUserSearch.trim() || uploadUserSearch.length < 3) {
      setUploadUserOptions([]);
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(async () => {
      try {
        setUploadUsersLoading(true);
        const response = await adminUsersApi.list({
          token,
          page: 1,
          limit: 20,
          search: uploadUserSearch.trim(),
        });

        if (!isActive) return;
        setUploadUserOptions(
          extractAdminUserOptions((response.data ?? null) as AdminUsersListApiData | null)
        );
      } catch (error: unknown) {
        if (!isActive) return;
        setUploadUserOptions([]);
        toast.error(
          getAdminFriendlyErrorMessage(error, { resource: "users", action: "load" })
        );
      } finally {
        if (isActive) {
          setUploadUsersLoading(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [uploadOpen, token, canAddKyc, uploadUserSearch]);

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

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canReview) {
      toast.error("You do not have permission to export KYC submissions");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    const exportToastId = `kyc-submissions-export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

      const searchTerm = search && search.length >= 3 ? search : undefined;
      const { blob, filename } = await adminKycApi.export({
        token,
        format: formatType,
        search: searchTerm,
        status: statusFilter !== "none" ? statusFilter : undefined,
      });

      if (!blob.size) {
        toast.error("No data returned for export", { id: exportToastId });
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Downloaded ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "KYC submissions", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [canReview, token, search, statusFilter]);

  const closeUploadDialog = useCallback(() => {
    setUploadOpen(false);
    setUploadForm(createEmptyKycUploadForm());
    setUploadTarget(null);
    setUploadUserSearch("");
    setUploadUserOptions([]);
    setUploadUsersLoading(false);
    setUploadingKyc(false);
  }, []);

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
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
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
        filterFn: () => true
      },
      {
        id: "submitted_at",
        header: "Submitted at",
        accessorKey: "submitted_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDateTime(row.original.submitted_at)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const canView = canReview && canViewKycStatus(row.original.kyc_status);
          if (!canReview) return null;
          return (
            <Button
              variant="ghost"
              size="sm"
              aria-label="View"
              onClick={() => {
                if (canView) openDetail(row.original.uuid);
              }}
              disabled={!canView}
            >
              <Eye className="h-4 w-4" />
              Review
            </Button>
          );
        },
      },
    ],
    [openDetail, canViewKycStatus, canReview]
  );

  const refreshRowInList = (user_uuid: string, next?: Partial<ListRow>) => {
    setRows((r) =>
      r.map((it) => (it.uuid === user_uuid ? { ...it, ...next } as ListRow : it))
    );
  };

  const handleUploadFileChange = useCallback(
    (field: keyof KycUploadFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!validateKycUploadFile(file)) {
        event.target.value = "";
        return;
      }

      setUploadForm((current) => ({
        ...current,
        [field]: file,
      }));
    },
    []
  );

const buildReviewPayload = () => {
  if (!detail?.user?.uuid) {
    toast.error("User UUID missing for this review");
    return null;
  }

  const arePrimaryDocsSubmitted = primaryDocKeys.every((key) => {
    const doc = detail.documents?.[key];
    return Boolean(doc?.url || doc?.file);
  });

  const docs: Record<string, "pending" | "approved" | "rejected" | { status: "pending" | "approved" | "rejected"; comment?: string }> = {};

  (Object.keys(docStatuses) as DocKey[]).forEach((k) => {
    if (arePrimaryDocsSubmitted && k === "other_file_status") {
      return;
    }

    const nowNum = docStatuses[k];
    const nowWord = numToWord(nowNum);
    const comment = nowWord === "approved" ? "" : (docComments[k] || "").trim();

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
    void setPage(1);
  };

  const submitKycUpload = async () => {
    if (!token) return;
    if (!canAddKyc) {
      toast.error("You do not have permission to add KYC documents.");
      return;
    }
    if (!uploadTarget?.id) {
      toast.error("Please select a user.");
      return;
    }
    if (!uploadForm.poi_front_file || !uploadForm.poa_front_file || !uploadForm.poa_back_file) {
      toast.error("POI front, POA front, and POA back files are required.");
      return;
    }

    try {
      setUploadingKyc(true);

      const formData = new FormData();
      formData.append("poi_front_file", uploadForm.poi_front_file);
      formData.append("poa_front_file", uploadForm.poa_front_file);
      formData.append("poa_back_file", uploadForm.poa_back_file);

      if (uploadForm.other_file) {
        formData.append("other_file", uploadForm.other_file);
      }

      const response = await adminKycApi.uploadForUser(uploadTarget.id, formData, token);
      toast.success(response.message || "KYC documents uploaded successfully.");
      closeUploadDialog();
      await loadList();
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "KYC documents", action: "submit" })
      );
    } finally {
      setUploadingKyc(false);
    }
  };

  if (!isAdmin && isManager && !statusFeatureOptions.length) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
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
      <div className="px-4 py-10 md:px-6 lg:px-8">
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
    
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Shield className="h-6 w-6 text-primary" />
            User Verification (KYC)
          </h1>
           <p className="text-sm text-muted-foreground">
                View and manage user KYC submissions, review document details, and update verification status.
              </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canReview ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                {/* <DropdownMenuItem onClick={() => void handleExport("csv")}>
                  Export CSV (.csv)
                </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {canAddKyc ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add KYC
            </Button>
          ) : null}
          <Button variant="outline" onClick={loadList} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        {/* Search and Filter Controls */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Bar */}
          <ApiSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(value) => {
              setSearch(value || "");
              void setPage(1);
            }}
            placeholder="Search by name, email, or user details"
            minimumLength={3}
            delay={300}
          />
          
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2">
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
        </div>
        
        <AppDataTable<ListRow> data={filteredRows} columns={columns} pageCount={Math.max(1, paginationMeta?.total_pages ?? 1)} advanced />
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
                  {(() => {
                    const arePrimaryDocsSubmitted = primaryDocKeys.every((key) => {
                      const doc = detail.documents?.[key];
                      return Boolean(doc?.url || doc?.file);
                    });

                    const visibleDocKeys = (Object.keys(docLabel) as DocKey[]).filter(
                      (key) => !(arePrimaryDocsSubmitted && key === "other_file_status")
                    );

                    return visibleDocKeys.map((k) => {
                    const doc = detail.documents?.[k];
                    const url = doc?.url || (doc?.file ? kycFileUrl(doc.file) : null);
                    const sourceUrl = doc?.url || url || "";
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
                          {(() => {
                            return sourceUrl ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch(sourceUrl, {
                                      headers: token
                                        ? { Authorization: `Bearer ${token}` }
                                        : undefined,
                                    });
                                    if (!response.ok) {
                                      throw new Error(`Failed to download document: ${response.status}`);
                                    }
                                    const blob = await response.blob();
                                    const downloadUrl = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    const fallbackName = `${docLabel[k]}-${detail?.user?.uuid || "document"}`;
                                    link.href = downloadUrl;
                                    link.download = doc?.file || fallbackName;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(downloadUrl);
                                  } catch (error) {
                                    console.error("Failed to download KYC document:", error);
                                    toast.error(
                                      getAdminFriendlyErrorMessage(error, {
                                        resource: docLabel[k],
                                        action: "download",
                                      })
                                    );
                                  }
                                }}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </Button>
                            ) : null;
                          })()}
                        </div>

                        <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-center min-h-[200px]">
                          <AuthenticatedDocumentViewer
                            src={sourceUrl || undefined}
                            fileName={doc?.file || sourceUrl || undefined}
                            label={docLabel[k]}
                            mode="embedded"
                            previewClassName="h-64 w-full"
                            dialogClassName="max-w-6xl"
                            emptyText="No document uploaded"
                          />
                        </div>

                        {canReview ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              className={`${
                                isApproved
                                  ? "bg-green-600 hover:bg-green-700 text-white"
                                  : "hover:bg-green-50 dark:hover:bg-green-950/20"
                              }`}
                              variant={isApproved ? "default" : "outline"}
                              onClick={() => {
                                setDocStatuses((s) => ({ ...s, [k]: 1 }));
                                setDocComments((c) => ({ ...c, [k]: "" }));
                              }}
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
                            >
                              <Clock className="h-4 w-4 mr-1.5" />
                              Pending
                            </Button>
                          </div>
                        ) : null}

                        {!isApproved ? (
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
                        ) : null}
                      </div>
                    );
                    });
                  })()}
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

      <Dialog
        open={uploadOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeUploadDialog();
            return;
          }
          setUploadOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Add KYC for User
            </DialogTitle>
            <DialogDescription>
              Upload KYC documents on the user&apos;s behalf. POI front, POA front, and POA back are required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <SearchSelectField
              id="kyc-user-search"
              label="User"
              className="md:col-span-2"
              options={uploadUserOptions}
              searchValue={uploadUserSearch}
              selectedValue={uploadTarget ? String(uploadTarget.id) : undefined}
              placeholder="Search by name, email, or mobile"
              disabled={uploadingKyc}
              loading={uploadUsersLoading}
              loadingMessage="Searching users..."
              idleMessage="Start typing to search users."
              emptyMessage="No users found."
              helperText={
                uploadTarget
                  ? `Selected user: ${uploadTarget.name} (${uploadTarget.email})`
                  : "Search and select the user you want to upload KYC for."
              }
              onSearchValueChange={(value) => {
                setUploadUserSearch(value);
                setUploadTarget(null);
              }}
              onOptionSelect={(user) => {
                setUploadTarget(user);
                setUploadUserSearch(user.email || user.name);
              }}
              getOptionValue={(user) => String(user.id)}
              getOptionLabel={(user) => user.name}
              getOptionDescription={(user) =>
                [user.email, user.mobile ? `Mobile: ${user.mobile}` : null]
                  .filter(Boolean)
                  .join(" | ")
              }
            />

            <KycUploadField
              id="poi-front-file"
              label="POI Front File"
              required
              disabled={uploadingKyc}
              file={uploadForm.poi_front_file}
              onChange={handleUploadFileChange("poi_front_file")}
            />
            <KycUploadField
              id="poa-front-file"
              label="POA Front File"
              required
              disabled={uploadingKyc}
              file={uploadForm.poa_front_file}
              onChange={handleUploadFileChange("poa_front_file")}
            />
            <KycUploadField
              id="poa-back-file"
              label="POA Back File"
              required
              disabled={uploadingKyc}
              file={uploadForm.poa_back_file}
              onChange={handleUploadFileChange("poa_back_file")}
            />
            <KycUploadField
              id="other-file"
              label="Other File"
              disabled={uploadingKyc}
              file={uploadForm.other_file}
              onChange={handleUploadFileChange("other_file")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={closeUploadDialog}
              disabled={uploadingKyc}
            >
              Cancel
            </Button>
            <Button onClick={submitKycUpload} disabled={uploadingKyc}>
              {uploadingKyc ? <Spinner className="mr-2 h-4 w-4" size="sm" /> : <Upload className="mr-2 h-4 w-4" />}
              Submit KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    
  );
}



