"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi, type IbRequestStatusResponse } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BecomePartnerCtaProps {
  className?: string;
  submitTriggerRef?: { current: (() => void) | null };
}

export function BecomePartnerCta({ className, submitTriggerRef }: BecomePartnerCtaProps) {
  const { token } = useAuth();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusData, setStatusData] = useState<IbRequestStatusResponse | null>(null);
  const hasSubmitted = Boolean(statusData?.ib_request);

  const refreshStatus = useCallback(async () => {
    if (!token) {
      setStatusData(null);
      return;
    }

    setIsCheckingStatus(true);
    try {
      const response = await ibRequestsApi.getStatus(token);
      const data = response?.data;
      
      if (data) {
        setStatusData(data);
      } else {
        setStatusData(null);
      }
    } catch (error) {
      setStatusData(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleSubmit = useCallback(async () => {
    if (!token) {
      toast.error("You need to be signed in to submit an IB request.");
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
      await refreshStatus();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't submit your request. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [token, notes, refreshStatus]);

  useEffect(() => {
    if (submitTriggerRef) {
      submitTriggerRef.current = handleSubmit;
    }
    return () => {
      if (submitTriggerRef) {
        submitTriggerRef.current = null;
      }
    };
  }, [submitTriggerRef, handleSubmit]);

  const submittedDetails = useMemo(() => {
    if (!statusData || !statusData.ib_request) return null;

    const ibRequest = statusData.ib_request;
    const timestamp = ibRequest.created_at_ist || ibRequest.created_at;

    let statusText: string;
    switch (ibRequest.status) {
      case 0:
        statusText = "Pending";
        break;
      case 1:
        statusText = "Approved";
        break;
      case 2:
        statusText = "Rejected";
        break;
      default:
        statusText = statusData.status_text || "Unknown";
    }

    let createdLabel: string | null = null;
    if (timestamp) {
      createdLabel = formatDateTimeInIST(timestamp);
    }

    return {
      statusText,
      adminComment: ibRequest.admin_comment || null,
      createdLabel,
      status: ibRequest.status,
    };
  }, [statusData]);

  if (isCheckingStatus) {
    return (
      <div className={cn("flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-5 text-sm font-medium text-muted-foreground shadow-sm", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-[#c8085a]" aria-hidden="true" />
        Checking your IB request status...
      </div>
    );
  }

  const getStatusDisplay = () => {
    if (!submittedDetails) return null;

    const { statusText, adminComment, createdLabel } = submittedDetails;
    const isPending = statusText.toLowerCase() === "pending";
    const isRejected = statusText.toLowerCase() === "rejected";
    const isApproved = statusText.toLowerCase() === "approved";

    if (isRejected) {
      return (
        <div className="space-y-4 rounded-3xl border border-red-200/60 bg-gradient-to-b from-red-50/50 to-red-50/20 backdrop-blur-md px-6 py-6 shadow-sm max-w-xl">
          <div className="flex items-start gap-3.5">
            <XCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" aria-hidden="true" />
            <div className="space-y-2">
              <h4 className="text-base font-bold text-red-800 tracking-tight">
                IB Request Declined
              </h4>
              <p className="text-sm text-red-700/90 leading-relaxed">
                Status: <span className="font-semibold text-red-800 capitalize">{statusText}</span>
                {createdLabel ? ` • Processed on ${createdLabel}` : null}
              </p>
              {adminComment ? (
                <div className="rounded-xl border border-red-200/40 bg-white/80 px-4 py-3 text-sm text-red-800 shadow-inner">
                  <span className="font-semibold block text-xs uppercase tracking-wider text-red-600 mb-1">Feedback:</span> 
                  {adminComment}
                </div>
              ) : null}
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                Your request has been declined. If you have any questions or want to update your portfolio,
                please reach out directly to <a href="mailto:partners@crmapp.com" className="font-medium text-indigo-600 hover:underline">partners@crmapp.com</a>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition duration-200 ease-in-out hover:bg-red-50 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                <>
                  Reapply
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 ease-in-out hover:border-slate-300 hover:text-slate-800 shadow-sm"
            >
              Review Benefits
            </Link>
          </div>
        </div>
      );
    }

    if (isApproved) {
      return (
        <div className="space-y-4 rounded-3xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-emerald-50/20 backdrop-blur-md px-6 py-6 shadow-sm max-w-xl">
          <div className="flex items-start gap-3.5">
            <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-500" aria-hidden="true" />
            <div className="space-y-2">
              <h4 className="text-base font-bold text-emerald-800 tracking-tight">
                🎉 IB Request Approved!
              </h4>
              <p className="text-sm text-emerald-700/90 leading-relaxed">
                Status: <span className="font-semibold text-emerald-800 capitalize">{statusText}</span>
                {createdLabel ? ` • Approved on ${createdLabel}` : null}
              </p>
              {adminComment ? (
                <div className="rounded-xl border border-emerald-200/40 bg-white/80 px-4 py-3 text-sm text-emerald-800 shadow-inner">
                  <span className="font-semibold block text-xs uppercase tracking-wider text-emerald-600 mb-1">Welcome Message:</span> 
                  {adminComment}
                </div>
              ) : null}
              <p className="text-sm text-slate-600 leading-relaxed pt-1">
                Congratulations! You now have full access to your IB dashboard where you can manage your clients, view analytics, and track your active earnings.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/ib-dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/10 transition duration-200 ease-in-out hover:bg-emerald-500 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Go to IB Dashboard
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition duration-200 ease-in-out hover:bg-emerald-50 hover:border-emerald-300 shadow-sm"
            >
              Review Benefits
            </Link>
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="space-y-5 rounded-3xl border border-amber-300/60 bg-amber-50 p-6 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h4 className="text-lg font-bold tracking-tight text-amber-900 dark:text-amber-100">
                  IB Application Pending
                </h4>
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-amber-700 dark:text-amber-300">
                  {statusText}
                </span>
              </div>
              {createdLabel ? (
                <p className="text-sm font-medium text-amber-700/80 dark:text-amber-300/80">
                  Submitted on {createdLabel}
                </p>
              ) : null}
              {adminComment ? (
                <div className="rounded-xl border border-amber-300/40 bg-background/70 px-4 py-3 text-sm text-foreground shadow-sm dark:border-amber-500/20">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Desk Note
                  </span>
                  {adminComment}
                </div>
              ) : null}
              <p className="pt-1 text-sm leading-relaxed text-foreground/75">
                Our onboarding desk is carefully reviewing your credentials.
                We&apos;ll email you as soon as a decision is ready.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-5 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300"
            >
              Review Benefits
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 rounded-3xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/50 to-emerald-50/20 backdrop-blur-md px-6 py-6 shadow-sm max-w-xl">
        <div className="flex items-start gap-3.5">
          <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-emerald-500" aria-hidden="true" />
          <div className="space-y-2">
            <h4 className="text-base font-bold text-emerald-800 tracking-tight">
              IB Request Received
            </h4>
            <p className="text-sm text-emerald-700/90 leading-relaxed">
              Status: <span className="font-semibold text-emerald-800 capitalize">{statusText}</span>
              {createdLabel ? ` • Submitted on ${createdLabel}` : null}
            </p>
            {adminComment ? (
              <div className="rounded-xl border border-emerald-200/40 bg-white/80 px-4 py-3 text-sm text-emerald-800 shadow-inner">
                <span className="font-semibold block text-xs uppercase tracking-wider text-emerald-600 mb-1">Feedback:</span> {adminComment}
              </div>
            ) : null}
            <p className="text-sm text-slate-600 leading-relaxed pt-1">
              Your application details are archived with our security and support desks.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href="#partner-benefits"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition duration-200 ease-in-out hover:bg-emerald-50 hover:border-emerald-300 shadow-sm"
          >
            Review Benefits
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition duration-200 ease-in-out hover:border-slate-300 hover:text-slate-800 shadow-sm"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div id="partner-cta-container" className={cn("space-y-4", className)}>
      {hasSubmitted && submittedDetails ? (
        getStatusDisplay()
      ) : (
        <>
          <div className="space-y-2">
            <label
              htmlFor="partner-notes"
              className="block text-sm font-semibold text-foreground"
            >
              Notes for our IB desk{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="partner-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Your network, business model, or how you work with clients."
              className="min-h-32 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition focus:border-[#c8085a] focus:outline-none focus:ring-4 focus:ring-[#c8085a]/15"
            />
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#c8085a] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#c8085a]/25 transition hover:bg-[#b00650] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8085a]/30 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Submitting application...
              </>
            ) : (
              <>
                Submit application
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Submitting registers an IB request with our
            compliance desk.
          </p>
        </>
      )}
    </div>
  );
}
