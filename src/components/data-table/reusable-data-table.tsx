"use client";

import { type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Types ────────────────────────────────────────────────────────────── */

export type ColumnAlignment = "left" | "center" | "right";

export type ColumnDef<T> = {
  /** Header label */
  header: string;
  /** Unique key for the column */
  key: string;
  /** Function to render the cell content */
  render: (row: T, index: number) => ReactNode;
  /** Column alignment */
  align?: ColumnAlignment;
  /** CSS class for the column */
  className?: string;
  /** Hide on mobile */
  hideOnMobile?: boolean;
};

export type PaginationState = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type DataTableProps<T> = {
  /** Array of data rows */
  data: T[];
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Pagination state */
  pagination?: PaginationState;
  /** Loading state */
  isLoading?: boolean;
  /** Show serial numbers */
  showSerialNumber?: boolean;
  /** Serial number starting index (for pagination) */
  serialNumberStart?: number;
  /** Empty state */
  emptyState?: ReactNode;
  /** Table container className */
  containerClassName?: string;
  /** Table className */
  tableClassName?: string;
  /** Pagination callbacks */
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  /** Per page options */
  perPageOptions?: number[];
};

/* ─── Helper Functions ─────────────────────────────────────────────────── */

function getAlignmentClass(align?: ColumnAlignment) {
  switch (align) {
    case "center":
      return "text-center";
    case "right":
      return "text-right";
    default:
      return "text-left";
  }
}

/* ─── Status Badge Helper ──────────────────────────────────────────────── */

export function getStatusBadge(status?: string) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  const normalized = status.toLowerCase();

  if (["completed", "success", "approved", "paid"].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{status}</span>
      </span>
    );
  }

  if (["pending", "processing"].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{status}</span>
      </span>
    );
  }

  if (["failed", "rejected", "cancelled"].includes(normalized)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{status}</span>
      </span>
    );
  }

  return <Badge variant="outline">{status}</Badge>;
}

/* ─── Transaction Type Icon Helper ─────────────────────────────────────── */

export function getTransactionTypeIcon(isOutflow: boolean, label: string) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[13px]",
          isOutflow
            ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
        )}
      >
        {isOutflow ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" />
        )}
      </span>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}

/* ─── Pagination Controls ──────────────────────────────────────────────── */

function PaginationControls({
  pagination,
  isLoading,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 30, 50],
}: {
  pagination: PaginationState;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
}) {
  if (pagination.total === 0) return null;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 px-1">
      <div className="flex items-center gap-4">
        <div className="text-xs text-muted-foreground tabular-nums">
          Showing {Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total)}–
          {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total}
        </div>
        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <label htmlFor="perPage" className="text-xs text-muted-foreground whitespace-nowrap">
              Rows per page:
            </label>
            <select
              id="perPage"
              value={pagination.per_page}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              disabled={isLoading}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {onPageChange && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.current_page - 1)}
            disabled={pagination.current_page === 1 || isLoading}
          >
            Previous
          </Button>
          {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - pagination.current_page) <= 1)
            .map((p, idx, arr) => (
              <div key={p} className="flex items-center gap-2">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-muted-foreground">…</span>
                )}
                <Button
                  variant={p === pagination.current_page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(p)}
                  disabled={isLoading}
                  className="min-w-[2.5rem]"
                >
                  {p}
                </Button>
              </div>
            ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.current_page + 1)}
            disabled={pagination.current_page === pagination.total_pages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Main DataTable Component ─────────────────────────────────────────── */

export function ReusableDataTable<T>({
  data,
  columns,
  pagination,
  isLoading,
  showSerialNumber = false,
  serialNumberStart = 1,
  emptyState,
  containerClassName,
  tableClassName,
  onPageChange,
  onPerPageChange,
  perPageOptions,
}: DataTableProps<T>) {
  const hasData = data.length > 0;

  if (!hasData && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <div className={cn("w-full overflow-x-auto rounded-2xl border border-border/50", containerClassName)}>
        <table className={cn("w-full min-w-[640px] text-sm", tableClassName)}>
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              {showSerialNumber && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sr. No.
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    getAlignmentClass(column.align),
                    column.hideOnMobile && "hidden md:table-cell",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((row, index) => (
              <tr
                key={index}
                className="group transition-colors hover:bg-muted/20"
              >
                {showSerialNumber && (
                  <td className="whitespace-nowrap px-4 py-3.5 text-center text-muted-foreground">
                    {serialNumberStart + index}
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3.5",
                      getAlignmentClass(column.align),
                      column.hideOnMobile && "hidden md:table-cell",
                      column.className
                    )}
                  >
                    {column.render(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <PaginationControls
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          perPageOptions={perPageOptions}
        />
      )}
    </div>
  );
}
