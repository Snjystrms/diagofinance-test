"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import {
  Building2,
  ChevronDown,
  Download,
  Eye,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";

import { AppDataTable } from "@/components/app-data-table";
import { StatePreservingLink } from "@/components/state-preserving-link";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    (formatType: "xlsx" | "csv") => {
      if (!canList) {
        toast.error("You do not have permission to export bank details");
        return;
      }

      const exportToastId = `bank-details-export-${formatType}`;
      try {
        if (filteredRows.length === 0) {
          toast.error("No data to export", { id: exportToastId });
          return;
        }

        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, {
          id: exportToastId,
        });
        const exportData = filteredRows.map((row, index) => ({
          "Sr. No.": index + 1,
          User: row.user?.name || "-",
          Email: row.user?.email || "-",
          "Account Holder": row.account_holder_name || "-",
          Bank: row.bank_name || "-",
          Country: row.country || "-",
          "Account Number": row.account_number || "-",
          IBAN: row.iban_number || "-",
          "SWIFT/IFSC": row.swift_ifsc_code || "-",
          Address: row.address || "-",
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const filenameBase = `bank-details-${getExportTimestamp()}`;
        let filename = `${filenameBase}.xlsx`;

        if (formatType === "xlsx") {
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Details");
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
          `Exported ${filteredRows.length} bank details to ${filename}`,
          {
            id: exportToastId,
          },
        );
      } catch (error: unknown) {
        console.error(`Failed to export ${formatType}:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "bank details",
            action: "export",
          }),
          { id: exportToastId },
        );
      }
    },
    [canList, filteredRows],
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

        <Card>
          <CardContent className="space-y-4">
            {canList ? (
              <>
                <div className="flex flex-col gap-3 pt-4 md:flex-row md:items-center">
                  <div className="w-full max-w-md">
                    <ApiSearchBar
                      value={searchInput}
                      onChange={setSearchInput}
                      onSearch={(value) => {
                        void setPage(1);
                        void setSearch(value || null);
                      }}
                      placeholder="Search by user, account holder, bank name..."
                      minimumLength={3}
                      delay={300}
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="w-full min-w-[180px] sm:w-[180px]">
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                          void setStatusFilter(value === "all" ? null : value);
                          void setPage(1);
                        }}
                      >
                        <SelectTrigger>
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
{/* 
                    <div className="w-full min-w-[180px] sm:w-[180px]">
                      <Select
                        value={sortColumn}
                        onValueChange={(value) => {
                          setSortColumn(value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="id">Sort by ID</SelectItem>
                        </SelectContent>
                      </Select>
                    </div> */}

                    <div className="w-full min-w-[140px] sm:w-[140px]">
                      <Select
                        value={sortOrder}
                        onValueChange={(value) => {
                          void setSortOrder(value);
                          void setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

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
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                You can add bank details, but your account is not allowed to
                view the existing list.
              </div>
            )}
          </CardContent>
        </Card>

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
