import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageFallback } from "../_components/auth-page-fallback";
import { RegisterClient } from "./_components/register-client";

export const metadata: Metadata = {
  title: "Register | CRM Dashboard",
  description: "Create your CRM dashboard account.",
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <RegisterClient />
    </Suspense>
  );
}
