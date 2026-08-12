"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useClientCustomization } from "@/contexts/client-customization-context";
import {
  ibRequestsApi,
  type IbDashboardResponse,
  type IbWalletData,
} from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ArrowLeft,
  Users,
  PieChart,
  Loader2,
  LogOut,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { getIbWalletSnapshot, normalizeIbWalletData } from "@/lib/ib";
import { useSessionLogout } from "@/hooks/use-session-logout";
import Image from "next/image";

export function IbDashboardSidebar() {
  const { user, token } = useAuth();
  const { themeMode } = useClientCustomization();
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, closeMobileSidebar } = useSidebar();
  const sessionLogout = useSessionLogout();
  const isCollapsed = state === "collapsed";
  const activeTextClass =
    themeMode === "bright"
      ? "text-[#48526b]"
      : "text-white dark:text-sidebar-active-text";

  const handleMobileNav = useCallback(() => {
    if (isMobile) closeMobileSidebar();
  }, [isMobile, closeMobileSidebar]);
  const [dashboardData, setDashboardData] =
    useState<IbDashboardResponse | null>(null);
  const [walletData, setWalletData] = useState<IbWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [dashboardResponse, walletResponse] = await Promise.all([
        ibRequestsApi.getDashboard(token).catch((err) => {
          console.error("Failed to fetch IB dashboard:", err);
          return null;
        }),
        ibRequestsApi.getIbWallet(token).catch((err) => {
          console.error("Failed to fetch IB wallet:", err);
          return null;
        }),
      ]);
      if (dashboardResponse?.data) setDashboardData(dashboardResponse.data);
      if (walletResponse?.success) {
        setWalletData(normalizeIbWalletData(walletResponse.data) ?? null);
      }
    } catch (err) {
      console.error("Failed to fetch IB data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/ib-dashboard" },
    { icon: Wallet, label: "Wallet", path: "/ib-dashboard/wallet" },
    {
      icon: ArrowLeftRight,
      label: "Internal Transfer",
      path: "/ib-dashboard/transfer",
    },
    { icon: Users, label: "Client Summary", path: "/ib-dashboard/clients" },
    // { icon: PieChart,        label: "Commissions",       path: "/ib-dashboard/commissions" },
  ];

  const displayUser = dashboardData?.user || user;
  const userName = displayUser?.name || "User";
  const partnerId =
    dashboardData?.partner_info?.partner_id ||
    dashboardData?.user?.partner_id ||
    "N/A";
  const walletSnapshot = getIbWalletSnapshot(walletData, dashboardData);
  const clientWallet = walletSnapshot.clientWallet.amount;
  const partnerWallet = walletSnapshot.partnerWallet.amount;
  const currency = walletSnapshot.currency;
  const ibPlan = dashboardData?.partner_info?.ib_plan || "GOLD";

  const avatarGradient = {
    backgroundImage:
      "linear-gradient(135deg, color-mix(in srgb, var(--sidebar-primary) 86%, white 14%) 0%, color-mix(in srgb, var(--accent) 62%, var(--sidebar-primary) 38%) 100%)",
  };

  const activeCardStyle = {
    backgroundImage:
      "linear-gradient(160deg, color-mix(in srgb, var(--sidebar-primary) 18%, transparent) 0%, color-mix(in srgb, var(--sidebar-primary) 5%, transparent) 100%)",
    borderColor: "color-mix(in srgb, var(--sidebar-primary) 45%, transparent)",
    boxShadow:
      "0 6px 18px -8px color-mix(in srgb, var(--sidebar-primary) 55%, transparent)",
  };

  const walletGlow = {
    backgroundColor:
      "color-mix(in srgb, var(--sidebar-primary) 32%, transparent)",
  };

  const isActive = (path: string) =>
    path === "/ib-dashboard"
      ? pathname === "/ib-dashboard" ||
        (pathname?.startsWith("/ib-dashboard") &&
          pathname.split("/").length === 2)
      : pathname === path || pathname?.startsWith(path + "/");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Collapsed ───────────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-3 bg-sidebar px-2.5 py-5 text-sidebar-foreground">
        {/* Avatar only — logo hidden in collapsed state */}
        <Avatar className="h-10 w-10 border-2 border-sidebar-border shadow-md ring-2 ring-sidebar-primary/10 mb-1">
          <AvatarFallback
            className="text-sidebar-primary-foreground text-xs font-bold"
            style={avatarGradient}
          >
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent my-1" />

        <div className="flex flex-col items-center gap-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => {
                  handleMobileNav();
                  router.push(item.path);
                }}
                style={active ? activeCardStyle : undefined}
                className={cn(
                  "w-full flex items-center justify-center rounded-2xl border p-2.5 transition-all duration-200",
                  active
                    ? activeTextClass
                    : "border-transparent bg-sidebar-accent/40 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
                title={item.label}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5",
                    active && activeTextClass,
                  )}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full">
          <button
            onClick={() => {
              handleMobileNav();
              router.push("/dashboard");
            }}
            className="w-full flex items-center justify-center rounded-2xl border border-transparent bg-sidebar-accent/40 p-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive"
            title="Client Portal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              handleMobileNav();
              void sessionLogout();
            }}
            className="w-full flex items-center justify-center rounded-2xl border border-transparent bg-sidebar-accent/40 p-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* ── Hero ── */}
      <div className="relative px-5 pt-6 pb-5 space-y-4">
        <Image
          src="/diagofinancelogo.svg"
          alt="Diagofinance"
          width={250}
          height={59}
          className="mx-auto object-contain"
          priority
        />

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />

        {/* Avatar + identity */}
        <div className="flex items-center gap-3.5">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-sidebar-border shadow-md ring-2 ring-sidebar-primary/15">
            <AvatarFallback
              className="text-sidebar-primary-foreground text-base font-bold"
              style={avatarGradient}
            >
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm text-sidebar-foreground leading-tight">
              {userName}
            </p>
            <p className="text-[11px] text-sidebar-foreground/55 mt-0.5">
              Partner&nbsp;
              <span className="text-sidebar-primary font-medium">
                {partnerId}
              </span>
            </p>
          </div>
        </div>

        {/* Wallet balances */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="ib-wallet-card relative overflow-hidden rounded-2xl border border-sidebar-border/60 px-3.5 py-3 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full blur-xl opacity-70"
              style={walletGlow}
            />
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">
                  Main Wallet
                </p>
              </div>
              <p className="text-sidebar-foreground font-bold text-[15px] tabular-nums leading-none">
                {formatCurrency(clientWallet, currency)}
              </p>
            </div>
          </div>

          <div className="ib-wallet-card relative overflow-hidden rounded-2xl border border-sidebar-border/60 px-3.5 py-3 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full blur-xl opacity-70"
              style={walletGlow}
            />
            <div className="relative z-10">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/15 text-sidebar-primary">
                  <PieChart className="h-3.5 w-3.5" />
                </div>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/55">
                  Partner Wallet
                </p>
              </div>
              <p className="text-sidebar-foreground font-bold text-[15px] tabular-nums leading-none">
                {formatCurrency(partnerWallet, currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav grid ── */}
      <div className="ib-sidebar-grid flex-1 overflow-y-auto px-4 py-3">
        <div className="grid grid-cols-2 gap-2.5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const isLastOdd =
              navItems.length % 2 !== 0 && index === navItems.length - 1;

            return (
              <button
                key={item.path}
                onClick={() => {
                  handleMobileNav();
                  router.push(item.path);
                }}
                style={active ? activeCardStyle : undefined}
                className={cn(
                  "ib-sidebar-nav-card group relative flex flex-col items-center justify-center gap-2.5 rounded-[20px] border px-3 py-5 transition-all duration-200 text-center",
                  isLastOdd &&
                    "col-span-2 flex-row gap-3 py-3.5 justify-start px-5",
                  active
                    ? "border-transparent"
                    : "border-transparent bg-sidebar-accent/35 hover:bg-sidebar-accent/65 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                )}
              >
                {/* Icon container — styled like the wallet card icon boxes */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                    active
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "bg-sidebar-accent/60 text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span
                  className={cn(
                    "text-[11px] font-medium leading-tight",
                    active
                      ? cn(activeTextClass, "font-semibold")
                      : "",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="shrink-0 px-4 pb-5 pt-2 space-y-2">
        <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent mb-3" />
        <button
          onClick={() => {
            handleMobileNav();
            router.push("/dashboard");
          }}
          className="group flex w-full items-center gap-3 rounded-2xl border border-sidebar-border/50 px-4 py-2.5 text-[12.5px] font-medium text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Client Portal
        </button>
        <button
          onClick={() => {
            handleMobileNav();
            void sessionLogout();
          }}
          className="group flex w-full items-center gap-3 rounded-2xl border border-sidebar-border/50 px-4 py-2.5 text-[12.5px] font-medium text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </div>
  );
}