"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Award,
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminCommissionGroupsApi,
  type AdminCommissionGroupItem,
  type AdminCommissionGroupRate,
  type AdminCommissionGroupUpdateBody,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import { getColumns } from "./columns";
import { CommissionGroupForm } from "./commission-group-form";

export type CommissionGroupRates =
  | AdminCommissionGroupRate[]
  | Record<string, Record<string, number>>;

export type CommissionGroupRow = {
  id: string;
  ib_plan_id: number;
  plan_name: string;
  group_id: number;
  group_name: string;
  mt5_group_name: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  rates?: CommissionGroupRates;
};

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
  return formatApiDateTimeAsIST(value);
};

const coerceBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "active", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "inactive", "no", "off", ""].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const normalizeGroup = (group: AdminCommissionGroupItem): CommissionGroupRow => ({
  id: String(group.id),
  ib_plan_id: Number(group.ib_plan_id) || 0,
  plan_name: group.plan_name ?? "",
  group_id: Number(group.group_id) || 0,
  group_name: group.group_name ?? "",
  mt5_group_name: group.mt5_group_name ?? "",
  status: coerceBoolean(group.status, true),
  created_at: group.created_at,
  updated_at: group.updated_at,
});

const toRatesArray = (
  rates: Record<string, Record<string, number>> | undefined,
): AdminCommissionGroupRate[] => {
  const result: AdminCommissionGroupRate[] = [];
  if (!rates) return result;

  for (const [category, levels] of Object.entries(rates)) {
    for (const [levelKey, rate] of Object.entries(levels)) {
      const level = Number(levelKey.replace("level", ""));
      if (Number.isFinite(level) && Number(rate) > 0) {
        result.push({ level, rate: Number(rate), symbol_category: category });
      }
    }
  }

  return result;
};

export default function CommissionGroupPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<CommissionGroupRow | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [search, setSearch] = useState("");
  const authToken = useMemo(() => {
    if (token) return token;
    if (typeof window === "undefined") return null;

    return (
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("auth_token")
    );
  }, [token]);

  const {
    data: groupsResult,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["commissionGroupsCrud", authToken],
    queryFn: async () => {
      const response = await adminCommissionGroupsApi.list(authToken!);
      return (response?.data?.commissionGroups ?? []).map(normalizeGroup);
    },
    enabled: Boolean(authToken),
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const data = useMemo(() => groupsResult ?? [], [groupsResult]);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((group) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        group.plan_name.toLowerCase().includes(normalizedSearch) ||
        group.group_name.toLowerCase().includes(normalizedSearch) ||
        group.mt5_group_name.toLowerCase().includes(normalizedSearch) ||
        group.id.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "true" && group.status) ||
        (statusFilter === "false" && !group.status);

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const invalidateGroups = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["commissionGroupsCrud", authToken],
    });
  }, [queryClient, authToken]);

  const fetchGroupDetail = useCallback(
    async (id: string): Promise<CommissionGroupRow> => {
      if (!authToken) {
        throw new Error("Missing auth token");
      }

      const response = await adminCommissionGroupsApi.getById(id, authToken);
      const group = response?.data;

      if (!group || group.id === undefined || group.id === null) {
        throw new Error("Commission group details unavailable");
      }

      return { ...normalizeGroup(group), rates: group.rates };
    },
    [authToken],
  );

  const handleAdd = async (payload: Partial<CommissionGroupRow>) => {
    if (!authToken) return Promise.reject();

    const ib_plan_id = Number(payload.ib_plan_id);
    const group_id = Number(payload.group_id);
    const rates = Array.isArray(payload.rates) ? payload.rates : [];

    if (!ib_plan_id) {
      toast.error("Please select an IB plan");
      return Promise.reject(new Error("IB plan is required"));
    }

    if (!group_id) {
      toast.error("Please select a group");
      return Promise.reject(new Error("Group is required"));
    }

    if (rates.length === 0) {
      toast.error("Please enter at least one commission rate");
      return Promise.reject(new Error("Commission rates are required"));
    }

    try {
      await adminCommissionGroupsApi.create(
        { ib_plan_id, group_id, rates },
        authToken,
      );
      invalidateGroups();
      toast.success("Commission group created");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "commission groups",
          action: "create",
        }),
      );
      return Promise.reject(error);
    }
  };

  const handleUpdate = async (row: CommissionGroupRow) => {
    if (!authToken) return Promise.reject();

    const payload: AdminCommissionGroupUpdateBody = {
      rates: Array.isArray(row.rates) ? row.rates : [],
      status: Boolean(row.status),
    };

    try {
      setActionLoadingId(row.id);
      await adminCommissionGroupsApi.update(row.id, payload, authToken);
      invalidateGroups();
      toast.success("Commission group updated");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "commission groups",
          action: "update",
        }),
      );
      return Promise.reject(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = useCallback(
    async (id: string) => {
      if (!authToken) return;

      const target = data.find((group) => group.id === id);
      if (!target) return;

      try {
        setActionLoadingId(id);

        let rates: AdminCommissionGroupRate[] = [];
        if (Array.isArray(target.rates)) {
          rates = target.rates;
        } else {
          const response = await adminCommissionGroupsApi.getById(
            id,
            authToken,
          );
          rates = toRatesArray(response?.data?.rates);
        }

        await adminCommissionGroupsApi.update(
          id,
          { rates, status: !target.status },
          authToken,
        );
        invalidateGroups();
        toast.success("Commission group status updated");
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "commission groups",
            action: "update",
          }),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [data, invalidateGroups, authToken],
  );

  const handleDelete = async (id: string) => {
    if (!authToken) return Promise.reject();

    try {
      setActionLoadingId(id);
      await adminCommissionGroupsApi.delete(id, authToken);
      invalidateGroups();
      toast.success("Commission group deleted");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "commission groups",
          action: "delete",
        }),
      );
      return Promise.reject(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewGroup = useCallback(
    async (id: string) => {
      try {
        setActionLoadingId(id);
        const group = await fetchGroupDetail(id);
        setViewItem(group);
        setViewOpen(true);
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "commission group details",
            action: "load",
          }),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchGroupDetail],
  );

  const handleExport = useCallback(
    (formatType: "xlsx" | "csv") => {
      const exportToastId = `commission-groups-export-${formatType}`;

      try {
        if (filteredData.length === 0) {
          toast.error("No data to export", { id: exportToastId });
          return;
        }

        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, {
          id: exportToastId,
        });

        const exportData = filteredData.map((group, index) => ({
          "Sr. No.": index + 1,
          "Group ID": group.id,
          "Plan Name": group.plan_name || "-",
          Group: group.group_name || "-",
          "MT5 Group Name": group.mt5_group_name || "-",
          Status: group.status ? "Active" : "Inactive",
          Created: formatExportDateTime(group.created_at),
          Updated: formatExportDateTime(group.updated_at),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const filenameBase = `commission-groups-${getExportTimestamp()}`;
        let filename = `${filenameBase}.xlsx`;

        if (formatType === "xlsx") {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Commission Groups");
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

        toast.success(
          `Exported ${filteredData.length} commission groups to ${filename}`,
          { id: exportToastId },
        );
      } catch (error: unknown) {
        console.error(`Failed to export ${formatType}:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "commission groups",
            action: "export",
          }),
          { id: exportToastId },
        );
      }
    },
    [filteredData],
  );

  const columns = useMemo(
    () => getColumns({ onToggleStatus: handleToggleStatus, actionLoadingId }),
    [handleToggleStatus, actionLoadingId],
  );

  if (isError && data.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="commission groups"
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
          columnCount={6}
          rowCount={8}
          filterPillCount={2}
        />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Award className="h-6 w-6 text-primary" />
              Commission Groups
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, update, and manage commission groups
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
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Button>
            <Button
              variant="outline"
              onClick={() => void invalidateGroups()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by plan, group, or ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value: "all" | "true" | "false") =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-full max-w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <PermissionAwareCrudDataTable<CommissionGroupRow>
          data={filteredData}
          initialData={filteredData}
          columns={columns}
          formComponent={CommissionGroupForm}
          title=""
          description=""
          requiredModule="ibPlan"
          hideAddButton={true}
          onAdd={async (partial) => {
            return handleAdd(partial as Partial<CommissionGroupRow>);
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onView={(row) => {
            void handleViewGroup(row.id);
          }}
          onFetchItem={fetchGroupDetail}
          rowIsReadOnly={() => false}
        />

        <CommissionGroupForm
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          initialData={null}
          onSubmit={async (formData) => {
            await handleAdd(formData);
            setIsCreateDialogOpen(false);
          }}
        />

        <CommissionGroupForm
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
