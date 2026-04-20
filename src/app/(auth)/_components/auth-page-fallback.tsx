import { CenteredLoadingSurface } from "@/components/loading/page-loading-skeleton";

export function AuthPageFallback() {
  return (
    <CenteredLoadingSurface
      minHeightClassName="min-h-screen"
      title="Loading"
      description="Preparing your secure sign-in experience."
    />
  );
}
