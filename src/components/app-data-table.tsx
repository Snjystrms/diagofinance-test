"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTable } from "./data-table/data-table";

type AppDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  pageCount?: number;             // pass from server when you paginate
  advanced?: boolean;             // toggle advanced toolbar
  actionBar?: React.ReactNode;    // e.g., bulk delete/export on selection
  getRowId?: (row: TData) => string; // Optional custom row ID getter
};
export function AppDataTable<TData>({
  data,
  columns,
  pageCount = 1,
  advanced: _advanced = false,
  actionBar,
  getRowId,
}: AppDataTableProps<TData>) {
  const { table } = useDataTable<TData>({
    data,
    columns,
    pageCount,
    // Example defaults; customize to your taste:
    initialState: { 
      pagination: { 
        pageIndex: 0,  // Start with first page (0-based index)
        pageSize: 10 
      } 
    },
    getRowId: getRowId || ((row: TData) => {
      const rowObj = row as Record<string, unknown>;
      return String(rowObj.id ?? rowObj._id ?? rowObj.uuid ?? Math.random());
    }),
  });

  return <DataTable table={table} actionBar={actionBar} />;
}
