import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { USDTTransactionsPageContent } from "./_components/usdt-transactions-page-content";

export const metadata: Metadata = {
  title: "All Transactions | CRM Dashboard",
  description: "Review and process USDT deposit and withdrawal requests.",
};

export default function USDTTransactionsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton statsCount={4} columnCount={6} rowCount={8} />}>
      <USDTTransactionsPageContent />
    </Suspense>
  );
}
