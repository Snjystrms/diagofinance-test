import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { WithdrawalRequestsPageContent } from "./_components/withdrawal-requests-page-content";

export const metadata: Metadata = {
  title: "Withdrawal List | CRM Dashboard",
  description: "Review and process USDT withdrawal requests.",
};

export default function WithdrawalRequestsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton columnCount={10} rowCount={8} />}>
      <WithdrawalRequestsPageContent />
    </Suspense>
  );
}
