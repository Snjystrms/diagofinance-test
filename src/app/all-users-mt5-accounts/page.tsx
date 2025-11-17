"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  RefreshCw,
  Search,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { adminMT5AccountsApi, type AdminMT5Account, type UpdateMT5AccountRequest, type CreateMT5AccountRequest } from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getColumnsWithActions } from "./columns";
import { EditAccountDialog } from "./edit-account-dialog";
import { CreateAccountDialog } from "./create-account-dialog";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { Plus } from "lucide-react";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Active", value: "1" },
  { label: "Inactive", value: "0" },
];

const extractItems = (data: any): AdminMT5Account[] => {
  if (!data) return [];
  
  // If data is already an array, return it
  if (Array.isArray(data)) return data;
  
  // Check for mt5_accounts first (most common case based on API response)
  if (Array.isArray(data.mt5_accounts)) return data.mt5_accounts;
  
  // Check for other common array property names
  if (Array.isArray(data.accounts)) return data.accounts;
  if (Array.isArray(data.items)) return data.items;
  
  // Check nested data structures
  if (data.data) {
    if (Array.isArray(data.data)) return data.data;
    if (data.data && Array.isArray(data.data.mt5_accounts)) return data.data.mt5_accounts;
    if (data.data && Array.isArray(data.data.accounts)) return data.data.accounts;
    if (data.data && Array.isArray(data.data.items)) return data.data.items;
    if (data.data && Array.isArray(data.data.data)) return data.data.data;
  }
  
  return [];
};

export default function AllUsersMT5AccountsPage() {
  const { token } = useAuth();

  const [accounts, setAccounts] = useState<AdminMT5Account[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [searchInput, setSearchInput] = useState(search ?? "");

  // Create, Edit and Delete state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AdminMT5Account | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | number | null>(null);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    void setPage(1);
    void setSearch(value.trim() ? value : null);
  }, 500);

  const loadAccounts = useCallback(async () => {
    if (!token) {
      setAccounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await adminMT5AccountsApi.list({
        token,
        page,
        limit: perPage,
        status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        search: search?.trim() ? search : undefined,
        user_id: userIdFilter?.trim() ? userIdFilter : undefined,
        group_id: groupIdFilter?.trim() ? groupIdFilter : undefined,
        manager_id: managerIdFilter?.trim() ? managerIdFilter : undefined,
      });

      // The API returns { success, message, data: { mt5_accounts: [...], pagination: {...} } }
      // So response.data contains the object with mt5_accounts and pagination
      const payload = response?.data;

      // Extract accounts from the payload
      const items = extractItems(payload);
      setAccounts(items);

      const paginationSource =
        (payload && payload.pagination) ??
        (payload && (payload as any).meta?.pagination) ??
        (payload &&
          payload.data &&
          !Array.isArray(payload.data) &&
          ((payload.data as any).pagination ?? (payload.data as any).meta?.pagination)) ??
        (response && (response as any).data?.pagination) ??
        (response && (response as any).pagination);

      const total =
        paginationSource?.total ??
        paginationSource?.total_items ??
        paginationSource?.totalAccounts ??
        payload?.total ??
        items.length;

      const perPageValue =
        paginationSource?.per_page ??
        paginationSource?.perPage ??
        paginationSource?.limit ??
        perPage;

      const totalPages =
        paginationSource?.total_pages ??
        paginationSource?.last_page ??
        (perPageValue ? Math.max(1, Math.ceil(total / perPageValue)) : 1);

      setPagination({
        current_page:
          paginationSource?.current_page ??
          paginationSource?.page ??
          page,
        per_page: perPageValue,
        total_pages: totalPages,
        total,
      });
    } catch (error: any) {
      console.error("Failed to load MT5 accounts:", error);
      toast.error(error?.message || "Failed to load MT5 accounts");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, search, userIdFilter, groupIdFilter, managerIdFilter]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  // Create handler
  const handleCreate = useCallback(async (data: CreateMT5AccountRequest) => {
    if (!token) return;

    try {
      await adminMT5AccountsApi.create(data, token);
      toast.success("MT5 account created successfully");
      setIsCreateDialogOpen(false);
      void loadAccounts(); // Refresh the list
    } catch (error: any) {
      console.error("Failed to create MT5 account:", error);
      toast.error(error?.message || "Failed to create MT5 account");
      throw error; // Re-throw to let the dialog handle it
    }
  }, [token, loadAccounts]);

  // Edit handler
  const handleEdit = useCallback((account: AdminMT5Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  }, []);

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
    } catch (error: any) {
      console.error("Failed to update MT5 account:", error);
      toast.error(error?.message || "Failed to update MT5 account");
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
    } catch (error: any) {
      console.error("Failed to delete MT5 account:", error);
      toast.error(error?.message || "Failed to delete MT5 account");
    }
  }, [token, accountToDelete, loadAccounts]);

  const columns: ColumnDef<AdminMT5Account>[] = useMemo(
    () => getColumnsWithActions(handleEdit, handleDeleteClick),
    [handleEdit, handleDeleteClick]
  );

  const renderTableSection = () => {
    if (loading && accounts.length === 0) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    if (!loading && accounts.length === 0) {
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
        data={accounts}
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
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">All Users MT5 Accounts</h1>
              <p className="text-sm text-muted-foreground">
                View and manage all MT5 trading accounts for users.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
              <Button variant="outline" onClick={loadAccounts} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Search and Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);
                    debouncedApplySearch(value);
                  }}
                  placeholder="Search by name, email, mobile, account_id, or mt5_id"
                  className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                {searchInput ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      void setSearch(null);
                      void setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>

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
            </div>

            {/* Additional Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
            </div>

            <div className="text-sm text-muted-foreground">
              Showing page {pagination.current_page} of {pagination.total_pages} •{" "}
              {pagination.total} total accounts
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {renderTableSection()}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <CreateAccountDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <EditAccountDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        account={editingAccount}
        onSubmit={handleUpdate}
      />

      {/* Delete Dialog */}
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
    </MainLayout>
  );
}

