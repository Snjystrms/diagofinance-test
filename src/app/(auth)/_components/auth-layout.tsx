'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useClientCustomization } from '@/contexts/client-customization-context';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { themeMode } = useClientCustomization();
  const logoSrc = themeMode === 'bright' ? '/vinnexia-logo.svg' : '/vinnexia-logo-dark.svg';

  return (
    <div className="min-h-screen flex bg-background">

      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col">

        {/* Subtle geometric grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(color-mix(in srgb, var(--color-primary) 60%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 60%, transparent) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top-left corner accent lines */}
        <div className="absolute top-0 left-0 w-24 h-24 opacity-40">
          <div className="absolute top-6 left-6 w-px h-12 bg-primary" />
          <div className="absolute top-6 left-6 w-12 h-px bg-primary" />
        </div>
        {/* Bottom-right corner accent lines */}
        <div className="absolute bottom-0 right-0 w-24 h-24 opacity-40">
          <div className="absolute bottom-6 right-6 w-px h-12 bg-primary" />
          <div className="absolute bottom-6 right-6 w-12 h-px bg-primary" />
        </div>

        {/* Centered vertical brand stack */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 gap-0">

          {/* Logo + wordmark */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src={logoSrc}
              alt="Vinnexia"
              width={72}
              height={72}
              className="object-contain drop-shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary)_50%,transparent)]"
              priority
            />
            <span
              className="truncate font-cinzel text-[21px] font-bold uppercase tracking-[0.2em] text-transparent [-webkit-text-stroke:0.5px_var(--color-foreground)] [text-shadow:0_0_4px_color-mix(in_srgb,var(--color-foreground)_25%,transparent)]"
              style={{ textShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 25%, transparent)' }}
            >
              VINNEXIA CAPITAL
            </span>
            <span className="font-arvo text-xs font-semibold tracking-[0.18em] text-primary mt-1.5 uppercase">
              Trade With Confidence
            </span>
          </div>

          {/* Thin gold divider */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-primary to-transparent mb-10 opacity-70" />

          {/* Bull image */}
          <div className="relative w-full flex items-center justify-center">
            {/* Radial glow beneath the bull */}
            <div
              className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[380px] h-[120px] rounded-full opacity-30 blur-2xl"
              style={{ background: 'radial-gradient(ellipse, var(--color-primary) 0%, transparent 70%)' }}
            />
            <Image
              src="/login-bull1.png"
              alt="Vinnexia bull"
              width={460}
              height={340}
              className="relative z-10 object-contain w-full max-w-[460px]
                         drop-shadow-[0_8px_40px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]"
              priority
            />
          </div>

          {/* Stats row */}
          <div className="mt-10 flex items-center gap-8">
            {[
              { value: '150+', label: 'Markets' },
              { value: '50K+', label: 'Traders' },
              { value: '24/7', label: 'Support' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className="text-xl font-bold text-primary font-cinzel"
                  style={{ textShadow: '0 0 10px color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
                >
                  {stat.value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-arvo">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <p className="mt-10 text-center text-[11px] text-muted-foreground/60 tracking-widest uppercase font-arvo max-w-[260px] leading-relaxed">
            Institutional-grade execution &nbsp;·&nbsp; Zero compromise
          </p>
        </div>

        {/* Right edge fade to separate from form side */}
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-background" />
      </div>

      {/* ─── RIGHT PANEL (form) ─── */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-md w-full space-y-8">

          {/* Mobile-only logo */}
          <div className="flex flex-col items-center lg:hidden">
            <Image
              src={logoSrc}
              alt="Vinnexia"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
            <span className="font-cinzel text-base font-bold uppercase tracking-[0.2em] text-foreground mt-2">
              VINNEXIA
            </span>
            <span className="font-arvo text-[10px] font-semibold tracking-wide text-primary mt-0.5">
              Trade With Confidence
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}