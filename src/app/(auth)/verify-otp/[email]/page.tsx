import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../../_components/auth-page-fallback";
import { VerifyOtpClient } from "./_components/verify-otp-client";

interface PageProps {
  params: Promise<{ email: string }>;
}

export const metadata: Metadata = {
  title: "Verify OTP | CRM Dashboard",
  description: "Verify your registration email with a one-time password.",
};

export default function VerifyOtpPage({ params }: PageProps) {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <VerifyOtpClient params={params} />
    </Suspense>
  );
}
