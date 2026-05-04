"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { NewsRow } from "./page";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";
import { ImageIcon } from "lucide-react";
import Image from "next/image";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

export const getColumns = (opts: {
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  actionLoadingId?: string | null;
}): ColumnDef<NewsRow>[] => [
  {
    id: "image",
    header: "Image",
    cell: ({ row }) =>
      row.original.image_url ? (
        <div className="relative h-10 w-16 overflow-hidden rounded border bg-muted">
          <Image
            src={row.original.image_url}
            alt={row.original.title}
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex h-10 w-16 items-center justify-center rounded border bg-muted">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      ),
    enableSorting: false,
  },
  {
    id: "title",
    accessorKey: "title",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <div className="flex flex-col max-w-xs">
        <span className="font-medium truncate">{row.original.title}</span>
        <span className="text-xs text-muted-foreground truncate">{row.original.short_description}</span>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "description",
    accessorKey: "description",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => (
      <p className="max-w-xs truncate text-sm text-muted-foreground">
        {row.original.description}
      </p>
    ),
    enableColumnFilter: false,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2">
        <Switch
          checked={row.original.status}
          onCheckedChange={() =>
            opts.onToggleStatus(row.original.id, row.original.status)
          }
          aria-label="Toggle status"
          disabled={opts.actionLoadingId === row.original.id}
        />
        <Badge
          variant="outline"
          className={
            row.original.status
              ? "border-green-500 text-green-700 bg-green-50"
              : "border-slate-400 text-slate-600 bg-slate-50"
          }
        >
          {row.original.status ? "Active" : "Inactive"}
        </Badge>
      </div>
    ),
    enableColumnFilter: true,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{fmtDate(row.original.created_at)}</span>
    ),
    enableColumnFilter: false,
  },
];
