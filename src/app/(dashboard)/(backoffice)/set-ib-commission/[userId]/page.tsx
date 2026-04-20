import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { DownlineTreePageContent } from "./_components/downline-tree-page-content";

export const metadata: Metadata = {
  title: "Set IB Commission | CRM Dashboard",
  description: "Review downline users and manage IB commission settings.",
};

export default function DownlineTreePage() {
  return (
    <Suspense fallback={<ListPageSkeleton statsCount={3} columnCount={5} rowCount={6} />}>
      <DownlineTreePageContent />
    </Suspense>
  );
}
