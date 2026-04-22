import type { ComponentProps } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BackofficeDetailDialogSkeletonProps extends ComponentProps<"div"> {
  fieldCount?: number;
  sectionCount?: number;
}

interface BackofficeStatsGridSkeletonProps extends ComponentProps<"div"> {
  cardCount?: number;
}

export function BackofficeDetailDialogSkeleton({
  fieldCount = 6,
  sectionCount = 2,
  className,
  ...props
}: BackofficeDetailDialogSkeletonProps) {
  return (
    <div className={cn("space-y-5", className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-40 rounded-full" />
      </div>

      {Array.from({ length: sectionCount }).map((_, sectionIndex) => (
        <section key={sectionIndex} className="space-y-3">
          <Skeleton className="h-5 w-32 rounded-full" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: Math.max(3, Math.ceil(fieldCount / Math.max(sectionCount, 1))),
            }).map((__, fieldIndex) => (
              <div
                key={`${sectionIndex}-${fieldIndex}`}
                className="space-y-2 rounded-md border bg-background p-3"
              >
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function BackofficeStatsGridSkeleton({
  cardCount = 4,
  className,
  ...props
}: BackofficeStatsGridSkeletonProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)} {...props}>
      {Array.from({ length: cardCount }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-3.5 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
