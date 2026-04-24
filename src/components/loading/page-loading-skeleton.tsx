import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ListPageSkeletonProps extends React.ComponentProps<"div"> {
  statsCount?: number;
  actionCount?: number;
  columnCount?: number;
  rowCount?: number;
  filterPillCount?: number;
  contained?: boolean;
  showHeader?: boolean;
  showFilterPanel?: boolean;
}

type TableSectionSkeletonProps = Omit<
  React.ComponentProps<typeof DataTableSkeleton>,
  "filterCount" | "withToolbar"
>;

interface CenteredLoadingSurfaceProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
  minHeightClassName?: string;
}

const panelStyle = {
  borderColor: "var(--skeleton-stroke)",
  backgroundColor: "var(--skeleton-panel)",
} as const;

const panelStrongStyle = {
  borderColor: "var(--skeleton-stroke)",
  backgroundColor: "var(--skeleton-panel-strong)",
} as const;

export function ListPageSkeleton({
  statsCount = 0,
  actionCount = 1,
  columnCount = 5,
  rowCount = 10,
  filterPillCount = 3,
  contained = true,
  showHeader = true,
  showFilterPanel = true,
  className,
  ...props
}: ListPageSkeletonProps) {
  return (
    <div
      className={cn(
        contained ? "container mx-auto" : "",
        "space-y-6 p-6",
        className
      )}
      {...props}
    >
      {showHeader ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56 max-w-full rounded-xl" />
            <Skeleton className="h-4 w-[25rem] max-w-full rounded-full" />
          </div>
          {actionCount > 0 ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: actionCount }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={cn(
                    "h-10 rounded-xl",
                    index === 0 ? "w-28" : "w-36"
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {statsCount > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: statsCount }).map((_, index) => (
            <div
              key={index}
              className="rounded-[22px] border p-5"
              style={panelStyle}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-xl" />
                </div>
                <Skeleton className="h-11 w-11 rounded-2xl" />
              </div>
              <Skeleton className="mt-4 h-3 w-28 rounded-full" />
            </div>
          ))}
        </div>
      ) : null}

      {showFilterPanel ? (
        <div className="rounded-[22px] border p-5" style={panelStyle}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <Skeleton className="h-11 w-full max-w-sm rounded-xl" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.max(2, filterPillCount) }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className={cn(
                      "h-10 rounded-xl",
                      index % 3 === 0
                        ? "w-28"
                        : index % 3 === 1
                          ? "w-36"
                          : "w-24"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-28 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[22px]" style={panelStrongStyle}>
        <DataTableSkeleton
          columnCount={columnCount}
          rowCount={rowCount}
          filterCount={showFilterPanel ? 0 : filterPillCount}
          withToolbar={!showFilterPanel}
        />
      </div>
    </div>
  );
}

export function TableSectionSkeleton({
  columnCount,
  rowCount = 10,
  className,
  ...props
}: TableSectionSkeletonProps) {
  return (
    <DataTableSkeleton
      columnCount={columnCount}
      rowCount={rowCount}
      filterCount={0}
      withToolbar={false}
      className={cn("gap-0", className)}
      {...props}
    />
  );
}

export function CenteredLoadingSurface({
  title = "Loading",
  description,
  minHeightClassName = "min-h-[60vh]",
  className,
  ...props
}: CenteredLoadingSurfaceProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4 py-8",
        minHeightClassName,
        className
      )}
      {...props}
    >
      <div
        className="w-full max-w-sm rounded-[26px] border border-border/80 bg-card/96 px-6 py-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)] backdrop-blur-sm"
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-[18px] border border-border/80 bg-background/80"
        >
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-[0.01em] text-foreground">{title}</p>
        {description ? (
          <p className="mt-1.5 text-sm leading-6 text-foreground/78">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
