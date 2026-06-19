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
  Megaphone,
  Search,
  CalendarDays,
  ImageIcon,
  RefreshCw,
  Inbox,
  Loader2,
  Clock,
  Sparkles,
  Calendar,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "");

/* ─── Detail Dialog ─────────────────────────────────────────────────────── */
function PromotionDetailDialog({
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
            <p className="text-sm text-muted-foreground">Loading promotion…</p>
          </div>
        ) : isError || !item ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
            <p className="text-sm text-destructive font-medium">Failed to load promotion.</p>
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
                    Promotion
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
                <Megaphone className="h-8 w-8 text-primary/50" />
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
                      Promotion
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
                    Details
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
function PromotionCard({ item, onView }: { item: NewsItem; onView: () => void }) {
  return (
    <div
      onClick={onView}
      className="group relative flex flex-col rounded-xl cursor-pointer overflow-hidden
        border border-primary/20 bg-card shadow-sm
        hover:border-primary/40 hover:shadow-lg transition-all duration-200"
    >
      {/* Gradient side accent bar */}
      <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-primary via-primary/70 to-accent opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Thumbnail or fallback */}
      {item.image_url || item.image ? (
        <div className="relative h-44 w-full overflow-hidden bg-muted">
          <Image
            src={item.image_url || item.image}
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
        <div className="flex h-44 w-full items-center justify-center border-b border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80 text-primary">
            <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
          </svg>
        </div>
      )}

      {/* Body */}
      <div className="p-4 pl-5 space-y-3 flex-1 flex flex-col">
        {/* Hot badge */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20">
            🎁 Special Offer
          </span>
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-2">
            {item.title}
          </h4>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.short_description || item.description || "Tap to explore this exclusive offer..."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            <Calendar className="h-2.5 w-2.5" />
            <span className="font-mono">{fmtDate(item.updated_at || item.created_at)}</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function PromotionCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
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
export default function UserPromotionsPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["userNews", token, "promotion"],
    queryFn: async () => {
      const res = await userNewsApi.list({ token: token!, per_page: 100 });
      const all: NewsItem[] = Array.isArray(res?.data)
        ? (res.data as unknown as NewsItem[])
        : (res?.data?.data ?? []);
      return all.filter((item) => item.type === "promotion");
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
        <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/[0.15] via-primary/[0.08] to-primary/[0.15] dark:from-primary/[0.12] dark:via-primary/[0.06] dark:to-primary/[0.12] p-6 border border-primary/20">
          {/* Glow orbs */}
          <div className="absolute -left-8 top-0 w-40 h-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
          <div className="absolute right-4 -top-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-accent/10 blur-2xl pointer-events-none" />
          
          {/* Bottom shimmer bar */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 via-50% to-transparent" />

          <div className="relative flex items-start gap-4">
            <div className="flex-shrink-0 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              {/* Sparkle dots */}
              <span className="absolute -top-1 -right-1 text-primary text-xs animate-spin" style={{ animationDuration: "4s" }}>✦</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/20 text-primary border border-primary/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  Limited Time
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Special Promotions</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Exclusive offers just for you — don&apos;t miss out!</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search promotions… (3+ characters)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 flex items-center justify-between text-sm text-destructive">
            <span>Failed to load promotions.</span>
            <button onClick={() => refetch()} className="flex items-center gap-1.5 underline font-medium">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PromotionCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {search.trim().length >= 3 ? "No results found" : "No promotions yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {search.trim().length >= 3
                ? "Try a different search term."
                : "Check back soon for new promotions and special offers."}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <PromotionCard
                key={item.id}
                item={item}
                onView={() => setSelectedId(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <PromotionDetailDialog
        id={selectedId}
        token={token ?? ""}
        open={Boolean(selectedId)}
        onOpenChange={(v) => { if (!v) setSelectedId(null); }}
      />
    </ProtectedRoute>
  );
}
