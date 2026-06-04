import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { AdminTransactionContent } from "./_components/admin-transaction-content";

export const metadata: Metadata = {
  title: "Admin Transaction | CRM Dashboard",
  description: "Manage admin transactions, deposits, withdrawals, and internal transfers",
};

export default function AdminTransactionPage() {
  return (
    <Suspense fallback={<ListPageSkeleton statsCount={4} columnCount={6} rowCount={8} />}>
      <AdminTransactionContent />
    </Suspense>
  );
}
