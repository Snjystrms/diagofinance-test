"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useClientCustomization } from "@/contexts/client-customization-context";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { themeMode } = useClientCustomization();
  const isDark = themeMode === "dark";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background grid grid-cols-1 lg:grid-cols-2">
      {/* ─── LEFT: form panel ─── */}
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-10">
        {/* Logo (full lockup: mark + wordmark + tagline) */}
        <div className="flex items-center">
          <Image
            src="/diagofinancelogo.svg"
            alt="Diago Finance"
            width={220}
            height={56}
            className="h-auto w-[190px] object-contain"
            priority
          />
        </div>

        {/* Form content, vertically centered */}
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse items-center gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2025. Diago Finance Ltd. All Rights Reserved.</span>
          <Link href="/privacy-policy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* ─── RIGHT: background + dashboard preview (Figma: 1440×1024 frame) ─── */}
      {/*
        Login_background.svg -> width 710, height 1024, left 730  => fills this panel exactly
        client_dashboard.svg -> width 933, height 606.97, top 199, left 842
          relative to panel (panel left = 730, width = 710, frame height = 1024):
          left  = (842-730)/710  = 15.8%
          top   = 199/1024       = 19.4%
          width = 933/710        = 131.4%  (intentionally bleeds off the right edge)
      */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="/Login_background.svg"
          alt=""
          fill
          className="object-cover"
          priority
          style={{
            filter: isDark ? "brightness(0.7) contrast(1.2)" : "brightness(1) contrast(1)",
          }}
        />

        <div
          className="absolute"
          style={{
            top: "13.4%",
            left: "17%",
            width: "102.4%",
            aspectRatio: "933 / 606.9732666015625",
          }}
        >
          <Image
            src="/client_dashboard.svg"
            alt="Diago Finance CRM Dashboard Preview"
            fill
            className="object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            priority
          />
        </div>
      </div>
    </div>
  );
}