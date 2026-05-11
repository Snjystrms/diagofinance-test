"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AccountTypeRow } from "./page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";
import { Gauge, Layers, Cog, Coins, Swords } from "lucide-react";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

const LeverBadge = ({ type, value }: { type: string; value: number }) => (
  <Badge
    variant="outline"
    className="gap-1 border-border bg-muted/50 text-foreground dark:bg-muted/30"
  >
    <Gauge className="h-3 w-3 text-primary" />
    {type === "dynamic" ? `Up to 1:${value} (dynamic)` : `1:${value} (fixed)`}
  </Badge>
);

export const getColumns = (opts: {
  onToggleStatus: (id: string) => void;
  actionLoadingId?: string | null;
}): ColumnDef<AccountTypeRow>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-xs text-muted-foreground">{row.original.base_currency}</span>
      </div>
    ),
    // meta: { label: "Name", variant: "text", placeholder: "Search name..." },
    enableColumnFilter: true,
  },
  {
    id: "spread_from",
    accessorKey: "spread_from",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Spread From" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Swords className="h-4 w-4 text-sky-600" />
        <span className="font-medium">{row.original.spread_from}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "leverage",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Leverage" />,
    cell: ({ row }) => (
      <LeverBadge type={row.original.leverage_type} value={row.original.leverage_value} />
    ),
    enableColumnFilter: false,
  },
  {
    id: "stop_out_level",
    accessorKey: "stop_out_level",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stop-out %" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Layers className="h-4 w-4 text-amber-600" />
        <span>{row.original.stop_out_level}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "hedge_margin",
    accessorKey: "hedge_margin",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hedge Margin" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Coins className="h-4 w-4 text-emerald-600" />
        <span>{row.original.hedge_margin}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "swap_free_option",
    accessorKey: "swap_free_option",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Swap Free" />,
    cell: ({ row }) => (
      <Badge
        className={
          row.original.swap_free_option
            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
        }
      >
        {row.original.swap_free_option ? "Yes" : "No"}
      </Badge>
    ),
    enableColumnFilter: true,
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
        {/* <Badge
          variant="outline"
          className={
            row.original.status
              ? "border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
              : "border-slate-400 text-slate-600 bg-slate-50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
          }
        >
          {row.original.status ? "Active" : "Inactive"}
        </Badge> */}
      </div>
    ),
    enableColumnFilter: true,
    // meta: {
    //   label: "Status",
    //   variant: "multiSelect",
    //   options: [
    //     { label: "Active", value: "true" },
    //     { label: "Inactive", value: "false" },
    //   ],
    // },
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-1">
        <Cog className="h-4 w-4 text-indigo-600" />
        <span className="text-sm">{fmtDate(row.original.updated_at)}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
];
