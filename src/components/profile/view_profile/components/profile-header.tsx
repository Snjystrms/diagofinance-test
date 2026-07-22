"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileHeaderSkeleton } from "@/components/loading/client-page-skeletons";
import { Phone, MapPin, Shield, CheckCircle2, Copy, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { authApi, type ProfileViewResponse } from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function ProfileHeader() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileViewResponse | null>(null);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState(false);

  const normalizeProfileResponse = (data: ProfileViewResponse): ProfileViewResponse => ({
    ...data,
    user: {
      ...data.user,
      country_code: String(data.user.country_code).startsWith("+")
        ? data.user.country_code
        : `+${data.user.country_code}`,
      google_2FA_status: Boolean(data.user.google_2FA_status),
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          const normalizedProfile = normalizeProfileResponse(response.data);
          setProfileData(normalizedProfile);
          setIs2FAEnabled(Boolean(normalizedProfile.user?.google_2FA_status));
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  useEffect(() => {
    const handleProfileRefresh = async () => {
      if (!token) return;
      try {
        const response = await authApi.getProfileView(token);
        if (response.success && response.data) {
          const normalizedProfile = normalizeProfileResponse(response.data);
          setProfileData(normalizedProfile);
          setIs2FAEnabled(Boolean(normalizedProfile.user?.google_2FA_status));
        }
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    };
    window.addEventListener("2fa-status-changed", handleProfileRefresh);
    window.addEventListener("profile-updated", handleProfileRefresh);
    return () => {
      window.removeEventListener("2fa-status-changed", handleProfileRefresh);
      window.removeEventListener("profile-updated", handleProfileRefresh);
    };
  }, [token]);

  const handleCopyAccountId = () => {
    if (profileData?.user?.account_id) {
      navigator.clipboard.writeText(profileData.user.account_id);
      setCopiedAccountId(true);
      toast.success("Account ID copied to clipboard");
      setTimeout(() => setCopiedAccountId(false), 2000);
    }
  };

  if (loading) return <ProfileHeaderSkeleton />;

  if (!profileData?.user) {
    return (
      <Card className="rounded-[28px]">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">No profile data available</p>
        </CardContent>
      </Card>
    );
  }

  const user = profileData.user;
  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const isVerified = user.verification_status === "verified";
  const isPending = user.verification_status === "pending";

  return (
    <div className="ib-portal-hero rounded-[28px] border px-6 py-6 sm:px-8 sm:py-7 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-12 -top-14 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 -bottom-10 h-40 w-40 rounded-full bg-primary/6 blur-2xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Avatar + Info */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar with ring */}
          <div className="relative shrink-0">
            <div className="rounded-full p-[2px] bg-gradient-to-br from-primary/40 via-primary/20 to-transparent shadow-sm">
              <Avatar className="h-20 w-20 border-2 border-background">
                <AvatarImage
                  src="https://bundui-images.netlify.app/avatars/08.png"
                  alt={user.name}
                />
                <AvatarFallback className="bg-primary/12 text-xl font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            {/* Verification dot */}
            {isPending && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-background">
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            {isVerified && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </span>
            )}
          </div>

          {/* Name + email + kicker */}
          <div className="space-y-1.5">
            <div className="ib-portal-kicker inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <Sparkles className="h-3 w-3" />
              Client Account
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.8rem] leading-tight">
              {user.name || user.email}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Right: Meta chips */}
        <div className="flex flex-wrap gap-2.5">

          {/* Phone */}
          {user.mobile && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 shadow-sm backdrop-blur-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                <Phone className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm text-foreground/80">
                {user.country_code} {user.mobile}
              </span>
            </div>
          )}

          {/* Location */}
          {user.location && (
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 shadow-sm backdrop-blur-sm">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                <MapPin className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm capitalize text-foreground/80">{user.location}</span>
            </div>
          )}

          {/* 2FA chip */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm",
              is2FAEnabled
                ? "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/30"
                : "border-red-200/80 bg-red-50/70 dark:border-red-800/60 dark:bg-red-950/30"
            )}
          >
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-md",
                is2FAEnabled
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-red-100 dark:bg-red-900/50"
              )}
            >
              <Shield
                className={cn(
                  "h-3 w-3",
                  is2FAEnabled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                )}
              />
            </div>
            <div className="flex items-center gap-1.5">
              {is2FAEnabled && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  is2FAEnabled
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {is2FAEnabled ? "2FA Active" : "2FA Off"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}