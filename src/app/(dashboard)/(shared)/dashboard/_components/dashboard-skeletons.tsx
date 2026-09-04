"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ClientDashboardSkeleton() {
  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 2px;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header + Key Metrics (75%) and Stepper (25%) - Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Side: Header + Key Metrics (75%) */}
          <div className="xl:col-span-3 space-y-6">
            {/* Header Section */}
            <div className="rounded-[28px] border bg-card px-6 py-6 sm:px-7">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-9 w-80 mb-2" />
                <Skeleton className="h-5 w-96" />
              </div>
            </div>

            {/* Key Metrics Summary Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden border rounded-[28px] shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl opacity-40" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <Skeleton className="h-3 w-32 mb-2" />
                        <Skeleton className="h-7 w-28" />
                      </div>
                      <Skeleton className="h-11 w-11 rounded-2xl" />
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Top Cards Row - Wallet, IB Wallet, Profile Progress */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden border rounded-[28px] shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl opacity-40" />
                  <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 pt-4 pb-6 px-6">
                    <div className="space-y-3">
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                      <Skeleton className="h-3 w-full max-w-xs" />
                      <Skeleton className="h-9 w-full rounded-xl mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Profile Stepper - 20% width on XL screens */}
          <div className="xl:col-span-1">
            <Card className="rounded-[28px] border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      {i < 3 && <Skeleton className="h-12 w-0.5 my-2" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Deposits and Withdrawals Charts */}
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="relative rounded-2xl border-2 border-border/50 shadow-lg">
              <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-6 md:flex-row md:items-center md:justify-between md:gap-0">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div>
                    <Skeleton className="h-5 w-24 mb-1" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative flex flex-col gap-4 p-6">
                <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 flex-1 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-[225px] w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Positions Table Skeleton */}
        <Card className="rounded-[28px] border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-56 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Trading Accounts Section */}
        <div className="space-y-6">
          <Card className="border-0 bg-card/70 shadow-xl backdrop-blur-sm rounded-[28px]">
            <CardContent className="px-4 py-4">
              <div className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/50 p-1 gap-1">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-56 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="rounded-[28px] border shadow-sm">
                <CardHeader className="pb-4 px-5 pt-5">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full mt-2" />
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-11 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export function AdminDashboardSkeleton() {
  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
      {/* Header Section */}
      <div className="mb-6 rounded-[28px] border bg-card px-6 py-6 sm:px-7">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-80 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>

      {/* KPI Cards Grid - 3 rows of 3 cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden border rounded-[28px] shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full blur-3xl opacity-40" />
            <CardContent className="relative z-10 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-9 w-9 rounded-2xl" />
              </div>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-3 w-40 mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="relative rounded-2xl border-2 border-border/50 shadow-lg">
            <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-6 md:flex-row md:items-center md:justify-between md:gap-0">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative p-6">
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Metrics Card */}
      <Card className="rounded-[28px]">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-40 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64 mb-2" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-3 w-20 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Total Section */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-40 rounded-full" />
            </div>
            <Skeleton className="h-3 w-64 mb-2" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
