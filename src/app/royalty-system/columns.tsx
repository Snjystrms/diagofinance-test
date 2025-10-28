"use client";

import { type Column, type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Text, CheckCircle, XCircle, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface RowActionsProps {
  row: any;
  onEdit: (royalty: RoyaltyLevel) => void;
  onDelete: (id: string) => void;
}

const RowActions = ({ row, onEdit, onDelete }: RowActionsProps) => {
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
        <DropdownMenuItem
          onClick={() => onDelete(row.original.id)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export interface RoyaltyLevel {
  id: string;
  level: string;
  incomePercent: string;
  requiredDirects: string;
  packageAmount: string;
  active: boolean;
}

interface ColumnsProps {
  onEdit: (royalty: RoyaltyLevel) => void;
  onDelete: (id: string) => void;
}

export const getColumns = ({ onEdit, onDelete }: ColumnsProps): ColumnDef<RoyaltyLevel>[] => [
  {
    id: "level",
    accessorKey: "level",
    header: ({ column }: { column: Column<RoyaltyLevel, unknown> }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Level" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.level}
      </div>
    ),
    meta: { label: "Level", placeholder: "Search level…", variant: "text", icon: Text },
    enableColumnFilter: true,
  },
  {
    id: "incomePercent",
    accessorKey: "incomePercent",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Income %" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.incomePercent}%
      </div>
    ),
    meta: { label: "Income %", variant: "text", placeholder: "Search income %…" },
    enableColumnFilter: true,
  },
  {
    id: "requiredDirects",
    accessorKey: "requiredDirects",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Required Directs" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        {row.original.requiredDirects}
      </div>
    ),
    meta: { label: "Required Directs", variant: "text", placeholder: "Search required directs…" },
    enableColumnFilter: true,
  },
  {
    id: "packageAmount",
    accessorKey: "packageAmount",
    header: ({ column }) => (
      <div className="text-center">
        <DataTableColumnHeader column={column} title="Min. Package Amount" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium">
        ${row.original.packageAmount}
      </div>
    ),
    meta: { label: "Minimum Package Amount", variant: "text", placeholder: "Search package amount…" },
    enableColumnFilter: true,
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
      <div className="text-left font-medium">
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
  // {
  //   id: "actions",
  //   header: () => <div className="text-center">Actions</div>,
  //   cell: ({ row }) => (
  //     <div className="flex justify-center">
  //       <RowActions row={row} onEdit={onEdit} onDelete={onDelete} />
  //     </div>
  //   ),
  // },
];