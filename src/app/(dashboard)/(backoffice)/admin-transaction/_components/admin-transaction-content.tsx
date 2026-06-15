"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  ArrowLeftRight,
  CalendarIcon,
  RefreshCw,
  CircleDollarSign,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Banknote,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminTransactionsApi,
  type AdminTransactionItem,
  type AdminTransactionsAllData,
  type AdminTransactionStatsData,
  type AdminClientDepositData,
  type AdminClientWithdrawalData,
  type AdminInternalTransferData,
} from "@/lib/api-admin-transactions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { fmtDateTime, formatAmount, statusBadge, transactionTypeLabel } from "../_lib/transaction-format";
import { ClientDepositDialog } from "./client-deposit-dialog";
import { ClientWithdrawalDialog } from "./client-withdrawal-dialog";
import { InternalTransferDialog } from "./internal-transfer-dialog";

export function AdminTransactionContent() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");
  const { isManager, hasFeature } = useManagerPermissions();
  const canView = !isManager || hasFeature("reportManagement", "allTransactionReport");

  const [rows, setRows] = useState<AdminTransactionItem[]>([]);
  const [stats, setStats] = useState<AdminTransactionStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(20));
  const [searchUser, setSearchUser] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchUser || "");
  const [typeFilter, setTypeFilter] = useQueryState("type", parseAsString);
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString);

  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    setSearchInput(searchUser || "");
  }, [searchUser]);

  const loadData = useCallback(async () => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    const currentRequestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      setRows([]);
      const searchTerm =
        typeof searchUser === "string" && searchUser.trim().length >= 3
          ? searchUser.trim()
          : undefined;
      const [txRes, statsRes] = await Promise.all([
        adminTransactionsApi.all({
          token,
          page,
          limit: perPage,
          sort_by: "created_at",
          sort_order: "DESC",
          search: searchTerm,
          transaction_type: (typeFilter as AdminTransactionItem["transaction_type"]) || undefined,
          status: (statusFilter as AdminTransactionItem["status"]) || undefined,
        }),
        adminTransactionsApi.stats(token),
      ]);
      if (currentRequestId !== requestIdRef.current) return;
      const txPayload = txRes.data;
      const txItems = Array.isArray(txPayload?.transactions) ? txPayload.transactions : [];
      setRows(txItems);
      setTotalPages(txPayload?.pagination?.total_pages ?? 1);
      setTotalRecords(txPayload?.pagination?.total_records ?? txItems.length);
      const statsPayload = statsRes.data;
      setStats(statsPayload ?? null);
    } catch (error: unknown) {
      if (currentRequestId !== requestIdRef.current) return;
      setLoadError(error);
      setRows([]);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "transactions", action: "load" }));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, perPage, searchUser, typeFilter, statusFilter, token, canView]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDepositSuccess = useCallback((res: AdminClientDepositData) => {
    toast.success(`Deposit of $${formatAmount(res.amount)} processed for client #${res.client_id}`);
    void loadData();
  }, [loadData]);

  const handleWithdrawalSuccess = useCallback((res: AdminClientWithdrawalData) => {
    toast.success(`Withdrawal of $${formatAmount(res.amount)} processed for client #${res.client_id}`);
    void loadData();
  }, [loadData]);

  const handleTransferSuccess = useCallback((res: AdminInternalTransferData) => {
    toast.success(`Transfer of $${formatAmount(res.amount)} from ${res.from_account} to ${res.to_account}`);
    void loadData();
  }, [loadData]);

  const columns: ColumnDef<AdminTransactionItem>[] = useMemo(() => [
    {
      id: "id",
      header: "Sr. No.",
      cell: ({ row, table }) => (
        <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
      ),
    },
    {
      id: "user",
      header: "User",
      cell: ({ row }) => {
        const user = row.original.user;
        return (
          <div className="space-y-0.5">
            <div className="font-medium">{user?.name || "—"}</div>
            <div className="text-xs text-muted-foreground">{user?.email || user?.username || "—"}</div>
          </div>
        );
      },
    },
    {
      id: "transaction_type",
      accessorKey: "transaction_type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Transaction Type" />,
      cell: ({ row }) => (
        <span className="text-sm capitalize">{transactionTypeLabel(row.original.transaction_label)}</span>
      ),
    },
    {
      id: "amount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      accessorKey: "amount",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">
          {formatAmount(row.original.amount)} {row.original.currency}
        </span>
      ),
    },
    {
      id: "balance_before",
      header: "Balance Before",
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {formatAmount(row.original.balance_before)}
        </span>
      ),
    },
    {
      id: "balance_after",
      header: "Balance After",
      cell: ({ row }) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {formatAmount(row.original.balance_after)}
        </span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => statusBadge(row.original.status),
    },
     {
      id: "transaction_hash",
      header: "Transaction Hash",
      accessorKey: "transaction_hash",
      cell: ({ row }) => (
        <span className="text-sm capitalize">{row.original.transaction_hash || "-"}</span>
      ),
    },
    {
      id: "admin_notes",
      header: "Admin Notes",
      accessorKey: "admin_notes",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-sm text-muted-foreground">
          {row.original.admin_notes || "-"}
        </span>
      ),
    },
    {
      id: "created_at",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      accessorKey: "created_at",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{fmtDateTime(row.original.created_at)}</span>
        </div>
      ),
    },
  ], []);

  if (!canView) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view admin transactions.
        </div>
      </div>
    );
  }

  if (loading && rows.length === 0 && !loadError) {
    return <ListPageSkeleton statsCount={4} columnCount={8} rowCount={10} />;
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="transactions"
          action="load"
          onRetry={() => { void loadData(); }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Admin Transaction
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage deposits, withdrawals and internal transfers on behalf of clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setDepositDialogOpen(true)}>
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Client Deposit
          </Button>
          <Button onClick={() => setWithdrawalDialogOpen(true)}>
            <ArrowUpFromLine className="mr-2 h-4 w-4" />
            Client Withdrawal
          </Button>
          <Button onClick={() => setTransferDialogOpen(true)}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Internal Transfer
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wallet Transactions</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.total_amounts.wallet_transactions)}</div>
              <p className="text-xs text-muted-foreground">{stats.total_counts.wallet_transactions} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">USDT Deposits</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.total_amounts.usdt_deposits)}</div>
              <p className="text-xs text-muted-foreground">{stats.total_counts.usdt_deposits} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawals</CardTitle>
              <ArrowUpFromLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.total_amounts.withdrawals)}</div>
              <p className="text-xs text-muted-foreground">{stats.total_counts.withdrawals} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">All Transactions</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats.total_amounts.total)}</div>
              <p className="text-xs text-muted-foreground">{stats.total_counts.total} total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <ApiSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(val) => {
              setSearchUser(val.trim() || null);
              setPage(1);
            }}
            placeholder="Search by user email or name..."
            className="min-w-[220px] flex-1 max-w-full"
            disabled={loading}
            minimumLength={3}
            delay={300}
          />
          <Select
            value={typeFilter ?? "all"}
            onValueChange={(v) => { setTypeFilter(v === "all" ? null : v); setPage(1); }}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="withdrawal">Withdrawal</SelectItem>
              <SelectItem value="credit">Credit</SelectItem>
              <SelectItem value="debit">Debit</SelectItem>
              <SelectItem value="transfer_in">Transfer In</SelectItem>
              <SelectItem value="transfer_out">Transfer Out</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter ?? "all"}
            onValueChange={(v) => { setStatusFilter(v === "all" ? null : v); setPage(1); }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <AppDataTable<AdminTransactionItem>
            data={rows}
            columns={columns}
            pageCount={totalPages}
          />
        </div>
      </div>

      {/* Dialogs */}
      <ClientDepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        token={token}
        onSuccess={handleDepositSuccess}
      />
      <ClientWithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        token={token}
        onSuccess={handleWithdrawalSuccess}
      />
      <InternalTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        token={token}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
