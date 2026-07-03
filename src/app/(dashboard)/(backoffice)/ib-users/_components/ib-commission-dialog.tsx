"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CalendarIcon, Landmark, Search } from "lucide-react";

import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatAmount } from "@/lib/formatters";
import {
  adminIbCommissionReportApi,
  type AdminIbUser,
  type IbCommissionReportPayload,
} from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const unwrapPayload = <T,>(response: T | { data?: T }): T =>
  response && typeof response === "object" && "data" in response
    ? (((response as { data?: T }).data ?? response) as T)
    : (response as T);

interface IbCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminIbUser | null;
  token: string;
}

export function IbCommissionDialog({
  open,
  onOpenChange,
  user,
  token,
}: IbCommissionDialogProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [report, setReport] = useState<IbCommissionReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  const loadReport = useCallback(async () => {
    if (!token || !user) {
      setReport(null);
      setLoading(false);
      return;
    }

    const userId = user.id ?? user.uuid;
    if (!userId) {
      toast.error("User ID not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const response =
        await adminIbCommissionReportApi.getCommissionLevelReport({
          token,
          user_id: String(userId),
          date_from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
          date_to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        });
      setReport(
        unwrapPayload<IbCommissionReportPayload>(
          response as unknown as IbCommissionReportPayload,
        ),
      );
    } catch (error) {
      setReport(null);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission report",
          action: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [token, user, fromDate, toDate]);

  useEffect(() => {
    if (open && user) {
      void loadReport();
    }
  }, [open, user, loadReport]);

  useEffect(() => {
    if (open) {
      setFromDate(undefined);
      setToDate(undefined);
      setReport(null);
      setLoadError(null);
    }
  }, [open]);

  const activeFilterCount = (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const deriveUserName = (u: AdminIbUser) =>
    u.name || u.email || `User ${u.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            IB Commission Report
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Commission report for ${deriveUserName(user)}`
              : "Select a user to view commission report"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Filters */}
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-3.5 w-3.5" />
                Date Filters
              </h3>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  From Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !fromDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {fromDate ? (
                        format(fromDate, "MMM dd, yyyy")
                      ) : (
                        <span>Select date</span>
                      )}
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
                <Label className="text-xs font-medium text-muted-foreground">
                  To Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal",
                        !toDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {toDate ? (
                        format(toDate, "MMM dd, yyyy")
                      ) : (
                        <span>Select date</span>
                      )}
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

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading commission report...
              </span>
            </div>
          ) : null}

          {/* Error */}
          {!loading && loadError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load commission report. Please try again.
            </div>
          ) : null}

          {/* Report */}
          {report ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Total Commission
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatAmount(report.summary.total_commission)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">
                    Total Downline Users
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {report.summary.total_downline_users}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs text-muted-foreground">Total Trades</p>
                  <p className="mt-1 text-lg font-semibold">
                    {report.summary.total_trade_count}
                  </p>
                </div>
              </div>

              {report.levels.map((level) => (
                <div key={level.level} className="rounded-lg border bg-card">
                  <div className="flex items-center justify-between border-b p-4">
                    <div>
                      <h3 className="text-base font-semibold">
                        {level.level_label === "IB"
                          ? "Partner"
                          : level.level_label}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Users: {level.user_count} | Trades: {level.trade_count}{" "}
                        | Days: {level.trade_days}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      Commission: {formatAmount(level.total_commission)}
                    </Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="p-3 text-left font-medium">User</th>
                          <th className="p-3 text-left font-medium">
                            Sponsor ID
                          </th>
                          <th className="p-3 text-left font-medium">Volume</th>
                          <th className="p-3 text-left font-medium">
                            Commission
                          </th>
                          <th className="p-3 text-left font-medium">Trades</th>
                          <th className="p-3 text-left font-medium">
                            Trade Days
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {level.users.map((u) => (
                          <tr key={u.user_id} className="border-t">
                            <td className="p-3">
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {u.email}
                              </div>
                            </td>
                            <td className="p-3">{u.sponsor_id || "\u2014"}</td>
                            <td className="p-3">{formatAmount(u.volume)}</td>
                            <td className="p-3">
                              {formatAmount(u.commission)}
                            </td>
                            <td className="p-3">{u.trade_count}</td>
                            <td className="p-3">{u.trade_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          ) : null}

          {/* Empty state */}
          {!loading && !report && !loadError ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground">
                {user
                  ? "No commission data available for this user."
                  : "No user selected."}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
