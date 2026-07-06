"use client";

import { useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Calendar,
  CreditCard,
  Eye,
  Pencil,
  RefreshCw,
  Server,
  Trash2,
  User,
  Wallet,
} from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminMT5Account } from "@/lib/api";
import { mt5AccountsApi, type MT5AccountBalance } from "@/lib/api-trading-ib";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { ManualSortHeader } from "../../../../components/data-table/manual-sort-header";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return formatApiDateTimeAsIST(value);
  } catch {
    return value;
  }
};

const emptyValue = "-";

// const fmtDate = (value?: string) => (value ? formatDateTimeInIST(value) : emptyValue);

const deriveAccountId = (account: AdminMT5Account) => {
  return account.account_id ?? account.mt5_id ?? account.id ?? emptyValue;
};

const deriveUserName = (account: AdminMT5Account) => {
  const user = account.user ?? account.User;
  if (user?.name) return user.name;

  const firstName = user?.first_name ?? account.first_name;
  const lastName = user?.last_name ?? account.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || account.name || emptyValue;
};

const deriveUserEmail = (account: AdminMT5Account) => {
  const user = account.user ?? account.User;
  return user?.email ?? account.email ?? emptyValue;
};

const deriveAccountType = (account: AdminMT5Account) => {
  return (
    account.accountType?.name ??
    account.AdminMT5AccountType?.name ??
    account.account_type ??
    emptyValue
  );
};

const isCentAccount = (account: AdminMT5Account) =>
  deriveAccountType(account).trim().toLowerCase() === "cent";

const getMt5BalanceCurrency = (account: AdminMT5Account) =>
  isCentAccount(account) ? "USC" : "USD";

const getMt5DisplayBalance = (
  account: AdminMT5Account,
  rawBalance: number | null | undefined,
) => {
  const balance =
    typeof rawBalance === "number" ? rawBalance : Number(rawBalance ?? 0);
  if (!Number.isFinite(balance)) return 0;
  // Balance API already returns correct value (USC for CENT, USD for standard)
  return balance;
};

// Balance button component
function BalanceButton({ account }: { account: AdminMT5Account }) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  const fetchBalance = async () => {
    if (!token) return;
    const mt5Login = account.mt5_id ?? account.account_id ?? account.id;
    if (!mt5Login) return;

    setIsLoading(true);
    setHasError(false);

    try {
      const response = (await mt5AccountsApi.getAdminBalance(
        mt5Login,
        token,
      )) as unknown as MT5AccountBalance;
      if (response.success && response.equity !== undefined) {
        setLiveBalance(response.equity);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Failed to fetch MT5 balance:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (liveBalance !== null) {
    const displayBalance = getMt5DisplayBalance(account, liveBalance);
    return (
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {displayBalance.toFixed(2)} {getMt5BalanceCurrency(account)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={fetchBalance}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    );
  }

  if (hasError) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={fetchBalance}
        disabled={isLoading}
        className="text-red-600"
      >
        {isLoading ? (
          <Spinner className="h-3 w-3 mr-1" size="sm" />
        ) : (
          <RefreshCw className="h-3 w-3 mr-1" />
        )}
        Retry
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={fetchBalance}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Spinner className="h-3 w-3 mr-1" size="sm" />
          Loading...
        </>
      ) : (
        <>
          <Eye className="h-3 w-3 mr-1" />
          Show Balance
        </>
      )}
    </Button>
  );
}

const deriveGroupName = (account: AdminMT5Account) => {
  return account.mt5_group_name ?? emptyValue;
};

const getStatusBadge = (status: AdminMT5Account["status"]) => {
  const statusValue =
    typeof status === "string" ? status.toLowerCase() : status;
  const isActive =
    statusValue === 1 || statusValue === "1" || statusValue === "active";

  return (
    <Badge
      className={
        isActive
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
};

const getModeBadge = (mode: AdminMT5Account["account_mode"]) => {
  const value = typeof mode === "string" ? mode.toLowerCase() : "";

  if (value === "live") {
    return <Badge variant="default">Live</Badge>;
  }

  if (value === "demo") {
    return <Badge variant="default">Demo</Badge>;
  }

  return <Badge variant="outline">{emptyValue}</Badge>;
};

export const getColumns = (): ColumnDef<AdminMT5Account>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "account_id",
    accessorKey: "account_id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account" />
    ),
    cell: ({ row }) => {
      const account = row.original;
      const accountId = deriveAccountId(account);
      const mt5Login = account.mt5_id ? String(account.mt5_id) : "";

      return (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            {/* <div className="truncate font-medium">{accountId}</div> */}
            {mt5Login && mt5Login !== String(accountId) ? (
              <div className="text-xs text-muted-foreground">{mt5Login}</div>
            ) : null}
          </div>
        </div>
      );
    },
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: "user",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
    cell: ({ row }) => {
      const account = row.original;

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <Link
              href={`/new-users/${(account.user ?? account.User)?.id ?? account.user_id ?? account.userId ?? ""}`}
              className="font-medium hover:underline"
            >
              {deriveUserName(account)}
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">
            {deriveUserEmail(account)}
          </div>
        </div>
      );
    },
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "account_type",
    accessorKey: "account_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{deriveAccountType(row.original)}</Badge>
    ),
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: "account_mode",
    accessorKey: "account_mode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Mode" />
    ),
    cell: ({ row }) => getModeBadge(row.original.account_mode),
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: "group",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Group" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{deriveGroupName(row.original)}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "self_wallet",
    accessorKey: "self_wallet",
    header: () => (
      <ManualSortHeader sortKey="balance" title="Wallet Balance" />
    ),
    cell: ({ row }) => {
      return <BalanceButton account={row.original} />;
    },
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: "leverage",
    accessorKey: "leverage",
    header: () => (
      <ManualSortHeader sortKey="leverage" title="Leverage" />
    ),
    cell: ({ row }) => {
      const leverage = row.original.leverage;
      return leverage ? `1:${leverage}` : emptyValue;
    },
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => getStatusBadge(row.original.status),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: () => (
      <ManualSortHeader sortKey="created_at" title="Created at" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 whitespace-nowrap">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm">
          {formatDateTime(row.original.created_at)}
        </span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
];

interface RowActionsProps {
  row: { original: AdminMT5Account };
  onView: (account: AdminMT5Account) => void;
  onEdit: (account: AdminMT5Account) => void;
  onDelete: (id: string | number) => void;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const RowActions = ({
  row,
  onView,
  onEdit,
  onDelete,
  canView,
  canEdit,
  canDelete,
}: RowActionsProps) => {
  const accountId =
    row.original.id ?? row.original.account_id ?? row.original.mt5_id;

  return (
    <div className="flex items-center justify-end gap-2">
      {canView ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onView(row.original)}
          disabled={!accountId}
          title="View account details"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View account details</span>
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(row.original)}
          title="Edit account"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive/80"
          onClick={() => accountId && onDelete(accountId)}
          disabled={!accountId}
          title="Delete account"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};

export const getColumnsWithActions = (
  onView: (account: AdminMT5Account) => void,
  onEdit: (account: AdminMT5Account) => void,
  onDelete: (id: string | number) => void,
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    showActionsColumn: boolean;
  },
): ColumnDef<AdminMT5Account>[] => [
  ...getColumns(),
  ...(permissions?.showActionsColumn
    ? [
        {
          id: "actions",
          header: "Actions",
          cell: ({ row }: { row: { original: AdminMT5Account } }) => (
            <RowActions
              row={row}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              canView={Boolean(permissions?.canView)}
              canEdit={Boolean(permissions?.canEdit)}
              canDelete={Boolean(permissions?.canDelete)}
            />
          ),
          enableColumnFilter: false,
          enableSorting: false,
        },
      ]
    : []),
];
