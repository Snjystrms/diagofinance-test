"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Award, ChevronDown, Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { PermissionAwareCrudDataTable } from "@/components/permission-aware-crud-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import {
  adminAccountTypesApi,
  adminIbPlansApi,
  type AccountTypeCommissionItem,
  type AccountTypeItem,
  type AdminIbPlanAccountTypeItem,
  type AdminIbPlanCommissionItem,
  type AdminIbPlanItem,
  type AdminIbPlanUpsertBody,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { getColumns } from "./columns";
import { IbPlanForm } from "./ib-plan-form";

export type IbPlanCommissionRow = {
  level: string;
  rate_ib: number;
  rate_sub_ib_1: number;
  rate_sub_ib_2: number;
  rate_sub_ib_3: number;
  rate_sub_ib_4: number;
  rate_sub_ib_5: number;
};

export type IbPlanAccountTypeRow = {
  account_type_id: string;
  account_type_name: string;
  commissions: IbPlanCommissionRow[];
};

export type IbPlanRow = {
  id: string;
  name: string;
  description: string;
  status: boolean;
  ib_user_count: number;
  created_at?: string;
  updated_at?: string;
  account_types: IbPlanAccountTypeRow[];
};

const COMMISSION_LEVELS = ["IB", "Level-1", "Level-2", "Level-3", "Level-4", "Level-5"] as const;

const COMMISSION_LEVEL_ORDER = COMMISSION_LEVELS.reduce<Record<string, number>>((accumulator, level, index) => {
  accumulator[level] = index;
  return accumulator;
}, {});

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

const toNumericValue = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const coerceBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "active", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "inactive", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
};

const defaultCommissionRows = (): IbPlanCommissionRow[] =>
  COMMISSION_LEVELS.map((level) => ({
    level,
    rate_ib: 0,
    rate_sub_ib_1: 0,
    rate_sub_ib_2: 0,
    rate_sub_ib_3: 0,
    rate_sub_ib_4: 0,
    rate_sub_ib_5: 0,
  }));

const normalizeCommissions = (commissions?: AdminIbPlanCommissionItem[]): IbPlanCommissionRow[] => {
  const merged = new Map<string, IbPlanCommissionRow>();

  for (const row of defaultCommissionRows()) {
    merged.set(row.level, row);
  }

  for (const row of commissions ?? []) {
    merged.set(row.level, {
      level: row.level,
      rate_ib: toNumericValue(row.rate_ib),
      rate_sub_ib_1: toNumericValue(row.rate_sub_ib_1),
      rate_sub_ib_2: toNumericValue(row.rate_sub_ib_2),
      rate_sub_ib_3: toNumericValue(row.rate_sub_ib_3),
      rate_sub_ib_4: toNumericValue(row.rate_sub_ib_4),
      rate_sub_ib_5: toNumericValue(row.rate_sub_ib_5),
    });
  }

  return Array.from(merged.values()).sort(
    (left, right) =>
      (COMMISSION_LEVEL_ORDER[left.level] ?? 99) - (COMMISSION_LEVEL_ORDER[right.level] ?? 99),
  );
};

const normalizeAccountTypeCommissionRows = (
  commissions?: AccountTypeCommissionItem[],
): IbPlanCommissionRow[] =>
  normalizeCommissions(
    (commissions ?? []).map((row) => ({
      level: row.level,
      rate_ib: toNumericValue(row.rate_ib),
      rate_sub_ib_1: toNumericValue(row.rate_sub_ib_1),
      rate_sub_ib_2: toNumericValue(row.rate_sub_ib_2),
      rate_sub_ib_3: toNumericValue(row.rate_sub_ib_3),
      rate_sub_ib_4: toNumericValue(row.rate_sub_ib_4),
      rate_sub_ib_5: toNumericValue(row.rate_sub_ib_5),
    })),
  );

const normalizeAccountTypes = (accountTypes?: AdminIbPlanAccountTypeItem[]): IbPlanAccountTypeRow[] =>
  (accountTypes ?? []).map((accountType) => ({
    account_type_id: String(accountType.account_type_id),
    account_type_name: accountType.account_type_name ?? `Account Type ${accountType.account_type_id}`,
    commissions: normalizeCommissions(accountType.commissions),
  }));

const normalizePlan = (plan: AdminIbPlanItem): IbPlanRow => ({
  id: String(plan.id),
  name: plan.name ?? "",
  description: plan.description ?? "",
  status: coerceBoolean(plan.status, true),
  ib_user_count: toNumericValue(plan.ib_user_count),
  created_at: plan.created_at,
  updated_at: plan.updated_at,
  account_types: normalizeAccountTypes(plan.account_types),
});

const extractPlanFromPayload = (payload: unknown): AdminIbPlanItem | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const payloadObject = payload as Record<string, unknown>;
  if (payloadObject.data && typeof payloadObject.data === "object" && !Array.isArray(payloadObject.data)) {
    return payloadObject.data as AdminIbPlanItem;
  }

  return payloadObject as unknown as AdminIbPlanItem;
};

const serialize = (plan: Partial<IbPlanRow>): AdminIbPlanUpsertBody => ({
  name: plan.name?.trim() ?? "",
  description: plan.description?.trim() ?? "",
  status: coerceBoolean(plan.status, true) ? 1 : 0,
  account_types: (plan.account_types ?? []).map((accountType) => ({
    account_type_id: Number(accountType.account_type_id),
    commissions: (accountType.commissions ?? []).map((commission) => ({
      level: commission.level,
      rate_ib: toNumericValue(commission.rate_ib),
      rate_sub_ib_1: toNumericValue(commission.rate_sub_ib_1),
      rate_sub_ib_2: toNumericValue(commission.rate_sub_ib_2),
      rate_sub_ib_3: toNumericValue(commission.rate_sub_ib_3),
      rate_sub_ib_4: toNumericValue(commission.rate_sub_ib_4),
      rate_sub_ib_5: toNumericValue(commission.rate_sub_ib_5),
    })),
  })),
});

export default function IbPlansManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<IbPlanRow | null>(null);

  const {
    data: plansResult,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ibPlans", token],
    queryFn: async () => {
      const response = await adminIbPlansApi.list({ token: token! });
      return ((response?.data ?? []) as AdminIbPlanItem[]).map(normalizePlan);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const { data: accountTypesResult = [] } = useQuery({
    queryKey: ["ibPlanAccountTypes", token],
    queryFn: async () => {
      const response = await adminAccountTypesApi.list({ token: token! });
      return ((response?.data?.accountTypes ?? []) as AccountTypeItem[]).map((item) => ({
        id: String(item.id),
        name: item.name ?? `Account Type ${item.id}`,
      }));
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const data = plansResult ?? [];

  const fetchPlanDetail = useCallback(
    async (id: string): Promise<IbPlanRow> => {
      if (!token) {
        throw new Error("Missing auth token");
      }

      const response = await adminIbPlansApi.getById(id, token);
      const plan = extractPlanFromPayload(response?.data);
      if (!plan || plan.id === undefined || plan.id === null) {
        throw new Error("IB plan details unavailable");
      }

      return normalizePlan(plan);
    },
    [token],
  );

  const fetchAccountTypeDetail = useCallback(
    async (id: string): Promise<IbPlanAccountTypeRow | null> => {
      if (!token) {
        throw new Error("Missing auth token");
      }

      await adminAccountTypesApi.list({ token });
      const response = await adminAccountTypesApi.getById(id, token);
      const payload = response?.data as
        | { accountType?: AccountTypeItem; data?: AccountTypeItem }
        | AccountTypeItem
        | undefined;
      let accountType: AccountTypeItem | null = null;
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        if ("accountType" in payload || "data" in payload) {
          accountType = payload.accountType ?? payload.data ?? null;
        } else {
          accountType = payload as AccountTypeItem;
        }
      }

      if (!accountType) {
        return null;
      }

      return {
        account_type_id: String(accountType.id),
        account_type_name: accountType.name ?? `Account Type ${accountType.id}`,
        commissions: normalizeAccountTypeCommissionRows(accountType.ib_commissions),
      };
    },
    [token],
  );

  const invalidatePlans = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ibPlans", token] });
  }, [queryClient, token]);

  const handleAdd = async (payload: Omit<IbPlanRow, "id">) => {
    if (!token) return Promise.reject();
    try {
      await adminIbPlansApi.create(serialize(payload), token);
      invalidatePlans();
      toast.success("IB plan created");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "IB plans", action: "create" }));
      return Promise.reject(error);
    }
  };

  const handleUpdate = async (row: IbPlanRow) => {
    if (!token) return Promise.reject();
    try {
      await adminIbPlansApi.patch(row.id, serialize(row), token);
      invalidatePlans();
      toast.success("IB plan updated");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "IB plans", action: "update" }));
      return Promise.reject(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return Promise.reject();
    try {
      await adminIbPlansApi.delete(id, token);
      invalidatePlans();
      toast.success("IB plan deleted");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "IB plans", action: "delete" }));
      return Promise.reject(error);
    }
  };

  const handleView = useCallback(
    async (id: string) => {
      try {
        const plan = await fetchPlanDetail(id);
        setViewItem(plan);
        setViewOpen(true);
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, { resource: "IB plan details", action: "load" }),
        );
      }
    },
    [fetchPlanDetail],
  );

  const handleExport = useCallback((formatType: "xlsx" | "csv") => {
    const exportToastId = `ib-plans-export-${formatType}`;
    try {
      if (data.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = data.map((plan, index) => ({
        "Sr. No.": index + 1,
        Plan: plan.name || "-",
        Description: plan.description || "-",
        "Account Types": plan.account_types.length,
        "Partner Users": plan.ib_user_count,
        Status: plan.status ? "Active" : "Inactive",
        Updated: formatExportDateTime(plan.updated_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `ib-plans-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "IB Plans");
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

      toast.success(`Exported ${data.length} IB plans to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB plans", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [data]);

  const columns = useMemo(() => getColumns(), []);

  const PlanFormComponent = useCallback(
    (props: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      initialData?: IbPlanRow | null;
      onSubmit: (data: Partial<IbPlanRow>) => void | Promise<void>;
      readOnly?: boolean;
    }) => (
      <IbPlanForm
        open={props.open}
        onOpenChange={props.onOpenChange}
        initialData={props.initialData}
        onSubmit={(data) =>
          props.onSubmit({
            ...data,
            ib_user_count: props.initialData?.ib_user_count ?? 0,
          })
        }
        readOnly={props.readOnly}
        accountTypeOptions={accountTypesResult}
        loadAccountTypeById={fetchAccountTypeDetail}
      />
    ),
    [accountTypesResult, fetchAccountTypeDetail],
  );

  if (loading && data.length === 0) {
    return (
      <ProtectedRoute>
        <ListPageSkeleton actionCount={1} columnCount={6} rowCount={8} filterPillCount={0} />
      </ProtectedRoute>
    );
  }

  if (isError && data.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="IB plans"
            action="load"
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Award className="h-6 w-6 text-primary" />
              Partner Plans Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, update, and manage Partner plans with account type specific commission levels.
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
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <PermissionAwareCrudDataTable<IbPlanRow>
          data={data}
          initialData={data}
          columns={columns}
          formComponent={PlanFormComponent}
          title=""
          description=""
          requiredModule="ibPlan"
          onAdd={async (partial) => {
            const { id: _ignored, ...rest } = partial as Partial<IbPlanRow>;
            return handleAdd(rest as Omit<IbPlanRow, "id">);
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onView={(row) => {
            void handleView(row.id);
          }}
          onFetchItem={fetchPlanDetail}
          rowIsReadOnly={() => false}
        />

        <IbPlanForm
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
          accountTypeOptions={accountTypesResult}
          loadAccountTypeById={fetchAccountTypeDetail}
        />
      </div>
    </ProtectedRoute>
  );
}
