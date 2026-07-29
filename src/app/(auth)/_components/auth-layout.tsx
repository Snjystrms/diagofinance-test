"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { TrendingUp, ShieldCheck, UserCircle2 } from "lucide-react";
import { useClientCustomization } from "@/contexts/client-customization-context";

interface AuthLayoutProps {
  children: ReactNode;
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Real-time insights",
    desc: "Track your growth every day",
  },
  {
    icon: ShieldCheck,
    title: "Bank-grade security",
    desc: "Your data, always protected",
  },
];

export function AuthLayout({ children }: AuthLayoutProps) {
  const { themeMode } = useClientCustomization();
  const logoSrc = themeMode === "bright" ? "/diagologo.svg" : "/diagologo.svg";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      {/* ─── Ambient background ─── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Fine dotted grid, denser toward the right */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.12]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dotGrid" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="var(--color-primary)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotGrid)" />
        </svg>

        <div
          className="absolute -top-40 -right-32 h-[520px] w-[520px] rounded-full opacity-30 blur-[130px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full opacity-20 blur-[110px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ─── Card container ─── */}
      <div
        className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-primary/20 bg-card lg:grid-cols-[46%_54%]"
        style={{
          boxShadow:
            "0 0 0 1px color-mix(in srgb, var(--color-primary) 8%, transparent), 0 32px 80px rgba(0,0,0,0.55)",
        }}
      >
        {/* ─── LEFT: brand panel ─── */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-primary/10 px-10 py-12 lg:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 55%)",
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Image
                  src={logoSrc}
                  alt="Diago Finance"
                  width={36}
                  height={36}
                  className="object-contain"
                  priority
                />
                <span className="font-cinzel text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                  Diago Finance
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <UserCircle2 className="h-3.5 w-3.5" />
                Member portal
              </span>
            </div>

            <h2 className="mt-10 font-cinzel text-4xl font-extrabold leading-tight text-foreground">
              Welcome <span className="text-primary">back</span>
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sign in to pick up right where you left off with Diago Finance.
            </p>

            <div className="mt-8 space-y-4">
              {FEATURES.map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-center pt-10">
            <div
              className="absolute h-[110px] w-[260px] rounded-full opacity-30 blur-2xl"
              style={{
                background:
                  "radial-gradient(ellipse, var(--color-primary) 0%, transparent 70%)",
              }}
            />
            <Image
              src="/loginpageimage.svg"
              alt="Diago Finance"
              width={222}
              height={155}
              className="relative z-10 object-contain drop-shadow-[0_8px_30px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
              style={{ width: 222, height: 155, transform: "rotate(0deg)", opacity: 1 }}
              priority
            />
          </div>
        </div>

        {/* ─── RIGHT: form panel ─── */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-12">
          {/* Mobile-only logo */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <Image
              src={logoSrc}
              alt="Diago Finance"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
            <span className="mt-2 font-cinzel text-base font-bold uppercase tracking-[0.18em] text-foreground">
              Diago Finance
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}