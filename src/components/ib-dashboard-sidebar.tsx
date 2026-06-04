"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ibRequestsApi, type IbDashboardResponse, type IbWalletData } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  ArrowLeft,
  Users, 
  PieChart,
  Gem,
  Loader2,
  LogOut
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { getFallbackIbWalletData, getIbWalletSnapshot, normalizeIbWalletData } from "@/lib/ib"
import { useSessionLogout } from "@/hooks/use-session-logout"

export function IbDashboardSidebar() {
  const { user, token } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const sessionLogout = useSessionLogout()
  const isCollapsed = state === "collapsed"
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null)
  const [walletData, setWalletData] = useState<IbWalletData | null>(null)
  const [ibPlanName, setIbPlanName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      // Fetch both dashboard and wallet data in parallel
      const [dashboardResponse, walletResponse, ibPlanResponse] = await Promise.all([
        ibRequestsApi.getDashboard(token).catch((err) => {
          console.error("Failed to fetch IB dashboard:", err)
          return null
        }),
        ibRequestsApi.getIbWallet(token).catch((err) => {
          console.error("Failed to fetch IB wallet:", err)
          return null
        }),
        ibRequestsApi.getPlan(token).catch((err) => {
          console.error("Failed to fetch IB plan:", err)
          return null
        }),
      ])

      if (dashboardResponse?.data) {
        setDashboardData(dashboardResponse.data)
      }

      if (walletResponse?.success) {
        setWalletData(normalizeIbWalletData(walletResponse.data) ?? getFallbackIbWalletData())
      } else if (!dashboardResponse?.data) {
        setWalletData(getFallbackIbWalletData())
      }

      if (ibPlanResponse?.success && ibPlanResponse.data?.ib_plan?.name) {
        setIbPlanName(ibPlanResponse.data.ib_plan.name)
      }
    } catch (err) {
      console.error("Failed to fetch IB data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Get user initials
  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Navigation items
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/ib-dashboard" },
    { icon: Wallet, label: "Wallet", path: "/ib-dashboard/wallet" },
    { icon: ArrowLeftRight, label: "Internal Transfer", path: "/ib-dashboard/transfer" },
    { icon: Users, label: "Client Summary", path: "/ib-dashboard/clients" },
    { icon: PieChart, label: "Commissions Table", path: "/ib-dashboard/commissions" },
  ]

  const displayUser = dashboardData?.user || user
  const userName = displayUser?.name || "User"
  const partnerId = dashboardData?.partner_info?.partner_id || dashboardData?.user?.partner_id || "N/A"
  
  // Get wallet data from ib-wallet API (preferred) or fallback to dashboard API
  const walletSnapshot = getIbWalletSnapshot(walletData, dashboardData)
  const clientWallet = walletSnapshot.clientWallet.amount
  const partnerWallet = walletSnapshot.partnerWallet.amount
  const currency = walletSnapshot.currency
  const ibPlan = ibPlanName || dashboardData?.partner_info?.ib_plan || "GOLD"
  const avatarGradient = {
    backgroundImage:
      "linear-gradient(135deg, color-mix(in srgb, var(--sidebar-primary) 86%, white 14%) 0%, color-mix(in srgb, var(--accent) 62%, var(--sidebar-primary) 38%) 100%)",
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Collapsed state - show minimal info
  if (isCollapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-4 bg-sidebar px-3 py-5 text-sidebar-foreground">
        <Avatar className="h-12 w-12 border border-sidebar-border shadow-sm">
          <AvatarFallback className="text-sidebar-primary-foreground text-sm font-bold" style={avatarGradient}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.path === "/ib-dashboard" 
              ? (pathname === "/ib-dashboard" || (pathname?.startsWith("/ib-dashboard") && pathname.split("/").length === 2))
              : pathname === item.path || pathname?.startsWith(item.path + "/")
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "rounded-2xl border p-2.5 transition-all duration-200",
                  isActive
                    ? "border-sidebar-primary/35 bg-sidebar-accent/80 text-sidebar-foreground shadow-sm"
                    : "border-sidebar-border bg-sidebar-accent/45 text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}
        </div>
       <button
          onClick={() => router.push("/dashboard")}
          className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-2.5 text-sidebar-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          title="Client Portal"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => void sessionLogout()}
          className="rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-2.5 text-sidebar-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          title="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="ib-sidebar-hero p-6 space-y-5">
        <div className="flex items-center justify-center gap-2">
          <Gem className="h-4 w-4 text-sidebar-primary" />
          <span className="text-sidebar-primary font-semibold text-sm uppercase tracking-[0.24em]">{ibPlan}</span>
        </div>

        <div className="flex justify-center">
          <Avatar className="h-20 w-20 border border-sidebar-border shadow-lg">
            <AvatarFallback className="text-sidebar-primary-foreground text-xl font-bold" style={avatarGradient}>
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="text-center">
          <h3 className="font-bold text-lg text-sidebar-foreground">{userName}</h3>
        </div>

        <div className="text-center">
          <span className="text-sidebar-foreground/70 text-sm">Partner ID: </span>
          <span className="text-sidebar-primary font-semibold">{partnerId}</span>
        </div>

        <div className="ib-sidebar-balance relative rounded-3xl p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sidebar-foreground/70 text-[11px] uppercase tracking-[0.2em] mb-2">Main Wallet</p>
              <p className="text-sidebar-foreground font-bold text-lg">
                {formatCurrency(clientWallet, currency)}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sidebar-foreground/70 text-[11px] uppercase tracking-[0.2em] mb-2">Partner Wallet</p>
              <p className="text-sidebar-foreground font-bold text-lg">
                {formatCurrency(partnerWallet, currency)}
              </p>
            </div>
          </div>
          <div className="absolute left-1/2 top-3 bottom-3 w-px bg-sidebar-border/70 transform -translate-x-1/2" />
        </div>
      </div>

      <div className="ib-sidebar-grid flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = item.path === "/ib-dashboard" 
              ? (pathname === "/ib-dashboard" || (pathname?.startsWith("/ib-dashboard") && pathname.split("/").length === 2))
              : pathname === item.path || pathname?.startsWith(item.path + "/")
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "ib-sidebar-nav-card flex min-h-[108px] flex-col items-center justify-center gap-2 rounded-[24px] p-4 transition-all duration-200",
                  navItems.length % 2 !== 0 && index === navItems.length - 1 && "col-span-2",
                  isActive
                    ? "ib-sidebar-nav-card-active"
                    : "text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-6 w-6",
                  isActive ? "text-sidebar-foreground" : "text-primary"
                )} />
                <span className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isActive ? "text-sidebar-foreground" : "text-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

     <div className="p-4 pt-0 space-y-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-sidebar-border/60 bg-transparent px-4 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          <ArrowLeft className="h-4 w-4" />
          Client Portal
        </button>
        <button
          onClick={() => void sessionLogout()}
          className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-sidebar-border/60 bg-transparent px-4 py-3 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </div>
  )
}




