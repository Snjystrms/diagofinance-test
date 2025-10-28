"use client";

import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useDataTable } from "@/hooks/use-data-table";
// import { DataTable } from "@/components/data-table";
// import { DataTableToolbar } from "@/components/data-table-toolbar";
// For advanced UI, swap in DataTableAdvancedToolbar with FilterList/SortList
import { DataTable } from "./data-table/data-table";
import { DataTableToolbar } from "./data-table/data-table-toolbar";

type AppDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  pageCount?: number;             // pass from server when you paginate
  advanced?: boolean;             // toggle advanced toolbar
  actionBar?: React.ReactNode;    // e.g., bulk delete/export on selection
};
export function AppDataTable<TData>({
  data,
  columns,
  pageCount = 1,
  advanced = false,
  actionBar,
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
    getRowId: (row: any) => row.id ?? row._id ?? String(Math.random()),
  });

  // Standard toolbar
  if (!advanced) {
    return (
      <DataTable table={table} actionBar={actionBar}>
        <DataTableToolbar table={table} />
      </DataTable>
    );
  }

  // Advanced toolbar - fallback to standard toolbar if advanced components are not available
  try {
    const { DataTableAdvancedToolbar } = require("@/components/data-table-advanced-toolbar");
    const { DataTableFilterList } = require("@/components/data-table-filter-list");
    const { DataTableSortList } = require("@/components/data-table-sort-list");

    return (
      <DataTable table={table} actionBar={actionBar}>
        <DataTableAdvancedToolbar table={table}>
          <DataTableFilterList table={table} />
          <DataTableSortList table={table} />
        </DataTableAdvancedToolbar>
      </DataTable>
    );
  } catch (error) {
    console.warn('Advanced table components not found. Falling back to standard toolbar.');
    return (
      <DataTable table={table} actionBar={actionBar}>
        <DataTableToolbar table={table} />
      </DataTable>
    );
  }
}
