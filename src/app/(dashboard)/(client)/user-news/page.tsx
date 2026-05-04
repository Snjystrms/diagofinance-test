"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { userNewsApi, type NewsItem } from "@/lib/api-auth-admin";
import { formatDateTimeInIST } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Newspaper,
  Search,
  CalendarDays,
  ImageIcon,
  RefreshCw,
  Inbox,
  Eye,
  Loader2,
  Clock,
} from "lucide-react";
import Image from "next/image";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "");

/* ─── Detail Dialog ─────────────────────────────────────────────────────── */
function NewsDetailDialog({
  id,
  token,
  open,
  onOpenChange,
}: {
  id: string | number | null;
  token: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["userNewsDetail", token, id],
    queryFn: async () => {
      const res = await userNewsApi.get(id!, token);
      return res?.data ?? null;
    },
    enabled: open && Boolean(id) && Boolean(token),
    staleTime: 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            <p className="text-sm text-muted-foreground">Loading article…</p>
          </div>
        ) : isError || !item ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
            <p className="text-sm text-destructive font-medium">Failed to load article.</p>
          </div>
        ) : (
          <>
            {/* Hero Image */}
            {item.image_url ? (
              <div className="relative h-52 w-full bg-muted">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover"
                  sizes="512px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <Badge className="bg-blue-600/90 text-white border-0 text-[10px] font-semibold mb-2">
                    News
                  </Badge>
                  <DialogHeader>
                    <DialogTitle className="text-white text-base font-bold leading-snug line-clamp-2 drop-shadow">
                      {item.title}
                    </DialogTitle>
                  </DialogHeader>
                </div>
              </div>
            ) : (
              <div className="flex h-24 w-full items-center justify-center bg-blue-50 dark:bg-blue-950/20 border-b border-border/40">
                <Newspaper className="h-8 w-8 text-blue-400/50" />
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Title (when no image) */}
              {!item.image_url && (
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className="mt-0.5 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 shrink-0"
                    >
                      News
                    </Badge>
                    <DialogTitle className="text-base font-bold leading-snug">
                      {item.title}
                    </DialogTitle>
                  </div>
                </DialogHeader>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {item.created_at && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Published: {fmtDate(item.created_at)}</span>
                  </div>
                )}
                {item.updated_at && item.updated_at !== item.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Updated: {fmtDate(item.updated_at)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Short description */}
              {item.short_description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {item.short_description}
                  </p>
                </div>
              )}

              {/* Full description */}
              {item.description && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Full Article
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */
function NewsCard({ item, onView }: { item: NewsItem; onView: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg">
      {/* Image */}
      {item.image_url ? (
        <div className="relative h-44 w-full overflow-hidden bg-muted">
          <Image
            src={item.image_url}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-muted/50 border-b border-border/40">
          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
          >
            News
          </Badge>
          {item.created_at && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {fmtDate(item.created_at)}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground">
            {item.title}
          </h3>
          {item.short_description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.short_description}
            </p>
          )}
        </div>

        {/* View button */}
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-full gap-2 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/40"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5" />
            View Article
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function NewsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-3 w-24 ml-auto" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-full mt-2 rounded-md" />
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function UserNewsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["userNews", token, "news"],
    queryFn: async () => {
      const res = await userNewsApi.list({ token: token!, per_page: 100 });
      const all: NewsItem[] = Array.isArray(res?.data)
        ? (res.data as unknown as NewsItem[])
        : (res?.data?.data ?? []);
      return all.filter((item) => item.type === "news");
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const rows = data ?? [];

  const filtered = useMemo(() => {
    if (search.trim().length < 3) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.short_description?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6 space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Newspaper className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            News
          </h1>
          <p className="text-sm text-muted-foreground">
            Stay up to date with the latest news and updates.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search news… (3+ characters)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-center justify-between text-sm text-destructive">
            <span>Failed to load news.</span>
            <button onClick={() => refetch()} className="flex items-center gap-1.5 underline font-medium">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {search.trim().length >= 3 ? "No results found" : "No news yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search.trim().length >= 3
                ? "Try a different search term."
                : "Check back soon for the latest news and updates."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onView={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <NewsDetailDialog
        id={selectedId}
        token={token ?? ""}
        open={Boolean(selectedId)}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
      />
    </ProtectedRoute>
  );
}
