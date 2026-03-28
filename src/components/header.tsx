"use client"

import { useState, useEffect } from "react"
import { Bell, Search, User, LogOut, Palette, Shield, Layout, Copy } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { authApi, admin2FAApi, manager2FAApi, adminNotificationApi } from "@/lib/api"
import toast from "react-hot-toast"
import { TwoFactorModal } from "@/components/two-factor-modal"
import { NotificationInbox } from "@/components/notification-inbox"
import { useClientCustomization } from "@/contexts/client-customization-context"

export function Header() {
  const { user, token, logout } = useAuth();
  const queryClient = useQueryClient();
  const {
    canCustomizeTheme,
    canCustomizeSidebar,
    customizationEnabled,
    exportPresetSnapshot,
  } = useClientCustomization();
  const router = useRouter();
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [sidebarSelectorOpen, setSidebarSelectorOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [dashboardName, setDashboardName] = useState<string | null>(null);
  const canManageCustomizer =
    user?.type === "admin" || user?.type === "subadmin" || user?.type === "manager";

  // Share the userDashboard data with dashboard page via React Query cache.
  const { data: userDashboardData } = useQuery({
    queryKey: ["userDashboard", token],
    queryFn: () => authApi.getUserDashboard(token!),
    enabled: Boolean(token) && user?.type === "user",
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Admin/manager unread count is fetched ONLY on `/dashboard` page.
  // Header just reads the cached value (no network calls here).
  const { data: adminUnreadCountData } = useQuery({
    queryKey: ["adminUnreadCount", token],
    queryFn: async () => {
      if (!token) return 0;
      const response = await adminNotificationApi.getUnreadCount(token);
      if (response.success && response.data) {
        return response.data.unread_count || 0;
      }
      return 0;
    },
    enabled: false,
    initialData: 0,
  });
  const unreadCount = adminUnreadCountData ?? 0;

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

  const handleLogout = async () => {
    try {
      // Only user sessions have a matching logout endpoint in the current API layer.
      if (token && user?.type === "user") {
        await authApi.logout(token);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message && !message.toLowerCase().includes("invalid token type")) {
        console.warn("Logout API failed, completing local logout");
      }
      // Even if the API call fails, we still want to log out locally
    } finally {
      // Perform local logout regardless of API success
      logout();
      router.push('/login');
      toast.success('You have been logged out successfully');
    }
  };

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
      <header className="flex h-16 items-center gap-2 border-b bg-card px-3 sm:px-4 md:px-6 overflow-hidden">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0 overflow-hidden">
          <SidebarTrigger className="-ml-1 flex-shrink-0" onClick={handleSidebarTriggerClick} />
          
          {/* Search Bar - Desktop */}
          <div className="relative hidden lg:block flex-shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-64 xl:w-80"
            />
          </div>
        </div>
        
        {/* Center Section - Account ID */}
        {user?.type === "user" && (
          <div className="hidden xl:flex items-center justify-center flex-shrink-0">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-card shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">ID</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[9px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-0.5">
                      Account
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-base font-bold text-foreground font-mono tracking-wider">
                        {accountId || user.id || "—"}
                      </div>
                      {accountId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 hover:bg-primary/10 hover:text-primary rounded-md transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(accountId);
                            toast.success('Account ID copied to clipboard');
                          }}
                          title="Copy Account ID"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Search Bar - Mobile/Tablet */}
          <div className="relative lg:hidden flex-shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 w-40 sm:w-48 md:w-56"
            />
          </div>
          
          {/* 2FA Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setTwoFactorModalOpen(true)}
            disabled={isLoading2FAStatus}
            className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 h-8 sm:h-9 px-2 sm:px-3 border rounded-lg ${
              isLoading2FAStatus 
                ? "border-muted" 
                : is2FAEnabled 
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50" 
                  : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50"
            }`}
          >
            {isLoading2FAStatus ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-xs sm:text-sm hidden sm:inline">Loading...</span>
              </>
            ) : (
              <>
                <Shield className={`h-4 w-4 flex-shrink-0 ${
                  is2FAEnabled 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`} />
                <span className={`text-xs sm:text-sm hidden lg:inline font-medium ${
                  is2FAEnabled 
                    ? "text-green-700 dark:text-green-300" 
                    : "text-red-700 dark:text-red-300"
                }`}>
                  {is2FAEnabled ? "Secured with 2FA" : "2FA Not Enabled"}
                </span>
              </>
            )}
          </Button>
          
          {canManageCustomizer && canCustomizeSidebar && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarSelectorOpen(true)}
              title="Choose Sidebar Layout"
              className="relative flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
            >
              <Layout className="h-4 w-4" />
            </Button>
          )}
          
          {canCustomizeTheme && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setThemeCustomizerOpen(true)}
              title="Customize Theme"
              className="relative flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
              style={{
                '--tw-ring-color': 'var(--accent, #3b82f6)',
              } as React.CSSProperties}
            >
              <Palette className="h-4 w-4" />
            </Button>
          )}

          {customizationEnabled && canManageCustomizer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPreset}
              className="hidden lg:inline-flex"
              title="Copy current preset snapshot"
            >
              Export Preset
            </Button>
          )}
          
          {user?.type === "user" ? (
            <NotificationInbox />
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/all-notifications')}
              className="relative flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
              title="View all notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {user?.type === "user" ? (
                <div className="hidden xl:flex items-center gap-3 min-w-0 cursor-pointer">
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-background via-muted/30 to-background border border-border/60 hover:border-border hover:shadow-lg transition-all duration-300">
                    <div className="relative flex-shrink-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-background">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      {profileStatus && (
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                          profileStatus.toLowerCase() === "verified" 
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" 
                            : "bg-orange-500"
                        }`}></div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[140px] leading-none">
                          {dashboardName || user.name || "User"}
                        </span>
                        {profileStatus && (
                          <span className={`text-[9px] font-medium mt-0.5 ${
                            profileStatus.toLowerCase() === "verified"
                              ? "text-green-600 dark:text-green-400"
                              : "text-orange-600 dark:text-orange-400"
                          }`}>
                            {profileStatus.charAt(0).toUpperCase() + profileStatus.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0">
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    <AvatarFallback>
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile/view_profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <ThemeCustomizer 
          open={themeCustomizerOpen} 
          onOpenChange={setThemeCustomizerOpen} 
        />
        <SidebarSelector 
          open={sidebarSelectorOpen} 
          onOpenChange={setSidebarSelectorOpen} 
        />
      </header>
      
      <TwoFactorModal 
        open={twoFactorModalOpen}
        onOpenChange={setTwoFactorModalOpen}
        is2FAEnabled={is2FAEnabled}
        onStatusChange={handle2FAStatusChange}
      />
    </>
  )
}
