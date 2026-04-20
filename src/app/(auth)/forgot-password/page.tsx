import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { ForgotPasswordClient } from "./_components/forgot-password-client";

export const metadata: Metadata = {
  title: "Forgot Password | CRM Dashboard",
  description: "Request a password reset link for your CRM dashboard account.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
