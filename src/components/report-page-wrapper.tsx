"use client";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Download, RefreshCw } from "lucide-react";

export type ReportExportFormat = "xlsx" | "csv";

interface ReportPageWrapperProps {
  title: string;
  titleIcon?: React.ReactNode;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: unknown;
  onExport?: (format: ReportExportFormat) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  filters?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared layout wrapper for all report pages.
 * Provides consistent header, loading state, export/refresh buttons, and filter slot.
 */
export function ReportPageWrapper({
  title,
  titleIcon,
  description,
  isLoading,
  isEmpty,
  error,
  onExport,
  onRefresh,
  isRefreshing,
  filters,
  children,
}: ReportPageWrapperProps) {
  const exportButton = onExport ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExport("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
        {/* <DropdownMenuItem onClick={() => onExport("csv")}>Export CSV (.csv)</DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (isLoading && isEmpty) {
    return (
      <ListPageSkeleton
        actionCount={(onRefresh ? 1 : 0) + (onExport ? 1 : 0)}
        columnCount={7}
        rowCount={10}
        filterPillCount={3}
        showFilterPanel
      />
    );
  }

  if (error && isEmpty) {
    return (
      <div className="space-y-6 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {titleIcon}
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {filters}
            {onRefresh ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            ) : null}
            {exportButton}
          </div>
        </div>
        <ApiErrorState
          error={error}
          audience="admin"
          variant="panel"
          resource={title.toLowerCase()}
          action="load"
          onRetry={onRefresh}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            {titleIcon}
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filters}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
          {exportButton}
        </div>
      </div>
      {children}
    </div>
  );
}
