"use client"

import { useState, useEffect, useMemo } from "react"
import { User, LogOut, Palette, Shield, Layout, Copy, Ticket, Wallet, UserCheck } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeCustomizer } from "@/components/theme-customizer"
import { SidebarSelector } from "@/components/sidebar-selector"
import { useAuth } from "@/contexts/auth-context"
import { useSessionLogout } from "@/hooks/use-session-logout"
import { usePathname, useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { authApi, admin2FAApi, manager2FAApi } from "@/lib/api"
import toast from "react-hot-toast"
import { TwoFactorModal } from "@/components/two-factor-modal"
import { NotificationInbox } from "@/components/notification-inbox"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { getManagerHeaderQuickLinks } from "@/lib/app-route-registry"

export function Header() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const {
    canCustomizeTheme,
    canCustomizeSidebar,
    canCustomizeDashboard,
    customizationEnabled,
    exportPresetSnapshot,
    themeMode,
    toggleThemeMode,
  } = useClientCustomization();
  const router = useRouter();
  const pathname = usePathname();
  const sessionLogout = useSessionLogout();
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [sidebarSelectorOpen, setSidebarSelectorOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState<string | null>(null);
  const canManageCustomizer =
    user?.type === "admin" || user?.type === "subadmin" || user?.type === "manager"  || user?.type === "user";  
  const canExportPreset =
    customizationEnabled && (canCustomizeTheme || canCustomizeSidebar || canCustomizeDashboard);
  const isDashboardRoute = pathname === "/dashboard";
  const isClientUser = user?.type === "user";
  const isAdminLike =
    user?.type === "admin" || user?.type === "subadmin";
  const isManagerUser = user?.type === "manager";

  const managerQuickLinks = useMemo(
    () =>
      isManagerUser
        ? getManagerHeaderQuickLinks(user?.managerPermissions)
        : [],
    [isManagerUser, user?.managerPermissions],
  );

  const showAccountMenuMiddle =
    !!user &&
    (isAdminLike ||
      isClientUser ||
      (isManagerUser && managerQuickLinks.length > 0) ||
      (!isAdminLike && !isClientUser && !isManagerUser));

  // Share the userDashboard data with dashboard page via React Query cache.
  const { data: userDashboardData } = useQuery({
    queryKey: ["userDashboard", token],
    queryFn: () => authApi.getUserDashboard(token!),
    enabled: Boolean(token) && user?.type === "user",
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const { data: is2FAEnabled = false, isFetching: isLoading2FAStatus } = useQuery({
    queryKey: ["twoFactorStatus", user?.type, user?.id, token],
    queryFn: async () => {
      if (!user?.id || !token) return false;

      try {
        const isAdminLike = user.type === "admin" || user.type === "subadmin";
        const isManager = user.type === "manager";

        const response = isAdminLike
          ? await admin2FAApi.getTwoFactorStatus(user.id, token)
          : isManager
            ? await manager2FAApi.getTwoFactorStatus(user.id, token)
            : await authApi.getTwoFactorStatus(Number(user.id), token);

        return response.success && response.data ? Boolean(response.data.google_2FA_status) : false;
      } catch {
        return false;
      }
    },
    enabled: Boolean(user?.id && token),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Derive header info from the shared userDashboard React Query cache.
  useEffect(() => {
    if (!userDashboardData?.success || !userDashboardData.data) {
      if (user?.type !== "user") {
        setAccountId(null);
        setProfileStatus(null);
        setDashboardName(null);
      }
      return;
    }
    const dashboardUser = userDashboardData.data.user;
    const profile = userDashboardData.data.profile_status;
    setAccountId(dashboardUser?.account_id ?? null);
    setProfileStatus(profile?.status ?? null);
    const displayName =
      dashboardUser?.name ||
      [dashboardUser?.first_name, dashboardUser?.last_name].filter(Boolean).join(" ");
    setDashboardName(displayName || null);
  }, [userDashboardData, user?.type]);

  const handle2FAStatusChange = () => {
    // Toggle the 2FA status and refresh the status from API
    void queryClient.invalidateQueries({ queryKey: ["twoFactorStatus"] });
  };

  const handleSidebarTriggerClick = () => {
    window.dispatchEvent(new CustomEvent("toggle-nested-sidebar"));
  };

  const handleExportPreset = async () => {
    try {
      await navigator.clipboard.writeText(exportPresetSnapshot());
      toast.success("Preset snapshot copied to clipboard");
    } catch (error) {
      console.error("Failed to copy preset snapshot:", error);
      toast.error("Unable to copy preset snapshot");
    }
  };

  return (
    <>
      <header className="flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 sm:px-5 md:px-6 overflow-hidden">
        {/* Left */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 overflow-hidden">
          <SidebarTrigger className="-ml-1 flex-shrink-0" onClick={handleSidebarTriggerClick} />
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">

          {/* 2FA pill */}
          <button
            onClick={() => setTwoFactorModalOpen(true)}
            disabled={isLoading2FAStatus}
            className="ib-portal-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-200 hover:shadow-sm disabled:opacity-60 flex-shrink-0"
          >
            {isLoading2FAStatus ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${is2FAEnabled ? "bg-green-500" : "bg-red-500"}`} />
            )}
            <Shield className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden lg:inline">
              {isLoading2FAStatus ? "Loading…" : is2FAEnabled ? "2FA On" : "2FA Off"}
            </span>
          </button>

          {/* Sidebar layout picker */}
          {canManageCustomizer && canCustomizeSidebar && (
            <button
              onClick={() => setSidebarSelectorOpen(true)}
              title="Choose Sidebar Layout"
              className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:bg-background text-foreground"
            >
              <Layout className="h-4 w-4" />
            </button>
          )}

          {/* Theme customizer */}
          {canCustomizeTheme && (
            <>
              <button
                onClick={toggleThemeMode}
                title={`Switch to ${themeMode === "bright" ? "dark" : "bright"} mode`}
                className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full border border-border/60 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md active:scale-95 text-foreground overflow-hidden"
                style={{
                  backgroundColor: themeMode === "dark" ? "#000000" : "#ffffff",
                  color: themeMode === "dark" ? "#ffffff" : "#000000",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  fill="currentColor"
                  strokeLinecap="round"
                  viewBox="0 0 32 32"
                  className="h-4 w-4"
                >
                  <clipPath id="header-theme-toggle-clip">
                    <motion.path
                      animate={{ y: themeMode === "dark" ? 10 : 0, x: themeMode === "dark" ? -12 : 0 }}
                      transition={{ ease: "easeInOut", duration: 0.35 }}
                      d="M0-5h30a1 1 0 0 0 9 13v24H0Z"
                    />
                  </clipPath>
                  <g clipPath="url(#header-theme-toggle-clip)">
                    <motion.circle
                      animate={{ r: themeMode === "dark" ? 10 : 8 }}
                      transition={{ ease: "easeInOut", duration: 0.35 }}
                      cx="16"
                      cy="16"
                    />
                    <motion.g
                      animate={{
                        rotate: themeMode === "dark" ? -100 : 0,
                        scale: themeMode === "dark" ? 0.5 : 1,
                        opacity: themeMode === "dark" ? 0 : 1,
                      }}
                      transition={{ ease: "easeInOut", duration: 0.35 }}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M16 5.5v-4" />
                      <path d="M16 30.5v-4" />
                      <path d="M1.5 16h4" />
                      <path d="M26.5 16h4" />
                      <path d="m23.4 8.6 2.8-2.8" />
                      <path d="m5.7 26.3 2.9-2.9" />
                      <path d="m5.8 5.8 2.8 2.8" />
                      <path d="m23.4 23.4 2.9 2.9" />
                    </motion.g>
                  </g>
                </svg>
              </button>
              <button
                onClick={() => setThemeCustomizerOpen(true)}
                title="Customize Theme"
                className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:bg-background text-foreground"
              >
                <Palette className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Export preset */}
          {canExportPreset && (
            <button
              onClick={handleExportPreset}
              title="Copy current preset snapshot"
              className="hidden lg:flex h-8 sm:h-9 flex-shrink-0 items-center gap-1.5 rounded-xl border border-border/60 bg-background/80 px-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:bg-background text-xs font-semibold text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              Export
            </button>
          )}

          {/* Notifications */}
          {user ? (
            <NotificationInbox
              mode={user.type === "user" ? "user" : "admin"}
              shouldFetchUnreadCount={isDashboardRoute}
            />
          ) : null}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {user?.type === "user" ? (
                <div className="hidden xl:flex cursor-pointer">
                  <div className="flex items-center gap-2.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:bg-background">
                    <div className="relative flex-shrink-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
                        <User className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      {profileStatus && (
                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${
                          profileStatus.toLowerCase() === "verified"
                            ? "bg-green-500"
                            : "bg-amber-500"
                        }`} />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="max-w-[140px] truncate text-sm font-semibold leading-none text-foreground">
                        {dashboardName || user.name || "User"}
                      </span>
                      {profileStatus && (
                        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          {profileStatus.charAt(0).toUpperCase() + profileStatus.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button className="flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:bg-background">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarFallback className="text-xs font-semibold bg-transparent">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{user?.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
                </div>
              </DropdownMenuLabel>
              {showAccountMenuMiddle ? (
                <>
                  <DropdownMenuSeparator />
                  {isAdminLike ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push("/user-verification")}
                      >
                        <UserCheck className="mr-2 h-4 w-4 shrink-0" />
                        User KYC
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/all-tickets")}
                      >
                        <Ticket className="mr-2 h-4 w-4 shrink-0" />
                        Tickets
                      </DropdownMenuItem>
                    </>
                  ) : isClientUser ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push("/profile/view_profile")}
                      >
                        <User className="mr-2 h-4 w-4 shrink-0" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/funds/deposit")}
                      >
                        <Wallet className="mr-2 h-4 w-4 shrink-0" />
                        Add funds
                      </DropdownMenuItem>
                    </>
                  ) : isManagerUser ? (
                    <>
                      {managerQuickLinks.map((link) => (
                        <DropdownMenuItem
                          key={link.url}
                          onClick={() => router.push(link.url)}
                        >
                          {link.title}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push("/profile/view_profile")}
                      >
                        <User className="mr-2 h-4 w-4 shrink-0" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/bank-details")}
                      >
                        Settings
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void sessionLogout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </header>

      <ThemeCustomizer open={themeCustomizerOpen} onOpenChange={setThemeCustomizerOpen} />
      <SidebarSelector open={sidebarSelectorOpen} onOpenChange={setSidebarSelectorOpen} />
      <TwoFactorModal 
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        is2FAEnabled={is2FAEnabled}
        onStatusChange={handle2FAStatusChange}
      />
    </>
  )
}
