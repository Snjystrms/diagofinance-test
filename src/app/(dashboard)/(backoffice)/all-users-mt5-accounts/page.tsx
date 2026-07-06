"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  ChevronDown,
  Database,
  Download,
  RefreshCw,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { adminMT5AccountsApi, adminMt5UsersReportApi, type AdminMT5Account, type UpdateMT5AccountRequest, type CreateMT5AccountRequest } from "@/lib/api";
import { useModuleCapabilities } from "@/hooks/use-permission-capabilities";
import { getColumnsWithActions } from "./columns";
import { EditAccountDialog } from "./edit-account-dialog";
import { CreateAccountDialog } from "./create-account-dialog";
import { AccountDetailsDialog } from "./account-details-dialog";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { Plus } from "lucide-react";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "1" },
  { label: "Inactive", value: "0" },
];

const accountModeFilters = [
  { label: "All", value: "all" },
  { label: "Demo", value: "demo" },
  { label: "Live", value: "live" },
];

const extractItems = (data: unknown): AdminMT5Account[] => {
  if (!data) return [];
  
  const dataObj = data as Record<string, unknown>;
  
  // If data is already an array, return it
  if (Array.isArray(data)) return data as AdminMT5Account[];
  
  // Check for mt5_accounts first (most common case based on API response)
  if (Array.isArray(dataObj.mt5_accounts)) return dataObj.mt5_accounts as AdminMT5Account[];
  
  // Check for other common array property names
  if (Array.isArray(dataObj.accounts)) return dataObj.accounts as AdminMT5Account[];
  if (Array.isArray(dataObj.items)) return dataObj.items as AdminMT5Account[];
  
  // Check nested data structures
  if (dataObj.data) {
    const nestedData = dataObj.data as Record<string, unknown>;
    if (Array.isArray(dataObj.data)) return dataObj.data as AdminMT5Account[];
    if (nestedData && Array.isArray(nestedData.mt5_accounts)) return nestedData.mt5_accounts as AdminMT5Account[];
    if (nestedData && Array.isArray(nestedData.accounts)) return nestedData.accounts as AdminMT5Account[];
    if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as AdminMT5Account[];
    if (nestedData && Array.isArray(nestedData.data)) return nestedData.data as AdminMT5Account[];
  }
  
  return [];
};

const extractAccountDetail = (data: unknown): AdminMT5Account | null => {
  if (!data || Array.isArray(data)) return null;

  const dataObj = data as Record<string, unknown>;
  const topLevelServer =
    typeof dataObj.server === "string"
      ? dataObj.server
      : dataObj.data && !Array.isArray(dataObj.data) && typeof (dataObj.data as Record<string, unknown>).server === "string"
        ? ((dataObj.data as Record<string, unknown>).server as string)
        : undefined;

  if (dataObj.mt5_account && !Array.isArray(dataObj.mt5_account)) {
    return {
      ...(dataObj.mt5_account as AdminMT5Account),
      ...(topLevelServer ? { server: topLevelServer } : {}),
    };
  }

  if (dataObj.account && !Array.isArray(dataObj.account)) {
    return dataObj.account as AdminMT5Account;
  }

  if (dataObj.data && !Array.isArray(dataObj.data)) {
    const nestedData = dataObj.data as Record<string, unknown>;

    if (nestedData.mt5_account && !Array.isArray(nestedData.mt5_account)) {
      return {
        ...(nestedData.mt5_account as AdminMT5Account),
        ...(topLevelServer ? { server: topLevelServer } : {}),
      };
    }

    if (nestedData.account && !Array.isArray(nestedData.account)) {
      return nestedData.account as AdminMT5Account;
    }

    if (nestedData.id || nestedData.account_id || nestedData.mt5_id) {
      return nestedData as AdminMT5Account;
    }
  }

  if (dataObj.id || dataObj.account_id || dataObj.mt5_id) {
    return dataObj as AdminMT5Account;
  }

  return null;
};

export default function AllUsersMT5AccountsPage() {
  const { token } = useAuth();
  const { can } = useModuleCapabilities("userManagement");
  const canViewMt5List = can("mt5List");
  const canCreateMt5 = can("mt5Add");
  const canEditMt5 = can("mt5Edit");
  const canDeleteMt5 = can("mt5Delete");
  const showActionsColumn = canViewMt5List || canEditMt5 || canDeleteMt5;

  const [accounts, setAccounts] = useState<AdminMT5Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
  const [accountModeFilter, setAccountModeFilter] = useQueryState(
    "account_mode",
    parseAsString.withDefault("all"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [userIdFilter, setUserIdFilter] = useQueryState(
    "user_id",
    parseAsString.withDefault(""),
  );
  const [groupIdFilter, setGroupIdFilter] = useQueryState(
    "group_id",
    parseAsString.withDefault(""),
  );
  const [managerIdFilter, setManagerIdFilter] = useQueryState(
    "manager_id",
    parseAsString.withDefault(""),
  );
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);
  const [dateFrom, setDateFrom] = useQueryState("date_from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("date_to", parseAsString);

  const [searchInput, setSearchInput] = useState(search ?? "");

  // Create, Edit and Delete state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminMT5Account | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsAccount, setDetailsAccount] = useState<AdminMT5Account | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | number | null>(null);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const loadAccounts = useCallback(async () => {
    if (!canViewMt5List) {
      setAccounts([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!token) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminMT5AccountsApi.list({
        token,
        page,
        limit: perPage,
        status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        account_mode:
          accountModeFilter && accountModeFilter !== "all" ? accountModeFilter : undefined,
        search: search?.trim() ? search : undefined,
        user_id: userIdFilter?.trim() ? userIdFilter : undefined,
        group_id: groupIdFilter?.trim() ? groupIdFilter : undefined,
        manager_id: managerIdFilter?.trim() ? managerIdFilter : undefined,
        sort_by: sortBy || undefined,
        sort_order: sortOrder || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });

      // The API returns { success, message, data: { mt5_accounts: [...], pagination: {...} } }
      // So response.data contains the object with mt5_accounts and pagination
      const payload = response?.data;

      // Extract accounts from the payload
      const items = extractItems(payload);
      setAccounts(items);

      const payloadObj = payload as unknown as Record<string, unknown> | undefined;
      const responseObj = response as unknown as Record<string, unknown> | undefined;
      const paginationSource =
        (payload && (payloadObj?.pagination as Record<string, unknown> | undefined)) ??
        (payload && ((payloadObj?.meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)) ??
        (payload &&
          payloadObj?.data &&
          !Array.isArray(payloadObj.data) &&
          (((payloadObj.data as Record<string, unknown>).pagination as Record<string, unknown> | undefined) ?? 
          ((payloadObj.data as Record<string, unknown>).meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)) ??
        (response && ((responseObj?.data as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)) ??
        (response && (responseObj?.pagination as Record<string, unknown> | undefined));

      const paginationObj = paginationSource as Record<string, unknown> | undefined;
      const payloadTyped = payload as Record<string, unknown> | undefined;
      
      const total =
        (paginationObj?.total as number | undefined) ??
        (paginationObj?.total_items as number | undefined) ??
        (paginationObj?.total_accounts as number | undefined) ??
        (paginationObj?.totalAccounts as number | undefined) ??
        (payloadTyped?.total as number | undefined) ??
        (payloadTyped?.total_accounts as number | undefined) ??
        items.length;

      const perPageValue =
        (paginationObj?.per_page as number | undefined) ??
        (paginationObj?.perPage as number | undefined) ??
        (paginationObj?.limit as number | undefined) ??
        perPage;

      const totalPages =
        (paginationObj?.total_pages as number | undefined) ??
        (paginationObj?.last_page as number | undefined) ??
        (perPageValue ? Math.max(1, Math.ceil(total / perPageValue)) : 1);

      setPagination({
        current_page:
          (paginationObj?.current_page as number | undefined) ??
          (paginationObj?.page as number | undefined) ??
          page,
        per_page: perPageValue,
        total_pages: totalPages,
        total,
      });
    } catch (error: unknown) {
      console.error("Failed to load MT5 accounts:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "MT5 accounts", action: "load" })
      );
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, accountModeFilter, search, userIdFilter, groupIdFilter, managerIdFilter, sortBy, sortOrder, dateFrom, dateTo, canViewMt5List]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canViewMt5List) {
      toast.error("You do not have permission to export MT5 accounts");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    const exportToastId = `mt5-accounts-export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

      const { blob, filename } = await adminMt5UsersReportApi.export({
        token,
        format: formatType,
        status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        account_mode:
          accountModeFilter && accountModeFilter !== "all" ? accountModeFilter : undefined,
        search: search?.trim() ? search : undefined,
        user_id: userIdFilter?.trim() ? userIdFilter : undefined,
        group_id: groupIdFilter?.trim() ? groupIdFilter : undefined,
        manager_id: managerIdFilter?.trim() ? managerIdFilter : undefined,
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
        getAdminFriendlyErrorMessage(error, { resource: "MT5 accounts", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [
    canViewMt5List,
    token,
    statusFilter,
    accountModeFilter,
    search,
    userIdFilter,
    groupIdFilter,
    managerIdFilter,
  ]);

  // Create handler
  const handleCreate = useCallback(async (data: CreateMT5AccountRequest) => {
    if (!token) return;

    try {
      await adminMT5AccountsApi.create(data, token);
      toast.success("MT5 account created successfully");
      setIsCreateDialogOpen(false);
      void loadAccounts(); // Refresh the list
    } catch (error: unknown) {
      console.error("Failed to create MT5 account:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "MT5 accounts", action: "create" })
      );
      throw error; // Re-throw to let the dialog handle it
    }
  }, [token, loadAccounts]);

  // Edit handler
  const handleEdit = useCallback((account: AdminMT5Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback(async (account: AdminMT5Account) => {
    if (!token) return;

    const accountId = account.id ?? account.account_id ?? account.mt5_id;

    if (!accountId) {
      toast.error("Account ID not found");
      return;
    }

    setIsDetailsDialogOpen(true);
    setDetailsAccount(null);
    setIsDetailsLoading(true);

    try {
      const response = await adminMT5AccountsApi.getById(accountId, token);
      const selectedAccount = extractAccountDetail(response);

      if (!selectedAccount) {
        toast.error(
          getAdminFriendlyErrorMessage("Account details are not available", {
            resource: "MT5 account details",
            action: "load",
          })
        );
        setDetailsAccount(account);
        return;
      }

      setDetailsAccount(selectedAccount);
    } catch (error: unknown) {
      console.error("Failed to load MT5 account details:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "MT5 account details", action: "load" })
      );
      setDetailsAccount(account);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [token]);

  // Update handler
  const handleUpdate = useCallback(async (data: UpdateMT5AccountRequest) => {
    if (!token || !editingAccount) return;

    const accountId = editingAccount.id ?? editingAccount.account_id ?? editingAccount.mt5_id;
    if (!accountId) {
      toast.error("Account ID not found");
      return;
    }

    try {
      await adminMT5AccountsApi.update(accountId, data, token);
      toast.success("MT5 account updated successfully");
      setIsEditDialogOpen(false);
      setEditingAccount(null);
      void loadAccounts(); // Refresh the list
    } catch (error: unknown) {
      console.error("Failed to update MT5 account:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "MT5 accounts", action: "update" })
      );
    }
  }, [token, editingAccount, loadAccounts]);

  // Delete handler
  const handleDeleteClick = useCallback((id: string | number) => {
    setAccountToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!token || !accountToDelete) return;

    try {
      await adminMT5AccountsApi.delete(accountToDelete, token);
      toast.success("MT5 account deleted successfully");
      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);
      void loadAccounts(); // Refresh the list
    } catch (error: unknown) {
      console.error("Failed to delete MT5 account:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "MT5 accounts", action: "delete" })
      );
    }
  }, [token, accountToDelete, loadAccounts]);

  const columns: ColumnDef<AdminMT5Account>[] = useMemo(
    () =>
      getColumnsWithActions(handleViewDetails, handleEdit, handleDeleteClick, {
        canView: canViewMt5List,
        canEdit: canEditMt5,
        canDelete: canDeleteMt5,
        showActionsColumn,
      }),
    [handleViewDetails, handleEdit, handleDeleteClick, canViewMt5List, canEditMt5, canDeleteMt5, showActionsColumn]
  );

  const visibleAccounts = useMemo(() => {
    if (!accountModeFilter || accountModeFilter === "all") return accounts;

    return accounts.filter((account) => {
      return String(account.account_mode ?? "").toLowerCase() === accountModeFilter;
    });
  }, [accounts, accountModeFilter]);

  if (canViewMt5List && loadError && visibleAccounts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="MT5 accounts"
          action="load"
          onRetry={() => {
            void loadAccounts();
          }}
        />
      </div>
    );
  }

  if (!canViewMt5List && !canCreateMt5) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          audience="admin"
          variant="panel"
          title="Access restricted"
          message="Your account does not have permission to manage MT5 accounts."
        />
      </div>
    );
  }

  const renderTableSection = () => {
    if (loading && visibleAccounts.length === 0) {
      return <TableSectionSkeleton columnCount={8} rowCount={8} />;
    }

    if (!loading && visibleAccounts.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No MT5 Accounts
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no MT5 accounts matching your filters. Adjust the filters or refresh
            to check for new accounts.
          </p>
          <Button variant="outline" onClick={loadAccounts} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <AppDataTable<AdminMT5Account>
        data={visibleAccounts}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => {
          const identifier =
            row.account_id ??
            row.mt5_id ??
            row.id ??
            `${row.created_at ?? row.account_id ?? Math.random().toString(36).slice(2)}`;
          return String(identifier);
        }}
      />
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Database className="h-6 w-6 text-primary" />
                MT5 Accounts
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage all MT5 trading accounts for users.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canViewMt5List ? (
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
                    <DropdownMenuItem onClick={() => void handleExport("csv")}>
                      Export CSV (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {canCreateMt5 ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Account
                </Button>
              ) : null}
              <Button variant="outline" onClick={loadAccounts} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Search and Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap">
              <ApiSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSearch={(value) => {
                  void setSearch(value || null);
                  void setPage(1);
                }}
                placeholder="Search by name, email, mobile, account_id, or mt5_id"
                minimumLength={3}
                delay={300}
              />

              <Select
                value={statusFilter ?? "all"}
                onValueChange={(value) => {
                  void setStatusFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs
                value={accountModeFilter ?? "all"}
                onValueChange={(value) => {
                  void setAccountModeFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <TabsList>
                  {accountModeFilters.map((option) => (
                    <TabsTrigger key={option.value} value={option.value}>
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              
              <Input
                type="date"
                value={dateFrom ?? ""}
                onChange={(e) => {
                  void setDateFrom(e.target.value || null);
                  void setPage(1);
                }}
                placeholder="From Date"
                className="h-9 w-[160px] text-sm"
              />
              
              <Input
                type="date"
                value={dateTo ?? ""}
                onChange={(e) => {
                  void setDateTo(e.target.value || null);
                  void setPage(1);
                }}
                placeholder="To Date"
                className="h-9 w-[160px] text-sm"
              />
            </div>

            {/* Additional Filters Row */}
            {/* <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={userIdFilter ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUserIdFilter(value.trim() ? value : null);
                    void setPage(1);
                  }}
                  placeholder="User ID"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={groupIdFilter ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setGroupIdFilter(value.trim() ? value : null);
                    void setPage(1);
                  }}
                  placeholder="Group ID"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex w-full max-w-xs items-center gap-2">
                <Input
                  value={managerIdFilter ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setManagerIdFilter(value.trim() ? value : null);
                    void setPage(1);
                  }}
                  placeholder="Manager ID"
                  className="h-9 text-sm"
                />
              </div>
            </div> */}

            <div className="text-sm text-muted-foreground">
              Showing page {pagination.current_page} of {pagination.total_pages} -{" "}
              {pagination.total} total accounts
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {canViewMt5List ? (
              renderTableSection()
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                You can create MT5 accounts, but your account is not allowed to view the MT5 account list.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {canCreateMt5 ? (
        <CreateAccountDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreate}
        />
      ) : null}

      {/* Edit Dialog */}
      {canEditMt5 ? (
        <EditAccountDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          account={editingAccount}
          onSubmit={handleUpdate}
        />
      ) : null}

      <AccountDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setDetailsAccount(null);
          }
        }}
        account={detailsAccount}
        loading={isDetailsLoading}
      />

      {/* Delete Dialog */}
      {canDeleteMt5 ? (
        <DeleteDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete MT5 Account"
          description="Are you sure you want to delete this MT5 account? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      ) : null}
    </>
  );
}
