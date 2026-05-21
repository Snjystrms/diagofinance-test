"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Award, Layers, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { formatDateTimeInIST } from "@/lib/formatters";
import type { IbPlanRow } from "./page";

const fmtDate = (value?: string) => (value ? formatDateTimeInIST(value) : "-");

export const getColumns = (): ColumnDef<IbPlanRow>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Plan" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.description?.trim() || "No description"}
        </span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "account_types",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account Types" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Layers className="h-4 w-4 text-sky-600" />
        <span>{row.original.account_types.length}</span>
      </div>
    ),
    enableColumnFilter: false,
  },
  {
    id: "ib_user_count",
    accessorKey: "ib_user_count",
    header: ({ column }) => <DataTableColumnHeader column={column} title="IB Users" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-600" />
        <span>{row.original.ib_user_count}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={
          row.original.status
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-slate-300 bg-slate-50 text-slate-600"
        }
      >
        <Award className="mr-1 h-3 w-3" />
        {row.original.status ? "Active" : "Inactive"}
      </Badge>
    ),
    enableColumnFilter: true,
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => <span className="text-sm">{fmtDate(row.original.updated_at)}</span>,
    enableColumnFilter: true,
  },
];
