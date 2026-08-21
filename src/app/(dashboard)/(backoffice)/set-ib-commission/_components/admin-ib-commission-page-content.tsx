"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { format, parse } from "date-fns";
import { Eye, Pencil, Percent, Plus, RefreshCw } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminIbCommissionApi,
  adminIbPlansCrudApi,
  adminUsersApi,
  type AdminIbCommissionItem,
  type AdminIbPlanCrudListData,
  type AdminUsersListApiData,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

import {
  coerceBoolean,
  emptyIbCommissionForm,
  extractAdminUserOptions,
  extractIbCommissionListRows,
  extractIbCommissionPagination,
  extractIbPlanOptions,
  mapIbCommissionToForm,
  normalizeAdminIbCommissionRow,
  toIbCommissionCreatePayload,
  toIbCommissionUpdatePayload,
  validateIbCommissionForm,
  type IbCommissionFormValues,
} from "../_lib/ib-commission";
import { IbCommissionFormDialog } from "./ib-commission-form-dialog";
import { IbCommissionViewDialog } from "./ib-commission-view-dialog";

type DialogMode = "create" | "edit" | null;

const formatDateTime = (value?: string | null) => {
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

const toDateMs = (value?: string | null): number => {
  if (!value) return Number.NaN;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NaN : date.getTime();
};

export function AdminIbCommissionPageContent() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { hasFeature, isAdmin, isManager } = useManagerPermissions();

  const canList = hasFeature("ibManagement", "setIbCommission");
  const canCreate = hasFeature("ibManagement", "addIbCommission");
  const canEdit = hasFeature("ibManagement", "editIbCommission");

  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "sort_order",
    parseAsString.withDefault("desc"),
  );
  const [dateFrom, setDateFrom] = useQueryState("date_from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("date_to", parseAsString);

  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(undefined);
  const [toDateObj, setToDateObj] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (dateFrom) {
      const parsed = parse(dateFrom, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setFromDateObj(parsed);
    } else {
      setFromDateObj(undefined);
    }
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) {
      const parsed = parse(dateTo, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setToDateObj(parsed);
    } else {
      setToDateObj(undefined);
    }
  }, [dateTo]);

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [formValues, setFormValues] =
    useState<IbCommissionFormValues>(emptyIbCommissionForm);
  const [userSearch, setUserSearch] = useState("");
  const [selectedDetail, setSelectedDetail] =
    useState<AdminIbCommissionItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  const deferredUserSearch = useDeferredValue(userSearch.trim());
  const queryKey = useMemo(
    () =>
      [
        "admin-ib-commission",
        token,
        search,
        page,
        perPage,
        statusFilter,
        sortOrder as "asc" | "desc",
        dateFrom,
        dateTo,
      ] as const,
    [token, search, page, perPage, statusFilter, sortOrder, dateFrom, dateTo],
  );

  const {
    data: ibCommissionsResponse,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await adminIbCommissionApi.list(
        token!,
        search || undefined,
        page,
        perPage,
        sortOrder,
        dateFrom || undefined,
        dateTo || undefined,
      );
      const payload = response.data ?? {};
      const rawRows = extractIbCommissionListRows(payload as unknown);
      const rows = rawRows
        .map((row) => normalizeAdminIbCommissionRow(row))
        .filter((row): row is AdminIbCommissionItem => row !== null);
      const pagination = extractIbCommissionPagination(payload as unknown);

      return {
        rows,
        totalIbCommissions: pagination?.totalIbCommissions ?? rows.length,
        pageCount: pagination?.totalPages ?? 1,
      };
    },
    enabled: Boolean(token) && canList,
    staleTime: 60 * 1000,
  });

  const { data: userOptions = [], isFetching: isFetchingUsers } = useQuery({
    queryKey: ["admin-ib-commission-users", token, deferredUserSearch],
    queryFn: async () => {
      const response = await adminUsersApi.list({
        token: token!,
        page: 1,
        limit: 20,
        search: deferredUserSearch || undefined,
      });

      return extractAdminUserOptions(
        (response.data ?? null) as AdminUsersListApiData | null,
      );
    },
    enabled:
      Boolean(token) &&
      canCreate &&
      dialogMode === "create" &&
      deferredUserSearch.length >= 3,
    staleTime: 30 * 1000,
  });

  const { data: planOptions = [], isFetching: isFetchingPlans } = useQuery({
    queryKey: ["admin-ib-commission-plans", token],
    queryFn: async () => {
      const response = await adminIbPlansCrudApi.list(token!);
      return extractIbPlanOptions(
        (response.data ?? null) as AdminIbPlanCrudListData | null,
      );
    },
    enabled: Boolean(token) && dialogMode !== null,
    staleTime: 5 * 60 * 1000,
  });

  const refreshIbCommissions = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: async (values: IbCommissionFormValues) =>
      adminIbCommissionApi.create(toIbCommissionCreatePayload(values), token!),
    onSuccess: (response) => {
      toast.success(
        response.message || "IB commission assigned successfully",
      );
      setDialogMode(null);
      setFormValues(emptyIbCommissionForm());
      setSelectedDetail(null);
      refreshIbCommissions();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission",
          action: "assign",
        }),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      userUuid,
      values,
    }: {
      userUuid: string;
      values: IbCommissionFormValues;
    }) =>
      adminIbCommissionApi.update(
        userUuid,
        toIbCommissionUpdatePayload(values),
        token!,
      ),
    onSuccess: (response) => {
      toast.success(
        response.message || "IB commission updated successfully",
      );
      setDialogMode(null);
      setSelectedDetail(null);
      setFormValues(emptyIbCommissionForm());
      refreshIbCommissions();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission",
          action: "update",
        }),
      );
    },
  });

  const rows = useMemo(
    () => ibCommissionsResponse?.rows ?? [],
    [ibCommissionsResponse],
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (statusFilter !== "all") {
      const target = statusFilter === "active";
      result = result.filter((row) => coerceBoolean(row.status) === target);
    }
    if (dateFrom) {
      const fromMs = parse(dateFrom, "yyyy-MM-dd", new Date()).getTime();
      if (!Number.isNaN(fromMs)) {
        result = result.filter((row) => {
          const ms = toDateMs(row.created_at);
          return Number.isNaN(ms) || ms >= fromMs;
        });
      }
    }
    if (dateTo) {
      const toMs = parse(dateTo, "yyyy-MM-dd", new Date()).getTime();
      if (!Number.isNaN(toMs)) {
        result = result.filter((row) => {
          const ms = toDateMs(row.created_at);
          return Number.isNaN(ms) || ms <= toMs;
        });
      }
    }
    return result;
  }, [rows, statusFilter, dateFrom, dateTo]);

  const totalIbCommissions =
    ibCommissionsResponse?.totalIbCommissions ?? rows.length;
  const activeCount = useMemo(
    () => rows.filter((row) => coerceBoolean(row.status)).length,
    [rows],
  );
  const uniqueUsers = useMemo(
    () => new Set(rows.map((row) => row.user_uuid).filter(Boolean)).size,
    [rows],
  );

  const openCreateDialog = () => {
    setSelectedDetail(null);
    setFormValues(emptyIbCommissionForm());
    setUserSearch("");
    setDialogMode("create");
  };

  const openEditDialog = useCallback((item: AdminIbCommissionItem) => {
    setSelectedDetail(item);
    setFormValues(mapIbCommissionToForm(item));
    setDialogMode("edit");
  }, []);

  const openViewDialog = useCallback(
    async (item: AdminIbCommissionItem) => {
      setSelectedDetail(item);
      setViewOpen(true);
      setViewLoading(true);
      if (token) {
        try {
          const response = await adminIbCommissionApi.get(
            item.user_uuid,
            token,
          );
          const fresh = normalizeAdminIbCommissionRow(response.data ?? item);
          if (fresh) setSelectedDetail(fresh);
        } catch (loadError) {
          console.error("Failed to load IB commission detail:", loadError);
          toast.error(
            getAdminFriendlyErrorMessage(loadError, {
              resource: "IB commission",
              action: "load",
            }),
          );
        } finally {
          setViewLoading(false);
        }
      } else {
        setViewLoading(false);
      }
    },
    [token],
  );

  const handleDialogSubmit = () => {
    const validationError = validateIbCommissionForm(formValues, {
      requireUserUuid: dialogMode === "create",
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (dialogMode === "create") {
      createMutation.mutate(formValues);
      return;
    }

    if (dialogMode === "edit" && selectedDetail) {
      updateMutation.mutate({
        userUuid: selectedDetail.user_uuid,
        values: formValues,
      });
    }
  };

  const columns = useMemo<ColumnDef<AdminIbCommissionItem>[]>(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">
              {row.original.user_name || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.user_email || "-"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.original.user_uuid || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "plan",
        header: "IB Plan",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div>{row.original.plan_name || "-"}</div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={coerceBoolean(row.original.status) ? "default" : "secondary"}
            className="capitalize"
          >
            {coerceBoolean(row.original.status) ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "assigned_by",
        header: "Assigned By",
        cell: ({ row }) => row.original.assigned_by || "-",
      },
      {
        id: "created_at",
        header: "Created At",
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: "updated_at",
        header: "Updated At",
        cell: ({ row }) => formatDateTime(row.original.updated_at),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void openViewDialog(row.original)}
              title="View IB commission"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => openEditDialog(row.original)}
              disabled={!canEdit}
              title="Edit IB commission"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [canEdit, openEditDialog, openViewDialog],
  );

  if (!isAdmin && isManager && !canList && !canCreate) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            audience="admin"
            variant="panel"
            title="Access restricted"
            message="Your account does not have permission to manage IB commissions."
          />
        </div>
      </ProtectedRoute>
    );
  }

  if (isError && canList && rows.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="IB commissions"
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
      <div className="container mx-auto space-y-6 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Set IB Commission
                </h1>
                <p className="text-sm text-muted-foreground">
                  Assign and manage IB plans and commission status for users.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canList ? (
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            ) : null}
            {canCreate ? (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Assign IB Commission
              </Button>
            ) : null}
          </div>
        </div>

        {canList ? (
          <>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-end">
                <div className="w-full sm:max-w-md sm:flex-1">
                  <ApiSearchBar
                    value={searchInput}
                    onChange={setSearchInput}
                    onSearch={(value) => {
                      void setPage(1);
                      void setSearch(value || null);
                    }}
                    placeholder="Search by user, email, IB plan..."
                    minimumLength={3}
                    delay={300}
                  />
                </div>

                <DateRangePicker
                  fromDate={fromDateObj}
                  toDate={toDateObj}
                  onFromDateChange={(date) => {
                    setFromDateObj(date);
                    void setDateFrom(date ? format(date, "yyyy-MM-dd") : null);
                    void setPage(1);
                  }}
                  onToDateChange={(date) => {
                    setToDateObj(date);
                    void setDateTo(date ? format(date, "yyyy-MM-dd") : null);
                    void setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              {isLoading ? (
                <TableSectionSkeleton columnCount={8} rowCount={8} />
              ) : (
                <AppDataTable<AdminIbCommissionItem>
                  data={filteredRows}
                  columns={columns}
                  pageCount={ibCommissionsResponse?.pageCount ?? 1}
                  getRowId={(row) =>
                    row.user_uuid ?? `fallback-${row.id}-${row.plan_name}`
                  }
                />
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            You can assign IB commissions, but your account is not allowed
            to view the existing list.
          </div>
        )}

        <IbCommissionFormDialog
          detail={selectedDetail}
          mode={dialogMode === "edit" ? "edit" : "create"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null);
              setSelectedDetail(null);
              setFormValues(emptyIbCommissionForm());
              setUserSearch("");
            }
          }}
          onSubmit={handleDialogSubmit}
          onUserSearchChange={setUserSearch}
          open={dialogMode !== null}
          submitting={createMutation.isPending || updateMutation.isPending}
          userOptions={userOptions}
          userSearch={userSearch}
          isLoadingUsers={isFetchingUsers}
          planOptions={planOptions}
          planLoading={isFetchingPlans}
          values={formValues}
          onValuesChange={setFormValues}
        />

        <IbCommissionViewDialog
          detail={selectedDetail}
          loading={viewLoading}
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open);
            if (!open) {
              setSelectedDetail(null);
            }
          }}
          onEdit={
            canEdit
              ? () => {
                  if (!selectedDetail) return;
                  setViewOpen(false);
                  openEditDialog(selectedDetail);
                }
              : undefined
          }
        />
      </div>
    </ProtectedRoute>
  );
}
