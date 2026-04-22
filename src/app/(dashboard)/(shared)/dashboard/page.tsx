import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardGroupLoading from "../../loading";
import { DashboardPageContent } from "./_components/dashboard-page-content";

export const metadata: Metadata = {
  title: "Dashboard | CRM Dashboard",
  description: "Overview of CRM activity, accounts, and trading statistics.",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardGroupLoading />}>
      <DashboardPageContent />
    </Suspense>
  );
}
