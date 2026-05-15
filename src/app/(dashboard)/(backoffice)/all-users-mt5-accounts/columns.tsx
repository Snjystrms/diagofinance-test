"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, CreditCard, Eye, Pencil, Server, Trash2, User } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminMT5Account } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

const emptyValue = "-";

const fmtDate = (value?: string) => (value ? formatDateTimeInIST(value) : emptyValue);

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
  return account.accountType?.name ?? account.account_type ?? emptyValue;
};

const deriveGroupName = (account: AdminMT5Account) => {
  return account.group?.name ?? account.mt5_group_name ?? emptyValue;
};

const getStatusBadge = (status: AdminMT5Account["status"]) => {
  const statusValue = typeof status === "string" ? status.toLowerCase() : status;
  const isActive = statusValue === 1 || statusValue === "1" || statusValue === "active";

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
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">Live</Badge>;
  }

  if (value === "demo") {
    return <Badge variant="secondary">Demo</Badge>;
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
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
  },
  {
    id: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const account = row.original;

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{deriveUserName(account)}</span>
          </div>
          <div className="text-xs text-muted-foreground">{deriveUserEmail(account)}</div>
        </div>
      );
    },
    enableColumnFilter: false,
  },
  {
    id: "account_type",
    accessorKey: "account_type",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => <Badge variant="outline">{deriveAccountType(row.original)}</Badge>,
    enableColumnFilter: true,
  },
  {
    id: "account_mode",
    accessorKey: "account_mode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mode" />,
    cell: ({ row }) => getModeBadge(row.original.account_mode),
    enableColumnFilter: true,
  },
  {
    id: "group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{deriveGroupName(row.original)}</span>
      </div>
    ),
    enableColumnFilter: false,
  },
  {
    id: "leverage",
    accessorKey: "leverage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Leverage" />,
    cell: ({ row }) => {
      const leverage = row.original.leverage;
      return leverage ? `1:${leverage}` : emptyValue;
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
  onView: (account: AdminMT5Account) => void;
  onEdit: (account: AdminMT5Account) => void;
  onDelete: (id: string | number) => void;
}

const RowActions = ({ row, onView, onEdit, onDelete }: RowActionsProps) => {
  const accountId = row.original.id ?? row.original.account_id ?? row.original.mt5_id;

  return (
    <div className="flex items-center justify-end gap-2">
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
    </div>
  );
};

export const getColumnsWithActions = (
  onView: (account: AdminMT5Account) => void,
  onEdit: (account: AdminMT5Account) => void,
  onDelete: (id: string | number) => void,
): ColumnDef<AdminMT5Account>[] => [
  ...getColumns(),
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <RowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
];



