"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Eye, Globe, Mail, Pencil, Phone, Trash2, User, Plus, RefreshCw, Wallet, KeyRound, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";

import type { PendingUser } from "@/lib/api";
import { adminUsersApi } from "@/lib/api-auth-admin";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  onManageSponsor,
  canEdit,
  canDelete,
  canManageSponsor,
  canViewDetail,
}: {
  row: { original: PendingUser };
  onEdit: (user: PendingUser) => void;
  onDelete: (user: PendingUser) => void;
  onManageSponsor: (user: PendingUser) => void;
  canEdit: boolean;
  canDelete: boolean;
  canManageSponsor: boolean;
  canViewDetail: boolean;
}) {
  const hasDetailRoute = Boolean(row.original.id);
  const detailHref = hasDetailRoute ? `/new-users/${row.original.id}` : null;
  const isIb = Boolean(String(row.original.sponsor_id ?? "").trim());

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        {canViewDetail && detailHref ? (
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
        ) : canViewDetail ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled
            className="h-8 w-8 text-amber-600/80"
            aria-label={`ID unavailable for ${row.original.name || "user"}`}
            title="ID unavailable"
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        {canEdit ? (
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
        ) : null}
        {canDelete ? (
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
        ) : null}
        {!isIb && canManageSponsor ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onManageSponsor(row.original)}
            title={`Manage parent for ${row.original.name || "user"}`}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {!hasDetailRoute ? (
        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          ID unavailable
        </span>
      ) : null}
    </div>
  );
}

/**
 * Component to display decrypted password with on-demand API call
 */
function DecryptedPassword({ 
  userId, 
  token 
}: { 
  userId: number; 
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
      console.log("🔐 Fetching decrypted password for user:", userId);
      const response = await adminUsersApi.decryptPassword(userId, token);
      
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
        className="h-8"
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

export const getColumnsWithActions = (
  onEdit: (user: PendingUser) => void,
  onDelete: (user: PendingUser) => void,
  onToggleStatus: (user: PendingUser, newStatus: number) => Promise<void>,
  onPromoteToIb: (user: PendingUser) => void | Promise<void>,
  onManageSponsor: (user: PendingUser) => void,
  promotingUserIds: Set<number>,
  permissions?: {
    canEditUser: boolean;
    canDeleteUser: boolean;
    canToggleStatus: boolean;
    canPromoteToIb: boolean;
    canManageSponsor: boolean;
    canViewUser: boolean;
    showActionsColumn: boolean;
  },
  token?: string | null,
): ColumnDef<PendingUser>[] => [
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
      const sponsorId = String(user.sponsor_id ?? "").trim();
      const isIb = sponsorId.length > 0;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <Link
              href={`/new-users/${user.id}`}
              className="font-medium hover:underline"
            >
              {user.name || "-"}
            </Link>
          </div>
          <div className="text-xs text-muted-foreground">@{user.username || "-"}</div>
          <div className="text-xs text-muted-foreground">
            {isIb ? `Partner: ${sponsorId}` : "Client"}
          </div>
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
      const statusValue = Number(user.status) || 0;
      const isActive = statusValue === 1;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={async (checked) => {
                const newStatus = checked ? 1 : 0;
                try {
                  await onToggleStatus(user, newStatus);
                } catch {
                  toast.error("Failed to update status");
                }
              }}
              disabled={!permissions?.canToggleStatus}
              aria-label={`Toggle status for ${user.name || "user"}`}
            />
            <span className="text-sm font-medium">
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
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
    id: "main_wallet_balance",
    accessorKey: "main_wallet_balance",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Main Wallet(USD)" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span>{row.original.main_wallet_balance?.toFixed(2) || "0.00"}</span>
      </div>
    ),
  },
 {
    id: "password",
    accessorKey: "password",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User Password" />,
    cell: ({ row }) => <DecryptedPassword userId={row.original.id} token={token} />,
  },
  {
    id: "ib_status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Partner Status" />,
    cell: ({ row }) => {
      const user = row.original;
      const isIb = Boolean(String(user.sponsor_id ?? "").trim());
      const isPromoting = promotingUserIds.has(user.id);

      return (
        <div className="flex flex-col items-start gap-3">
  {isIb && (
    <Badge 
      variant="default" 
      className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20 px-2.5 py-0.5 text-xs font-medium transition-colors"
    >
      Partner
    </Badge>
  )}
  
  {!isIb && permissions?.canPromoteToIb && (
    <div className="w-full sm:w-auto">
      <Button
        type="button"
        size="sm"
        onClick={() => void onPromoteToIb(user)}
        disabled={isPromoting}
        className="relative font-medium shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70 px-4 py-2 text-xs"
      >
        {isPromoting ? (
          <div className="flex items-center gap-2">
            <svg 
              className="h-3 w-3 animate-spin text-current" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Promoting...</span>
          </div>
        ) : (
           <div className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Promote to Partner</span>
                </div>
        )}
      </Button>
    </div>
  )}
</div>
      );
    },
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
  },
    {
    id: "approved_by",
    accessorKey: "approved_by",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Processed By" />,
    cell: ({ row }) => (
      <div className="space-y-1">
      <div className="flex items-center gap-1 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{row.original.approved_by || "-"}</span>
      </div>
       <div className="text-xs text-muted-foreground">
            <span>{row.original.approved_at || "-"}</span>
          </div>
      </div>
    ),
  },
    {
    id: "referred_by",
    accessorKey: "sponsor_by",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Referred By" />,
    cell: ({ row }) => (
      <div className="space-y-1">
      <div className="flex items-center gap-1 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span>{row.original.sponsor_by || "Not referred"}</span>
      </div>
       <div className="text-xs text-muted-foreground">
            <span>{row.original.sponsor_by_email || "-"}</span>
          </div>
      </div>
    ),
  },
  ...(permissions?.showActionsColumn
    ? [{
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: { original: PendingUser } }) => (
      <RowActions
        row={row}
        onEdit={onEdit}
        onDelete={onDelete}
        onManageSponsor={onManageSponsor}
        canEdit={Boolean(permissions?.canEditUser)}
        canDelete={Boolean(permissions?.canDeleteUser)}
        canManageSponsor={Boolean(permissions?.canManageSponsor)}
        canViewDetail={Boolean(permissions?.canViewUser)}
      />
    ),
    enableSorting: false,
  }]
    : []),
];



