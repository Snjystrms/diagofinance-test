import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { CheckEmailClient } from "./_components/check-email-client";

export const metadata: Metadata = {
  title: "Check Email | CRM Dashboard",
  description: "Enter the OTP sent to your email address.",
};

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <CheckEmailClient />
    </Suspense>
  );
}
