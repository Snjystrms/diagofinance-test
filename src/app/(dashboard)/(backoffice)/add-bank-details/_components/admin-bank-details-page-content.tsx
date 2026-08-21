"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { format, parse } from "date-fns";
import {
  Building2,
  Download,
  Eye,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { StatePreservingLink } from "@/components/state-preserving-link";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminBankDetailsApi,
  adminUsersApi,
  type AdminBankDetailItem,
  type AdminUsersListApiData,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

import {
  emptyBankDetailForm,
  extractAdminUserOptions,
  extractBankDetailListRows,
  filterBankDetails,
  mapBankDetailToForm,
  normalizeAdminBankDetailRow,
  resolveBankDetailRouteId,
  toBankDetailCreatePayload,
  toBankDetailUpdatePayload,
  validateBankDetailForm,
  type BankDetailFormValues,
} from "../_lib/bank-details";
import { BankDetailFormDialog } from "./bank-detail-form-dialog";
import { BankDetailViewDialog } from "./bank-detail-view-dialog";

type DialogMode = "create" | "edit" | null;

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

export function AdminBankDetailsPageContent() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { hasFeature, isAdmin, isManager } = useManagerPermissions();

  const canList = hasFeature("userManagement", "bankDetailsList");
  const canMutate = hasFeature("userManagement", "addBankDetails");

  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  // const [sortColumn, setSortColumn] = useState("id");
  const [sortOrder, setSortOrder] = useQueryState(
    "sort_order",
    parseAsString.withDefault("desc"),
  );
  const [dateFrom, setDateFrom] = useQueryState("date_from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("date_to", parseAsString);

  // Date state for DateRangePicker
  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(undefined);
  const [toDateObj, setToDateObj] = useState<Date | undefined>(undefined);

  // Sync date objects with query params
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
    useState<BankDetailFormValues>(emptyBankDetailForm);
  const [userSearch, setUserSearch] = useState("");
  const [selectedDetail, setSelectedDetail] =
    useState<AdminBankDetailItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] =
    useState<AdminBankDetailItem | null>(null);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  const deferredUserSearch = useDeferredValue(userSearch.trim());
  const queryKey = useMemo(
    () =>
      [
        "admin-bank-details",
        token,
        search,
        page,
        perPage,
        statusFilter,
        // sortColumn,
        sortOrder as "asc" | "desc",
      ] as const,
    [token, search, page, perPage, statusFilter, sortOrder],
  );

  const {
    data: bankDetailsResponse,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await adminBankDetailsApi.list(
        token!,
        search || undefined,
        page,
        perPage,
        statusFilter === "all" ? undefined : statusFilter,
        // sortColumn,
        sortOrder,
      );
      const payload = response.data ?? { count: 0, rows: [] };
      const rawRows = extractBankDetailListRows(payload as unknown);
      const rows = rawRows
        .map((row) => normalizeAdminBankDetailRow(row))
        .filter((row): row is AdminBankDetailItem => row !== null);

      const payloadRecord = payload as {
        count?: number;
        pagination?: {
          total?: number;
          page_count?: number;
          total_pages?: number;
        };
      };
      const count =
        typeof payloadRecord.count === "number"
          ? payloadRecord.count
          : typeof payloadRecord.pagination?.total === "number"
            ? payloadRecord.pagination.total
            : rows.length;
      const pageCount =
        typeof payloadRecord.pagination?.total_pages === "number"
          ? payloadRecord.pagination.total_pages
          : typeof payloadRecord.pagination?.page_count === "number"
            ? payloadRecord.pagination.page_count
            : 1;

      return { count, rows, pageCount };
    },
    enabled: Boolean(token) && canList,
    staleTime: 60 * 1000,
  });

  const { data: userOptions = [], isFetching: isFetchingUsers } = useQuery({
    queryKey: ["admin-bank-detail-users", token, deferredUserSearch],
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
      canMutate &&
      dialogMode === "create" &&
      deferredUserSearch.length >= 3,
    staleTime: 30 * 1000,
  });

  const refreshBankDetails = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: async (values: BankDetailFormValues) =>
      adminBankDetailsApi.create(toBankDetailCreatePayload(values), token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details created successfully");
      setDialogMode(null);
      setFormValues(emptyBankDetailForm());
      setSelectedDetail(null);
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "bank details",
          action: "create",
        }),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      uuid,
      values,
    }: {
      uuid: string;
      values: BankDetailFormValues;
    }) =>
      adminBankDetailsApi.update(
        uuid,
        toBankDetailUpdatePayload(values),
        token!,
      ),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details updated successfully");
      setDialogMode(null);
      setSelectedDetail(null);
      setFormValues(emptyBankDetailForm());
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "bank details",
          action: "update",
        }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uuid: string) =>
      adminBankDetailsApi.delete(uuid, token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details deleted successfully");
      setDeleteCandidate(null);
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "bank details",
          action: "delete",
        }),
      );
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({
      uuid,
      status,
      adminNotes,
    }: {
      uuid: string;
      status: "approved" | "rejected";
      adminNotes: string;
    }) =>
      adminBankDetailsApi.verify(
        uuid,
        { status, admin_notes: adminNotes },
        token!,
      ),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details verified successfully");
      setViewOpen(false);
      setSelectedDetail(null);
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "bank details",
          action: "verify",
        }),
      );
    },
  });

  const rows = useMemo(
    () => bankDetailsResponse?.rows ?? [],
    [bankDetailsResponse],
  );
  const filteredRows = rows;

  const totalBankDetails = bankDetailsResponse?.count ?? rows.length;
  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === "pending").length,
    [rows],
  );
  const uniqueUsers = useMemo(
    () => new Set(rows.map((row) => row.user?.uuid).filter(Boolean)).size,
    [rows],
  );
  const countriesCovered = useMemo(
    () => new Set(rows.map((row) => row.country?.trim()).filter(Boolean)).size,
    [rows],
  );

  const openCreateDialog = () => {
    setSelectedDetail(null);
    setFormValues(emptyBankDetailForm());
    setUserSearch("");
    setDialogMode("create");
  };

  const openEditDialog = useCallback((item: AdminBankDetailItem) => {
    setSelectedDetail(item);
    setFormValues(mapBankDetailToForm(item));
    setDialogMode("edit");
  }, []);

  const openViewDialog = useCallback((item: AdminBankDetailItem) => {
    setSelectedDetail(item);
    setViewOpen(true);
  }, []);

  const handleDialogSubmit = () => {
    const validationError = validateBankDetailForm(formValues, {
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
      const routeId = resolveBankDetailRouteId(selectedDetail);
      if (!routeId) {
        toast.error(
          "This record has no usable id or UUID. Refresh and try again.",
        );
        return;
      }
      updateMutation.mutate({ uuid: routeId, values: formValues });
    }
  };

  const handleExport = useCallback(
    async () => {
      if (!canList || !token) {
        toast.error("You do not have permission to export bank details");
        return;
      }

      const exportToastId = "bank-details-export";
      try {
        toast.loading("Preparing export...", { id: exportToastId });

        const response = await adminBankDetailsApi.export(
          token,
          search || null,
          statusFilter === "all" ? null : statusFilter,
          sortOrder,
          dateFrom || null,
          dateTo || null,
        );

        if (!response.ok) {
          throw new Error("Failed to export bank details");
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get("Content-Disposition");
        const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
        const filename = filenameMatch
          ? filenameMatch[1]
          : `bank-details-${getExportTimestamp()}.xlsx`;

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);

        toast.success(`Exported bank details to ${filename}`, {
          id: exportToastId,
        });
      } catch (error: unknown) {
        console.error("Failed to export:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "bank details",
            action: "export",
          }),
          { id: exportToastId },
        );
      }
    },
    [canList, token, search, statusFilter, sortOrder, dateFrom, dateTo],
  );

  const columns = useMemo<ColumnDef<AdminBankDetailItem>[]>(
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
            <StatePreservingLink
              storageKey="add-bank-details"
              href={`/new-users/${row.original.user?.id ?? ""}`}
              className="font-medium hover:underline"
            >
              {row.original.user?.name || "-"}
            </StatePreservingLink>
            <div className="text-xs text-muted-foreground">
              {row.original.user?.email || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "account_holder_name",
        header: "Account Holder",
        accessorKey: "account_holder_name",
      },
      {
        id: "bank_name",
        header: "Bank",
        accessorKey: "bank_name",
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
        cell: ({ row }) => row.original.country || "-",
      },
      {
        id: "account_number",
        header: "Account Number",
        accessorKey: "account_number",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.account_number || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const status = row.original.status || "pending";
          return (
            <Badge
              variant={
                status === "approved"
                  ? "default"
                  : status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
              className="capitalize"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          return (
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openViewDialog(row.original)}
                title="View bank detail"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => openEditDialog(row.original)}
                disabled={!canMutate}
                title="Edit bank detail"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setDeleteCandidate(row.original)}
                disabled={!canMutate}
                title="Delete bank detail"
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canMutate, openEditDialog, openViewDialog],
  );

  if (!isAdmin && isManager && !canList && !canMutate) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            audience="admin"
            variant="panel"
            title="Access restricted"
            message="Your account does not have permission to manage bank details."
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
            resource="bank details"
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
                <Landmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Bank Details
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create, review, update, and delete user bank details from the
                  admin panel.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canList ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
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
              </>
            ) : null}
            {canMutate ? (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Bank Details
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
                    placeholder="Search by user, account holder, bank name..."
                     className="min-w-[220px] flex-1 max-w-full"
                    minimumLength={3}
                    delay={300}
                  />
                </div>

                <div className="w-full sm:w-[180px]">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      void setStatusFilter(value === "all" ? null : value);
                      void setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-[140px]">
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => {
                      void setSortOrder(value);
                      void setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
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
                <TableSectionSkeleton columnCount={6} rowCount={8} />
              ) : (
                <AppDataTable<AdminBankDetailItem>
                  data={filteredRows}
                  columns={columns}
                  pageCount={bankDetailsResponse?.pageCount ?? 1}
                  getRowId={(row) =>
                    resolveBankDetailRouteId(row) ??
                    `fallback-${row.user_id}-${row.account_number}-${row.bank_name}`
                  }
                />
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            You can add bank details, but your account is not allowed to
            view the existing list.
          </div>
        )}

        <BankDetailFormDialog
          detail={selectedDetail}
          isLoadingDetail={false}
          isLoadingUsers={isFetchingUsers}
          mode={dialogMode === "edit" ? "edit" : "create"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null);
              setSelectedDetail(null);
              setFormValues(emptyBankDetailForm());
              setUserSearch("");
            }
          }}
          onSubmit={handleDialogSubmit}
          onUserSearchChange={setUserSearch}
          open={dialogMode !== null}
          submitting={createMutation.isPending || updateMutation.isPending}
          userOptions={userOptions}
          userSearch={userSearch}
          values={formValues}
          onValuesChange={setFormValues}
        />

        <BankDetailViewDialog
          detail={selectedDetail}
          loading={false}
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open);
            if (!open) {
              setSelectedDetail(null);
            }
          }}
          onVerify={(status, adminNotes) => {
            if (!selectedDetail) return;
            const routeId = resolveBankDetailRouteId(selectedDetail);
            if (!routeId) {
              toast.error(
                "This record has no usable id or UUID. Refresh and try again.",
              );
              return;
            }
            verifyMutation.mutate({ uuid: routeId, status, adminNotes });
          }}
          verifying={verifyMutation.isPending}
          canMutate={canMutate}
          onRefresh={refreshBankDetails}
        />

        <DeleteDialog
          isOpen={Boolean(deleteCandidate)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteCandidate(null);
            }
          }}
          onConfirm={() => {
            if (!deleteCandidate || !token) return;
            const routeId = resolveBankDetailRouteId(deleteCandidate);
            if (!routeId) {
              toast.error("Cannot delete: missing record identifier.");
              return;
            }
            deleteMutation.mutate(routeId);
          }}
          title="Delete Bank Details"
          description={`Are you sure you want to delete the bank details for ${deleteCandidate?.user?.name || deleteCandidate?.account_holder_name || "this record"}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  );
}
