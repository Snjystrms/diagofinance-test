"use client";

import { useState, useCallback, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Handshake,
  LineChart,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
  BadgeCheck,
  CircleDollarSign,
} from "lucide-react";
import { BecomePartnerCta } from "@/components/become-partner/ib-request-cta";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";

const advantages = [
  {
    title: "Zero sign-up fees",
    description: "Super simple set-up process with no upfront costs.",
    icon: BadgeCheck,
  },
  {
    title: "Lucrative commission payouts",
    description: "Competitive rebates that grow as your client base grows.",
    icon: CircleDollarSign,
  },
  {
    title: "Advanced dashboard & tools",
    description: "Real-time analytics and monitoring to stay ahead.",
    icon: TrendingUp,
  },
];

const stats = [
  { value: "$15", label: "Rebate per lot*", icon: CircleDollarSign },
  { value: "24h", label: "Onboarding time", icon: Zap },
  { value: "100%", label: "Transparent reporting", icon: ShieldCheck },
];

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
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Checking partner status…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
          {/* subtle radial glow behind content */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_60%_-10%,hsl(var(--primary)/0.08),transparent)]" />

          <div className="relative flex flex-col gap-10 px-6 py-10 md:px-8 lg:px-10">
            {/* eyebrow */}
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Partner Programme
            </span>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
              {/* left — copy */}
              <div className="space-y-7">
                <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                  Become a Partner&nbsp;&amp;&nbsp;Expand Your Own Business
                </h1>
                <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Join forces with us and unlock new opportunities to grow. Earn
                  more while giving your clients access to secure, transparent,
                  and innovative trading experiences.
                </p>

                {/* stat strip */}
                <div className="flex flex-wrap gap-3">
                  {stats.map(({ value, label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm shadow-sm"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-bold text-foreground">{value}</span>
                      <span className="text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>

                <BecomePartnerCta className="max-w-xl" />
              </div>

              {/* right — feature card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-8 text-primary-foreground shadow-2xl lg:p-10">
                {/* decorative blobs */}
                <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-primary-foreground/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-accent/30 blur-2xl" />

                <div className="relative flex flex-col gap-7">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary-foreground/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Premium Partner Experience
                  </div>

                  <p className="text-xl font-semibold leading-relaxed md:text-2xl">
                    A guided, data-informed programme built for ambitious
                    partners who want to scale with confidence.
                  </p>

                  <div className="grid gap-4 text-sm md:grid-cols-2">
                    {[
                      {
                        icon: LineChart,
                        title: "Growth Support",
                        body: "Resources, mentorship, and live performance coaching to scale faster.",
                      },
                      {
                        icon: Handshake,
                        title: "Dedicated Team",
                        body: "A specialised success team that cares about every client you bring aboard.",
                      },
                    ].map(({ icon: Icon, title, body }) => (
                      <div
                        key={title}
                        className="rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur transition-colors hover:bg-primary-foreground/15"
                      >
                        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                          <Icon className="h-3.5 w-3.5" />
                          {title}
                        </h3>
                        <p className="mt-2.5 text-sm leading-relaxed text-primary-foreground/80">
                          {body}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="inline-flex w-fit items-center gap-3 rounded-full bg-primary-foreground/15 px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-foreground/20 text-base font-extrabold">
                      $15
                    </span>
                    Rebate per lot*
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY PARTNER ──────────────────────────────────────────────────── */}
        <section
          id="partner-benefits"
          className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-10 shadow-sm md:px-8 lg:px-10"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative space-y-12">
            {/* section header */}
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Why Partner with Us?
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Earn additional income by referring clients to exclusive markets
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                We bring our partners the ultimate transparency and seamless
                experience — advanced trading tools, robust security, and
                responsive support to build trust with every client you
                introduce.
              </p>
            </div>

            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              {/* left — visual card */}
              <div className="sticky top-6">
                <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-card via-primary/5 to-accent/10 p-10 shadow-[0_32px_64px_-24px_hsl(var(--primary)/0.25)]">
                  <div className="pointer-events-none absolute -right-10 top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-12 left-3 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />

                  <div className="relative flex flex-col items-center gap-6 text-center">
                    <div className="rounded-2xl border border-primary/15 bg-primary/5 p-5">
                      <Handshake className="h-14 w-14 text-primary" />
                    </div>

                    <div>
                      <p className="text-3xl font-extrabold tracking-tight text-foreground">
                        $15
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        rebate per lot*
                      </p>
                    </div>

                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Build long-term client relationships backed by a partner
                      programme that scales with your ambitions.
                    </p>

                    <div className="flex w-full flex-col gap-2">
                      {[
                        "Real-time commission tracking",
                        "Multi-level partner support",
                        "Automated monthly payouts",
                      ].map((point) => (
                        <div
                          key={point}
                          className="flex items-center gap-2.5 rounded-xl bg-muted/70 px-3.5 py-2.5 text-left text-sm text-foreground"
                        >
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            ✓
                          </span>
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* right — advantages + support */}
              <div className="space-y-4">
                {advantages.map(({ title, description, icon: Icon }, i) => (
                  <div
                    key={title}
                    className="group flex items-start gap-4 rounded-2xl border border-border bg-muted/40 p-5 shadow-sm transition-colors hover:border-primary/25 hover:bg-muted/60"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}

                {/* support callout */}
                <div className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-6 py-7">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Dedicated partner success support
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Our multilingual team provides onboarding, training
                        sessions, campaign assets, and real-time analytics to
                        keep you ahead in every market you enter.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-muted px-6 py-10 md:px-8 lg:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-0 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />

          <div className="relative grid gap-8 lg:grid-cols-3 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                Ready to grow?
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-foreground">
                Start onboarding clients in less than 24 hours.
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Submit your application with essential business data and our
                team will verify your profile right away.
              </p>
              <p>
                Once approved, access partner dashboards, marketing assets, and
                automated reporting tailored to your performance.
              </p>
            </div>
            <div className="flex items-center lg:justify-end">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5 text-sm font-medium text-primary">
                <ArrowRight className="h-4 w-4" />
                Apply now — it&apos;s free
              </div>
            </div>
          </div>
        </section>

        {/* disclaimer */}
        <p className="px-1 text-xs text-muted-foreground">
          *Rebate values may vary based on active promotions and regional
          regulations. Contact our partner desk for the latest commission
          structure.
        </p>
      </div>
    </div>
  );
}