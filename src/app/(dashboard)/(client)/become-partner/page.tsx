"use client";

import { useState, useCallback, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Handshake,
  LineChart,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { BecomePartnerCta } from "@/components/become-partner/ib-request-cta";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";

const stats = [
  { label: "Rebate per lot*", value: "Up to $12", icon: LineChart },
  { label: "Typical onboarding", value: "24 hours", icon: ShieldCheck },
  { label: "To join or stay", value: "No fees", icon: Users },
];

const steps = [
  {
    title: "Apply in one step",
    body: "Send your profile to our IB desk. No fees, no paperwork upfront.",
  },
  {
    title: "We verify within a business day",
    body: "Compliance reviews your details and emails you the decision.",
  },
  {
    title: "Start earning",
    body: "Get your dashboard, referral links and marketing assets, then onboard clients.",
  },
];

const benefits = [
  {
    title: "Rebates that scale",
    body: "Up to $12 per lot, rising as your client base grows. Automated monthly payouts.",
  },
  {
    title: "Real-time transparency",
    body: "Track commissions, client activity and performance live in your IB dashboard.",
  },
  {
    title: "A team behind you",
    body: "Multilingual onboarding, training sessions and campaign assets from a dedicated success desk.",
  },
  {
    title: "Trust you can pass on",
    body: "Secure, regulated infrastructure and advanced trading tools your clients can rely on.",
  },
];

// Header noise texture (shared with dashboard create-account card)
const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='1.4' intercept='0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function BecomePartnerPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    setIsInitialized(false);

    if (user?.is_ib_user) {
      router.push("/ib-dashboard");
      return;
    }

    if (!token) {
      setIsCheckingStatus(false);
      setIsInitialized(true);
      return;
    }

    try {
      const response = await ibRequestsApi.getStatus(token);
      if (response?.data) {
        const ibRequest = response.data.ib_request;
        if (ibRequest && ibRequest.status === 1) {
          router.push("/ib-dashboard");
          return;
        }
      }
    } catch (error) {
      console.error("Failed to check partner status:", error);
    } finally {
      setIsCheckingStatus(false);
      setIsInitialized(true);
    }
  }, [token, router, user?.is_ib_user]);

  useLayoutEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (isCheckingStatus || !isInitialized) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-[#c8085a]" />
          <p className="text-sm font-medium text-muted-foreground">
            Checking IB status…
          </p>
        </div>
      </div>
    );
  }

  const scrollToForm = () => {
    document
      .getElementById("become-partner-form")
      ?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => {
      document.getElementById("partner-notes")?.focus();
    }, 350);
  };

  const scrollToHow = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-full bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* ── HERO (same UI in light & dark) ───────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[28px] border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {/* red radial glow + black base */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(130% 130% at 8% -15%, #ff4a1f 0%, #e8330f 11%, #8a1608 28%, #2b0803 46%, transparent 64%), #050505",
            }}
          />
          {/* grain */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: NOISE_TEXTURE,
              backgroundSize: "180px 180px",
              mixBlendMode: "screen",
              opacity: 0.22,
            }}
          />
          {/* inner highlight */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
          />

          {/* header artwork (top-right) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/become_ib_header.svg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 top-1/2 hidden w-[260px] max-w-[42%] -translate-y-1/2 select-none md:block lg:w-[320px]"
          />

          <div className="relative z-10 px-6 py-6 md:px-10 md:py-8">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#c8085a] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm">
                <Handshake className="h-3.5 w-3.5" />
                IB Programme
              </span>

              <h1 className="mt-4 text-2xl font-bold leading-[1.1] tracking-tight text-white md:text-[2rem]">
                Introducing Broker.
                <br />
                Earn on every lot your team trade.
              </h1>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
                Join our IB programme and grow your business
                while giving clients access to secure, transparent trading.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-2 rounded-full bg-[#c8085a] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c8085a]/25 transition hover:bg-[#b00650] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8085a]/30"
                >
                  Apply it&apos;s free
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={scrollToHow}
                  className="text-sm font-medium text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                >
                  See how it works
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── STAT CARDS ───────────────────────────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-5 shadow-sm"
            >
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {label}
                </p>
                <p className="text-xl font-bold text-foreground">{value}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c8085a]/10 text-[#c8085a]">
                <Icon className="h-5 w-5" />
              </span>
            </div>
          ))}
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          className="scroll-mt-6 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm md:px-8"
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <ol className="mt-6">
            {steps.map(({ title, body }, i) => (
              <li key={title} className="relative flex gap-4 pb-7 last:pb-0">
                {i < steps.length - 1 ? (
                  <span className="absolute left-[13px] top-8 h-full w-px bg-border" />
                ) : null}
                <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#c8085a] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── WHAT YOU GET ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border bg-card px-6 py-8 shadow-sm md:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            What you get
          </h2>
          <div className="mt-6 grid gap-x-12 gap-y-7 sm:grid-cols-2">
            {benefits.map(({ title, body }) => (
              <div key={title} className="space-y-1.5">
                <p className="flex items-center gap-2 font-semibold text-foreground">
                  <Check className="h-4 w-4 text-[#c8085a]" strokeWidth={3} />
                  {title}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── BECOME A PARTNER (form / status) ─────────────────────────────── */}
        <section
          id="become-partner-form"
          className="scroll-mt-6 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm md:px-10 md:py-10"
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Become an IB
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            One step. We review your profile within one business day and email
            you the outcome.
          </p>

          <BecomePartnerCta className="mt-6" />
        </section>

        {/* disclaimer */}
        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          *Rebate values vary with active promotions and regional regulations.
          Contact our IB desk for the current commission structure.
        </p>
      </div>
    </div>
  );
}
