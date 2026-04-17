"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AdminMT5Account } from "@/lib/api";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { utilityFunctions } from "@/utils/operations";
import { User, CreditCard, DollarSign, TrendingUp, Calendar, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

const fmtDate = (s?: string) =>
  s
    ? utilityFunctions.formatDate(s, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const deriveAccountId = (account: AdminMT5Account) => {
  return account.account_id ?? account.mt5_id ?? account.id ?? "—";
};

const deriveUserName = (account: AdminMT5Account) => {
  const accountExt = account as AdminMT5Account & { User?: { name?: string; first_name?: string; last_name?: string } };
  const user = account.user ?? accountExt.User;
  if (user) {
    if (user.name) return user.name;
    if (user.first_name || user.last_name) {
      return [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
    }
  }
  return account.name ?? "—";
};

const deriveUserEmail = (account: AdminMT5Account) => {
  const accountExt = account as AdminMT5Account & { User?: { email?: string } };
  const user = account.user ?? accountExt.User;
  return user?.email ?? account.email ?? "—";
};

const deriveUserMobile = (account: AdminMT5Account) => {
  const accountExt = account as AdminMT5Account & { User?: { mobile?: string } };
  const user = account.user ?? accountExt.User;
  return user?.mobile ?? account.mobile ?? "—";
};

const getStatusBadge = (status: number | string | undefined) => {
  const statusNum = typeof status === "string" ? parseInt(status, 10) : status;
  if (statusNum === 1 || status === "1" || status === "active") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
      Inactive
    </Badge>
  );
};

const formatCurrency = (value: string | number | undefined, currency: string = "USD") => {
  if (value === undefined || value === null || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const getColumns = (): ColumnDef<AdminMT5Account>[] => [
  {
    id: "account_id",
    accessorKey: "account_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account ID" />,
    cell: ({ row }) => {
      const accountId = deriveAccountId(row.original);
      return (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{accountId}</span>
        </div>
      );
    },
    enableColumnFilter: true,
  },
  {
    id: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const account = row.original;
      const name = deriveUserName(account);
      const email = deriveUserEmail(account);
      const mobile = deriveUserMobile(account);

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{name}</span>
          </div>
          <div className="text-xs text-muted-foreground">{email}</div>
          <div className="text-xs text-muted-foreground">{mobile}</div>
        </div>
      );
    },
    enableColumnFilter: false,
  },
  {
    id: "account_type",
    accessorKey: "account_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account Type" />,
    cell: ({ row }) => {
      const account = row.original;
      const accountExt = account as AdminMT5Account & { accountType?: { name?: string } };
      const accountType = account.account_type ?? accountExt.accountType?.name ?? "—";
      return <Badge variant="outline">{accountType}</Badge>;
    },
    enableColumnFilter: true,
  },
  {
    id: "balance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
    cell: ({ row }) => {
      const account = row.original;
      const accountExt = account as AdminMT5Account & { self_wallet?: number | string };
      const balance = (account.balance as string | number | undefined) ?? 
        (account.available_balance as string | number | undefined) ?? 
        (accountExt.self_wallet as string | number | undefined);
      const currency = (account.currency as string) ?? "USD";
      return (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-medium">{formatCurrency(balance, currency)}</span>
        </div>
      );
    },
    enableColumnFilter: false,
  },
  {
    id: "equity",
    accessorKey: "equity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Equity" />,
    cell: ({ row }) => {
      const equity = row.original.equity as string | number | undefined;
      const currency = (row.original.currency as string) ?? "USD";
      return (
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-indigo-600" />
          <span>{formatCurrency(equity, currency)}</span>
        </div>
      );
    },
    enableColumnFilter: false,
  },
  {
    id: "leverage",
    accessorKey: "leverage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Leverage" />,
    cell: ({ row }) => {
      const leverage = row.original.leverage;
      return leverage ? `1:${leverage}` : "—";
    },
    enableColumnFilter: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => getStatusBadge(row.original.status),
    enableColumnFilter: true,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{fmtDate(row.original.created_at)}</span>
      </div>
    ),
    enableColumnFilter: false,
  },
];

interface RowActionsProps {
  row: { original: AdminMT5Account };
  onEdit: (account: AdminMT5Account) => void;
  onDelete: (id: string | number) => void;
}

const RowActions = ({ row, onEdit, onDelete }: RowActionsProps) => {
  const accountId = row.original.id ?? row.original.account_id ?? row.original.mt5_id;
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(row.original)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => accountId && onDelete(accountId)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getColumnsWithActions = (
  onEdit: (account: AdminMT5Account) => void,
  onDelete: (id: string | number) => void
): ColumnDef<AdminMT5Account>[] => [
  ...getColumns(),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
];

