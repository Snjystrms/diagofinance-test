"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Mail, Phone, Globe, User, Calendar } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeInIST } from "@/lib/formatters";

export interface TempUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  mobile: string;
  country: string;
  referral_code: string;
  sponsor_by: string | null;
  created_at: string;
  attempt_count: number;
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return formatDateTimeInIST(value);
  } catch {
    return value;
  }
};

function RowActions({
  row,
  onViewDetails,
}: {
  row: { original: TempUser };
  onViewDetails: (user: TempUser) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onViewDetails(row.original)}
        title={`View details for ${row.original.first_name} ${row.original.last_name}`}
      >
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
}

export const getColumnsWithActions = (
  onViewDetails: (user: TempUser) => void,
): ColumnDef<TempUser>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">
              {user.first_name} {user.last_name}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Attempts: {user.attempt_count}
          </div>
        </div>
      );
    },
    enableSorting: false,
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
    enableSorting: false,
  },
  {
    id: "referral",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Referral" />,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="space-y-1">
          {user.referral_code ? (
            <Badge variant="outline" className="text-xs">
              {user.referral_code}
            </Badge>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
          {user.sponsor_by && (
            <div className="text-xs text-muted-foreground">
              By: {user.sponsor_by}
            </div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Registration Date" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm whitespace-nowrap">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>{formatDateTime(row.original.created_at)}</span>
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <RowActions row={row} onViewDetails={onViewDetails} />
    ),
    enableSorting: false,
  },
];
