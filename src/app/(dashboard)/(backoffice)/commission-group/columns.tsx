"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Award, Cog, Layers } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Switch } from "@/components/ui/switch";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import type { CommissionGroupRow } from "./page";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatApiDateTimeAsIST(value);
};

export const getColumns = (opts: {
  onToggleStatus: (id: string) => void;
  actionLoadingId?: string | null;
}): ColumnDef<CommissionGroupRow>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "plan_name",
    accessorKey: "plan_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Plan Name" />
    ),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.plan_name}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "group_name",
    accessorKey: "group_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Group" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1.5">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{row.original.group_name}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "mt5_group_name",
    accessorKey: "mt5_group_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="MT5 Group Name" />
    ),
    cell: ({ row }) => (
      <code className="rounded bg-muted px-2 py-1 text-xs text-foreground">
        {row.original.mt5_group_name}
      </code>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Switch
          checked={row.original.status}
          onCheckedChange={() => opts.onToggleStatus(row.original.id)}
          aria-label="Toggle status"
          disabled={opts.actionLoadingId === row.original.id}
        />
        <span className="text-sm text-muted-foreground">
          {row.original.status ? "Active" : "Inactive"}
        </span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Award className="h-4 w-4 text-primary" />
        <span className="text-sm">{formatDateTime(row.original.created_at)}</span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  // {
  //   id: "updated_at",
  //   accessorKey: "updated_at",
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title="Updated" />
  //   ),
  //   cell: ({ row }) => (
  //     <div className="inline-flex items-center gap-1">
  //       <Cog className="h-4 w-4 text-primary" />
  //       <span className="text-sm">{fmtDate(row.original.updated_at)}</span>
  //     </div>
  //   ),
  //   enableColumnFilter: false,
  //   enableSorting: false,
  // },
];
