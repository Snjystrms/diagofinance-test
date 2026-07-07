"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AccountTypeRow } from "./page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";
import { Gauge, Cog } from "lucide-react";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

export const getColumns = (opts: {
  onToggleStatus: (id: string) => void;
  actionLoadingId?: string | null;
}): ColumnDef<AccountTypeRow>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "live_group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Live Group" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.live_group_name || "-"}</span>
        <span className="text-xs text-muted-foreground">{row.original.live_mt5_group_name || "-"}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "demo_group",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Demo Group" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.demo_group_name || "-"}</span>
        <span className="text-xs text-muted-foreground">{row.original.demo_mt5_group_name || "-"}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "leverage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Max Leverage" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Gauge className="h-4 w-4 text-primary" />
        <span className="font-medium">1:{row.original.leverage_value}</span>
        <span className="text-xs text-muted-foreground">(max {row.original.maximum_leverage})</span>
      </div>
    ),
    enableColumnFilter: false,
  },
  {
    id: "minimum_deposit",
    accessorKey: "minimum_deposit",
    header: ({ column }) => <DataTableColumnHeader column={column} title="First Time Deposit" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">${row.original.minimum_deposit.toFixed(2)}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Switch
          checked={row.original.status}
          onCheckedChange={() => opts.onToggleStatus(row.original.id)}
          aria-label="Toggle status"
          disabled={opts.actionLoadingId === row.original.id}
        />
      </div>
    ),
     enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Cog className="h-4 w-4 text-primary" />
        <span className="text-sm">{fmtDate(row.original.updated_at)}</span>
      </div>
    ),
      enableColumnFilter: false,
    enableSorting: false,
  },
];



