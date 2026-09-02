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
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Banknote,
  Eye,
  Download,
  ChevronDown,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, parse } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { StatePreservingLink } from "@/components/state-preserving-link";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminTransactionsApi,
  type AdminTransactionItem,
  type AdminTransactionsAllData,
  type AdminTransactionStatistics,
  type AdminClientDepositData,
  type AdminClientWithdrawalData,
  type AdminClientWithdrawalToMt5Data,
  type AdminInternalTransferData,
} from "@/lib/api-admin-transactions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { fmtDateTime, fmtISTDateTime, formatAmount, statusBadge, transactionTypeLabel } from "../_lib/transaction-format";
import { ClientDepositDialog } from "./client-deposit-dialog";
import { ClientWithdrawalDialog } from "./client-withdrawal-dialog";
import { ClientWithdrawToMt5Dialog } from "./client-withdraw-to-mt5-dialog";
import { InternalTransferDialog } from "./internal-transfer-dialog";
import { DirectToMt5Dialog } from "./direct-to-mt5-dialog";
import { TransactionDetailsDialog } from "./transaction-details-dialog";
import { TransactionBalanceCell } from "./transaction-balance-cell";

export function AdminTransactionContent() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");
  const { isManager, hasFeature } = useManagerPermissions();
  const canView = !isManager || hasFeature("transaction", "anyTransactionAccess");
  const canWalletDeposit = !isManager || hasFeature("transaction", "walletDeposit");
  const canWalletWithdraw = !isManager || hasFeature("transaction", "walletWithdraw");
  const canInternalTransfer = !isManager || hasFeature("transaction", "internalTransfer");
  const canClientDeposit = !isManager || hasFeature("transaction", "clientDeposit");
  const canClientWithdraw = !isManager || hasFeature("transaction", "clientWithdraw");
  const canCreateTransaction =
    canWalletDeposit ||
    canWalletWithdraw ||
    canInternalTransfer ||
    canClientDeposit ||
    canClientWithdraw;

  const [rows, setRows] = useState<AdminTransactionItem[]>([]);
  const [stats, setStats] = useState<AdminTransactionStatistics | null>(null);
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
  const [dateFrom, setDateFrom] = useQueryState("date_from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("date_to", parseAsString);
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString.withDefault("created_at"));
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString.withDefault("desc"));

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

  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [directToMt5DialogOpen, setDirectToMt5DialogOpen] = useState(false);
  const [clientWithdrawToMt5DialogOpen, setClientWithdrawToMt5DialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<AdminTransactionItem | null>(null);

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
      const txRes = await adminTransactionsApi.all({
        token,
        page,
        limit: perPage,
        sort_by: sortBy || "created_at",
        sort_order: (sortOrder?.toUpperCase() as "ASC" | "DESC") || "DESC",
        search: searchTerm,
        transaction_type: (typeFilter as AdminTransactionItem["transaction_type"]) || undefined,
        status: (statusFilter as AdminTransactionItem["status"]) || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      if (currentRequestId !== requestIdRef.current) return;
      const txPayload = txRes.data;
      const txItems = Array.isArray(txPayload?.transactions) ? txPayload.transactions : [];
      setRows(txItems);
      setTotalPages(txPayload?.pagination?.total_pages ?? 1);
      setTotalRecords(txPayload?.pagination?.total_records ?? txItems.length);
      setStats(txPayload?.statistics ?? null);
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
  }, [page, perPage, searchUser, typeFilter, statusFilter, dateFrom, dateTo, sortBy, sortOrder, token, canView]);

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
    const fromLabel = res.type === "direct_to_mt5" ? "Direct" : String(res.from_wallet_id);
    toast.success(`Transfer of $${formatAmount(res.amount)} from ${fromLabel} to ${res.to_wallet_id} completed successfully`);
    void loadData();
  }, [loadData]);

  const handleDirectToMt5Success = useCallback(() => {
    void loadData();
  }, [loadData]);

  const handleClientWithdrawToMt5Success = useCallback(
    (res: AdminClientWithdrawalToMt5Data) => {
      toast.success(
        `Withdrawal of $${formatAmount(res.amount)} processed from MT5 account ${
          res.mt5_account || ""
        } for client #${res.client_id}`,
      );
      void loadData();
    },
    [loadData],
  );

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canView) {
      toast.error("You do not have permission to export transactions");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    const exportToastId = `transactions-export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

      const { blob, filename } = await adminTransactionsApi.export({
        token,
        format: formatType,
        search: typeof searchUser === "string" && searchUser.trim().length >= 3 ? searchUser.trim() : null,
        transaction_type: (typeFilter as AdminTransactionItem["transaction_type"]) || null,
        status: (statusFilter as AdminTransactionItem["status"]) || null,
        from_date: dateFrom || null,
        to_date: dateTo || null,
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
    } catch (err) {
      console.error(`Failed to export ${formatType}:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "transactions", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [canView, token, searchUser, typeFilter, statusFilter, dateFrom, dateTo]);

  const handleViewDetails = useCallback((transaction: AdminTransactionItem) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  }, []);

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
            <StatePreservingLink
              storageKey="admin-transaction"
              href={`/new-users/${user?.id ?? ""}`}
              className="font-medium hover:underline"
            >
              {user?.name || "—"}
            </StatePreservingLink>
            <div className="text-xs text-muted-foreground">{user?.email || user?.username || "—"}</div>
          </div>
        );
      },
    },
    {
      id: "transaction_type",
      accessorKey: "transaction_type",
      header: "Transaction Type",
      cell: ({ row }) => (
        <span className="text-sm capitalize">{transactionTypeLabel(row.original.transaction_type)}</span>
      ),
    },
    {
      id: "amount",
      header: () => <ManualSortHeader sortKey="amount" title="Amount" />,
      accessorKey: "amount",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums whitespace-nowrap">
          {formatAmount(row.original.amount)} {row.original.wallet_currency}
        </span>
      ),
    },
    {
      id: "balance",
      header: "Balance",
      cell: ({ row }) => (
        <TransactionBalanceCell transaction={row.original} />
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusBadge(row.original.status),
    },
       {
      id: "processed_by",
      accessorKey: "processed_by",
      header: "Processed By",
      cell: ({ row }) => (
         <div className="space-y-0.5">
        <div className="font-normal">{row.original.processed_by || "-"} </div>
         <div className="font-normal">{fmtISTDateTime(row.original.processed_at)} </div>
        </div>
      ),
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
        <span className="max-w-[200px] break-words text-sm text-muted-foreground">
          {row.original.admin_notes || "-"}
        </span>
      ),
    },
    {
      id: "created_at",
      header: () => <ManualSortHeader sortKey="created_at" title="Date" />,
      accessorKey: "created_at",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="whitespace-nowrap">{fmtISTDateTime(row.original.created_at)}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewDetails(row.original)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View details</span>
        </Button>
      ),
    },
  ], [handleViewDetails]);

  if (!canView) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view admin transactions.
        </div>
      </div>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
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
    <div className="space-y-6">
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
        {canCreateTransaction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Transaction
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              {canWalletDeposit && (
                <DropdownMenuItem onClick={() => setDepositDialogOpen(true)}>
                  <ArrowDownToLine className="mr-2 h-4 w-4" />
                  Wallet Deposit
                </DropdownMenuItem>
              )}
              {canWalletWithdraw && (
                <DropdownMenuItem onClick={() => setWithdrawalDialogOpen(true)}>
                  <ArrowUpFromLine className="mr-2 h-4 w-4" />
                  Wallet Withdrawal
                </DropdownMenuItem>
              )}
              {canInternalTransfer && (
                <DropdownMenuItem
                  onClick={() => {
                    setTransferDialogOpen(true);
                  }}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Internal Transfer
                </DropdownMenuItem>
              )}
              {canClientDeposit && (
                <DropdownMenuItem
                  onClick={() => {
                    setDirectToMt5DialogOpen(true);
                  }}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Client Deposit
                </DropdownMenuItem>
              )}
              {canClientWithdraw && (
                <DropdownMenuItem
                  onClick={() => {
                    setClientWithdrawToMt5DialogOpen(true);
                  }}
                >
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Client Withdraw
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
              {/* <DropdownMenuItem onClick={() => void handleExport("csv")}>
                Export CSV (.csv)
              </DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <ApiSearchBar
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(val) => {
              setSearchUser(val.trim() || null);
              setPage(1);
            }}
            placeholder="Search by user email or name..."
            className="min-w-[220px] flex-1 max-w-full"
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
          <DateRangePicker
            fromDate={fromDateObj}
            toDate={toDateObj}
            onFromDateChange={(date) => {
              setFromDateObj(date);
              setDateFrom(date ? format(date, "yyyy-MM-dd") : null);
              setPage(1);
            }}
            onToDateChange={(date) => {
              setToDateObj(date);
              setDateTo(date ? format(date, "yyyy-MM-dd") : null);
              setPage(1);
            }}
          />
        </div>
      </div>
      
      {/* Stats Section */}
      {stats && (
        <div className="space-y-4">
          {/* Main Stats Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Wallet Transactions</p>
                    <div className="text-3xl font-bold tracking-tight">{stats.total_wallet_transactions}</div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                    <Wallet className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">USD Deposits</p>
                    <div className="text-3xl font-bold tracking-tight">{stats.total_usdt_deposits}</div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                    <Banknote className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card> */}
            {/* <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Withdrawals</p>
                    <div className="text-3xl font-bold tracking-tight">{stats.total_withdrawals}</div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                    <ArrowUpFromLine className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card> */}
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">All Transactions</p>
                    <div className="text-3xl font-bold tracking-tight">{stats.total_all_transactions}</div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm">
                    <CircleDollarSign className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-5 min-w-0">
          {loading && rows.length === 0 ? (
            <TableSectionSkeleton columnCount={12} rowCount={10} />
          ) : (
            <AppDataTable<AdminTransactionItem>
              data={rows}
              columns={columns}
              pageCount={totalPages}
            />
          )}
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
      <DirectToMt5Dialog
        open={directToMt5DialogOpen}
        onOpenChange={setDirectToMt5DialogOpen}
        token={token}
        onSuccess={handleDirectToMt5Success}
      />
      <ClientWithdrawToMt5Dialog
        open={clientWithdrawToMt5DialogOpen}
        onOpenChange={setClientWithdrawToMt5DialogOpen}
        token={token}
        onSuccess={handleClientWithdrawToMt5Success}
      />
      <TransactionDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        transaction={selectedTransaction}
      />
    </div>
  );
}
