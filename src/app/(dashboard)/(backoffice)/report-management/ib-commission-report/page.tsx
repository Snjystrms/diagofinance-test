"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CalendarIcon, Landmark, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";

import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatAmount } from "@/lib/formatters";
import {
  adminIbCommissionReportApi,
  adminIbUsersApi,
  type AdminIbUser,
  type AdminIbUsersListData,
  type IbCommissionReportPayload,
} from "@/lib/api";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const getUsersFromResponse = (payload: unknown): AdminIbUser[] => {
  const payloadObj = payload as Record<string, unknown>;
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as AdminIbUser[];
  if (Array.isArray(payloadObj.items)) return payloadObj.items as AdminIbUser[];
  if (Array.isArray(payloadObj.users)) return payloadObj.users as AdminIbUser[];
  if (Array.isArray(payloadObj.data)) return payloadObj.data as AdminIbUser[];
  if (payloadObj.data && typeof payloadObj.data === "object") {
    const nested = payloadObj.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) return nested.items as AdminIbUser[];
    if (Array.isArray(nested.users)) return nested.users as AdminIbUser[];
    if (Array.isArray(nested.data)) return nested.data as AdminIbUser[];
  }
  return [];
};

const unwrapPayload = <T,>(response: T | { data?: T }): T =>
  response && typeof response === "object" && "data" in response
    ? (((response as { data?: T }).data ?? response) as T)
    : (response as T);

export default function IbCommissionReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "ibCommissionReport");
  const token =
    authCtx?.token ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [ibUsers, setIbUsers] = useState<AdminIbUser[]>([]);
  const [selectedIbUserId, setSelectedIbUserId] = useQueryState("user_id", parseAsString);
  const [fromDateStr, setFromDateStr] = useQueryState("date_from", parseAsString);
  const [toDateStr, setToDateStr] = useQueryState("date_to", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [report, setReport] = useState<IbCommissionReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  useEffect(() => {
    setFromDate(fromDateStr ? new Date(fromDateStr) : undefined);
  }, [fromDateStr]);

  useEffect(() => {
    setToDate(toDateStr ? new Date(toDateStr) : undefined);
  }, [toDateStr]);

  useEffect(() => {
    if (fromDate) {
      setFromDateStr(format(fromDate, "yyyy-MM-dd"));
    } else {
      setFromDateStr(null);
    }
  }, [fromDate, setFromDateStr]);

  useEffect(() => {
    if (toDate) {
      setToDateStr(format(toDate, "yyyy-MM-dd"));
    } else {
      setToDateStr(null);
    }
  }, [toDate, setToDateStr]);

  const loadIbUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await adminIbUsersApi.list({ token, page: 1, per_page: 10 });
      const payload = (response as { data?: unknown })?.data;
      const users = getUsersFromResponse(payload);
      setIbUsers(users);
    } catch (error) {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB users", action: "load" })
      );
    }
  }, [token]);

  const loadReport = useCallback(async () => {
    if (!token || !selectedIbUserId) {
      setLoading(false);
      setReport(null);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminIbCommissionReportApi.getCommissionLevelReport({
        token,
        user_id: selectedIbUserId,
        date_from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        date_to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      });
      setReport(unwrapPayload<IbCommissionReportPayload>(response as unknown as IbCommissionReportPayload));
    } catch (error) {
      setReport(null);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission report",
          action: "load",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [token, selectedIbUserId, fromDate, toDate]);

  useEffect(() => {
    void loadIbUsers();
  }, [loadIbUsers]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [fromDate, toDate]);

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view IB commission report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="IB Commission Report"
      titleIcon={<Landmark className="h-6 w-6 text-primary" />}
      description="View level-wise IB commissions with date filters"
      isLoading={loading}
      isEmpty={!report}
      error={loadError}
      onRefresh={() => void loadReport()}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Search className="h-4 w-4" />
              Filters
            </h2>
            {activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate(undefined);
                  setToDate(undefined);
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">IB User</Label>
              <Select value={selectedIbUserId ?? ""} onValueChange={setSelectedIbUserId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select IB user" />
                </SelectTrigger>
                <SelectContent>
                  {ibUsers.map((user) => (
                    <SelectItem key={String(user.id)} value={String(user.id)}>
                      {user.name || user.email || `User ${user.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {fromDate ? format(fromDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {toDate ? format(toDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {report ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Commission</p>
                <p className="mt-1 text-lg font-semibold">{formatAmount(report.summary.total_commission)}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Downline Users</p>
                <p className="mt-1 text-lg font-semibold">{report.summary.total_downline_users}</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Trades</p>
                <p className="mt-1 text-lg font-semibold">{report.summary.total_trade_count}</p>
              </div>
            </div>

            {report.levels.map((level) => (
              <div key={level.level} className="rounded-lg border bg-card">
                <div className="flex items-center justify-between border-b p-4">
                  <div>
                    <h3 className="text-base font-semibold">{level.level_label}</h3>
                    <p className="text-xs text-muted-foreground">
                      Users: {level.user_count} | Trades: {level.trade_count} | Days: {level.trade_days}
                    </p>
                  </div>
                  <Badge variant="secondary">Commission: {formatAmount(level.total_commission)}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-3 text-left font-medium">User</th>
                        <th className="p-3 text-left font-medium">Sponsor ID</th>
                        <th className="p-3 text-left font-medium">Volume</th>
                        <th className="p-3 text-left font-medium">Commission</th>
                        <th className="p-3 text-left font-medium">Trades</th>
                        <th className="p-3 text-left font-medium">Trade Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {level.users.map((user) => (
                        <tr key={user.user_id} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </td>
                          <td className="p-3">{user.sponsor_id || "—"}</td>
                          <td className="p-3">{formatAmount(user.volume)}</td>
                          <td className="p-3">{formatAmount(user.commission)}</td>
                          <td className="p-3">{user.trade_count}</td>
                          <td className="p-3">{user.trade_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </ReportPageWrapper>
  );
}
