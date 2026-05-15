"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { Building2, Eye, Landmark, Pencil, Plus, RefreshCw, Search, Trash2, Users } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
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

export function AdminBankDetailsPageContent() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { hasFeature, isAdmin, isManager } = useManagerPermissions();

  const canList = hasFeature("userManagement", "bankDetailsList");
  const canMutate = hasFeature("userManagement", "addBankDetails");

  const [search, setSearch] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [formValues, setFormValues] = useState<BankDetailFormValues>(emptyBankDetailForm);
  const [userSearch, setUserSearch] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<AdminBankDetailItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<AdminBankDetailItem | null>(null);

  const deferredUserSearch = useDeferredValue(userSearch.trim());
  const queryKey = useMemo(() => ["admin-bank-details", token] as const, [token]);

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
      const response = await adminBankDetailsApi.list(token!);
      const payload = response.data ?? { count: 0, rows: [] };
      const rawRows = extractBankDetailListRows(payload as unknown);
      const rows = rawRows
        .map((row) => normalizeAdminBankDetailRow(row))
        .filter((row): row is AdminBankDetailItem => row !== null);

      const payloadRecord = payload as { count?: number; pagination?: { total?: number } };
      const count =
        typeof payloadRecord.count === "number"
          ? payloadRecord.count
          : typeof payloadRecord.pagination?.total === "number"
            ? payloadRecord.pagination.total
            : rows.length;

      return { count: count ?? rows.length, rows };
    },
    enabled: Boolean(token) && canList,
    staleTime: 60 * 1000,
  });

  const {
    data: userOptions = [],
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: ["admin-bank-detail-users", token, deferredUserSearch],
    queryFn: async () => {
      const response = await adminUsersApi.list({
        token: token!,
        page: 1,
        limit: 20,
        search: deferredUserSearch || undefined,
      });

      return extractAdminUserOptions((response.data ?? null) as AdminUsersListApiData | null);
    },
    enabled: Boolean(token) && canMutate && dialogMode === "create",
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
        getAdminFriendlyErrorMessage(error, { resource: "bank details", action: "create" })
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ uuid, values }: { uuid: string; values: BankDetailFormValues }) =>
      adminBankDetailsApi.update(uuid, toBankDetailUpdatePayload(values), token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details updated successfully");
      setDialogMode(null);
      setSelectedDetail(null);
      setFormValues(emptyBankDetailForm());
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "bank details", action: "update" })
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uuid: string) => adminBankDetailsApi.delete(uuid, token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details deleted successfully");
      setDeleteCandidate(null);
      refreshBankDetails();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "bank details", action: "delete" })
      );
    },
  });

  const rows = useMemo(() => bankDetailsResponse?.rows ?? [], [bankDetailsResponse]);
  const filteredRows = useMemo(() => filterBankDetails(rows, search), [rows, search]);

  const totalBankDetails = bankDetailsResponse?.count ?? rows.length;
  const uniqueUsers = useMemo(
    () => new Set(rows.map((row) => row.user?.uuid).filter(Boolean)).size,
    [rows]
  );
  const countriesCovered = useMemo(
    () => new Set(rows.map((row) => row.country?.trim()).filter(Boolean)).size,
    [rows]
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
        toast.error("This record has no usable id or UUID. Refresh and try again.");
        return;
      }
      updateMutation.mutate({ uuid: routeId, values: formValues });
    }
  };

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
            <div className="font-medium">{row.original.user?.name || "-"}</div>
            <div className="text-xs text-muted-foreground">{row.original.user?.email || "-"}</div>
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
          <span className="font-mono text-xs">{row.original.account_number || "-"}</span>
        ),
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
        ),
      },
    ],
    [canMutate, openEditDialog, openViewDialog]
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
                <h1 className="text-2xl font-semibold tracking-tight">Bank Details</h1>
                <p className="text-sm text-muted-foreground">
                  Create, review, update, and delete user bank details from the admin panel.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canList ? (
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : null}
            {canMutate ? (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Bank Details
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBankDetails}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users Covered</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Countries</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countriesCovered}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Bank Details List</CardTitle>
              <CardDescription>
                Search by user, account holder, bank name, account number.
              </CardDescription>
            </div>
            {canList ? (
              <Badge variant="secondary" className="w-fit">
                {filteredRows.length} of {rows.length} records
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {canList ? (
              <>
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search bank details"
                    className="pl-9"
                  />
                </div>

                {isLoading ? (
                  <TableSectionSkeleton columnCount={6} rowCount={8} />
                ) : (
                  <AppDataTable<AdminBankDetailItem>
                    data={filteredRows}
                    columns={columns}
                    pageCount={1}
                    getRowId={(row) =>
                      resolveBankDetailRouteId(row) ??
                      `fallback-${row.user_id}-${row.account_number}-${row.bank_name}`
                    }
                  />
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                You can add bank details, but your account is not allowed to view the existing list.
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



