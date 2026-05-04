"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Eye, Globe, Mail, Pencil, Phone, Trash2, User } from "lucide-react";

import type { PendingUser } from "@/lib/api";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeInIST } from "@/lib/formatters";

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return formatDateTimeInIST(value);
  } catch {
    return value;
  }
};

const getStatusBadge = (status: string) => {
  const normalized = status?.toLowerCase?.() ?? "";

  switch (normalized) {
    case "payment_verified":
    case "verified":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
          Payment Verified
        </Badge>
      );
    case "pending":
    case "0":
      return <Badge variant="secondary">Pending</Badge>;
    case "active":
    case "1":
      return <Badge variant="default">Active</Badge>;
    case "blocked":
    case "2":
      return <Badge variant="destructive">Blocked</Badge>;
    default:
      return <Badge variant="outline">{status || "Unknown"}</Badge>;
  }
};

function RowActions({
  row,
  onEdit,
  onDelete,
}: {
  row: { original: PendingUser };
  onEdit: (user: PendingUser) => void;
  onDelete: (user: PendingUser) => void;
}) {
  const hasDetailRoute = Boolean(row.original.uuid?.trim());
  const detailHref = hasDetailRoute ? `/new-users/${encodeURIComponent(row.original.uuid!.trim())}` : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        {detailHref ? (
          <Button
            asChild
            variant="outline"
            size="icon"
            className="h-8 w-8"
          >
            <Link href={detailHref} aria-label={`View details for ${row.original.name || "user"}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled
            className="h-8 w-8 text-amber-600/80"
            aria-label={`UUID unavailable for ${row.original.name || "user"}`}
            title="UUID unavailable"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(row.original)}
          title={`Edit ${row.original.name || "user"}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive/80"
          onClick={() => onDelete(row.original)}
          title={`Delete ${row.original.name || "user"}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {!hasDetailRoute ? (
        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          UUID unavailable
        </span>
      ) : null}
    </div>
  );
}

export const getColumnsWithActions = (
  onEdit: (user: PendingUser) => void,
  onDelete: (user: PendingUser) => void,
): ColumnDef<PendingUser>[] => [
  {
    id: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{user.name || "-"}</span>
          </div>
          <div className="text-xs text-muted-foreground">@{user.username || "-"}</div>
          <div className="text-xs text-muted-foreground">Sponsor: {user.sponsor_id || "-"}</div>
        </div>
      );
    },
  },
  {
    id: "contact",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="mr-1 h-3 w-3" />
            <span>{user.email || "-"}</span>
          </div>
          <div className="flex items-center text-sm">
            <Phone className="mr-1 h-3 w-3" />
            <span>{user.mobile || "-"}</span>
          </div>
          <div className="flex items-center text-sm">
            <Globe className="mr-1 h-3 w-3" />
            <span>{user.country || "-"}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="space-y-2">
          {getStatusBadge(user.status)}
          <div className="space-y-1">
            {user.email_verified === 1 ? (
              <Badge variant="outline" className="text-xs">
                Email Verified
              </Badge>
            ) : null}
            {user.payment_verified === 1 ? (
              <Badge variant="outline" className="text-xs">
                Payment Verified
              </Badge>
            ) : null}
          </div>
        </div>
      );
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Registration Date" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{formatDateTime(row.original.created_at)}</span>
      </div>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />,
    enableSorting: false,
  },
];
