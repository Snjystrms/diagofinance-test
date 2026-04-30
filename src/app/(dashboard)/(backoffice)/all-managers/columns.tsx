// C:\Users\DELL\Desktop\crminhouse\src\app\all-managers\columns.tsx
"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import type { ManagerRow } from "./page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CalendarDays, Mail, Phone, User2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

export const getColumns = (opts: {
  onToggleStatus: (id: string, next: boolean) => void;
  actionLoadingId?: string | null;
}): ColumnDef<ManagerRow>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }: { column: Column<ManagerRow, unknown> }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2 font-medium">
        <User2 className="h-4 w-4 text-indigo-600" />
        <span>{row.original.name}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "email",
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Mail className="h-4 w-4 text-sky-600" />
        <span className="text-sm">{row.original.email}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "mobile",
    accessorKey: "mobile",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mobile" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Phone className="h-4 w-4 text-emerald-600" />
        <span className="text-sm">{row.original.mobile}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const isBusy = opts.actionLoadingId === row.original.id;
      const next = !row.original.status; // ✅ force flip based on current value
      console.log(`Manager ${row.original.id} current status:`, row.original.status, "Next status:", next); // Debug log
      return (
        <div className="flex items-center">
          <Switch
            checked={!!row.original.status}
            onCheckedChange={() => {
              console.log(`Calling onToggleStatus with id: ${row.original.id}, next: ${next}`); // Debug log
              opts.onToggleStatus(row.original.id, next);
            }}
            disabled={isBusy}
          />
          <span className="ml-2 text-xs text-muted-foreground">
            {row.original.status ? "Active" : "Inactive"}
          </span>
        </div>
      );
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1 text-sm">
        <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-foreground">{fmtDate(row.original.created_at)}</span>
      </div>
    ),
  },
];
