"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleDollarSign, RefreshCw, ShieldCheck } from "lucide-react";

import { IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { ibRequestsApi, type IbDirectRate } from "@/lib/api-trading-ib";
import { formatDateTimeInIST } from "@/lib/formatters";
import toast from "react-hot-toast";

const directRateNotes = [
  "Direct rates are assigned by admin based on your discussion with your upline partner and determine your commission per trade.",
  "Parent rate indicates the maximum rate available from your upline — your direct rate cannot exceed it.",
  "Rates are applied per account type and may differ across Standard, Cent, Copy Trading, and other account types.",
];

const formatRate = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `$${num}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDateTimeInIST(value);
};

const getStatusBadge = (status: number) =>
  status === 1 ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      Active
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
      Inactive
    </Badge>
  );

export default function IbCommissionsPage() {
  const { token } = useAuth();
  const [rates, setRates] = useState<IbDirectRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectRates = useCallback(async () => {
    if (!token) {
      setRates([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await ibRequestsApi.getDirectRates(token);

      if (!response.success) {
        throw new Error("Failed to load direct rates");
      }

      const ratesData = (response as unknown as { rates?: IbDirectRate[] }).rates;
      setRates(ratesData ?? []);
    } catch (err: unknown) {
      console.error("Failed to load direct rates:", err);
      const msg = getAdminFriendlyErrorMessage(err, { resource: "direct rates", action: "load" });
      setError(msg);
      toast.error(msg);
      setRates([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchDirectRates();
  }, [fetchDirectRates]);

  const activeCount = rates.filter((r) => r.status === 1).length;

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Partner Direct Rates"
        title="Direct Rates"
        description="View the direct commission rates assigned to you across each account type. Parent rates are set by your upline partner."
        actions={
          <Button variant="outline" onClick={() => void fetchDirectRates()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <IbSectionCard
        title="Your Direct Rates"
        description="Commission rates per account type assigned directly to your partner account."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              {rates.length} account {rates.length === 1 ? "type" : "types"}
            </Badge>
            {activeCount > 0 ? (
              <Badge className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {activeCount} active
              </Badge>
            ) : null}
          </div>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[24px]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <CircleDollarSign className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Failed to load direct rates</h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void fetchDirectRates()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : rates.length > 0 ? (
          <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="min-w-[140px]">Account Type</TableHead>
                    <TableHead className="text-right">Direct Rate</TableHead>
                    <TableHead className="text-right">Parent Rate</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.account_type_id}>
                      <TableCell className="font-medium">
                        {rate.account_type_name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRate(rate.direct_rate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRate(rate.parent_direct_rate)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(rate.status)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDateTime(rate.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <CircleDollarSign className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No direct rates assigned</h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              No direct commission rates have been assigned to your account yet. Contact your upline partner for more details.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/15 p-5">
          <p className="text-sm font-semibold text-foreground">Notes</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {directRateNotes.map((note) => (
              <li key={note} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </IbSectionCard>
    </IbPageShell>
  );
}
