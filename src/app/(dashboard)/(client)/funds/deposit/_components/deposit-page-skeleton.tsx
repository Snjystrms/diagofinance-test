import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DepositPageSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Section */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
        </div>

        {/* Wallet Summary Cards */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Tab Skeleton */}
        <div className="space-y-6">
          <div className="inline-flex h-auto w-full flex-wrap gap-1.5 rounded-2xl border border-border/60 bg-muted/30 p-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 flex-1 min-w-[120px] rounded-xl" />
            ))}
          </div>

          {/* Welcome Card Skeleton */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/30 to-muted/40 p-6 shadow-lg">
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              {/* Left content */}
              <div className="space-y-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-8 w-full max-w-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full max-w-xl" />
                  <Skeleton className="h-4 w-full max-w-lg" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-10 w-40 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
              </div>
              
              {/* Right info panel */}
              <div className="rounded-2xl border border-border/70 bg-background/70 backdrop-blur-sm p-5">
                <Skeleton className="h-4 w-40 mb-4" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-6 w-24 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepositFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-sm md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Left Card - Wallet Info */}
        <Card className="rounded-[28px] border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <div className="space-y-2 flex-1 text-center">
                <Skeleton className="h-7 w-48 mx-auto" />
                <Skeleton className="h-4 w-56 mx-auto" />
              </div>
              <div className="flex-1 flex justify-end">
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* QR Code / Image */}
            <div className="flex justify-center">
              <Skeleton className="h-64 w-64 rounded-2xl" />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>

            {/* Address Section */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-12 w-24 rounded-xl" />
              </div>
              <Skeleton className="h-3 w-full max-w-xs" />
            </div>

            {/* Alert Box */}
            <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2">
              <Skeleton className="h-4 w-28" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0 mt-0.5" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Card - Form */}
        <Card className="rounded-[28px] border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <Skeleton className="h-7 w-56 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Form Fields */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
            ))}

            {/* File Upload Area */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <div className="rounded-xl border-2 border-dashed border-border p-6">
                <div className="flex flex-col items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-full max-w-sm" />
            </div>

            {/* Submit Button */}
            <Skeleton className="h-12 w-full rounded-xl" />

            {/* How it Works Box */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
