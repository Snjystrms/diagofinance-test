import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const panelStyle = {
  borderColor: "var(--skeleton-stroke)",
  backgroundColor: "var(--skeleton-panel)",
} as const;

export function MyDepositPageSkeleton() {
  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 max-w-full rounded-xl" />
          <Skeleton className="h-4 w-[25rem] max-w-full rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5" style={panelStyle}>
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>

        <div className="mb-4">
          <Skeleton className="h-10 w-full max-w-sm rounded-lg" />
        </div>

        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 rounded-full" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card" style={panelStyle}>
        <DataTableSkeleton
          columnCount={9}
          rowCount={8}
          filterCount={0}
          withToolbar={false}
        />
      </div>
    </div>
  );
}
