"use client";

import { Skeleton } from "@/components/ui/skeleton";

function DashboardHeaderSkeleton() {
  return (
    <div
      className="rounded-[26px] p-6"
      style={{ backgroundColor: "var(--skeleton-panel)" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-80 max-w-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ClientDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[20px] p-6"
            style={{ backgroundColor: "var(--skeleton-panel)" }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div
          className="xl:col-span-2 rounded-[24px] p-6"
          style={{ backgroundColor: "var(--skeleton-panel)" }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-[320px] w-full rounded-2xl" />
          </div>
        </div>
        <div
          className="rounded-[24px] p-6"
          style={{ backgroundColor: "var(--skeleton-panel)" }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-[16px] p-3"
                style={{ backgroundColor: "var(--skeleton-panel-strong)" }}
              >
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="rounded-[24px] p-6"
        style={{ backgroundColor: "var(--skeleton-panel)" }}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[18px] p-4"
                style={{ backgroundColor: "var(--skeleton-panel-strong)" }}
              >
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-28" />
                  <Skeleton className="h-32 w-full rounded-[16px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardHeaderSkeleton />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[20px] p-6"
            style={{ backgroundColor: "var(--skeleton-panel)" }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-11 w-11 rounded-xl" />
              </div>
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div
          className="xl:col-span-2 rounded-[24px] p-6"
          style={{ backgroundColor: "var(--skeleton-panel)" }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-9 w-24 rounded-[10px]" />
            </div>
            <Skeleton className="h-[265px] rounded-[18px]" />
          </div>
        </div>
        <div
          className="rounded-[24px] p-6"
          style={{ backgroundColor: "var(--skeleton-panel)" }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[16px] p-3"
                style={{ backgroundColor: "var(--skeleton-panel-strong)" }}
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="rounded-[24px] p-6"
        style={{ backgroundColor: "var(--skeleton-panel)" }}
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-[10px]" />
            ))}
          </div>
          <Skeleton className="h-[360px] rounded-[20px]" />
        </div>
      </div>
    </div>
  );
}
