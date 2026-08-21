"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { PermissionAwareCrudDataTable } from "@/components/permission-aware-crud-table";
import { getColumns } from "./columns";
import { AccountTypeForm } from "./account-type-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, Download, Package, Plus, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import {
  adminAccountTypesApi,
  type AccountTypeCommissionItem,
  type AccountTypeItem,
  type AccountTypeUpsertBody,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

export type AccountTypeCommissionRow = {
  id?: string;
  account_type_id?: string;
  is_default: boolean;
  level: string;
  rate_ib: number;
  rate_sub_ib_1: number;
  rate_sub_ib_2: number;
  rate_sub_ib_3: number;
  rate_sub_ib_4: number;
  rate_sub_ib_5: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

// Row type for the table
export type AccountTypeRow = {
  id: string;
  live_id?: string;
  demo_id?: string;
  name: string;
  maximum_leverage: string;
  minimum_deposit: number;
  leverage_value: number;
  live_group_name: string;
  live_mt5_group_name: string;
  demo_group_name: string;
  demo_mt5_group_name: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

// ---- helpers: normalize / serialize ----
const ACCOUNT_TYPE_LEVELS = [
  "IB",
  "Level-1",
  "Level-2",
  "Level-3",
  "Level-4",
  "Level-5",
] as const;

const getExportTimestamp = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const formatExportDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const COMMISSION_LEVEL_ORDER = ACCOUNT_TYPE_LEVELS.reduce<Record<string, number>>(
  (accumulator, level, index) => {
    accumulator[level] = index;
    return accumulator;
  },
  {},
);

const toNumericValue = (
  value: unknown,
  fallback = 0,
  options?: { preferLastMatch?: boolean },
) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const matches = trimmed.match(/-?\d+(\.\d+)?/g);
    if (matches && matches.length > 0) {
      const candidate = options?.preferLastMatch
        ? matches[matches.length - 1]
        : matches[0];
      const extracted = Number(candidate);
      if (Number.isFinite(extracted)) {
        return extracted;
      }
    }
  }

  return fallback;
};

const toStringValue = (value: unknown, fallback = "") => {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const createDefaultCommissionRows = (): AccountTypeCommissionRow[] =>
  ACCOUNT_TYPE_LEVELS.map((level, index) => ({
    is_default: index === 0,
    level,
    rate_ib: 0,
    rate_sub_ib_1: 0,
    rate_sub_ib_2: 0,
    rate_sub_ib_3: 0,
    rate_sub_ib_4: 0,
    rate_sub_ib_5: 0,
    status: true,
  }));

const normalizeCommissions = (
  commissions?: AccountTypeCommissionItem[],
): AccountTypeCommissionRow[] => {
  const normalized = (commissions ?? []).map((commission) => ({
    id:
      commission.id !== undefined && commission.id !== null
        ? String(commission.id)
        : undefined,
    account_type_id:
      commission.account_type_id !== undefined &&
      commission.account_type_id !== null
        ? String(commission.account_type_id)
        : undefined,
    is_default: coerceBoolean(commission.is_default, commission.level === "IB"),
    level: commission.level,
    rate_ib: toNumericValue(commission.rate_ib),
    rate_sub_ib_1: toNumericValue(commission.rate_sub_ib_1),
    rate_sub_ib_2: toNumericValue(commission.rate_sub_ib_2),
    rate_sub_ib_3: toNumericValue(commission.rate_sub_ib_3),
    rate_sub_ib_4: toNumericValue(commission.rate_sub_ib_4),
    rate_sub_ib_5: toNumericValue(commission.rate_sub_ib_5),
    status: coerceBoolean(commission.status, true),
    created_at: commission.created_at,
    updated_at: commission.updated_at,
  }));

  const mergedByLevel = new Map<string, AccountTypeCommissionRow>();
  for (const row of createDefaultCommissionRows()) {
    mergedByLevel.set(row.level, row);
  }
  for (const row of normalized) {
    mergedByLevel.set(row.level, row);
  }

  return Array.from(mergedByLevel.values()).sort(
    (left, right) =>
      (COMMISSION_LEVEL_ORDER[left.level] ?? 99) -
      (COMMISSION_LEVEL_ORDER[right.level] ?? 99),
  );
};

const normalize = (a: AccountTypeItem): AccountTypeRow => {
  if (a.groups) {
    return {
      id: String(a.id),
      live_id: a.groups.live ? String(a.groups.live.id) : undefined,
      demo_id: a.groups.demo ? String(a.groups.demo.id) : undefined,
      name: a.name ?? "",
      maximum_leverage: toStringValue(a.maximum_leverage),
      minimum_deposit: toNumericValue(a.minimum_deposit, 0),
      leverage_value: toNumericValue(a.leverage_value),
      live_group_name: a.groups.live?.name ?? "",
      live_mt5_group_name: a.groups.live?.mt5_group_name ?? "",
      demo_group_name: a.groups.demo?.name ?? "",
      demo_mt5_group_name: a.groups.demo?.mt5_group_name ?? "",
      status: coerceBoolean(a.status, true),
      created_at: a.created_at,
      updated_at: a.updated_at,
    };
  }

  return {
    id: String(a.id),
    live_id: a.mode === "live" ? String(a.id) : undefined,
    demo_id: a.mode === "demo" ? String(a.id) : undefined,
    name: a.name ?? "",
    maximum_leverage: toStringValue(a.maximum_leverage),
    minimum_deposit: toNumericValue(a.minimum_deposit, 0),
    leverage_value: toNumericValue(a.leverage_value),
    live_group_name: a.mode === "live" ? (a.group?.name ?? "") : "",
    live_mt5_group_name: a.mode === "live" ? (a.group?.mt5_group_name ?? "") : "",
    demo_group_name: a.mode === "demo" ? (a.group?.name ?? "") : "",
    demo_mt5_group_name: a.mode === "demo" ? (a.group?.mt5_group_name ?? "") : "",
    status: coerceBoolean(a.status, true),
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
};

const groupAccountTypes = (items: AccountTypeItem[]): AccountTypeRow[] => {
  const hasNewFormat = items.some((item) => item.groups);

  if (hasNewFormat) {
    return items.map(normalize);
  }

  const byName = new Map<string, { live?: AccountTypeItem; demo?: AccountTypeItem }>();

  for (const item of items) {
    const key = (item.name ?? "").toLowerCase().trim();
    if (!key) continue;
    const existing = byName.get(key) ?? {};
    if (item.mode === "live" || item.mode === "demo") {
      existing[item.mode] = item;
    } else {
      existing.live = item;
    }
    byName.set(key, existing);
  }

  const rows: AccountTypeRow[] = [];

  for (const [, pair] of byName) {
    const live = pair.live;
    const demo = pair.demo;
    const primary = live ?? demo;
    if (!primary) continue;

    rows.push({
      id: String(primary.id),
      live_id: live ? String(live.id) : undefined,
      demo_id: demo ? String(demo.id) : undefined,
      name: primary.name ?? "",
      maximum_leverage: toStringValue(primary.maximum_leverage),
      minimum_deposit: toNumericValue(primary.minimum_deposit, 0),
      leverage_value: toNumericValue(primary.leverage_value),
      live_group_name: live?.group?.name ?? "",
      live_mt5_group_name: live?.group?.mt5_group_name ?? "",
      demo_group_name: demo?.group?.name ?? "",
      demo_mt5_group_name: demo?.group?.mt5_group_name ?? "",
      status: coerceBoolean(primary.status, true),
      created_at: primary.created_at,
      updated_at: primary.updated_at,
    });
  }

  return rows;
};

const extractSingleAccountType = (payload: unknown): AccountTypeItem | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const payloadObj = payload as Record<string, unknown>;

  if (
    payloadObj.accountType &&
    typeof payloadObj.accountType === "object" &&
    !Array.isArray(payloadObj.accountType)
  ) {
    return payloadObj.accountType as AccountTypeItem;
  }

  if (
    payloadObj.data &&
    typeof payloadObj.data === "object" &&
    !Array.isArray(payloadObj.data)
  ) {
    const nestedData = payloadObj.data as Record<string, unknown>;

    if (
      nestedData.groups &&
      typeof nestedData.groups === "object" &&
      !Array.isArray(nestedData.groups)
    ) {
      return nestedData as unknown as AccountTypeItem;
    }

    if (
      nestedData.live &&
      typeof nestedData.live === "object" &&
      !Array.isArray(nestedData.live)
    ) {
      return nestedData.live as AccountTypeItem;
    }

    if (
      nestedData.accountType &&
      typeof nestedData.accountType === "object" &&
      !Array.isArray(nestedData.accountType)
    ) {
      return nestedData.accountType as AccountTypeItem;
    }
  }

  return payloadObj as unknown as AccountTypeItem;
};

const coerceBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
};

const serialize = (r: Partial<AccountTypeRow>): AccountTypeUpsertBody => ({
  name: r.name && r.name.trim() !== "" ? r.name.trim() : "",
  groups: [
    {
      mode: "live",
      name: r.live_group_name ?? "",
      mt5_group_name: r.live_mt5_group_name ?? "",
    },
    {
      mode: "demo",
      name: r.demo_group_name ?? "",
      mt5_group_name: r.demo_mt5_group_name ?? "",
    },
  ],
  maximum_leverage: toNumericValue(r.maximum_leverage, 0, {
    preferLastMatch: true,
  }),
  minimum_deposit: toNumericValue(r.minimum_deposit, 0),
  leverage_value: toNumericValue(r.leverage_value),
  status: coerceBoolean(r.status, true),
});

// simple debounce hook
const useDebouncedValue = <T,>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export default function AllAccountsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AccountTypeRow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // filters
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">("all");
  const [search, setSearch] = useState<string>("");

  // debounced + min-length-3 rule
  const debouncedSearch = useDebouncedValue(search, 450);
  const effectiveSearch =
    debouncedSearch.trim().length >= 3 ? debouncedSearch.trim() : "";

  const {
    data: accountTypesResult,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["accountTypes", token, statusFilter, effectiveSearch],
    queryFn: async () => {
      const res = await adminAccountTypesApi.list({
        token: token!,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: effectiveSearch || undefined,
      });
      return groupAccountTypes((res?.data?.accountTypes || []) as AccountTypeItem[]);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
  const data = accountTypesResult ?? [];

  const fetchList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
  }, [queryClient, token]);

  const fetchAccountTypeDetail = useCallback(
    async (id: string): Promise<AccountTypeRow> => {
      if (!token) {
        throw new Error("Missing auth token");
      }

      const response = await adminAccountTypesApi.getById(id, token);
      const payload = response?.data as Record<string, unknown> | undefined;

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        if ("groups" in payload && typeof payload.groups === "object" && payload.groups !== null) {
          return normalize(payload as unknown as AccountTypeItem);
        }

        if ("live" in payload && typeof payload.live === "object" && payload.live !== null) {
          const liveItem = payload.live as AccountTypeItem;
          const demoItem = (payload.demo as AccountTypeItem | undefined) ?? undefined;
          const rows = groupAccountTypes([liveItem, ...(demoItem ? [demoItem] : [])]);
          if (rows.length > 0) return rows[0];
        }
      }

      const accountType = extractSingleAccountType(response?.data);

      if (!accountType || accountType.id === undefined || accountType.id === null) {
        throw new Error("Account type details unavailable");
      }

      return normalize(accountType);
    },
    [token],
  );

  // CREATE
  const handleAdd = async (payload: Omit<AccountTypeRow, "id">) => {
    if (!token) return Promise.reject();
    
    // Validate that name is not empty
    if (!payload.name || payload.name.trim() === "") {
      toast.error("Account type name is required");
      return Promise.reject(new Error("Account type name is required"));
    }
    
    try {
      await adminAccountTypesApi.create(serialize(payload), token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type created");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Create error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "account types", action: "create" })
      );
      return Promise.reject(e);
    }
  };

  // UPDATE
  const handleUpdate = async (row: AccountTypeRow) => {
    if (!token) return Promise.reject();
    
    // Validate that name is not empty
    if (!row.name || row.name.trim() === "") {
      toast.error("Account type name is required");
      return Promise.reject(new Error("Account type name is required"));
    }
    
    try {
      setActionLoadingId(row.id);
      await adminAccountTypesApi.update(row.id, serialize(row), token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type updated");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Update error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "account types", action: "update" })
      );
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // TOGGLE STATUS
  const handleToggleStatus = async (id: string) => {
    if (!token) return;
    try {
      setActionLoadingId(id);
      const toggled = await adminAccountTypesApi.toggleStatus(id, token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success(toggled.message || "Status updated");
    } catch (e: unknown) {
      console.error("Toggle error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "account types", action: "update" })
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (!token) return Promise.reject();
    try {
      setActionLoadingId(id);
      await adminAccountTypesApi.delete(id, token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type deleted");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Delete error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "account types", action: "delete" })
      );
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewAccountType = useCallback(
    async (id: string) => {
      try {
        setActionLoadingId(id);
        const accountType = await fetchAccountTypeDetail(id);
        setViewItem(accountType);
        setViewOpen(true);
      } catch (error: unknown) {
        console.error("View account type error:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "account type details",
            action: "load",
          }),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchAccountTypeDetail],
  );

  const handleExport = useCallback((formatType: "xlsx" | "csv") => {
    const exportToastId = `account-types-export-${formatType}`;
    try {
      if (data.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = data.map((accountType, index) => ({
        "Sr. No.": index + 1,
        Name: accountType.name || "-",
        "Live Group": accountType.live_group_name || "-",
        "Live MT5 Group": accountType.live_mt5_group_name || "-",
        "Demo Group": accountType.demo_group_name || "-",
        "Demo MT5 Group": accountType.demo_mt5_group_name || "-",
        "Max Leverage": accountType.maximum_leverage || "-",
        "First Time Deposit": accountType.minimum_deposit || "-",
        "Leverage Value": accountType.leverage_value || "-",
        Status: accountType.status ? "Active" : "Inactive",
        Updated: formatExportDateTime(accountType.updated_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `account-types-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Account Types");
        XLSX.writeFile(workbook, filename);
      } else {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        filename = `${filenameBase}.csv`;
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      }

      toast.success(`Exported ${data.length} account types to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "account types", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [data]);

  const columns = useMemo(
    () => getColumns({ onToggleStatus: handleToggleStatus, actionLoadingId }),
    [handleToggleStatus, actionLoadingId]
  );

  if (isError && data.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="account types"
            action="load"
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  if (loading && data.length === 0) {
    return (
      <ProtectedRoute>
        <ListPageSkeleton
          actionCount={1}
          columnCount={8}
          rowCount={8}
          filterPillCount={2}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Package className="h-6 w-6 text-primary" />
                All Groups
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, update, and manage group types
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export CSV (.csv)
                  </DropdownMenuItem> */}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add New
              </Button>
              <Button variant="outline" onClick={() => void fetchList()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          {/* Filters */}
          <div className="mb-4 rounded-lg border bg-card p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="search">Search</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="search"
                    placeholder="Type at least 3 characters..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fetchList()} // explicit search
                    disabled={search.trim().length < 3} // <- hard block before 3 chars
                    title={search.trim().length < 3 ? "Type at least 3 characters to search" : "Search"}
                  >
                    Search
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      fetchList(); // explicit default reset (no search)
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="space-y-1 w-[60%]">
                <Label>Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(v: "all" | "true" | "false") => setStatusFilter(v)}
                >
                  <SelectTrigger className="w-full min-w-[100px] max-w-[127px]">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <PermissionAwareCrudDataTable<AccountTypeRow>
            data={data}
            initialData={data}
            columns={columns}
            formComponent={AccountTypeForm}
            title=""
            description=""
            requiredModule="account-types"
            hideAddButton={true}
            onAdd={async (partial) => {
              const { id: _ignore, ...rest } = partial as Partial<AccountTypeRow>;
              return handleAdd(rest as Omit<AccountTypeRow, "id">);
            }}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onView={(row) => {
              void handleViewAccountType(row.id);
            }}
            onFetchItem={fetchAccountTypeDetail}
            rowIsReadOnly={() => false}
          />

          <AccountTypeForm
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            initialData={null}
            onSubmit={async (data) => {
              const { id: _ignore, ...rest } = data as Partial<AccountTypeRow>;
              await handleAdd(rest as Omit<AccountTypeRow, "id">);
              setIsCreateDialogOpen(false);
            }}
          />

          <AccountTypeForm
            open={viewOpen}
            onOpenChange={(open) => {
              setViewOpen(open);
              if (!open) {
                setViewItem(null);
              }
            }}
            initialData={viewItem}
            readOnly={true}
            onSubmit={() => {}}
          />
        </div>
      
    </ProtectedRoute>
  );
}
