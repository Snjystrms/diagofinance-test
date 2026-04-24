"use client";

import { useMemo, useState } from "react";
import { BadgeDollarSign, Bitcoin, Boxes, ChevronDown, Coins, RefreshCw } from "lucide-react";

import { IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CommissionRateRow = {
  level: string;
  ib: string;
  subIb1: string;
  subIb2: string;
  subIb3: string;
  subIb4: string;
  subIb5: string;
};

type CommissionAssetGroup = {
  id: string;
  name: string;
  icon: typeof Bitcoin;
  rows: CommissionRateRow[];
};

type CommissionAccountType = {
  id: string;
  name: string;
  groups: CommissionAssetGroup[];
};

const commissionPlans: CommissionAccountType[] = [
  {
    id: "standard-plus",
    name: "Standard Plus",
    groups: [
      {
        id: "bitcoin-plus",
        name: "Bitcoin Plus",
        icon: Bitcoin,
        rows: [
          { level: "IB", ib: "$5", subIb1: "-", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-1", ib: "$1.5", subIb1: "$3.5", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-2", ib: "$0.75", subIb1: "$0.75", subIb2: "$3.5", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-3", ib: "$0.5", subIb1: "$0.5", subIb2: "$1", subIb3: "$3", subIb4: "-", subIb5: "-" },
          { level: "Level-4", ib: "$0.5", subIb1: "$0.5", subIb2: "$0.5", subIb3: "$0.5", subIb4: "$3", subIb5: "-" },
          { level: "Level-5", ib: "$0.5", subIb1: "$0.5", subIb2: "$0.5", subIb3: "$0.5", subIb4: "$0.5", subIb5: "$2.5" },
        ],
      },
      {
        id: "commodities",
        name: "Commodities",
        icon: Boxes,
        rows: [
          { level: "IB", ib: "$2", subIb1: "-", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-1", ib: "$0.6", subIb1: "$1.4", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-2", ib: "$0.3", subIb1: "$0.3", subIb2: "$1.4", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-3", ib: "$0.2", subIb1: "$0.2", subIb2: "$0.4", subIb3: "$1.2", subIb4: "-", subIb5: "-" },
          { level: "Level-4", ib: "$0.2", subIb1: "$0.2", subIb2: "$0.2", subIb3: "$0.2", subIb4: "$1.2", subIb5: "-" },
          { level: "Level-5", ib: "$0.2", subIb1: "$0.2", subIb2: "$0.2", subIb3: "$0.2", subIb4: "$0.2", subIb5: "$1" },
        ],
      },
    ],
  },
  {
    id: "standard",
    name: "Standard",
    groups: [
      {
        id: "forex",
        name: "Forex",
        icon: BadgeDollarSign,
        rows: [
          { level: "IB", ib: "$10", subIb1: "-", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-1", ib: "$3", subIb1: "$7", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-2", ib: "$1.5", subIb1: "$1.5", subIb2: "$7", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-3", ib: "$1", subIb1: "$1", subIb2: "$2", subIb3: "$6", subIb4: "-", subIb5: "-" },
          { level: "Level-4", ib: "$0.75", subIb1: "$0.75", subIb2: "$0.75", subIb3: "$0.75", subIb4: "$5", subIb5: "-" },
          { level: "Level-5", ib: "$0.5", subIb1: "$0.5", subIb2: "$0.5", subIb3: "$0.5", subIb4: "$0.5", subIb5: "$4" },
        ],
      },
    ],
  },
  {
    id: "exclusive",
    name: "Exclusive",
    groups: [
      {
        id: "indices",
        name: "Indices",
        icon: Coins,
        rows: [
          { level: "IB", ib: "$8", subIb1: "-", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-1", ib: "$2.4", subIb1: "$5.6", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-2", ib: "$1.2", subIb1: "$1.2", subIb2: "$5.6", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-3", ib: "$0.8", subIb1: "$0.8", subIb2: "$1.6", subIb3: "$4.8", subIb4: "-", subIb5: "-" },
          { level: "Level-4", ib: "$0.6", subIb1: "$0.6", subIb2: "$0.6", subIb3: "$0.6", subIb4: "$4.2", subIb5: "-" },
          { level: "Level-5", ib: "$0.4", subIb1: "$0.4", subIb2: "$0.4", subIb3: "$0.4", subIb4: "$0.4", subIb5: "$3.4" },
        ],
      },
    ],
  },
  {
    id: "cent",
    name: "Cent",
    groups: [
      {
        id: "metals",
        name: "Metals",
        icon: Boxes,
        rows: [
          { level: "IB", ib: "$4", subIb1: "-", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-1", ib: "$1.2", subIb1: "$2.8", subIb2: "-", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-2", ib: "$0.6", subIb1: "$0.6", subIb2: "$2.8", subIb3: "-", subIb4: "-", subIb5: "-" },
          { level: "Level-3", ib: "$0.4", subIb1: "$0.4", subIb2: "$0.8", subIb3: "$2.4", subIb4: "-", subIb5: "-" },
          { level: "Level-4", ib: "$0.3", subIb1: "$0.3", subIb2: "$0.3", subIb3: "$0.3", subIb4: "$2", subIb5: "-" },
          { level: "Level-5", ib: "$0.2", subIb1: "$0.2", subIb2: "$0.2", subIb3: "$0.2", subIb4: "$0.2", subIb5: "$1.6" },
        ],
      },
    ],
  },
];

const commissionNotes = [
  "Commissions are calculated only for round-trip trades that remain open for at least three minutes.",
  "No commissions are paid for trades closed within three minutes of opening or trades executed as internal hedges.",
];

export default function IbCommissionsPage() {
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [assetGroupFilter, setAssetGroupFilter] = useState("all");

  const assetGroupOptions = useMemo(() => {
    const uniqueGroups = new Map<string, string>();
    for (const plan of commissionPlans) {
      for (const group of plan.groups) {
        uniqueGroups.set(group.id, group.name);
      }
    }
    return Array.from(uniqueGroups.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  const filteredPlans = useMemo(() => {
    return commissionPlans
      .filter((plan) => accountTypeFilter === "all" || plan.id === accountTypeFilter)
      .map((plan) => ({
        ...plan,
        groups: plan.groups.filter((group) => assetGroupFilter === "all" || group.id === assetGroupFilter),
      }))
      .filter((plan) => plan.groups.length > 0);
  }, [accountTypeFilter, assetGroupFilter]);

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="IB Commissions"
        title="Commission table"
        description="Review the payout matrix available inside the IB portal and filter by account type or asset group."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAccountTypeFilter("all");
                setAssetGroupFilter("all");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset filters
            </Button>
          </>
        }
      />

      <IbSectionCard
        title="Commission schedule"
        description="The table below mirrors the IB portal structure from your reference and is ready to be connected to a live API later."
        actions={
          <div className="flex flex-wrap gap-3">
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
                  {commissionPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[190px] space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Asset Group
              </p>
              <Select value={assetGroupFilter} onValueChange={setAssetGroupFilter}>
                <SelectTrigger className="w-full rounded-2xl">
                  <SelectValue placeholder="Show all asset groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show all</SelectItem>
                  {assetGroupOptions.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      >
        {filteredPlans.length > 0 ? (
          <Accordion
            type="multiple"
            defaultValue={filteredPlans.map((plan) => plan.id)}
            className="rounded-[24px] border border-border/60 bg-muted/10"
          >
            {filteredPlans.map((plan) => (
              <AccordionItem key={plan.id} value={plan.id} className="border-border/60 px-5">
                <AccordionTrigger className="py-5 text-left text-lg font-semibold hover:no-underline">
                  <div className="flex flex-1 items-center gap-3">
                    <span>{plan.name}</span>
                    <Badge variant="outline" className="rounded-full">
                      {plan.groups.length} {plan.groups.length === 1 ? "asset group" : "asset groups"}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-5">
                    {plan.groups.map((group) => {
                      const Icon = group.icon;
                      return (
                        <div
                          key={group.id}
                          className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-muted/25 px-5 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-background">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Asset Group
                                </p>
                                <p className="text-lg font-semibold text-foreground">{group.name}</p>
                              </div>
                            </div>
                            <Badge className="rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-background/70">
                              Live portal layout
                            </Badge>
                          </div>

                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/20">
                                  <TableHead className="min-w-[120px]">Level</TableHead>
                                  <TableHead>IB</TableHead>
                                  <TableHead>Sub-IB 1</TableHead>
                                  <TableHead>Sub-IB 2</TableHead>
                                  <TableHead>Sub-IB 3</TableHead>
                                  <TableHead>Sub-IB 4</TableHead>
                                  <TableHead>Sub-IB 5</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.rows.map((row) => (
                                  <TableRow key={`${group.id}-${row.level}`}>
                                    <TableCell className="font-medium">{row.level}</TableCell>
                                    <TableCell>{row.ib}</TableCell>
                                    <TableCell>{row.subIb1}</TableCell>
                                    <TableCell>{row.subIb2}</TableCell>
                                    <TableCell>{row.subIb3}</TableCell>
                                    <TableCell>{row.subIb4}</TableCell>
                                    <TableCell>{row.subIb5}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <ChevronDown className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No commission rows match this filter</h3>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Try another account type or asset group to view the available commission matrix.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-[24px] border border-border/60 bg-muted/15 p-5">
          <p className="text-sm font-semibold text-foreground">Notes</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {commissionNotes.map((note) => (
              <li key={note} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </IbSectionCard>
    </IbPageShell>
  );
}
