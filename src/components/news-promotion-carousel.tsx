"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Newspaper, Megaphone, ArrowRight, ImageIcon, CalendarDays } from "lucide-react";
import { formatDateTimeInIST } from "@/lib/formatters";
import type { NewsItem } from "@/lib/api-auth-admin";

interface NewsPromotionCarouselProps {
  items: NewsItem[];
  type: "news" | "promotion" | "mixed";
  viewAllHref: string;
}

const TYPE_CONFIG = {
  news: {
    icon: Newspaper,
    label: "News",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    gradient: "from-blue-500/10 via-sky-500/5 to-transparent",
    border: "border-blue-500/20 hover:border-blue-500/40",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    dotActive: "bg-blue-500",
    dotInactive: "bg-blue-500/25",
    ctaClass: "text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300",
  },
  promotion: {
    icon: Megaphone,
    label: "Promotion",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    dotActive: "bg-emerald-500",
    dotInactive: "bg-emerald-500/25",
    ctaClass: "text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300",
  },
  mixed: {
    icon: Newspaper,
    label: "News & Promotion",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700",
    gradient: "from-slate-500/10 via-zinc-500/5 to-transparent",
    border: "border-slate-500/20 hover:border-slate-500/40",
    iconBg: "bg-slate-500/10 border-slate-500/20",
    iconColor: "text-slate-700 dark:text-slate-300",
    dotActive: "bg-slate-600",
    dotInactive: "bg-slate-600/25",
    ctaClass: "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
  },
};

const AUTOPLAY_DELAY = 5000;

export function NewsPromotionCarousel({ items, type, viewAllHref }: NewsPromotionCarouselProps) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  const isMultiple = items.length > 1;

  const go = useCallback(
    (idx: number) => {
      setCurrent(((idx % items.length) + items.length) % items.length);
    },
    [items.length]
  );

  const startAutoplay = useCallback(() => {
    if (!isMultiple) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, AUTOPLAY_DELAY);
  }, [isMultiple, items.length]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoplay]);

  if (items.length === 0) return null;

  const getSlideTypeConfig = (slideType?: NewsItem["type"]) => {
    if (slideType === "promotion") return TYPE_CONFIG.promotion;
    if (slideType === "news") return TYPE_CONFIG.news;
    return TYPE_CONFIG.mixed;
  };

  const getSlideHref = (slideType?: NewsItem["type"]) => {
    if (type !== "mixed") return viewAllHref;
    return slideType === "promotion" ? "/user-promotions" : "/user-news";
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br ${config.gradient} ${config.border} shadow-sm transition-all duration-300 hover:shadow-md`}
      onMouseEnter={() => { if (timerRef.current) clearInterval(timerRef.current); }}
      onMouseLeave={startAutoplay}
    >
      <div className="relative z-10 flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className={`rounded-lg border p-2 ${config.iconBg}`}>
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-extrabold tracking-tight text-foreground">
              {config.label}
            </p>
            {isMultiple ? (
              <span className="text-xs text-muted-foreground">
                {current + 1}/{items.length}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isMultiple ? (
            <button
              onClick={() => { go(current - 1); startAutoplay(); }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 transition-colors hover:bg-muted"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {isMultiple ? (
            <button
              onClick={() => { go(current + 1); startAutoplay(); }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 transition-colors hover:bg-muted"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative z-10 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((slide) => (
            <div key={slide.id} className="w-full flex-shrink-0">
              <div className="grid gap-0 md:grid-cols-10">
                <div className="relative md:col-span-7">
                  {slide.image_url ? (
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted md:aspect-[16/9]">
                      <Image
                        src={slide.image_url}
                        alt={slide.title}
                        fill
                        className="object-cover object-center"
                        sizes="(min-width: 1024px) 40vw, (min-width: 768px) 55vw, 100vw"
                        unoptimized
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] w-full items-center justify-center bg-muted md:aspect-[16/9]">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-col justify-between border-t border-border/40 p-5 md:col-span-3 md:border-l md:border-t-0 md:p-6">
                  <div className="space-y-3">
                    <Badge
                      variant="outline"
                      className={`px-2 py-0.5 text-[10px] font-semibold ${getSlideTypeConfig(slide.type).badgeClass}`}
                    >
                      {slide.type === "promotion" ? "Promotion" : "News"}
                    </Badge>
                    <h3 className="line-clamp-3 text-2xl font-extrabold leading-tight tracking-tight text-foreground">
                      {slide.title}
                    </h3>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {slide.short_description || slide.description}
                    </p>
                  </div>
                  <div className="mt-5 space-y-3">
                    {slide.created_at ? (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-[11px] text-muted-foreground">
                          {formatDateTimeInIST(slide.created_at)}
                        </span>
                      </div>
                    ) : null}
                    <Link
                      href={getSlideHref(slide.type)}
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${getSlideTypeConfig(slide.type).ctaClass}`}
                    >
                      Navigate
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isMultiple && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border/40 px-5 py-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? `w-5 ${config.dotActive}`
                  : `w-2 ${config.dotInactive}`
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
