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

interface TeamTreeSkeletonProps extends ComponentProps<"div"> {}

function TreeNodeSkeleton({ level = 0 }: { level?: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm w-[220px] min-h-[100px]">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-3 w-32 rounded-full" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TeamTreeSkeleton({
  className,
  ...props
}: TeamTreeSkeletonProps) {
  return (
    <div className={cn("flex flex-col items-center gap-8 py-8", className)} {...props}>
      {/* Root node */}
      <div className="flex flex-col items-center gap-4">
        <TreeNodeSkeleton level={0} />
        
        {/* Vertical connector */}
        <div className="h-8 w-px bg-border" />
      </div>

      {/* Level 1 - 2 nodes */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-start gap-12">
          <TreeNodeSkeleton level={1} />
          <TreeNodeSkeleton level={1} />
        </div>
        
        {/* Vertical connectors */}
        <div className="h-8 w-px bg-border" />
      </div>

      {/* Level 2 - 4 nodes */}
      <div className="flex items-start gap-6">
        <TreeNodeSkeleton level={2} />
        <TreeNodeSkeleton level={2} />
        <TreeNodeSkeleton level={2} />
        <TreeNodeSkeleton level={2} />
      </div>
    </div>
  );
}
