"use client";

import type { Row, Table } from "@tanstack/react-table";

type SerialNumberCellWithTableProps<TData> = {
  row: Row<TData>;
  table: Table<TData>;
  serialNumber?: never;
  className?: string;
};

type SerialNumberCellWithValueProps = {
  serialNumber: number;
  row?: never;
  table?: never;
  className?: string;
};

type SerialNumberCellProps<TData> = SerialNumberCellWithTableProps<TData> | SerialNumberCellWithValueProps;

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
  serialNumber,
  className = "font-medium",
}: SerialNumberCellProps<TData>) {
  const resolvedSerialNumber =
    typeof serialNumber === "number" ? serialNumber : getSerialNumberFromRow(row, table);
  return <span className={className}>{resolvedSerialNumber}</span>;
}
