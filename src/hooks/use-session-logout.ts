"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { authApi } from "@/lib/api";

export function useSessionLogout() {
  const { token, logout } = useAuth();
  const router = useRouter();

  return useCallback(async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message && !message.toLowerCase().includes("invalid token type")) {
        console.warn("Logout API failed, completing local logout");
      }
    } finally {
      logout();
      router.push("/login");
      toast.success("You have been logged out successfully");
    }
  }, [token, logout, router]);
}
