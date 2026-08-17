"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Sparkles, Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import type { NewsItem } from "@/lib/api-auth-admin";
import { formatDateTimeInIST } from "@/lib/formatters";

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotions: NewsItem[];
}

const CONFETTI = [
  { x: 8,  y: 18, r: 0,  w: 10, h: 4,  color: "hsl(var(--primary))", delay: 0 },
  { x: 20, y: 8,  r: 45, w: 7,  h: 7,  color: "hsl(var(--primary) / 0.7)", delay: 0.2 },
  { x: 35, y: 22, r: 20, w: 5,  h: 12, color: "hsl(var(--foreground) / 0.6)", delay: 0.5 },
  { x: 50, y: 5,  r: 60, w: 8,  h: 3,  color: "hsl(var(--primary))", delay: 0.1 },
  { x: 65, y: 15, r: 30, w: 6,  h: 6,  color: "hsl(var(--primary) / 0.7)", delay: 0.35 },
  { x: 78, y: 20, r: 75, w: 10, h: 4,  color: "hsl(var(--primary))", delay: 0.6 },
  { x: 88, y: 7,  r: 15, w: 5,  h: 9,  color: "hsl(var(--foreground) / 0.6)", delay: 0.25 },
  { x: 92, y: 28, r: 50, w: 7,  h: 4,  color: "hsl(var(--primary) / 0.7)", delay: 0.45 },
  { x: 14, y: 35, r: 80, w: 4,  h: 10, color: "hsl(var(--primary))", delay: 0.7 },
  { x: 56, y: 30, r: 10, w: 9,  h: 3,  color: "hsl(var(--primary) / 0.7)", delay: 0.15 },
];

export function PromotionDialog({ open, onOpenChange, promotions }: PromotionDialogProps) {
  const router = useRouter();

  const handleViewAll = () => {
    router.push("/user-news?type=promotion");
    onOpenChange(false);
  };

  const handleViewItem = (id: number | string) => {
    router.push(`/user-news?id=${id}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl gap-0">

        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background px-6 pt-6 pb-6">
          {/* Confetti SVG layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 50"
            preserveAspectRatio="none"
          >
            {CONFETTI.map((c, i) => (
              <rect
                key={i}
                x={c.x}
                y={c.y}
                width={c.w * 0.08}
                height={c.h * 0.08}
                rx="0.5"
                fill={c.color}
                opacity="0.45"
                transform={`rotate(${c.r}, ${c.x}, ${c.y})`}
                style={{
                  animation: `confetti-fall 3s ${c.delay}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </svg>

          {/* Glow orbs */}
          <div className="absolute -left-8 top-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute right-4 -top-6 w-32 h-32 rounded-full bg-primary/7 blur-2xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 text-primary text-xs animate-spin" style={{ animationDuration: "4s" }}>✦</span>
              <span className="absolute -bottom-1 -left-1 text-primary/70 text-[8px] animate-pulse">✦</span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/15 text-primary border border-primary/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  Limited Time
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">Special Promotions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Exclusive offers just for you don&apos;t miss out!</p>
            </div>
          </div>

          {/* Bottom shimmer bar */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 via-50% to-transparent" />
        </div>

        {/* ── Promotion Items ── */}
        <div className="bg-background px-4 py-4 space-y-3 max-h-[380px] overflow-y-auto">
          {promotions.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleViewItem(item.id)}
              className="group relative flex items-start gap-3 rounded-xl cursor-pointer overflow-hidden
                border border-border bg-muted
                hover:border-primary/50 transition-all duration-200"
            >
              {/* Gradient side accent bar */}
              <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-primary via-primary/70 to-primary opacity-60 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start gap-3 p-3.5 pl-5 w-full">
                {/* Thumbnail or fallback */}
                {item.image_url || item.image ? (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border relative">
                    <Image
                      src={item.image_url || item.image || ""}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="64px"
                      unoptimized
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        if (img.parentElement) {
                          img.parentElement.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-primary/10 text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>
                          </div>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-border bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary opacity-70">
                      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                      <Gift className="h-2.5 w-2.5" /> Offer {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.short_description || item.description || "Tap to explore this exclusive offer..."}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/60">
                    <Calendar className="h-2.5 w-2.5" />
                    <span className="font-mono">{formatDateTimeInIST(item.updated_at || item.created_at)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="absolute right-3.5 bottom-3.5 h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-4 py-3 border-t border-border bg-muted/50 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleViewAll}
            className="bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-sm gap-2 shadow-lg shadow-primary/20 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            All Promotions
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>

        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(0px) rotate(var(--r, 0deg)); opacity: 0.45; }
            100% { transform: translateY(6px) rotate(calc(var(--r, 0deg) + 20deg)); opacity: 0.2; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}