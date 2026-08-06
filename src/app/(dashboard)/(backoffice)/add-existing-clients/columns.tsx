"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Badge } from "@/components/ui/badge";
import type { IBExistingClient } from "@/lib/api";
import { formatApiDateTimeAsIST } from "@/lib/formatters";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return formatApiDateTimeAsIST(value);
  } catch {
    return value;
  }
};

const emptyValue = "-";

const deriveAccountId = (client: IBExistingClient) => {
  return client.account_id ?? client.mt5_id ?? client.id ?? emptyValue;
};

const deriveClientName = (client: IBExistingClient) => {
  const firstName = client.first_name;
  const lastName = client.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || client.client_name || emptyValue;
};

const deriveClientEmail = (client: IBExistingClient) => {
  return client.client_email ?? emptyValue;
};

const getStatusBadge = (status: IBExistingClient["status"]) => {
  const isActive = status === true;

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

const getModeBadge = (mode: IBExistingClient["account_mode"]) => {
  const value = typeof mode === "string" ? mode.toLowerCase() : "";

  if (value === "live") {
    return <Badge variant="default">Live</Badge>;
  }

  if (value === "demo") {
    return <Badge variant="default">Demo</Badge>;
  }

  return <Badge variant="outline">{emptyValue}</Badge>;
};

const getSourceBadge = (source: IBExistingClient["source"]) => {
  const value = typeof source === "string" ? source.toLowerCase() : "";

  if (value === "existing_client") {
    return <Badge variant="secondary">Added via IB</Badge>;
  }

  if (value === "normal") {
    return <Badge variant="outline">Normal Flow</Badge>;
  }

  return <Badge variant="outline">{source || emptyValue}</Badge>;
};

export const getColumns = (): ColumnDef<IBExistingClient>[] => [
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
      const client = row.original;
      const accountId = deriveAccountId(client);
      const mt5Login = client.mt5_id ? String(client.mt5_id) : "";

      return (
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{accountId}</div>
            {mt5Login && mt5Login !== String(accountId) ? (
              <div className="text-xs text-muted-foreground">MT5: {mt5Login}</div>
            ) : null}
          </div>
        </div>
      );
    },
    enableColumnFilter: true,
    enableSorting: false,
  },
  {
    id: "client",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Client" />
    ),
    cell: ({ row }) => {
      const client = row.original;

      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">{deriveClientName(client)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {deriveClientEmail(client)}
          </div>
        </div>
      );
    },
    enableColumnFilter: false,
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
      <div className="space-y-0.5 items-center">
        <div className="truncate text-sm font-medium">
          {row.original.group_name}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {row.original.mt5_group_name}
        </div>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "leverage",
    accessorKey: "leverage",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Leverage" />
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created at" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-sm">
          {formatDateTime(row.original.created_at)}
        </span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
];