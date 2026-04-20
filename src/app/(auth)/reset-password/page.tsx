import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { ResetPasswordRedirectClient } from "./_components/reset-password-redirect-client";

export const metadata: Metadata = {
  title: "Reset Password | CRM Dashboard",
  description: "Reset your CRM dashboard password.",
};

export default function ResetPasswordRedirectPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <ResetPasswordRedirectClient />
    </Suspense>
  );
}
