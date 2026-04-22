import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";

export default function BackofficeLoading() {
  return <ListPageSkeleton statsCount={4} columnCount={6} rowCount={8} />;
}
