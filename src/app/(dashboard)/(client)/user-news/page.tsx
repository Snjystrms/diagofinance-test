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
  Loader2,
  Clock,
  Radio,
  Calendar,
  ArrowRight,
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
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
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
                  <Badge className="bg-primary/90 text-primary-foreground border-0 text-[10px] font-semibold mb-2">
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
              <div className="flex h-24 w-full items-center justify-center bg-primary/5 dark:bg-primary/10 border-b border-border/40">
                <Newspaper className="h-8 w-8 text-primary/50" />
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
                      className="mt-0.5 text-[10px] font-semibold px-2 py-0.5 bg-primary/5 text-primary border-primary/30 dark:bg-primary/10 dark:text-primary dark:border-primary/30 shrink-0"
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
    <div 
      onClick={onView}
      className="group relative flex flex-col rounded-xl border border-border/60 bg-card cursor-pointer overflow-hidden
        hover:border-[#FFB401]/40 hover:bg-[#FFB401]/[0.03] transition-all duration-200 shadow-sm hover:shadow-lg"
    >
      {/* Thumbnail or fallback */}
      {item.image_url || item.image ? (
        <div className="relative h-44 w-full overflow-hidden bg-muted">
          <Image
            src={(item.image_url || item.image) as string}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        </div>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-[#FFB401]/8 border-b border-[#FFB401]/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFB401" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
          </svg>
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Category pill */}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFB401]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FFB401]">
            News Update
          </span>
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-2">
            {item.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.short_description || item.description || "Click to read the full story..."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <Calendar className="h-2.5 w-2.5" />
            <span className="font-mono">{fmtDate(item.updated_at || item.created_at)}</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-[#FFB401] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
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
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1220] via-[#0B1220] to-[#1a1f2e] p-6 border border-[#FFB401]/20">
          {/* Decorative elements */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFB401] to-transparent opacity-80" />
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="news-grid-page" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#news-grid-page)" />
            </svg>
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#FFB401]/10 blur-2xl" />
          </div>

          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFB401]/15 border border-[#FFB401]/30">
                <Radio className="h-6 w-6 text-[#FFB401]" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB401] opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFB401]" />
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFB401]">Breaking</span>
                <span className="w-1 h-1 rounded-full bg-[#FFB401]/50" />
                <span className="text-[10px] tracking-widest uppercase text-white/40">Vinnexia Capital</span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Latest News</h1>
              <p className="text-sm text-white/50 mt-0.5">Stay ahead with real-time updates &amp; announcements.</p>
            </div>
          </div>
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
