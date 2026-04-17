"use client";

import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

interface ReportPageWrapperProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
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
