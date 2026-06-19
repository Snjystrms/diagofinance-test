"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { NewsItem } from "@/lib/api-auth-admin";
import { formatDateTimeInIST } from "@/lib/formatters";

interface PromotionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotions: NewsItem[];
}

// Static confetti pieces — deterministic so no hydration mismatch
const CONFETTI = [
  { x: 8, y: 18, r: 0, w: 10, h: 4, color: "#FFB401", delay: 0 },
  { x: 20, y: 8, r: 45, w: 7, h: 7, color: "#a855f7", delay: 0.2 },
  { x: 35, y: 22, r: 20, w: 5, h: 12, color: "#ec4899", delay: 0.5 },
  { x: 50, y: 5, r: 60, w: 8, h: 3, color: "#22d3ee", delay: 0.1 },
  { x: 65, y: 15, r: 30, w: 6, h: 6, color: "#FFB401", delay: 0.35 },
  { x: 78, y: 20, r: 75, w: 10, h: 4, color: "#a855f7", delay: 0.6 },
  { x: 88, y: 7, r: 15, w: 5, h: 9, color: "#ec4899", delay: 0.25 },
  { x: 92, y: 28, r: 50, w: 7, h: 4, color: "#22d3ee", delay: 0.45 },
  { x: 14, y: 35, r: 80, w: 4, h: 10, color: "#a855f7", delay: 0.7 },
  { x: 56, y: 30, r: 10, w: 9, h: 3, color: "#FFB401", delay: 0.15 },
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
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0533] via-[#2d0a5a] to-[#1a0533] px-6 pt-6 pb-6">
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
                opacity="0.55"
                transform={`rotate(${c.r}, ${c.x}, ${c.y})`}
                style={{
                  animation: `confetti-fall 3s ${c.delay}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </svg>

          {/* Glow orbs */}
          <div className="absolute -left-8 top-0 w-40 h-40 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
          <div className="absolute right-4 -top-6 w-32 h-32 rounded-full bg-[#FFB401]/15 blur-2xl pointer-events-none" />
          <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-pink-500/10 blur-2xl pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Icon with sparkle ring */}
            <div className="flex-shrink-0 mt-0.5 relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB401] to-[#f97316] flex items-center justify-center shadow-lg shadow-[#FFB401]/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              {/* Sparkle dots */}
              <span className="absolute -top-1 -right-1 text-[#FFB401] text-xs animate-spin" style={{ animationDuration: "4s" }}>✦</span>
              <span className="absolute -bottom-1 -left-1 text-pink-400 text-[8px] animate-pulse">✦</span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#FFB401]/20 text-[#FFB401] border border-[#FFB401]/30">
                  <Sparkles className="h-2.5 w-2.5" />
                  Limited Time
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Special Promotions</h2>
              <p className="text-sm text-white/50 mt-0.5">Exclusive offers just for you — don&apos;t miss out!</p>
            </div>
          </div>

          {/* Bottom shimmer bar */}
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/50 via-50% to-transparent" />
        </div>

        {/* ── Promotion Items ── */}
        <div className="bg-background px-4 py-4 space-y-3 max-h-[380px] overflow-y-auto
          [scrollbar-width:thin] [scrollbar-color:#a855f7_transparent]
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-500/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {promotions.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleViewItem(item.id)}
              className="group relative flex items-start gap-3 rounded-xl cursor-pointer overflow-hidden
                border border-purple-500/20 bg-card
                hover:border-purple-400/50 transition-all duration-200"
            >
              {/* Gradient side accent bar */}
              <div className="absolute left-0 inset-y-0 w-[3px] bg-gradient-to-b from-[#FFB401] via-purple-500 to-pink-500 opacity-70 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start gap-3 p-3.5 pl-5 w-full">
                {/* Thumbnail or fallback */}
                {item.image_url || item.image ? (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-purple-500/20 relative">
                    <Image
                      src={item.image_url || item.image || ""}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="64px"
                      unoptimized
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        if (img.parentElement) {
                          img.parentElement.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-purple-500/10 text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/></svg>
                        </div>`;
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-[#FFB401]/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
                      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                  </div>
                )}

                <div className="flex-1 min-w-0 pr-6">
                  {/* Hot badge + offer index */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#FFB401]/20 to-purple-500/20 text-[#FFB401] border border-[#FFB401]/20">
                      🎁 Offer {String(idx + 1).padStart(2, "0")}
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
                <ArrowRight className="absolute right-3.5 bottom-3.5 h-3.5 w-3.5 text-purple-400 opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-4 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleViewAll}
            className="bg-gradient-to-r from-purple-600 to-[#FFB401] hover:from-purple-500 hover:to-[#FFB401]/90 text-white font-semibold text-sm gap-2 shadow-lg shadow-purple-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            All Promotions
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>

        {/* Confetti keyframe (scoped inline) */}
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(0px) rotate(var(--r, 0deg)); opacity: 0.55; }
            100% { transform: translateY(6px) rotate(calc(var(--r, 0deg) + 20deg)); opacity: 0.3; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}