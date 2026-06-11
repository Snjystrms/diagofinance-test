"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { Plus, RefreshCw, Wallet } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  adminBrokerCryptoWalletsApi,
  type BrokerCryptoWallet,
  type BrokerCryptoWalletCreateBody,
  type BrokerCryptoWalletUpdateBody,
} from "@/lib/api";
import { useModuleCapabilities } from "@/hooks/use-permission-capabilities";
import { getColumnsWithActions } from "./columns";
import { CreateWalletDialog } from "./create-wallet-dialog";
import { EditWalletDialog } from "./edit-wallet-dialog";
import { WalletDetailsDialog } from "./wallet-details-dialog";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

export default function DepositCryptoDetailsPage() {
  const { token } = useAuth();
  const { can } = useModuleCapabilities("cryptoWalletManagement");
  const canViewList = can("list");
  const canCreate = can("add");
  const canEdit = can("edit");
  const canDelete = can("delete");
  const showActionsColumn = canViewList || canEdit || canDelete;

  const [wallets, setWallets] = useState<BrokerCryptoWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<BrokerCryptoWallet | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsWallet, setDetailsWallet] = useState<BrokerCryptoWallet | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<string | number | null>(null);

  const loadWallets = useCallback(async () => {
    if (!canViewList) {
      setWallets([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!token) {
      setWallets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminBrokerCryptoWalletsApi.list(token);
      const payload = response?.data as Record<string, unknown> | undefined;

      let items: BrokerCryptoWallet[] = [];
      if (Array.isArray(payload?.rows)) {
        items = payload.rows as BrokerCryptoWallet[];
      } else if (Array.isArray(payload?.data)) {
        items = (payload as { data: BrokerCryptoWallet[] }).data;
      } else if (Array.isArray(response?.data)) {
        items = response.data as unknown as BrokerCryptoWallet[];
      }

      setWallets(items);
    } catch (error: unknown) {
      console.error("Failed to load crypto wallets:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "crypto wallets", action: "load" })
      );
      setWallets([]);
    } finally {
      setLoading(false);
    }
  }, [token, canViewList]);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  // Create handler
  const handleCreate = useCallback(async (data: BrokerCryptoWalletCreateBody) => {
    if (!token) return;

    try {
      await adminBrokerCryptoWalletsApi.create(data, token);
      toast.success("Crypto wallet created successfully");
      setIsCreateDialogOpen(false);
      void loadWallets();
    } catch (error: unknown) {
      console.error("Failed to create crypto wallet:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "crypto wallets", action: "create" })
      );
      throw error;
    }
  }, [token, loadWallets]);

  // Edit handler
  const handleEdit = useCallback((wallet: BrokerCryptoWallet) => {
    setEditingWallet(wallet);
    setIsEditDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback(async (wallet: BrokerCryptoWallet) => {
    if (!token) return;

    setIsDetailsDialogOpen(true);
    setDetailsWallet(null);
    setIsDetailsLoading(true);

    try {
      const response = await adminBrokerCryptoWalletsApi.getById(wallet.id, token);
      const detail = (response?.data ?? response) as unknown as BrokerCryptoWallet;
      setDetailsWallet(detail);
    } catch (error: unknown) {
      console.error("Failed to load wallet details:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "crypto wallet details", action: "load" })
      );
      setDetailsWallet(wallet);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [token]);

  // Update handler
  const handleUpdate = useCallback(async (data: BrokerCryptoWalletUpdateBody) => {
    if (!token || !editingWallet) return;

    try {
      await adminBrokerCryptoWalletsApi.update(editingWallet.id, data, token);
      toast.success("Crypto wallet updated successfully");
      setIsEditDialogOpen(false);
      setEditingWallet(null);
      void loadWallets();
    } catch (error: unknown) {
      console.error("Failed to update crypto wallet:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "crypto wallets", action: "update" })
      );
    }
  }, [token, editingWallet, loadWallets]);

  // Delete handler
  const handleDeleteClick = useCallback((id: string | number) => {
    setWalletToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!token || !walletToDelete) return;

    try {
      await adminBrokerCryptoWalletsApi.delete(walletToDelete, token);
      toast.success("Crypto wallet deleted successfully");
      setIsDeleteDialogOpen(false);
      setWalletToDelete(null);
      void loadWallets();
    } catch (error: unknown) {
      console.error("Failed to delete crypto wallet:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "crypto wallets", action: "delete" })
      );
    }
  }, [token, walletToDelete, loadWallets]);

  const columns: ColumnDef<BrokerCryptoWallet>[] = useMemo(
    () =>
      getColumnsWithActions(handleViewDetails, handleEdit, handleDeleteClick, {
        canView: canViewList,
        canEdit,
        canDelete,
        showActionsColumn,
      }),
    [handleViewDetails, handleEdit, handleDeleteClick, canViewList, canEdit, canDelete, showActionsColumn]
  );

  if (canViewList && loadError && wallets.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="crypto wallets"
          action="load"
          onRetry={() => {
            void loadWallets();
          }}
        />
      </div>
    );
  }

  if (!canViewList && !canCreate) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          audience="admin"
          variant="panel"
          title="Access restricted"
          message="Your account does not have permission to manage crypto wallets."
        />
      </div>
    );
  }

  const renderTableSection = () => {
    if (loading && wallets.length === 0) {
      return <TableSectionSkeleton columnCount={7} rowCount={5} />;
    }

    if (!loading && wallets.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No Crypto Wallets
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no broker crypto wallets configured. Add one to get started.
          </p>
          {canCreate ? (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Wallet
            </Button>
          ) : (
            <Button variant="outline" onClick={loadWallets} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
      );
    }

    return (
      <AppDataTable<BrokerCryptoWallet>
        data={wallets}
        columns={columns}
        pageCount={1}
        getRowId={(row) => String(row.id)}
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
                <Wallet className="h-6 w-6 text-primary" />
                Crypto Deposit Details
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage broker crypto wallet addresses for deposit payments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreate ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Wallet
                </Button>
              ) : null}
              <Button variant="outline" onClick={loadWallets} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} configured
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {canViewList ? (
              renderTableSection()
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                You can create crypto wallets, but your account is not allowed to view the wallet list.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {canCreate ? (
        <CreateWalletDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreate}
        />
      ) : null}

      {/* Edit Dialog */}
      {canEdit ? (
        <EditWalletDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          wallet={editingWallet}
          onSubmit={handleUpdate}
        />
      ) : null}

      {/* Details Dialog */}
      <WalletDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) {
            setDetailsWallet(null);
          }
        }}
        wallet={detailsWallet}
        loading={isDetailsLoading}
      />

      {/* Delete Dialog */}
      {canDelete ? (
        <DeleteDialog
          isOpen={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          title="Delete Crypto Wallet"
          description="Are you sure you want to delete this crypto wallet? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      ) : null}
    </>
  );
}
