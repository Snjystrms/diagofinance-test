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
  type: "news" | "promotion";
  viewAllHref: string;
}

const TYPE_CONFIG = {
  news: {
    icon: Newspaper,
    label: "News",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    gradient: "from-blue-500/15 via-sky-500/5 to-transparent",
    border: "border-blue-500/25 hover:border-blue-500/50",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    dotActive: "bg-blue-500",
    dotInactive: "bg-blue-500/25",
  },
  promotion: {
    icon: Megaphone,
    label: "Promotion",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    gradient: "from-purple-500/15 via-violet-500/5 to-transparent",
    border: "border-purple-500/25 hover:border-purple-500/50",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-600 dark:text-purple-400",
    dotActive: "bg-purple-500",
    dotInactive: "bg-purple-500/25",
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

  const item = items[current];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 bg-gradient-to-br ${config.gradient} ${config.border} transition-all duration-300 group`}
      onMouseEnter={() => { if (timerRef.current) clearInterval(timerRef.current); }}
      onMouseLeave={startAutoplay}
    >
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-current/10 to-transparent rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${config.iconBg}`}>
            <Icon className={`h-4 w-4 ${config.iconColor}`} />
          </div>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${config.iconColor}`}>
              {config.label}
            </p>
            {isMultiple && (
              <p className="text-[10px] text-muted-foreground">
                {current + 1} / {items.length}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMultiple && (
            <div className="flex items-center gap-1.5 mr-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? `w-4 ${config.dotActive}`
                      : `w-1.5 ${config.dotInactive}`
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Slide container */}
      <div className="relative z-10 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {items.map((slide) => (
            <div key={slide.id} className="w-full flex-shrink-0">
              <div className="flex gap-4 px-5 pb-5">
                {/* Image */}
                <div className="relative h-24 w-36 flex-shrink-0 overflow-hidden rounded-2xl border bg-muted">
                  {slide.image_url ? (
                    <Image
                      src={slide.image_url}
                      alt={slide.title}
                      fill
                      className="object-cover"
                      sizes="144px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div className="space-y-1.5">
                    <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${config.badgeClass}`}>
                      {config.label}
                    </Badge>
                    <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground">
                      {slide.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {slide.short_description || slide.description}
                    </p>
                  </div>
                  {slide.created_at && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <CalendarDays className="h-3 w-3 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTimeInIST(slide.created_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next arrows */}
      {isMultiple && (
        <>
          <button
            onClick={() => { go(current - 1); startAutoplay(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm hover:bg-background transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Previous"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { go(current + 1); startAutoplay(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-background/80 border border-border/50 shadow-sm hover:bg-background transition-all duration-200 opacity-0 group-hover:opacity-100"
            aria-label="Next"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
