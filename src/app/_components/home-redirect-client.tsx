"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useClientCustomization } from "@/contexts/client-customization-context";
import { LogoCube } from "@/components/ui/logo-cube";

export function HomeRedirectClient() {
  const user = useAuth();
  const router = useRouter();
  const { themeMode } = useClientCustomization();

  const logoSrc = themeMode === "bright" ? "/diagologo.svg" : "/diagologo.svg";

  useEffect(() => {
    if (user.isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [user.isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-[26px] border border-border/80 bg-card/96 px-6 py-6 text-center shadow-[0_24px_70px_-36px_rgba(15,23,42,0.85)] backdrop-blur-sm">
        <LogoCube logoSrc={logoSrc} />
        <p className="mt-4 text-sm font-semibold tracking-[0.01em] text-foreground">
          Loading
        </p>
        <p className="mt-1.5 text-sm leading-6 text-foreground/78">
          Preparing your DiagoFinance workspace.
        </p>
      </div>
    </div>
  );
}
