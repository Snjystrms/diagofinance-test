'use client';

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Circle,
  Diamond,
  Layers,
  Plus,
  SquareStack,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { AccountType } from "@/lib/api";
import { AccountCreationDialog } from "./account-creation-dialog";

type AccountTypeCardGridProps = {
  accountTypes: AccountType[];
  className?: string;
};

const getAccountIcon = (accountName: string) => {
  const name = accountName.toLowerCase();
  if (name.includes("exclusive")) return Diamond;
  if (name.includes("cent")) return Circle;
  if (name.includes("shares")) return Layers;
  if (name.includes("plus")) return Plus;
  return SquareStack;
};

export function AccountTypeCardGrid({
  accountTypes,
  className,
}: AccountTypeCardGridProps) {
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
  const [selectedMode, setSelectedMode] = useState<'live' | 'demo'>('live');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleOpenDialog = (accountType: AccountType, mode: 'live' | 'demo') => {
    setSelectedAccountType(accountType);
    setSelectedMode(mode);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {accountTypes.map((accountType) => {
        const Icon = getAccountIcon(accountType.name);
        const minimumDeposit = formatCurrency(accountType.minimum_deposit);

        return (
         <Card key={accountType.id} className="flex flex-col overflow-hidden">
           <CardHeader className="bg-primary/10 px-6 py-4 dark:bg-primary/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Image 
                    src="/metatrader-5.svg" 
                    alt="MetaTrader 5" 
                    width={40} 
                    height={40}
                  />
                </div>
                <h3 className="text-lg font-semibold">{accountType.name}</h3>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4 px-6 py-6">
              <div className="border-b pb-2">
                <div className="text-sm text-muted-foreground">
                  First Time Deposit
                </div>
                <div className="text-xl font-bold">{minimumDeposit}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Maximum Leverage:
                  </span>
                  <span className="text-sm font-medium">
                    {accountType.maximum_leverage}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">
                    Leverage Value:
                  </span>
                  <span className="text-sm font-medium">
                    {accountType.leverage_value ?? "-"}
                  </span>
                </div>
              </div>

              <div className="mt-auto space-y-2 border-t pt-4">
                {accountType.groups?.demo && (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleOpenDialog(accountType, 'demo')}
                  >
                    <span className="flex min-w-0 items-center justify-center gap-2">
                      <span className="truncate">Create Demo Account</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </span>
                  </Button>
                )}
                {accountType.groups?.live && (
                  <Button 
                    className="w-full"
                    onClick={() => handleOpenDialog(accountType, 'live')}
                  >
                    <span className="flex min-w-0 items-center justify-center gap-2">
                      <span className="truncate">Create Live Account</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </span>
                  </Button>
                )}
                {!accountType.groups?.live && !accountType.groups?.demo && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    No trading groups available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>

    {/* Account Creation Dialog */}
    {selectedAccountType && (
      <AccountCreationDialog
        accountType={selectedAccountType}
        mode={selectedMode}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    )}
  </>
  );
}
