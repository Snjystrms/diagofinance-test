"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import type { NewsItem } from "@/lib/api-auth-admin";
import { formatDateTimeInIST } from "@/lib/formatters";

interface NewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newsItems: NewsItem[];
}

export function NewsDialog({ open, onOpenChange, newsItems }: NewsDialogProps) {
  const router = useRouter();

  const handleViewAll = () => {
    router.push("/user-news?type=news");
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
        <div className="relative overflow-hidden bg-[#0B1220] px-6 pt-6 pb-5">
          {/* Decorative ticker lines */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFB401] to-transparent opacity-80" />
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {/* Subtle grid lines */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="news-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#news-grid)" />
            </svg>
            {/* Glowing orb */}
            <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#FFB401]/10 blur-2xl" />
          </div>

          <div className="relative flex items-start gap-4">
            {/* Live badge + icon */}
            <div className="flex-shrink-0 mt-0.5">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#FFB401]/15 border border-[#FFB401]/30">
                <Radio className="h-5 w-5 text-[#FFB401]" />
                {/* Live pulse dot */}
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB401] opacity-60" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#FFB401]" />
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#FFB401]">Breaking</span>
                <span className="w-1 h-1 rounded-full bg-[#FFB401]/50" />
                <span className="text-[10px] tracking-widest uppercase text-white/40">Vaspan Capital</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Latest News</h2>
              <p className="text-sm text-white/50 mt-0.5">Stay ahead with real-time updates &amp; announcements.</p>
            </div>
          </div>
        </div>

        {/* ── News Items ── */}
        <div className="bg-background px-4 py-4 space-y-3 max-h-[380px] overflow-y-auto
          [scrollbar-width:thin] [scrollbar-color:#FFB401_transparent]
          [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#FFB401]/40 [&::-webkit-scrollbar-thumb]:rounded-full">
          {newsItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleViewItem(item.id)}
              className="group relative flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5 cursor-pointer
                hover:border-[#FFB401]/40 hover:bg-[#FFB401]/[0.03] transition-all duration-200"
            >
              {/* Issue number */}
              <span className="absolute top-3 right-3.5 text-[10px] font-mono text-muted-foreground/40 select-none">
                #{String(idx + 1).padStart(2, "0")}
              </span>

              {/* Thumbnail or fallback */}
              {item.image_url || item.image ? (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-border/60 relative">
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
                        img.parentElement.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-[#FFB401]/10 text-[#FFB401]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>
                      </div>`;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-[#FFB401]/8 border border-[#FFB401]/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB401" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0 pr-6">
                {/* Category pill (if exists) or default */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FFB401]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FFB401]">
                    {(item as NewsItem & { category?: string }).category || "Update"}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-foreground leading-snug mb-1 line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.short_description || item.description || "Click to read the full story..."}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground/60">
                  <Calendar className="h-2.5 w-2.5" />
                  <span className="font-mono">{formatDateTimeInIST(item.updated_at || item.created_at)}</span>
                </div>
              </div>

              {/* Hover arrow */}
              <ArrowRight className="absolute right-3 bottom-3.5 h-3.5 w-3.5 text-[#FFB401] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200" />
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
            Dismiss
          </Button>
          <Button
            onClick={handleViewAll}
            className="bg-[#FFB401] hover:bg-[#FFB401]/90 text-black font-semibold text-sm gap-2"
          >
            View All News
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}