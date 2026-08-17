"use client";

import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
import type * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCommonPinningStyles } from "@/lib/data-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn("flex w-full min-w-0 flex-col gap-2.5", className)}
      {...props}
    >
      {children}
      <div className="rounded-md border overflow-x-auto min-w-0">
        <Table className="w-auto min-w-[1400px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isFirstVisCol = header.column.getIndex() === 0;
                  const mobileHidden = (header.column.columnDef.meta as Record<string, unknown> | undefined)?.mobileHidden === true;
                  if (mobileHidden && isMobile) return null;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
className={cn(
                          isMobile && isFirstVisCol && "sticky left-0 z-10 bg-background",
                        )}
                      style={{
                        ...getCommonPinningStyles({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isFirstVisCol = cell.column.getIndex() === 0;
                    const mobileHidden = (cell.column.columnDef.meta as Record<string, unknown> | undefined)?.mobileHidden === true;
                    if (mobileHidden && isMobile) return null;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          isMobile && isFirstVisCol && "sticky left-0 z-10 bg-background",
                        )}
                        style={{
                          ...getCommonPinningStyles({ column: cell.column }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
