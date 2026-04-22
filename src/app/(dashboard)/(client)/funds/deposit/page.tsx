import type { Metadata } from "next";
import { Suspense } from "react";
import { CenteredLoadingSurface } from "@/components/loading/page-loading-skeleton";
import { USDTDepositPageContent } from "./_components/usdt-deposit-page-content";

export const metadata: Metadata = {
  title: "Deposit Funds | CRM Dashboard",
  description: "Submit and track client deposit requests.",
};

export default function USDTDepositPage() {
  return (
    <Suspense
      fallback={
        <CenteredLoadingSurface
          minHeightClassName="min-h-[60vh]"
          title="Loading deposit options"
          description="Preparing the deposit form."
        />
      }
    >
      <USDTDepositPageContent />
    </Suspense>
  );
}
