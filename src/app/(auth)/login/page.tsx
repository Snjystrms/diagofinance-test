import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { LoginClient } from "./_components/login-client";

export const metadata: Metadata = {
  title: "Login | CRM Dashboard",
  description: "Sign in to your CRM dashboard.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <LoginClient />
    </Suspense>
  );
}
