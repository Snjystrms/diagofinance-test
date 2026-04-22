"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Globe, Mail, MoreHorizontal, Pencil, Phone, Trash2, User } from "lucide-react";

import type { PendingUser } from "@/lib/api";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
