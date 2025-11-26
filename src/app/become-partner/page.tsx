"use client";

import { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Handshake, LineChart, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { MainLayout } from "@/components/main-layout";
import { BecomePartnerCta } from "@/components/become-partner/ib-request-cta";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

const advantages = [
  "Zero sign-up fees and super simple set-up process",
  "Lucrative and competitive commission payouts",
  "Advanced dashboard and tools for close monitoring",
];

export default function BecomePartnerPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [statusData, setStatusData] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkStatus = useCallback(async () => {
    // Show spinner immediately - prevent any content flash
    setIsCheckingStatus(true);
    setIsInitialized(false);
    
    if (!token) {
      setIsCheckingStatus(false);
      setIsInitialized(true);
      return;
    }

    try {
      const response = await ibRequestsApi.getStatus(token);
      if (response?.data) {
        setStatusData(response.data);
        // Redirect to IB dashboard if approved - check ib_request.status === 1
        const ibRequest = response.data.ib_request;
        if (ibRequest && ibRequest.status === 1) {
          router.push("/ib-dashboard");
          return;
        }
      }
    } catch (error) {
      console.error("Failed to check IB status:", error);
    } finally {
      setIsCheckingStatus(false);
      setIsInitialized(true);
    }
  }, [token, router]);

  // Use useLayoutEffect to run synchronously before paint to prevent flash
  useLayoutEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Show spinner before API call completes - prevent direct page access
  // Always show spinner until check is complete and initialized
  // Render spinner immediately without MainLayout to prevent any flash
  if (isCheckingStatus || !isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-slate-600">Checking partner status...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-slate-50 pb-24">
      <section className="bg-white/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-24 md:px-10 lg:px-16">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
              <span className="size-2 rounded-full bg-indigo-500" /> Become a
              Partner
            </span>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center">
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
                  Become an Introducing Broker & Expand Your Own Business
                </h1>
                <p className="text-lg leading-relaxed text-slate-600">
                  Join forces with us and explore new opportunities to grow. Earn
                  more while giving your clients access to secure, transparent,
                  and innovative trading experiences.
                </p>
                <BecomePartnerCta className="max-w-xl" />
              </div>
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-blue-600 to-sky-500 p-10 text-white shadow-2xl">
                <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-cyan-400/30 blur-2xl" />
                <div className="relative flex flex-col gap-8">
                  <div className="inline-flex max-w-max items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-sm font-semibold backdrop-blur">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Premium Experience
                  </div>
                  <p className="text-xl font-semibold leading-relaxed md:text-2xl">
                    Opportunity to grow and earn more with us through a guided,
                    data-informed programme built for ambitious partners.
                  </p>
                  <div className="grid gap-5 text-sm md:grid-cols-2 md:text-base">
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/70">
                        <LineChart className="h-4 w-4" aria-hidden="true" />
                        Growth Support
                      </h3>
                      <p className="mt-3 text-sm text-white/80">
                        Access resources, mentorship, and live performance
                        coaching to scale your business faster.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/70">
                        <Handshake className="h-4 w-4" aria-hidden="true" />
                        Dedicated Team
                      </h3>
                      <p className="mt-3 text-sm text-white/80">
                        Collaborate with a specialised success team that cares
                        about every referral you bring onboard.
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex w-fit items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur">
                    <span className="flex size-8 items-center justify-center rounded-full bg-white/20 text-lg font-bold">
                      $15
                    </span>
                    Rebate per lot*
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      <section
        id="partner-benefits"
        className="mx-auto mt-16 max-w-6xl space-y-12 rounded-[2.5rem] border border-slate-200 bg-white px-6 py-16 shadow-xl md:px-10 lg:px-16"
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
            Why Partner with Us?
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Become an IB to earn additional income by referring clients to
            exclusive markets
          </h2>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            We bring our partners the ultimate transparency and seamless
            experience. Gain access to the most advanced trading tools, robust
            security, and responsive customer service to build trust with every
            client you introduce.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-br from-white via-indigo-50 to-violet-100 p-10 shadow-[0_40px_80px_-40px_rgba(79,70,229,0.6)]">
            <div className="absolute -right-10 top-6 h-24 w-24 rounded-full bg-indigo-200/60 blur-2xl" />
            <div className="absolute -bottom-12 left-3 h-28 w-28 rounded-full bg-sky-200/50 blur-2xl" />
            <div className="relative flex flex-col items-center gap-6 text-center">
              <div className="rounded-full border border-indigo-100 bg-white/70 p-6">
                <Handshake className="h-16 w-16 text-indigo-500" />
              </div>
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-600">
                Profit
              </div>
              <p className="text-base font-medium text-slate-600">
                Build long-term relationships with trusted partners who value
                your growth as much as their own.
              </p>
              <div className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
                  ✓
                </span>
                $15 rebate per lot*
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-5">
              {advantages.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50/50 p-5 shadow-sm"
                >
                  <span className="mt-1 flex size-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">
                    ✓
                  </span>
                  <p className="text-base leading-relaxed text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <div className="rounded-3xl bg-slate-900 px-6 py-8 text-white">
              <h3 className="text-lg font-semibold">
                Dedicated partner success support
              </h3>
              <p className="mt-3 text-sm text-white/80">
                Our multilingual partner success team provides onboarding,
                training sessions, campaign assets, and real-time analytics to
                keep you ahead in every market you enter.
              </p>
              <a
                href="mailto:partners@crmapp.com"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Talk to Partner Desk
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl rounded-3xl bg-slate-900 px-6 py-12 text-white md:px-10 lg:px-16">
        <div className="grid gap-8 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">
              Ready to grow?
            </p>
            <h2 className="mt-4 text-3xl font-bold">
              Start onboarding clients in less than 24 hours.
            </h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-white/80">
            <p>
              Submit your application with essential business data and our team
              will verify your profile right away.
            </p>
            <p>
              Once approved, access partner dashboards, marketing assets, and
              automated reporting tailored to your performance.
            </p>
          </div>
          <div className="flex items-end lg:justify-end">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Apply Now
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <p className="mx-auto mt-6 max-w-6xl px-6 text-xs text-slate-500 md:px-10 lg:px-16">
        *Rebate values may vary based on active promotions and regional
        regulations. Contact our partner desk for the latest commission
        structure.
      </p>
    </div>
    </MainLayout>
  );
}


