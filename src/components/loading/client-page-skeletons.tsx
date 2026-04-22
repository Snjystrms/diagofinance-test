import type { ComponentProps } from "react";

import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ClientCardGridSkeletonProps extends ComponentProps<"div"> {
  cardCount?: number;
}

interface ClientTablePageSkeletonProps extends ComponentProps<"div"> {
  columnCount?: number;
  rowCount?: number;
}

export function ClientCardGridSkeleton({
  cardCount = 6,
  className,
  ...props
}: ClientCardGridSkeletonProps) {
  return (
    <div
      className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}
      {...props}
    >
      {Array.from({ length: cardCount }).map((_, index) => (
        <Card key={index} className="flex flex-col overflow-hidden">
          <CardHeader className="bg-primary/10 px-6 py-4 dark:bg-primary/20">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-36 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 px-6 py-6">
            <div className="space-y-2 border-b pb-3">
              <Skeleton className="h-3.5 w-28 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((__, rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton className="h-3.5 w-20 rounded-full" />
                </div>
              ))}
            </div>
            <div className="space-y-2 border-t pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ClientTablePageSkeleton({
  columnCount = 7,
  rowCount = 8,
  className,
  ...props
}: ClientTablePageSkeletonProps) {
  return (
    <ListPageSkeleton
      actionCount={0}
      columnCount={columnCount}
      rowCount={rowCount}
      filterPillCount={2}
      showFilterPanel={false}
      className={className}
      {...props}
    />
  );
}

export function ProfileHeaderSkeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <Card className={cn("border-gray-200 dark:border-gray-700", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-7 w-56 max-w-full rounded-full" />
              <Skeleton className="h-4 w-72 max-w-full rounded-full" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-44 rounded-lg" />
              <Skeleton className="h-10 w-36 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-40 rounded-lg" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileContentSkeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-56 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 rounded-full" />
                      <Skeleton className="h-3 w-full rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-4 w-72 max-w-full rounded-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 5 }).map((__, rowIndex) => (
                <div key={rowIndex} className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44 rounded-full" />
        </CardHeader>
        <CardContent>
          <DataTableSkeleton
            columnCount={4}
            rowCount={4}
            filterCount={0}
            withToolbar={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
