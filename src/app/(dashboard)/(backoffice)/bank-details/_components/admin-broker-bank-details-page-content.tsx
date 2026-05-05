"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
  Building2,
  Eye,
  Globe2,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

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
import {
  adminBrokerBankDetailsApi,
  type BrokerBankDetailItem,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTimeInIST } from "@/lib/formatters";

import {
  emptyBrokerBankDetailForm,
  filterBrokerBankDetails,
  isBrokerBankDetailActive,
  mapBrokerBankDetailToForm,
  toBrokerBankDetailPayload,
  validateBrokerBankDetailForm,
  type BrokerBankDetailFormValues,
} from "../_lib/broker-bank-details";
import { BrokerBankDetailFormDialog } from "./broker-bank-detail-form-dialog";
import { BrokerBankDetailViewDialog } from "./broker-bank-detail-view-dialog";

type DialogMode = "create" | "edit" | null;

export function AdminBrokerBankDetailsPageContent() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [formValues, setFormValues] = useState<BrokerBankDetailFormValues>(
    emptyBrokerBankDetailForm
  );
  const [selectedDetail, setSelectedDetail] = useState<BrokerBankDetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<BrokerBankDetailItem | null>(null);

  const queryKey = useMemo(
    () => ["admin-broker-bank-details", token] as const,
    [token]
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
      const response = await adminBrokerBankDetailsApi.list(token!);
      return response.data ?? { count: 0, rows: [] };
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const refreshBankDetails = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: async (values: BrokerBankDetailFormValues) =>
      adminBrokerBankDetailsApi.create(toBrokerBankDetailPayload(values), token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details created successfully");
      setDialogMode(null);
      setFormValues(emptyBrokerBankDetailForm());
      setSelectedDetail(null);
      refreshBankDetails();
    },
    onError: (mutationError) => {
      toast.error(
        getAdminFriendlyErrorMessage(mutationError, {
          resource: "broker bank details",
          action: "create",
        })
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: number;
      values: BrokerBankDetailFormValues;
    }) =>
      adminBrokerBankDetailsApi.update(id, toBrokerBankDetailPayload(values), token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details updated successfully");
      setDialogMode(null);
      setSelectedDetail(null);
      setFormValues(emptyBrokerBankDetailForm());
      refreshBankDetails();
    },
    onError: (mutationError) => {
      toast.error(
        getAdminFriendlyErrorMessage(mutationError, {
          resource: "broker bank details",
          action: "update",
        })
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      adminBrokerBankDetailsApi.delete(id, token!),
    onSuccess: (response) => {
      toast.success(response.message || "Bank details deleted successfully");
      setDeleteCandidate(null);
      refreshBankDetails();
    },
    onError: (mutationError) => {
      toast.error(
        getAdminFriendlyErrorMessage(mutationError, {
          resource: "broker bank details",
          action: "delete",
        })
      );
    },
  });

  const rows = useMemo(() => bankDetailsResponse?.rows ?? [], [bankDetailsResponse]);
  const filteredRows = useMemo(
    () => filterBrokerBankDetails(rows, search),
    [rows, search]
  );

  const totalBankDetails = bankDetailsResponse?.count ?? rows.length;
  const activeBankDetails = useMemo(
    () => rows.filter((row) => isBrokerBankDetailActive(row)).length,
    [rows]
  );
  const countriesCovered = useMemo(
    () => new Set(rows.map((row) => row.country?.trim()).filter(Boolean)).size,
    [rows]
  );

  const loadBankDetail = useCallback(
    async (id: number) => {
      if (!token) return null;

      setDetailLoading(true);
      try {
        const response = await adminBrokerBankDetailsApi.getById(id, token);
        return response.data ?? null;
      } catch (loadError) {
        toast.error(
          getAdminFriendlyErrorMessage(loadError, {
            resource: "broker bank detail",
            action: "load",
          })
        );
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const openCreateDialog = () => {
    setSelectedDetail(null);
    setFormValues(emptyBrokerBankDetailForm());
    setDialogMode("create");
  };

  const openEditDialog = useCallback(
    async (id: number) => {
      const detail = await loadBankDetail(id);
      if (!detail) return;

      setSelectedDetail(detail);
      setFormValues(mapBrokerBankDetailToForm(detail));
      setDialogMode("edit");
    },
    [loadBankDetail]
  );

  const openViewDialog = useCallback(
    async (id: number) => {
      setViewOpen(true);
      const detail = await loadBankDetail(id);
      if (detail) {
        setSelectedDetail(detail);
      }
    },
    [loadBankDetail]
  );

  const handleDialogSubmit = () => {
    const validationError = validateBrokerBankDetailForm(formValues);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (dialogMode === "create") {
      createMutation.mutate(formValues);
      return;
    }

    if (dialogMode === "edit" && selectedDetail) {
      updateMutation.mutate({ id: selectedDetail.id, values: formValues });
    }
  };

  const columns = useMemo<ColumnDef<BrokerBankDetailItem>[]>(
    () => [
      {
        id: "account_holder_name",
        header: "Account Holder",
        accessorKey: "account_holder_name",
      },
      {
        id: "bank_name",
        header: "Bank",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">{row.original.bank_name || "-"}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.country || "-"}
            </div>
          </div>
        ),
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
        id: "swift_ifsc_code",
        header: "Swift / IFSC",
        accessorKey: "swift_ifsc_code",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.swift_ifsc_code || "-"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const active = isBrokerBankDetailActive(row.original);
          return (
            <Badge variant={active ? "default" : "secondary"}>
              {active ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        id: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTimeInIST(row.original.updated_at)}
          </span>
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
              onClick={() => {
                void openViewDialog(row.original.id);
              }}
              title="View bank detail"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                void openEditDialog(row.original.id);
              }}
              title="Edit bank detail"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setDeleteCandidate(row.original)}
              title="Delete bank detail"
              className="text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [openEditDialog, openViewDialog]
  );

  if (isError && rows.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="broker bank details"
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
                  Deposit Bank Details
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage the bank accounts that clients see on the bank deposit tab.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Bank Detail
            </Button>
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
              <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBankDetails}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Countries</CardTitle>
              <Globe2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countriesCovered}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Broker Bank Accounts</CardTitle>
              <CardDescription>
                Search by bank, account holder, account number, IBAN, or Swift/IFSC code.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {filteredRows.length} of {rows.length} records
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <TableSectionSkeleton columnCount={7} rowCount={8} />
            ) : (
              <AppDataTable<BrokerBankDetailItem>
                data={filteredRows}
                columns={columns}
                pageCount={1}
                getRowId={(row) => String(row.id)}
              />
            )}
          </CardContent>
        </Card>

        <BrokerBankDetailFormDialog
          detail={selectedDetail}
          isLoadingDetail={detailLoading}
          mode={dialogMode === "edit" ? "edit" : "create"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode(null);
              setSelectedDetail(null);
              setFormValues(emptyBrokerBankDetailForm());
            }
          }}
          onSubmit={handleDialogSubmit}
          open={dialogMode !== null}
          submitting={createMutation.isPending || updateMutation.isPending}
          values={formValues}
          onValuesChange={setFormValues}
        />

        <BrokerBankDetailViewDialog
          detail={selectedDetail}
          loading={detailLoading}
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
            if (deleteCandidate) {
              deleteMutation.mutate(deleteCandidate.id);
            }
          }}
          title="Delete Bank Detail"
          description={`Are you sure you want to delete the bank detail for ${deleteCandidate?.bank_name || "this record"}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </div>
    </ProtectedRoute>
  );
}
