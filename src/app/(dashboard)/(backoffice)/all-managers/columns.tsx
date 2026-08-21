// C:\Users\DELL\Desktop\crminhouse\src\app\all-managers\columns.tsx
"use client";

import { useState } from "react";
import type { Column, ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import type { ManagerRow } from "./page";
import { adminManagersApi } from "@/lib/api-auth-admin";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { CalendarDays, Eye, KeyRound, Mail, Phone, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

/**
 * Component to display decrypted password with on-demand API call
 */
export function DecryptedPassword({
  managerId,
  token,
}: {
  managerId: string;
  token?: string | null;
}) {
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecryptPassword = async () => {
    if (decrypted) {
      // If already decrypted, just toggle visibility
      setShowPassword(!showPassword);
      return;
    }

    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await adminManagersApi.decryptPassword(managerId, token);

      if (response.success && response.data?.password) {
        setDecrypted(response.data.password);
        setShowPassword(true);
        toast.success("Password retrieved successfully");
      } else {
        throw new Error("Failed to decrypt password");
      }
    } catch (err) {
      console.error("❌ Password decryption error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to decrypt password";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive">Failed to decrypt</span>
      </div>
    );
  }

  if (!decrypted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecryptPassword}
        disabled={isLoading}
        className="h-8 cursor-pointer"
      >
        {isLoading ? (
          <>
            <KeyRound className="mr-2 h-3 w-3 animate-spin" />
            Decrypting...
          </>
        ) : (
          <>
            <Eye className="mr-2 h-3 w-3" />
            Show Password
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <KeyRound className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {showPassword ? decrypted : "••••••••"}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowPassword(!showPassword)}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <Eye className="h-3 w-3" />
          ) : (
            <Eye className="h-3 w-3 opacity-50" />
          )}
        </Button>
      </div>
    </div>
  );
}

export const getColumns = (opts: {
  onToggleStatus: (id: string, next: boolean) => void;
  actionLoadingId?: string | null;
  token?: string | null;
}): ColumnDef<ManagerRow>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
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
      return (
        <div className="flex items-center">
          <Switch
            checked={!!row.original.status}
            onCheckedChange={() => {
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
    id: "password",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Password" />,
    cell: ({ row }) => (
      <DecryptedPassword managerId={row.original.id} token={opts.token} />
    ),
    enableSorting: false,
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



