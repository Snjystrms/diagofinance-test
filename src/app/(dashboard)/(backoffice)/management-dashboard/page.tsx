"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Users,
  LayoutDashboard
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { IbPageHeader } from "@/components/ib/ib-page-primitives";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminManagementReportApi,
  type ManagementReportResponse,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTimeInIST } from "@/lib/formatters";
import { FALLBACK_COUNTRY_OPTIONS } from "@/lib/country-options";
import { ProtectedRoute } from "@/components/protected-route";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCurrency = (value?: number | string | null) => {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(num)) return "—";
  return `${currencyFormatter.format(num)} USD`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  try {
    return formatDateTimeInIST(value);
  } catch {
    return value;
  }
};

export default function ManagementDashboardPage() {
  const { token } = useAuth();
  const { isManager, hasFeature } = useManagerPermissions();
  const canView = !isManager || hasFeature("reportManagement", "depositReport");

  const [country, setCountry] = useState("__all__");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [data, setData] = useState<ManagementReportResponse | null>(null);

  const countryOptions = useMemo(
    () =>
      [...FALLBACK_COUNTRY_OPTIONS].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    [],
  );

  const loadReport = useCallback(async () => {
    const authToken =
      token ||
      (typeof window !== "undefined"
        ? localStorage.getItem("auth_token") || ""
        : "");

    if (!authToken) {
      setLoading(false);
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await adminManagementReportApi.list({
        token: authToken,
        country:
          country && country !== "__all__"
            ? country.trim() || undefined
            : undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      });
      setData(response as ManagementReportResponse);
    } catch (err) {
      console.error("Failed to load management report", err);
      setError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "management report",
          action: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [country, fromDate, toDate, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const summary = useMemo(() => {
    const d = data?.data;
    return (
      data?.summary ??
      d?.summary ?? {
        total_clients: d?.total_clients,
        total_deposit: d?.total_deposit,
        total_withdraw: d?.total_withdraw,
        net_deposit: d?.net_deposit,
        total_lots: d?.total_lots,
        total_ib_commission: d?.total_ib_commission,
      }
    );
  }, [data]);
  const chartRows = useMemo(
    () =>
      data?.country_wise_deposit_chart ??
      data?.country_wise_deposit ??
      data?.chart_data ??
      data?.data?.country_wise_deposit_chart ??
      data?.data?.country_wise_deposit ??
      data?.data?.chart_data ??
      [],
    [data],
  );
  const topDepositors = useMemo(
    () => data?.top_10_depositor ?? data?.data?.top_10_depositor ?? [],
    [data],
  );
  const topWithdrawals = useMemo(
    () => data?.top_10_withdrawals ?? data?.data?.top_10_withdrawals ?? [],
    [data],
  );

  if (!canView) {
    return (
      <ProtectedRoute>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="rounded-xl border border-border/70 bg-card px-8 py-6 text-center shadow-sm">
            <p className="text-sm font-semibold">
              You do not have access to this page.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6 p-1">
        <IbPageHeader
          eyebrow="Management overview"
          title="Management Dashboard"
          description="Monitor platform activity, deposits, withdrawals, and top contributors for the selected period."
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadReport()}
              disabled={loading}
            >
              <RefreshCw
                className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"}
              />
              Refresh
            </Button>
          }
        />

        <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm lg:flex-row lg:items-end">
          <div className="grid flex-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="country-filter">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country-filter" className="w-full">
                  <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All countries</SelectItem>
                  {countryOptions.map((countryOption) => (
                    <SelectItem
                      key={countryOption.iso2}
                      value={countryOption.name}
                    >
                      {countryOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              fromLabel="From date"
              toLabel="To date"
              className="flex-col sm:flex-row"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCountry("__all__");
                setFromDate(undefined);
                setToDate(undefined);
              }}
            >
              Clear
            </Button>
            <Button onClick={() => void loadReport()}>Apply</Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-border/70">
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-28 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <ApiErrorState
            title="Unable to load management report"
            message={getAdminFriendlyErrorMessage(error, {
              resource: "management report",
              action: "load",
            })}
          />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                icon={Users}
                title="Total Clients"
                value={formatCurrency(summary.total_clients)}
                ibVariant="ib-portal-surface-primary"
              />
              <SummaryCard
                icon={CircleDollarSign}
                title="Total Deposit"
                value={formatCurrency(summary.total_deposit)}
                ibVariant="ib-portal-surface-emerald"
              />
              <SummaryCard
                icon={ArrowDownLeft}
                title="Total Withdraw"
                value={formatCurrency(summary.total_withdraw)}
                ibVariant="ib-portal-surface-amber"
              />
              <SummaryCard
                icon={TrendingUp}
                title="Net Deposit"
                value={formatCurrency(summary.net_deposit)}
                ibVariant="ib-portal-surface-primary"
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <Card className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Country-wise deposit activity
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Deposit volume by country for the selected range.
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {chartRows.length ? (
                    <div className="space-y-3">
                      {chartRows.map((row, index) => (
                        <div
                          key={`${row.country ?? row.name ?? "row"}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                        >
                          <p className="text-sm font-medium">
                            {row.country ??
                              row.name ??
                              row.label ??
                              "Unknown"}
                          </p>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(
                                row.total_deposit ??
                                  row.deposit ??
                                  row.value ??
                                  row.amount,
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No chart data found for the selected filter.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Key totals</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Additional platform metrics.
                    </p>
                  </div>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricRow
                    label="Total lots"
                    value={formatCurrency(summary.total_lots)}
                    icon={BarChart3}
                  />
                  <MetricRow
                    label="IB commission"
                    value={formatCurrency(summary.total_ib_commission)}
                    icon={CreditCard}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Top depositors</CardTitle>
                </CardHeader>
                <CardContent>
                  {topDepositors.length ? (
                    <div className="space-y-3">
                      {topDepositors.map((row, index) => (
                        <div
                          key={`depositor-${row.uuid ?? row.id ?? index}`}
                          className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/new-users/${row.id}`}
                              className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                            >
                              {row.name ??
                                row.marketing_name ??
                                row.username ??
                                `User ${index + 1}`}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.email ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.country ?? "—"}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold">
                            {formatCurrency(
                              row.total_deposit ?? row.deposit ?? row.amount,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No top depositors available.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Top withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  {topWithdrawals.length ? (
                    <div className="space-y-3">
                      {topWithdrawals.map((row, index) => (
                        <div
                          key={`withdrawal-${row.uuid ?? row.id ?? index}`}
                          className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/new-users/${row.id}`}
                              className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                            >
                              {row.name ??
                                row.marketing_name ??
                                row.username ??
                                `User ${index + 1}`}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.email ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {row.country ?? "—"}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold">
                            {formatCurrency(
                              row.total_withdraw ?? row.withdraw ?? row.amount,
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No top withdrawals available.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  ibVariant,
}: {
  icon: typeof Users;
  title: string;
  value: string;
  ibVariant: string;
}) {
  return (
    <Card
      className={`relative h-full overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ${ibVariant}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground leading-tight">
            {title}
          </p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
