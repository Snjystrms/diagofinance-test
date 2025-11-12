"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BecomePartnerCtaProps {
  className?: string;
}

export function BecomePartnerCta({ className }: BecomePartnerCtaProps) {
  const { token } = useAuth();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [existingRequest, setExistingRequest] = useState<Record<string, any> | null>(null);
  const hasSubmitted = Boolean(existingRequest);

  const refreshOverview = useCallback(async () => {
    if (!token) {
      setExistingRequest(null);
      return;
    }

    setIsCheckingStatus(true);
    try {
      const response = await ibRequestsApi.overview(token);
      const payload = response?.data;
      if (Array.isArray(payload)) {
        setExistingRequest(payload[0] ?? null);
      } else if (payload && typeof payload === "object") {
        setExistingRequest(payload);
      } else {
        setExistingRequest(null);
      }
    } catch (error) {
      console.error("Failed to load IB request overview:", error);
      setExistingRequest(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("You need to be signed in to submit a partner request.");
      return;
    }

    try {
      setIsSubmitting(true);
      await ibRequestsApi.create(
        notes.trim() ? { notes: notes.trim() } : {},
        token
      );
      toast.success("Your IB request has been sent. Our team will contact you shortly.");
      setNotes("");
      await refreshOverview();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn’t submit your request. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submittedDetails = useMemo(() => {
    if (!existingRequest) return null;

    const status =
      existingRequest.status ||
      existingRequest.request_status ||
      existingRequest.current_status ||
      "pending";

    const timestamp =
      existingRequest.created_at ||
      existingRequest.createdAt ||
      existingRequest.submitted_at ||
      existingRequest.requested_at;

    let createdLabel: string | null = null;
    if (timestamp) {
      const date = new Date(timestamp);
      if (!Number.isNaN(date.getTime())) {
        createdLabel = date.toLocaleString();
      }
    }

    return {
      status: String(status),
      notes: existingRequest.notes || existingRequest.comment || null,
      createdLabel,
    };
  }, [existingRequest]);

  if (isCheckingStatus) {
    return (
      <div className={cn("flex items-center gap-3 rounded-3xl border border-indigo-100 bg-white/80 px-6 py-6 text-sm text-slate-600 shadow-sm", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" />
        Checking your partner request status...
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {hasSubmitted && submittedDetails ? (
        <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50/80 px-6 py-6 text-sm text-emerald-700 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-emerald-700">
                IB request already submitted
              </p>
              <p>
                Status: <span className="font-medium text-emerald-800 capitalize">{submittedDetails.status}</span>
                {submittedDetails.createdLabel
                  ? ` • Submitted on ${submittedDetails.createdLabel}`
                  : null}
              </p>
              {submittedDetails.notes ? (
                <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-700">
                  <span className="font-medium">Your notes:</span> {submittedDetails.notes}
                </p>
              ) : null}
              <p>
                Our partner desk will follow up via email. If you need to amend your request,
                reach out to partners@crmapp.com with your details.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#partner-benefits"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Review Benefits
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label
              htmlFor="ib-notes"
              className="text-sm font-medium text-slate-700"
            >
              Optional notes for our partner desk
            </label>
            <textarea
              id="ib-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Share any additional information that will help us prepare your onboarding."
              className="min-h-24 w-full resize-y rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending...
                </>
              ) : (
                <>
                  Become a Partner
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            <Link
              href="#partner-benefits"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Explore Benefits
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Submitting sends an Introducing Broker request to our compliance team.
            We typically respond within one business day.
          </p>
        </>
      )}
    </div>
  );
}

