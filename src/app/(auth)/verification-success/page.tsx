import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { VerificationSuccessClient } from "./_components/verification-success-client";

interface PageProps {
  searchParams: Promise<{ data?: string }>;
}

export const metadata: Metadata = {
  title: "Verification Success | CRM Dashboard",
  description: "Your registration verification was completed successfully.",
};

export default function VerificationSuccessPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <VerificationSuccessClient searchParams={searchParams} />
    </Suspense>
  );
}
