"use client";

import type { Row, Table } from "@tanstack/react-table";

type SerialNumberCellProps<TData> = {
  row: Row<TData>;
  table: Table<TData>;
  className?: string;
};

export function getSerialNumberFromRow<TData>(
  row: Row<TData>,
  table: Table<TData>,
): number {
  const paginationState = table.getState().pagination;
  const pageIndex = paginationState?.pageIndex ?? 0;
  const pageSize = paginationState?.pageSize ?? 10;

  return pageIndex * pageSize + row.index + 1;
}

export function SerialNumberCell<TData>({
  row,
  table,
  className = "font-medium",
}: SerialNumberCellProps<TData>) {
  return <span className={className}>{getSerialNumberFromRow(row, table)}</span>;
}
