'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-[#080808]">

      {/* ─── LEFT PANEL ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col">

        {/* Subtle geometric grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,184,0,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,184,0,0.6) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top-left corner accent lines */}
        <div className="absolute top-0 left-0 w-24 h-24 opacity-40">
          <div className="absolute top-6 left-6 w-px h-12 bg-[#FFB800]" />
          <div className="absolute top-6 left-6 w-12 h-px bg-[#FFB800]" />
        </div>
        {/* Bottom-right corner accent lines */}
        <div className="absolute bottom-0 right-0 w-24 h-24 opacity-40">
          <div className="absolute bottom-6 right-6 w-px h-12 bg-[#FFB800]" />
          <div className="absolute bottom-6 right-6 w-12 h-px bg-[#FFB800]" />
        </div>

        {/* Centered vertical brand stack */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-10 gap-0">

          {/* Logo + wordmark */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/vinnexia-logo-dark.svg"
              alt="Vinnexia"
              width={72}
              height={72}
              className="object-contain drop-shadow-[0_0_18px_rgba(255,184,0,0.5)]"
              priority
            />
            <span
              className="mt-4 font-cinzel text-2xl font-bold uppercase tracking-[0.25em] text-white"
              style={{ textShadow: '0 0 20px rgba(255,184,0,0.25)' }}
            >
              VINNEXIA
            </span>
            <span className="font-arvo text-xs font-semibold tracking-[0.18em] text-[#FFB800] mt-1.5 uppercase">
              Trade With Confidence
            </span>
          </div>

          {/* Thin gold divider */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#FFB800] to-transparent mb-10 opacity-70" />

          {/* Bull image */}
          <div className="relative w-full flex items-center justify-center">
            {/* Radial glow beneath the bull */}
            <div
              className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[380px] h-[120px] rounded-full opacity-30 blur-2xl"
              style={{ background: 'radial-gradient(ellipse, #FFB800 0%, transparent 70%)' }}
            />
            <Image
              src="/login-bull1.png"
              alt="Vinnexia bull"
              width={460}
              height={340}
              className="relative z-10 object-contain w-full max-w-[460px]
                         drop-shadow-[0_8px_40px_rgba(255,184,0,0.35)]"
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
                  className="text-xl font-bold text-[#FFB800] font-cinzel"
                  style={{ textShadow: '0 0 10px rgba(255,184,0,0.3)' }}
                >
                  {stat.value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-arvo">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <p className="mt-10 text-center text-[11px] text-white/25 tracking-widest uppercase font-arvo max-w-[260px] leading-relaxed">
            Institutional-grade execution &nbsp;·&nbsp; Zero compromise
          </p>
        </div>

        {/* Right edge fade to separate from form side */}
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent to-[#080808]" />
      </div>

      {/* ─── RIGHT PANEL (form) ─── */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#080808]">
        <div className="max-w-md w-full space-y-8">

          {/* Mobile-only logo */}
          <div className="flex flex-col items-center lg:hidden">
            <Image
              src="/vinnexia-logo-dark.svg"
              alt="Vinnexia"
              width={52}
              height={52}
              className="object-contain"
              priority
            />
            <span className="font-cinzel text-base font-bold uppercase tracking-[0.2em] text-white mt-2">
              VINNEXIA
            </span>
            <span className="font-arvo text-[10px] font-semibold tracking-wide text-[#FFB800] mt-0.5">
              Trade With Confidence
            </span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}