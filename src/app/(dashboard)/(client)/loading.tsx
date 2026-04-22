import { CenteredLoadingSurface } from "@/components/loading/page-loading-skeleton";

export default function ClientAreaLoading() {
  return (
    <CenteredLoadingSurface
      minHeightClassName="min-h-[60vh]"
      title="Loading"
      description="Preparing your account workspace."
    />
  );
}
