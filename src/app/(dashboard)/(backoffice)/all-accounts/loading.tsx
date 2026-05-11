import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";

export default function Loading() {
  return (
    <ListPageSkeleton
      actionCount={1}
      columnCount={8}
      rowCount={8}
      filterPillCount={2}
    />
  );
}
