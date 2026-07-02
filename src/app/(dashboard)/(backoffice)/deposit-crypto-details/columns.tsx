"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, Eye, Globe, Hash, Image, Pencil, Tag, Trash2, Coins } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ScreenshotPreviewDialog } from "@/components/dialogs/screenshot-preview-dialog";
import { AuthImage } from "@/components/ui/auth-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BrokerCryptoWallet } from "@/lib/api";
import { formatApiDateTimeAsIST } from "@/lib/formatters";

const emptyValue = "-";

const fmtDate = (value?: string) => (value ? formatApiDateTimeAsIST(value) : emptyValue);

const getStatusBadge = (isActive: number) => {
  return (
    <Badge
      className={
        isActive === 1
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }
    >
      {isActive === 1 ? "Active" : "Inactive"}
    </Badge>
  );
};

const getNetworkBadge = (network: string) => {
  const colorMap: Record<string, string> = {
    TRC20: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    ERC20: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    BEP20: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  };
  return (
    <Badge className={colorMap[network] ?? "bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300"}>
      {network}
    </Badge>
  );
};

function ScreenshotCell({ imageUrl }: { imageUrl: string }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="group inline-flex items-center gap-2"
      >
        <AuthImage
          src={imageUrl}
          alt="Wallet screenshot"
          className="h-10 w-10 rounded border object-cover transition-opacity group-hover:opacity-80"
          fallbackClassName="h-10 w-10 rounded"
        />
        <span className="text-xs text-blue-600 group-hover:underline dark:text-blue-400">
          Preview
        </span>
      </button>
      <ScreenshotPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageUrl={imageUrl}
      />
    </>
  );
}

const getCurrencyBadge = (currency: string) => {
    const colorMap: Record<string, string> = {
      USDT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
      BTC: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
      ETH: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
    };
    return (
      <Badge className={colorMap[currency] ?? "bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300"}>
        {currency}
      </Badge>
    );
  };

export const getColumns = (): ColumnDef<BrokerCryptoWallet>[] => [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: "network",
    accessorKey: "network",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Network" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        {getNetworkBadge(row.original.network)}
      </div>
    ),
  },
  {
    id: "currency",
    accessorKey: "currency",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Currency" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-muted-foreground" />
        {getCurrencyBadge(row.original.currency)}
      </div>
    ),
  },
  {
    id: "wallet_address",
    accessorKey: "wallet_address",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Wallet Address" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="max-w-[200px] truncate font-mono text-xs" title={row.original.wallet_address}>
          {row.original.wallet_address}
        </span>
      </div>
    ),
  },
  {
    id: "wallet_screenshot",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Screenshot" />,
    cell: ({ row }) => {
      const url = row.original.wallet_screenshot_url;
      if (!url) return <span className="text-muted-foreground">{emptyValue}</span>;
      return <ScreenshotCell imageUrl={url} />;
    },
  },
  {
    id: "label",
    accessorKey: "label",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Label" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{row.original.label ?? emptyValue}</span>
      </div>
    ),
  },
  {
    id: "is_active",
    accessorKey: "is_active",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => getStatusBadge(row.original.is_active),
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{fmtDate(row.original.created_at)}</span>
      </div>
    ),
  },
  {
    id: "updated_at",
    accessorKey: "updated_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{fmtDate(row.original.updated_at)}</span>
      </div>
    ),
  },
];

interface RowActionsProps {
  row: { original: BrokerCryptoWallet };
  onView: (wallet: BrokerCryptoWallet) => void;
  onEdit: (wallet: BrokerCryptoWallet) => void;
  onDelete: (id: string | number) => void;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const RowActions = ({ row, onView, onEdit, onDelete, canView, canEdit, canDelete }: RowActionsProps) => {
  return (
    <div className="flex items-center justify-end gap-2">
      {canView ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onView(row.original)}
          title="View wallet details"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">View wallet details</span>
        </Button>
      ) : null}
      {canEdit ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onEdit(row.original)}
          title="Edit wallet"
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
          onClick={() => onDelete(row.original.id)}
          title="Delete wallet"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
};

export const getColumnsWithActions = (
  onView: (wallet: BrokerCryptoWallet) => void,
  onEdit: (wallet: BrokerCryptoWallet) => void,
  onDelete: (id: string | number) => void,
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    showActionsColumn: boolean;
  },
): ColumnDef<BrokerCryptoWallet>[] => [
  ...getColumns(),
  ...(permissions?.showActionsColumn
    ? [{
    id: "actions",
    header: "Actions",
    cell: ({ row }: { row: { original: BrokerCryptoWallet } }) => (
      <RowActions
        row={row}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        canView={Boolean(permissions?.canView)}
        canEdit={Boolean(permissions?.canEdit)}
        canDelete={Boolean(permissions?.canDelete)}
      />
    ),
    enableColumnFilter: false,
    enableSorting: false,
  }]
    : []),
];
