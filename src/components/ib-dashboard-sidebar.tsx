"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { ibRequestsApi, type IbDashboardResponse, type IbWalletResponse } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  User, 
  Megaphone, 
  PieChart,
  Gem,
  Loader2
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"

export function IbDashboardSidebar() {
  const { user, token } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null)
  const [walletData, setWalletData] = useState<IbWalletResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!token) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      // Fetch both dashboard and wallet data in parallel
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

      if (dashboardResponse?.data) {
        setDashboardData(dashboardResponse.data)
      }

      if (walletResponse?.data) {
        setWalletData(walletResponse)
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
    { icon: ArrowLeftRight, label: "IB Internal Transfer", path: "/ib-dashboard/transfer" },
    { icon: User, label: "Client Summary", path: "/ib-dashboard/clients" },
    { icon: Megaphone, label: "Marketing Material", path: "/ib-dashboard/marketing" },
    { icon: PieChart, label: "Commissions Table", path: "/ib-dashboard/commissions" },
  ]

  const displayUser = dashboardData?.user || user
  const userName = displayUser?.name || "User"
  const partnerId = dashboardData?.partner_info?.partner_id || dashboardData?.user?.partner_id || "N/A"
  
  // Get wallet data from ib-wallet API (preferred) or fallback to dashboard API
  const clientWallet = walletData?.data?.client_wallet?.amount ?? dashboardData?.client_wallet?.balance ?? 0
  const partnerWallet = walletData?.data?.wallet_balance?.amount ?? dashboardData?.partner_wallet?.balance ?? 0
  const currency = walletData?.data?.client_wallet?.currency ?? 
                   walletData?.data?.wallet_balance?.currency ?? 
                   dashboardData?.client_wallet?.currency ?? 
                   dashboardData?.partner_wallet?.currency ?? 
                   "USD"
  const ibPlan = dashboardData?.partner_info?.ib_plan || "GOLD"

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
      <div className="flex flex-col items-center p-4 space-y-4">
        <Avatar className="h-12 w-12 border-2 border-gray-300 dark:border-gray-700">
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-sm font-bold">
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
                  "p-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                title={item.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top Section - Dark Theme */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6 space-y-4">
        {/* Tier Status */}
        <div className="flex items-center justify-center gap-2">
          <Gem className="h-4 w-4 text-green-400" />
          <span className="text-green-400 font-semibold text-sm uppercase">{ibPlan}</span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="h-20 w-20 border-2 border-white/20">
            <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xl font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* User Name */}
        <div className="text-center">
          <h3 className="font-bold text-lg">{userName}</h3>
        </div>

        {/* Partner ID */}
        <div className="text-center">
          <span className="text-white/80 text-sm">Partner ID: </span>
          <span className="text-cyan-400 font-semibold">{partnerId}</span>
        </div>

        {/* Wallet Balances */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 relative">
          <div className="grid grid-cols-2 gap-4">
            {/* Client Wallet */}
            <div className="text-center">
              <p className="text-white/80 text-xs mb-1">Client Wallet</p>
              <p className="text-white font-bold text-lg">
                {formatCurrency(clientWallet, currency)}
              </p>
            </div>

            {/* Partner Wallet */}
            <div className="text-center">
              <p className="text-white/80 text-xs mb-1">Partner Wallet</p>
              <p className="text-white font-bold text-lg">
                {formatCurrency(partnerWallet, currency)}
              </p>
            </div>
          </div>
          {/* Divider */}
          <div className="absolute left-1/2 top-2 bottom-2 w-px bg-gray-700/50 transform -translate-x-1/2" />
        </div>
      </div>

      {/* Bottom Section - Light Theme */}
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
        <div className="grid grid-cols-2 gap-3">
          {navItems.map((item) => {
            const Icon = item.icon
            // Check if current path matches the item path
            // For dashboard, check if pathname is exactly /ib-dashboard or starts with /ib-dashboard but doesn't have additional paths
            const isActive = item.path === "/ib-dashboard" 
              ? (pathname === "/ib-dashboard" || (pathname?.startsWith("/ib-dashboard") && pathname.split("/").length === 2))
              : pathname === item.path || pathname?.startsWith(item.path + "/")
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className={cn(
                  "h-6 w-6",
                  isActive ? "text-white" : "text-gray-600 dark:text-gray-400"
                )} />
                <span className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isActive ? "text-white" : "text-gray-700 dark:text-gray-300"
                )}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

