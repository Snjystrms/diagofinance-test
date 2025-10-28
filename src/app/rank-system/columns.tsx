"use client";

import { type Column, type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Text, CheckCircle, XCircle } from "lucide-react";

export type Rank = {
  id: string;
  name: string;
  downlines: number;
  perDownline: string;
  description: string;
  rewardAmount: string;
  active: boolean;
};

interface ColumnsProps {
  onEdit: (rank: Rank) => void;
  onDelete: (id: string) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<Rank>[] => [
  {
    id: "name",
    accessorKey: "name",
    header: ({ column }: { column: Column<Rank, unknown> }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Rank" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.name}
      </div>
    ),
    meta: { label: "Rank", placeholder: "Search rank…", variant: "text", icon: Text },
    enableColumnFilter: true,
  },
  {
    id: "downlines",
    accessorKey: "downlines",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Downlines" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.downlines}
      </div>
    ),
  },
  {
    id: "perDownline",
    accessorKey: "perDownline",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Per Downline" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.perDownline}
      </div>
    ),
    meta: { label: "Per Downline", variant: "text", placeholder: "e.g. $5,000 / ₹1 Lakh" },
    enableColumnFilter: true,
  },
  {
    id: "description",
    accessorKey: "description",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Description" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.description}
      </div>
    ),
    meta: { label: "Description", variant: "text", placeholder: "Search description…" },
    enableColumnFilter: true,
  },
  {
    id: "rewardAmount",
    accessorKey: "rewardAmount",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Reward" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.rewardAmount}
      </div>
    ),
  },
  {
    id: "active",
    accessorKey: "active",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Active" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left">
        {row.original.active ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
    ),
    meta: {
      label: "Active",
      variant: "multiSelect",
      options: [
        { label: "Yes", value: "true", icon: CheckCircle },
        { label: "No", value: "false", icon: XCircle },
      ],
    },
    enableColumnFilter: true,
  },
  // Actions column removed - CrudDataTable handles this internally
];
