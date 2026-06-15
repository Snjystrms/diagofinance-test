"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { ibRequestsApi, type IbDashboardResponse, type IbWalletData } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  ArrowLeft,
  Users, 
  PieChart,
  Loader2,
  LogOut,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { getIbWalletSnapshot, normalizeIbWalletData } from "@/lib/ib"
import { useSessionLogout } from "@/hooks/use-session-logout"
import Image from "next/image"

export function IbDashboardSidebar() {
  const { user, token } = useAuth()
  const { themeMode } = useClientCustomization()
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const sessionLogout = useSessionLogout()
  const isCollapsed = state === "collapsed"
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null)
  const [walletData, setWalletData] = useState<IbWalletData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const [dashboardResponse, walletResponse] = await Promise.all([
        ibRequestsApi.getDashboard(token).catch((err) => {
          console.error("Failed to fetch IB dashboard:", err)
          return null
        }),
        ibRequestsApi.getIbWallet(token).catch((err) => {
          console.error("Failed to fetch IB wallet:", err)
          return null
        }),
      ])
      if (dashboardResponse?.data) setDashboardData(dashboardResponse.data)
      if (walletResponse?.success) {
        setWalletData(normalizeIbWalletData(walletResponse.data) ?? null)
      }
    } catch (err) {
      console.error("Failed to fetch IB data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => { void fetchData() }, [fetchData])

  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard",         path: "/ib-dashboard" },
    { icon: Wallet,          label: "Wallet",            path: "/ib-dashboard/wallet" },
    { icon: ArrowLeftRight,  label: "Internal Transfer", path: "/ib-dashboard/transfer" },
    { icon: Users,           label: "Client Summary",    path: "/ib-dashboard/clients" },
    { icon: PieChart,        label: "Commissions",       path: "/ib-dashboard/commissions" },
  ]

  const displayUser   = dashboardData?.user || user
  const userName      = displayUser?.name || "User"
  const partnerId     = dashboardData?.partner_info?.partner_id || dashboardData?.user?.partner_id || "N/A"
  const walletSnapshot = getIbWalletSnapshot(walletData, dashboardData)
  const clientWallet  = walletSnapshot.clientWallet.amount
  const partnerWallet = walletSnapshot.partnerWallet.amount
  const currency      = walletSnapshot.currency
  const ibPlan        = dashboardData?.partner_info?.ib_plan || "GOLD"

  const avatarGradient = {
    backgroundImage:
      "linear-gradient(135deg, color-mix(in srgb, var(--sidebar-primary) 86%, white 14%) 0%, color-mix(in srgb, var(--accent) 62%, var(--sidebar-primary) 38%) 100%)",
  }

  const isActive = (path: string) =>
    path === "/ib-dashboard"
      ? pathname === "/ib-dashboard" || (pathname?.startsWith("/ib-dashboard") && pathname.split("/").length === 2)
      : pathname === path || pathname?.startsWith(path + "/")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ── Collapsed ───────────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-3 bg-sidebar px-2.5 py-5 text-sidebar-foreground">
        {/* Avatar only — logo hidden in collapsed state */}
        <Avatar className="h-10 w-10 border border-sidebar-border shadow-sm mb-1">
          <AvatarFallback className="text-sidebar-primary-foreground text-xs font-bold" style={avatarGradient}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        <div className="w-full h-px bg-sidebar-border/50 my-1" />

        <div className="flex flex-col items-center gap-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "w-full flex items-center justify-center rounded-2xl border p-2.5 transition-all duration-200",
                  active
                    ? "border-sidebar-primary/30 bg-sidebar-primary/10 text-sidebar-primary"
                    : "border-transparent bg-sidebar-accent/40 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
                title={item.label}
              >
                <Icon className="h-4.5 w-4.5" />
              </button>
            )
          })}
        </div>

        <div className="mt-auto flex flex-col items-center gap-2 w-full">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full flex items-center justify-center rounded-2xl border border-transparent bg-sidebar-accent/40 p-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive"
            title="Client Portal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => void sessionLogout()}
            className="w-full flex items-center justify-center rounded-2xl border border-transparent bg-sidebar-accent/40 p-2.5 text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/25 hover:bg-destructive/8 hover:text-destructive"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // ── Expanded ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden">

      {/* ── Hero ── */}
      <div className="ib-sidebar-hero relative px-5 pt-6 pb-5 space-y-4">

        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/60 px-3 py-2 ib-portal-hero">
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src="/vinnexia-logo.svg"
              alt="Vinnexia"
              fill
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/vinnexia-logo-dark.svg"
              alt="Vinnexia"
              fill
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="grid flex-1 gap-0.5 text-left leading-tight">
            <span
              className={cn(
                "truncate font-cinzel text-[11px] font-bold uppercase tracking-[0.2em]",
                themeMode === "bright"
                  ? "text-[#48526b] [-webkit-text-stroke:0.5px_#48526b] [text-shadow:0_0_4px_rgba(72,82,107,0.25)]"
                  : "text-transparent [-webkit-text-stroke:0.5px_white] [text-shadow:0_0_4px_rgba(255,255,255,0.25)]"
              )}
            >
              Vinnexia Capital
            </span>
            <span className="truncate font-arvo text-[10px] font-bold tracking-wide text-[#FFB800]">
              Precision, Power, Performance
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-sidebar-border/40" />

        {/* Avatar + identity */}
        <div className="flex items-center gap-3.5">
          <Avatar className="h-14 w-14 shrink-0 border-2 border-sidebar-border shadow-md ring-2 ring-sidebar-primary/15">
            <AvatarFallback className="text-sidebar-primary-foreground text-base font-bold" style={avatarGradient}>
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm text-sidebar-foreground leading-tight">{userName}</p>
            <p className="text-[11px] text-sidebar-foreground/55 mt-0.5">
              Partner&nbsp;
              <span className="text-sidebar-primary font-medium">{partnerId}</span>
            </p>
          </div>
        </div>

        {/* Wallet balances */}
        <div className="ib-sidebar-balance relative rounded-2xl border border-sidebar-border/60 px-4 py-3.5">
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 mb-1">Main Wallet</p>
              <p className="text-sidebar-foreground font-bold text-base tabular-nums">
                {formatCurrency(clientWallet, currency)}
              </p>
            </div>
            <div className="pl-4 border-l border-sidebar-border/60">
              <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 mb-1">Partner Wallet</p>
              <p className="text-sidebar-foreground font-bold text-base tabular-nums">
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
            const Icon = item.icon
            const active = isActive(item.path)
            const isLastOdd = navItems.length % 2 !== 0 && index === navItems.length - 1

            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "ib-sidebar-nav-card group relative flex flex-col items-center justify-center gap-2.5 rounded-[20px] px-3 py-5 transition-all duration-200 text-center",
                  isLastOdd && "col-span-2 flex-row gap-3 py-3.5 justify-start px-5",
                  active
                    ? "ib-sidebar-nav-card-active"
                    : "bg-sidebar-accent/35 hover:bg-sidebar-accent/65 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                )}
              >
                {/* Icon container */}
                <div className={cn(
                  "flex items-center justify-center rounded-xl p-2 transition-colors duration-200",
                  active
                    ? "bg-sidebar-primary/15 text-sidebar-primary"
                    : "bg-sidebar-accent/60 text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                )}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn(
                  "text-[11px] font-medium leading-tight",
                  active ? "text-sidebar-foreground font-semibold" : ""
                )}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {active && (
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Footer actions ── */}
      <div className="shrink-0 px-4 pb-5 pt-2 space-y-2">
        <div className="h-px bg-sidebar-border/40 mb-3" />
        <button
          onClick={() => router.push("/dashboard")}
          className="group flex w-full items-center gap-3 rounded-2xl border border-sidebar-border/50 px-4 py-2.5 text-[12.5px] font-medium text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Client Portal
        </button>
        <button
          onClick={() => void sessionLogout()}
          className="group flex w-full items-center gap-3 rounded-2xl border border-sidebar-border/50 px-4 py-2.5 text-[12.5px] font-medium text-sidebar-foreground/60 transition-all duration-200 hover:border-destructive/30 hover:bg-destructive/8 hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </div>
  )
}