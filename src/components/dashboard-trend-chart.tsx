"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"
import { TrendingDown, TrendingUp } from "lucide-react"

type PeriodOption = {
  label: string
  value: "7d" | "1m"
  maxPoints: number
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "7D", value: "7d", maxPoints: 7 },
  { label: "1M", value: "1m", maxPoints: 30 },
]

export type WalletStatistic = {
  day: string
  date: string
  amount: number
}

type SelectOption = {
  label: string
  value: string
}

type DashboardTrendChartProps = {
  title: string
  subtitle: string
  icon: React.ReactNode
  stats: WalletStatistic[]
  lineColor: string
  primaryColor?: string
  selectOptions?: SelectOption[]
  emptyStateLabel?: string
  formatValue: (value: number) => string
  selectedPeriod?: PeriodOption["value"]
  onPeriodChange?: (period: PeriodOption["value"]) => void
}

export function DashboardTrendChart({
  title,
  subtitle,
  icon,
  stats,
  lineColor,
  primaryColor = "#22c55e",
  selectOptions = [{ label: "All Wallets", value: "all" }],
  emptyStateLabel = "No data available",
  formatValue,
  selectedPeriod: controlledPeriod,
  onPeriodChange,
}: DashboardTrendChartProps) {
  const [internalPeriod, setInternalPeriod] =
    React.useState<PeriodOption["value"]>("7d")
  
  // Track theme changes by observing class changes on document element
  const [themeVersion, setThemeVersion] = React.useState(0)
  
  React.useEffect(() => {
    if (typeof window === "undefined") return
    
    // Force re-computation when theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" || mutation.attributeName === "style") {
          setThemeVersion((v) => v + 1)
        }
      })
    })
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    })
    
    return () => observer.disconnect()
  }, [])
  
  // Use controlled period if provided, otherwise use internal state
  const selectedPeriod = controlledPeriod ?? internalPeriod
  
  // Resolve CSS variables to actual color values that SVG can render.
  // SVG stroke does NOT support oklch() or other modern color spaces —
  // we must always resolve to rgb() via the DOM element trick.
  const resolvedPrimaryColor = React.useMemo(() => {
    if (typeof window === "undefined") return primaryColor
    
    // If it's already a hex color, return as-is (hex is safe for SVG)
    if (primaryColor.startsWith("#")) {
      return primaryColor
    }
    
    // For everything else (CSS variables, oklch, hsl, rgb, etc.)
    // use the browser to compute the final rgb() value that SVG understands.
    const testEl = document.createElement("div")
    testEl.style.color = primaryColor
    testEl.style.visibility = "hidden"
    testEl.style.position = "absolute"
    document.body.appendChild(testEl)
    const computedColor = getComputedStyle(testEl).color
    document.body.removeChild(testEl)
    
    // getComputedStyle().color always returns rgb() or rgba() — safe for SVG
    return computedColor || primaryColor
  }, [primaryColor, themeVersion]) // Re-compute when theme changes
  
  // Get contrasting stroke color for activeDot based on theme
  const activeDotStroke = React.useMemo(() => {
    if (typeof window === "undefined") return "#ffffff"
    
    const root = document.documentElement
    const bgValue = getComputedStyle(root).getPropertyValue("--background").trim()
    // Default to white for light themes, dark for dark themes
    // A simple heuristic: if background is dark, use light stroke
    return bgValue.includes("0.145") || bgValue.includes("0.205") ? "#ffffff" : "#000000"
  }, [themeVersion]) // Re-compute when theme changes
  
  const handlePeriodChange = (period: PeriodOption["value"]) => {
    if (onPeriodChange) {
      onPeriodChange(period)
    } else {
      setInternalPeriod(period)
    }
  }
  
  const [selectedSource, setSelectedSource] = React.useState(
    selectOptions[0]?.value ?? "all",
  )

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      amount: {
        label: title,
        color: resolvedPrimaryColor,
      },
    }),
    [resolvedPrimaryColor, title],
  )

  const displayedStats = React.useMemo(() => {
    if (!stats?.length) return []
    const option =
      PERIOD_OPTIONS.find((period) => period.value === selectedPeriod) ??
      PERIOD_OPTIONS[0]
    if (!option) return stats

    if (stats.length <= option.maxPoints) {
      return stats
    }
    return stats.slice(stats.length - option.maxPoints)
  }, [stats, selectedPeriod])

  const chartData = React.useMemo(() => {
    return displayedStats.map((stat, index) => {
      // Format date from stat.date or stat.day
      let dateLabel = "";
      if (stat.date) {
        try {
          const date = new Date(stat.date);
          // Format as MM/DD for better readability
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          dateLabel = `${month}/${day}`;
        } catch (e) {
          // If date parsing fails, try to extract from day or use index
          dateLabel = stat.day?.slice(0, 3) || `${index + 1}`;
        }
      } else if (stat.day) {
        // If we have day but no date, try to parse day as date string
        try {
          const date = new Date(stat.day);
          if (!isNaN(date.getTime())) {
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            dateLabel = `${month}/${day}`;
          } else {
            dateLabel = stat.day.slice(0, 3);
          }
        } catch {
          dateLabel = stat.day.slice(0, 3);
        }
      } else {
        // Fallback to index if no date or day available
        dateLabel = `${index + 1}`;
      }
      
      return {
        time: index,
        amount: stat.amount,
        label: dateLabel,
      };
    });
  }, [displayedStats])

  const totalValue = React.useMemo(() => {
    if (!displayedStats.length) return 0
    return displayedStats.reduce((sum, stat) => sum + stat.amount, 0)
  }, [displayedStats])

  const changePercent = React.useMemo(() => {
    if (displayedStats.length < 2) return 0
    const first = displayedStats[0].amount
    const last = displayedStats[displayedStats.length - 1].amount
    if (first === 0) return 0
    return ((last - first) / Math.abs(first)) * 100
  }, [displayedStats])

  const highest = React.useMemo(() => {
    if (!displayedStats.length) return 0
    return Math.max(...displayedStats.map((stat) => stat.amount))
  }, [displayedStats])

  const lowest = React.useMemo(() => {
    if (!displayedStats.length) return 0
    return Math.min(...displayedStats.map((stat) => stat.amount))
  }, [displayedStats])

  const isPositive = changePercent >= 0

  // Get theme-aware color for XAxis ticks
  const tickColor = React.useMemo(() => {
    if (typeof window === "undefined") return "#71717a" // fallback for SSR
    // Create a test element to get the computed color
    const testEl = document.createElement("div")
    testEl.className = "text-muted-foreground"
    testEl.style.visibility = "hidden"
    testEl.style.position = "absolute"
    document.body.appendChild(testEl)
    const computedColor = getComputedStyle(testEl).color
    document.body.removeChild(testEl)
    
    // If we got a valid color, use it
    if (computedColor && computedColor !== "rgba(0, 0, 0, 0)" && computedColor !== "transparent") {
      return computedColor
    }
    
    // Fallback: try to get CSS variable value directly
    const root = document.documentElement
    const value = getComputedStyle(root).getPropertyValue("--muted-foreground").trim()
    if (value) {
      return value.startsWith("hsl") ? value : `hsl(${value})`
    }
    
    // Final fallback
    return "#71717a"
  }, [])

  return (
    <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-card via-card to-muted/20 shadow-lg backdrop-blur-sm group md:p-6">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 group-hover:opacity-75 transition-opacity pointer-events-none" />
      
      <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
        <CardTitle className="flex items-center gap-2.5 text-base font-bold leading-none">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            {icon}
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {title}
          </span>
        </CardTitle>

        {selectOptions.length > 1 && (
          <Select
            value={selectedSource}
            onValueChange={(value) => setSelectedSource(value)}
          >
            <SelectTrigger size="sm" className="w-full border-border/50 bg-background/50 backdrop-blur-sm md:w-[150px]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {selectOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      </CardHeader>

      <CardContent className="relative flex flex-col gap-4 p-0">
        <div className="group flex w-full -space-x-[1.5px] divide-x overflow-hidden rounded-lg border border-border/50 bg-muted/30 backdrop-blur-sm">
          {PERIOD_OPTIONS.map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              data-active={selectedPeriod === period.value}
              className={cn(
                "relative flex h-9 flex-1 items-center justify-center bg-transparent text-sm font-semibold tracking-[-0.006em] outline-none transition-all duration-200 first:rounded-l-lg last:rounded-r-lg",
                selectedPeriod === period.value
                  ? "bg-gradient-to-br from-primary/20 to-primary/10 text-foreground shadow-sm border-y border-primary/20"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>

        {displayedStats.length > 0 ? (
          <>
            <div className="flex flex-col gap-1.5 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-4 border border-border/30">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold tracking-[-0.006em] tabular-nums bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                  {formatValue(totalValue)}
                </span>
                <span
                  className={cn(
                    "inline-flex h-6 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold tracking-[-0.006em] whitespace-nowrap shadow-sm border",
                    isPositive
                      ? "bg-[#E0FAEC] text-[#22C55E] border-emerald-200/50 dark:bg-emerald-900/50 dark:border-emerald-800/50"
                      : "bg-rose-100 text-rose-600 border-rose-200/50 dark:bg-rose-900/40 dark:border-rose-800/50",
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(changePercent).toFixed(2)}%
                </span>
              </div>
              <p className="text-xs font-medium tracking-[-0.006em] text-muted-foreground uppercase">
                {subtitle}
              </p>
            </div>

            <div className="relative rounded-lg border border-border/30 bg-gradient-to-br from-background to-muted/10 p-3 shadow-inner">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[225px] w-full"
              >
                <LineChart accessibilityLayer data={chartData}>
                  <CartesianGrid 
                    vertical={false} 
                    stroke="hsl(var(--muted))" 
                    strokeDasharray="3 3"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ 
                      fontSize: 11,
                      fill: tickColor,
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
                  <ChartTooltip
                    content={<ChartTooltipContent hideIndicator hideLabel />}
                    cursor={{ stroke: resolvedPrimaryColor, strokeWidth: 1, strokeDasharray: "5 5" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke={resolvedPrimaryColor}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: resolvedPrimaryColor,
                      stroke: activeDotStroke,
                      strokeWidth: 2,
                      className: "drop-shadow-lg",
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>

            <div className="group flex w-full -space-x-[1.5px] divide-x overflow-hidden rounded-lg border border-border/50 bg-muted/20">
              <div className="relative flex h-9 flex-1 items-center justify-center bg-transparent text-sm font-semibold tracking-[-0.006em] outline-none first:rounded-l-lg last:rounded-r-lg transition-colors hover:bg-accent/50">
                <span className="font-medium text-muted-foreground">
                  Highest
                </span>
                <span className="ml-1.5 font-bold text-foreground">
                  {formatValue(highest)}
                </span>
              </div>

              <div className="relative flex h-9 flex-1 items-center justify-center bg-transparent text-sm font-semibold tracking-[-0.006em] outline-none first:rounded-l-lg last:rounded-r-lg transition-colors hover:bg-accent/50">
                <span className="font-medium text-muted-foreground">
                  Lowest
                </span>
                <span className="ml-1.5 font-bold text-foreground">
                  {formatValue(lowest)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[225px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10">
            <p className="text-sm text-muted-foreground font-medium">{emptyStateLabel}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

