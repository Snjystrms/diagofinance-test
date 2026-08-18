import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { IbWithdrawalRequestsPageContent } from "./_components/ib-withdrawal-requests-page-content";

export const metadata: Metadata = {
  title: "IB Withdrawal List | CRM Dashboard",
  description: "Review and process IB withdrawal requests.",
};

export default function IbWithdrawalRequestsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton statsCount={4} columnCount={6} rowCount={8} />}>
      <IbWithdrawalRequestsPageContent />
    </Suspense>
  );
}
