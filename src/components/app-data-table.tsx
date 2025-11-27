"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
// import { DataTable } from "@/components/data-table";
// import { DataTableToolbar } from "@/components/data-table-toolbar";
// For advanced UI, swap in DataTableAdvancedToolbar with FilterList/SortList
import { DataTable } from "./data-table/data-table";
import { DataTableToolbar } from "./data-table/data-table-toolbar";
import { DataTableAdvancedToolbar } from "./data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "./data-table/data-table-filter-list";
import { DataTableSortList } from "./data-table/data-table-sort-list";

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
  advanced = false,
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

  // Standard toolbar
  if (!advanced) {
    return (
      <DataTable table={table} actionBar={actionBar}>
        <DataTableToolbar table={table} />
      </DataTable>
    );
  }

  // Advanced toolbar - use advanced components if available
  if (advanced && DataTableAdvancedToolbar && DataTableFilterList && DataTableSortList) {
    return (
      <DataTable table={table} actionBar={actionBar}>
        <DataTableAdvancedToolbar table={table}>
          <DataTableFilterList table={table} />
          <DataTableSortList table={table} />
        </DataTableAdvancedToolbar>
      </DataTable>
    );
  }
}
