import type { Metadata } from "next";
import { Suspense } from "react";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { AllGroupsPageContent } from "./_components/all-groups-page-content";

export const metadata: Metadata = {
  title: "All Groups | CRM Dashboard",
  description: "View all available trading groups.",
};

export default function AllGroupsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton statsCount={1} columnCount={2} rowCount={8} />}>
      <AllGroupsPageContent />
    </Suspense>
  );
}
