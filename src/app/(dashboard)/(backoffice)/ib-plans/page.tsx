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
  adminIbPlansCrudApi,
  type AdminIbPlanCrudItem,
  type AdminIbPlanCrudUpdateBody,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { getColumns } from "./columns";
import { IbPlanForm } from "./ib-plan-form";

export type IbPlanRow = {
  id: string;
  name: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
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

const normalizePlan = (plan: AdminIbPlanCrudItem): IbPlanRow => ({
  id: String(plan.id),
  name: plan.name ?? "",
  status: coerceBoolean(plan.status, true),
  created_at: plan.created_at,
  updated_at: plan.updated_at,
});

export default function IbPlansPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<IbPlanRow | null>(null);
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
    data: plansResult,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ibPlansCrud", authToken],
    queryFn: async () => {
      const response = await adminIbPlansCrudApi.list(authToken!);
      return (response?.data?.ibPlans ?? []).map(normalizePlan);
    },
    enabled: Boolean(authToken),
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const data = useMemo(() => plansResult ?? [], [plansResult]);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((plan) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        plan.name.toLowerCase().includes(normalizedSearch) ||
        plan.id.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "true" && plan.status) ||
        (statusFilter === "false" && !plan.status);

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  const invalidatePlans = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ibPlansCrud", authToken] });
  }, [queryClient, authToken]);

  const fetchPlanDetail = useCallback(
    async (id: string): Promise<IbPlanRow> => {
      if (!authToken) {
        throw new Error("Missing auth token");
      }

      const response = await adminIbPlansCrudApi.getById(id, authToken);
      const plan = response?.data;

      if (!plan || plan.id === undefined || plan.id === null) {
        throw new Error("IB plan details unavailable");
      }

      return normalizePlan(plan);
    },
    [authToken],
  );

  const handleAdd = async (payload: Omit<IbPlanRow, "id">) => {
    if (!authToken) return Promise.reject();

    if (!payload.name.trim()) {
      toast.error("IB plan name is required");
      return Promise.reject(new Error("IB plan name is required"));
    }

    try {
      await adminIbPlansCrudApi.create(
        {
          name: payload.name.trim(),
        },
        authToken,
      );
      invalidatePlans();
      toast.success("IB plan created");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB plans",
          action: "create",
        }),
      );
      return Promise.reject(error);
    }
  };

  const handleUpdate = async (row: IbPlanRow) => {
    if (!authToken) return Promise.reject();

    if (!row.name.trim()) {
      toast.error("IB plan name is required");
      return Promise.reject(new Error("IB plan name is required"));
    }

    const payload: AdminIbPlanCrudUpdateBody = {
      name: row.name.trim(),
      status: Boolean(row.status),
    };

    try {
      setActionLoadingId(row.id);
      await adminIbPlansCrudApi.update(row.id, payload, authToken);
      invalidatePlans();
      toast.success("IB plan updated");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB plans",
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

      const target = data.find((plan) => plan.id === id);
      if (!target) return;

      try {
        setActionLoadingId(id);
        await adminIbPlansCrudApi.update(
          id,
          {
            name: target.name.trim(),
            status: !target.status,
          },
          authToken,
        );
        invalidatePlans();
        toast.success("IB plan status updated");
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "IB plans",
            action: "update",
          }),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [data, invalidatePlans, authToken],
  );

  const handleDelete = async (id: string) => {
    if (!authToken) return Promise.reject();

    try {
      setActionLoadingId(id);
      await adminIbPlansCrudApi.delete(id, authToken);
      invalidatePlans();
      toast.success("IB plan deleted");
      return Promise.resolve();
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB plans",
          action: "delete",
        }),
      );
      return Promise.reject(error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewPlan = useCallback(
    async (id: string) => {
      try {
        setActionLoadingId(id);
        const plan = await fetchPlanDetail(id);
        setViewItem(plan);
        setViewOpen(true);
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "IB plan details",
            action: "load",
          }),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchPlanDetail],
  );

  const handleExport = useCallback(
    (formatType: "xlsx" | "csv") => {
      const exportToastId = `ib-plans-export-${formatType}`;

      try {
        if (filteredData.length === 0) {
          toast.error("No data to export", { id: exportToastId });
          return;
        }

        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, {
          id: exportToastId,
        });

        const exportData = filteredData.map((plan, index) => ({
          "Sr. No.": index + 1,
          "Plan ID": plan.id,
          Name: plan.name || "-",
          Status: plan.status ? "Active" : "Inactive",
          Created: formatExportDateTime(plan.created_at),
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

        toast.success(`Exported ${filteredData.length} IB plans to ${filename}`, {
          id: exportToastId,
        });
      } catch (error: unknown) {
        console.error(`Failed to export ${formatType}:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "IB plans",
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

  if (loading && data.length === 0) {
    return (
      <ProtectedRoute>
        <ListPageSkeleton
          actionCount={1}
          columnCount={5}
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
              IB Plans
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, update, and manage IB plans
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
              onClick={() => void invalidatePlans()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border bg-card p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by plan name or ID..."
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
        </div>

        <PermissionAwareCrudDataTable<IbPlanRow>
          data={filteredData}
          initialData={filteredData}
          columns={columns}
          formComponent={IbPlanForm}
          title=""
          description=""
          requiredModule="ibPlan"
          hideAddButton={true}
          onAdd={async (partial) => {
            const plan = partial as Partial<IbPlanRow>;
            return handleAdd({
              name: plan.name ?? "",
              status: Boolean(plan.status),
            });
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onView={(row) => {
            void handleViewPlan(row.id);
          }}
          onFetchItem={fetchPlanDetail}
          rowIsReadOnly={() => false}
        />

        <IbPlanForm
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          initialData={null}
          onSubmit={async (formData) => {
            await handleAdd({
              name: formData.name,
              status: formData.status,
            });
            setIsCreateDialogOpen(false);
          }}
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
        />
      </div>
    </ProtectedRoute>
  );
}
