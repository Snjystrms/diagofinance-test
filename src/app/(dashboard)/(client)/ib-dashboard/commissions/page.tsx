"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Circle, Diamond, Layers, Plus, RefreshCw, SquareStack } from "lucide-react";

import { IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ibRequestsApi, type IbPlanCommission } from "@/lib/api-trading-ib";
import { useAuth } from "@/contexts/auth-context";

const commissionNotes = [
  "Commissions are calculated only for round-trip trades that remain open for at least three minutes.",
  "No commissions are paid for trades closed within three minutes of opening or trades executed as internal hedges.",
];

function formatRate(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num) || num === 0) return "-";
  return `$${num}`;
}

function getAccountTypeIcon(accountName: string) {
  const name = accountName.toLowerCase();
  if (name.includes("exclusive")) return Diamond;
  if (name.includes("cent")) return Circle;
  if (name.includes("shares")) return Layers;
  if (name.includes("plus")) return Plus;
  return SquareStack;
}

export default function IbCommissionsPage() {
  const { token } = useAuth();
  const [commissions, setCommissions] = useState<IbPlanCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");

  const fetchCommissions = useCallback(async () => {
    setError("Commission data is currently unavailable.");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchCommissions();
  }, [fetchCommissions]);

  const accountTypes = useMemo(() => {
    const names = Array.from(
      new Set(
        commissions
          .map((commission) => commission.account_type_name)
          .filter((name): name is string => Boolean(name))
      )
    );

    return names.map((name) => ({ id: name, name }));
  }, [commissions]);

  const filteredAccountTypes = useMemo(() => {
    if (accountTypeFilter === "all") return accountTypes;
    return accountTypes.filter((at) => at.id === accountTypeFilter);
  }, [accountTypes, accountTypeFilter]);

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Partner Commissions"
        title="Commission table"
        description="Review the live payout matrix for each account type available in the Partner portal."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setAccountTypeFilter("all");
              void fetchCommissions();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <IbSectionCard
        title="Commission Rates"
        description="Live commission rates by account type. Each level shows the payout for the Partner and up to 5 sub-Partner tiers."
        actions={
          <div className="min-w-[190px] space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account Type
            </p>
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-full rounded-2xl">
                <SelectValue placeholder="Show all account types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show all</SelectItem>
                {accountTypes.map((at) => (
                  <SelectItem key={at.id} value={at.id}>
                    {at.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => void fetchCommissions()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : filteredAccountTypes.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={filteredAccountTypes.map((at) => String(at.id))}
            className="rounded-[24px] border border-border/60 bg-muted/10"
          >
            {filteredAccountTypes.map((at) => {
              const accountTypeCommissions = commissions.filter(
                (commission) => commission.account_type_name === at.name
              );
              const AccountTypeIcon = getAccountTypeIcon(at.name);

              return (
                <AccordionItem
                  key={at.id}
                  value={at.id}
                  className="border-border/60 px-5"
                >
                  <AccordionTrigger className="py-5 text-left text-lg font-semibold hover:no-underline">
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                      <span>{at.name}</span>
                      <Badge variant="outline" className="rounded-full">
                        {accountTypeCommissions.length}{" "}
                        {accountTypeCommissions.length === 1 ? "level" : "levels"}
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-5">
                    {accountTypeCommissions.length > 0 ? (
                      <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-muted/25 px-5 py-4">
                          <div>
                            {/* <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Commission Rates
                            </p> */}
                            <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
                              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <AccountTypeIcon className="h-4 w-4" />
                              </span>
                              {at.name}
                            </p>
                            {/* {ibPlan?.name ? (
                              <p className="mt-1 text-xs text-muted-foreground">{ibPlan.name}</p>
                            ) : null} */}
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/20">
                                <TableHead className="min-w-[120px]">Level</TableHead>
                                <TableHead>Partner</TableHead>
                                <TableHead>Sub-Partner 1</TableHead>
                                <TableHead>Sub-Partner 2</TableHead>
                                <TableHead>Sub-Partner 3</TableHead>
                                <TableHead>Sub-Partner 4</TableHead>
                                <TableHead>Sub-Partner 5</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {accountTypeCommissions.map((c, index) => (
                                <TableRow key={`${at.id}-${c.level}-${index}`}>
                                  <TableCell className="font-medium">{c.level}</TableCell>
                                  <TableCell>{formatRate(c.rate_ib)}</TableCell>
                                  <TableCell>{formatRate(c.rate_sub_ib_1)}</TableCell>
                                  <TableCell>{formatRate(c.rate_sub_ib_2)}</TableCell>
                                  <TableCell>{formatRate(c.rate_sub_ib_3)}</TableCell>
                                  <TableCell>{formatRate(c.rate_sub_ib_4)}</TableCell>
                                  <TableCell>{formatRate(c.rate_sub_ib_5)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-[120px] items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 text-sm text-muted-foreground">
                        No commission levels configured for this account type.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <ChevronDown className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No commission plans found</h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              No commission data is currently available for your IB plan.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/15 p-5">
          <p className="text-sm font-semibold text-foreground">Notes</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {commissionNotes.map((note) => (
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
