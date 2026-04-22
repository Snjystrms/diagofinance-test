"use client";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface ReportPageWrapperProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: unknown;
  onExport?: () => void;
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
      <div className="container mx-auto space-y-6 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
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
            {onExport ? (
              <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            ) : null}
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
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
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
