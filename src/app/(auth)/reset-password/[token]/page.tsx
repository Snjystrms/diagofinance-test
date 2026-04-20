import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../../_components/auth-page-fallback";
import { ResetPasswordTokenClient } from "./_components/reset-password-token-client";

export const metadata: Metadata = {
  title: "Reset Password | CRM Dashboard",
  description: "Choose a new password for your CRM dashboard account.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <ResetPasswordTokenClient />
    </Suspense>
  );
}
