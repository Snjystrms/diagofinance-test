"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi, type IbRequestStatusResponse } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BecomePartnerCtaProps {
  className?: string;
}

export function BecomePartnerCta({ className }: BecomePartnerCtaProps) {
  const { token } = useAuth();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusData, setStatusData] = useState<IbRequestStatusResponse | null>(null);
  // Show status only if ib_request exists (not null) - if null, user hasn't applied yet
  const hasSubmitted = Boolean(statusData?.ib_request);

  const refreshStatus = useCallback(async () => {
    if (!token) {
      console.log("[IB Status] No token available, skipping API call");
      setStatusData(null);
      return;
    }

    console.log("[IB Status] Calling getStatus API with token:", token ? "token exists" : "no token");
    setIsCheckingStatus(true);
    try {
      console.log("[IB Status] Making API call to /user/ib-requests/status");
      const response = await ibRequestsApi.getStatus(token);
      console.log("[IB Status] Full API response:", JSON.stringify(response, null, 2));
      
      // The API returns: { success: true, data: { ib_request, status_text, ... } }
      const data = response?.data;
      console.log("[IB Status] Extracted data from response.data:", data);
      console.log("[IB Status] status_text:", data?.status_text);
      console.log("[IB Status] ib_request:", data?.ib_request);
      
      if (data) {
        // Always set statusData if we have data, even if ib_request is null
        console.log("[IB Status] Valid data structure, setting statusData");
        setStatusData(data);
      } else {
        console.log("[IB Status] No data in response, setting statusData to null");
        setStatusData(null);
      }
    } catch (error) {
      console.error("[IB Status] Failed to load IB request status:", error);
      if (error instanceof Error) {
        console.error("[IB Status] Error message:", error.message);
        console.error("[IB Status] Error stack:", error.stack);
      }
      setStatusData(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

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
  };

  const submittedDetails = useMemo(() => {
    // Only show details if ib_request exists (user has applied)
    if (!statusData || !statusData.ib_request) return null;

    const ibRequest = statusData.ib_request;
    const timestamp = ibRequest.created_at_ist || ibRequest.created_at;

    // Determine status based on ib_request.status: 0 = Pending, 1 = Approved, 2 = Rejected
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
      <div className={cn("flex items-center gap-3 rounded-3xl border border-indigo-100 bg-white/80 px-6 py-6 text-sm text-slate-600 shadow-sm", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" aria-hidden="true" />
        Checking your partner request status...
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
        <div className="space-y-3 rounded-3xl border border-red-200 bg-red-50/80 px-6 py-6 text-sm text-red-700 shadow-sm">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-red-700">
                IB Request Rejected
              </p>
              <p>
                Status: <span className="font-medium text-red-800 capitalize">{statusText}</span>
                {createdLabel ? ` • Submitted on ${createdLabel}` : null}
              </p>
              {adminComment ? (
                <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-red-700">
                  <span className="font-medium">Admin Comment:</span> {adminComment}
                </div>
              ) : null}
              <p>
                Your IB request has been rejected. If you have questions or would like to reapply,
                please reach out to partners@crmapp.com with your details.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition hover:border-red-400 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-80"
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
              href="#partner-benefits"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Review Benefits
            </Link>
          </div>
        </div>
      );
    }

    if (isApproved) {
      return (
        <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50/80 px-6 py-6 text-sm text-emerald-700 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-emerald-700">
                🎉 IB Request Approved!
              </p>
              <p>
                Status: <span className="font-medium text-emerald-800 capitalize">{statusText}</span>
                {createdLabel ? ` • Approved on ${createdLabel}` : null}
              </p>
              {adminComment ? (
                <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-700">
                  <span className="font-medium">Admin Comment:</span> {adminComment}
                </div>
              ) : null}
              <p>
                Congratulations! Your IB request has been approved. You now have access to the IB dashboard where you can track your earnings, manage clients, and view your performance metrics.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ib-dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Go to IB Dashboard
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="#partner-benefits"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-6 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Review Benefits
            </Link>
          </div>
        </div>
      );
    }

    if (isPending) {
      return (
        <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50/80 px-6 py-6 text-sm text-amber-700 shadow-sm">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-amber-700">
                IB Request Pending
              </p>
              <p>
                Status: <span className="font-medium text-amber-800 capitalize">{statusText}</span>
                {createdLabel ? ` • Submitted on ${createdLabel}` : null}
              </p>
              {adminComment ? (
                <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-amber-700">
                  <span className="font-medium">Admin Comment:</span> {adminComment}
                </div>
              ) : null}
              <p>
                Your IB request is currently under review. Our partner desk will follow up via email once a decision has been made.
                If you need to contact us, reach out to partners@crmapp.com with your details.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="#partner-benefits"
              className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-white px-6 py-3 text-sm font-semibold text-amber-700 transition hover:border-amber-400 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
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
      );
    }

    // Default other status state
    return (
      <div className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50/80 px-6 py-6 text-sm text-emerald-700 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" aria-hidden="true" />
          <div className="space-y-2">
            <p className="text-base font-semibold text-emerald-700">
              IB request already submitted
            </p>
            <p>
              Status: <span className="font-medium text-emerald-800 capitalize">{statusText}</span>
              {createdLabel ? ` • Submitted on ${createdLabel}` : null}
            </p>
            {adminComment ? (
              <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-emerald-700">
                <span className="font-medium">Admin Comment:</span> {adminComment}
              </div>
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
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {hasSubmitted && submittedDetails ? (
        getStatusDisplay()
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

