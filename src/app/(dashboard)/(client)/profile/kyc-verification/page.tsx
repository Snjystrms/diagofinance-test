import type { Metadata } from "next";
import { Suspense } from "react";
import { CenteredLoadingSurface } from "@/components/loading/page-loading-skeleton";
import { KycVerificationPageContent } from "./_components/kyc-verification-page-content";

export const metadata: Metadata = {
  title: "KYC Verification | CRM Dashboard",
  description: "Upload and review KYC verification documents.",
};

export default function KycVerificationPage() {
  return (
    <Suspense
      fallback={
        <CenteredLoadingSurface
          minHeightClassName="min-h-[60vh]"
          title="Loading verification"
          description="Preparing your document upload area."
        />
      }
    >
      <KycVerificationPageContent />
    </Suspense>
  );
}
