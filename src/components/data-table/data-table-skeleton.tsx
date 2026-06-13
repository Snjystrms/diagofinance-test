import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableSkeletonProps extends React.ComponentProps<"div"> {
  columnCount: number;
  rowCount?: number;
  filterCount?: number;
  cellWidths?: string[];
  withToolbar?: boolean;
  withViewOptions?: boolean;
  withPagination?: boolean;
  shrinkZero?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ["auto"],
  withToolbar = true,
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, index) => cellWidths[index % cellWidths.length] ?? "auto",
  );
  const lineWidths = ["w-[48%]", "w-[58%]", "w-[66%]", "w-[74%]", "w-[82%]"];
  const headerWidths = ["w-[34%]", "w-[46%]", "w-[54%]", "w-[62%]", "w-[40%]"];
  const toolbarPillWidths =
    filterCount > 0
      ? Array.from({ length: filterCount }, (_, index) => ["w-[10.5rem]", "w-[8.5rem]", "w-[6.5rem]"][index % 3]!)
      : ["w-[10.5rem]", "w-[8.5rem]", "w-[6.5rem]"];

  const renderHeaderCell = (index: number) => (
    <div className="flex items-center gap-2.5">
      {index === 0 ? <Skeleton className="size-4 rounded-[5px]" /> : null}
      <Skeleton className={cn("h-3.5 rounded-full", headerWidths[index % headerWidths.length])} />
    </div>
  );

  const renderBodyCell = (rowIndex: number, columnIndex: number) => {
    const widthClass = lineWidths[(rowIndex + columnIndex) % lineWidths.length];
    const pattern = columnIndex % 4;

    if (pattern === 0) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className={cn("h-3.5 rounded-full", widthClass)} />
        </div>
      );
    }

    if (pattern === 1) {
      return (
        <div className="space-y-2">
          <Skeleton className={cn("h-3.5 rounded-full", widthClass)} />
          <Skeleton className={cn("h-3 rounded-full opacity-70", lineWidths[(rowIndex + columnIndex + 2) % lineWidths.length])} />
        </div>
      );
    }

    if (pattern === 2) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="size-4 rounded-[6px]" />
          <Skeleton className={cn("h-3.5 rounded-full", widthClass)} />
        </div>
      );
    }

    return <Skeleton className={cn("h-3.5 rounded-full", widthClass)} />;
  };

  return (
    <div
      className={cn("flex w-full flex-col gap-4 overflow-auto", className)}
      {...props}
    >
      {withToolbar ? (
        <div
          className="overflow-x-auto rounded-[18px] border"
          style={{
            borderColor: "var(--skeleton-stroke)",
            backgroundColor: "var(--skeleton-panel-strong)",
          }}
        >
          <div
            className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
            style={{ borderColor: "var(--skeleton-stroke)" }}
          >
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-[4.75rem] rounded-[10px]" />
              <Skeleton className="h-8 w-[4.25rem] rounded-[10px]" />
              <Skeleton className="h-8 w-[3.75rem] rounded-[10px]" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-[5.5rem] rounded-[10px]" />
              <Skeleton className="h-8 w-[4.25rem] rounded-[10px]" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 overflow-auto px-4 py-3">
            {toolbarPillWidths.map((widthClass, index) => (
              <Skeleton
                key={index}
                className={cn("h-9 shrink-0 rounded-[10px]", widthClass)}
              />
            ))}
            {withViewOptions ? <Skeleton className="ml-auto hidden h-9 w-24 rounded-[10px] lg:flex" /> : null}
          </div>
        </div>
      ) : null}
      <div
className="overflow-x-auto rounded-[18px] border"
          style={{
            borderColor: "var(--skeleton-stroke)",
            backgroundColor: "var(--skeleton-panel)",
          }}
      >
        <Table>
          <TableHeader>
            {Array.from({ length: 1 }).map((_, i) => (
              <TableRow
                key={i}
                className="border-b hover:bg-transparent"
                style={{ borderColor: "var(--skeleton-stroke)" }}
              >
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableHead
                    key={j}
                    className="h-11 border-r px-4 last:border-r-0"
                    style={{
                      borderColor: "var(--skeleton-stroke)",
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                    }}
                  >
                    {renderHeaderCell(j)}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow
                key={i}
                className="h-[56px] border-b hover:bg-transparent last:border-b-0"
                style={{ borderColor: "var(--skeleton-stroke)" }}
              >
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell
                    key={j}
                    className="border-r px-4 py-3 last:border-r-0"
                    style={{
                      borderColor: "var(--skeleton-stroke)",
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : "auto",
                    }}
                  >
                    {renderBodyCell(i, j)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {withPagination ? (
        <div
          className="flex w-full items-center justify-between gap-4 overflow-auto rounded-[18px] border px-4 py-3 sm:gap-8"
          style={{
            borderColor: "var(--skeleton-stroke)",
            backgroundColor: "var(--skeleton-panel-strong)",
          }}
        >
          <Skeleton className="h-8 w-44 shrink-0 rounded-[10px]" />
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-[10px]" />
              <Skeleton className="h-8 w-[4.75rem] rounded-[10px]" />
            </div>
            <div className="flex items-center justify-center font-medium text-sm">
              <Skeleton className="h-8 w-20 rounded-[10px]" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="hidden size-8 rounded-[10px] lg:block" />
              <Skeleton className="size-8 rounded-[10px]" />
              <Skeleton className="size-8 rounded-[10px]" />
              <Skeleton className="hidden size-8 rounded-[10px] lg:block" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
