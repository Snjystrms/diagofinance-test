import Link from 'next/link';
import {
  ArrowRight,
  Circle,
  Diamond,
  Layers,
  Plus,
  SquareStack,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/lib/api';

type AccountTypeCardGridProps = {
  accountTypes: AccountType[];
  className?: string;
};

const getAccountIcon = (accountName: string) => {
  const name = accountName.toLowerCase();
  if (name.includes('exclusive')) return Diamond;
  if (name.includes('cent')) return Circle;
  if (name.includes('shares')) return Layers;
  if (name.includes('plus')) return Plus;
  return SquareStack;
};

const getMinimumDeposit = (accountName: string): string => {
  const name = accountName.toLowerCase();
  if (name.includes('exclusive')) return '$500';
  if (name.includes('standard plus')) return '$200';
  if (name.includes('standard')) return '$50';
  if (name.includes('cent')) return '$10';
  if (name.includes('shares')) return '$1000';
  return '$100';
};

export function AccountTypeCardGrid({
  accountTypes,
  className,
}: AccountTypeCardGridProps) {
  return (
    <div className={cn('grid gap-6 md:grid-cols-2 lg:grid-cols-3', className)}>
      {accountTypes.map((accountType) => {
        const Icon = getAccountIcon(accountType.name);
        const minimumDeposit = getMinimumDeposit(accountType.name);

        return (
          <Card key={accountType.id} className="flex flex-col">
            <CardHeader className="rounded-t-xl bg-primary/10 px-6 py-4 dark:bg-primary/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{accountType.name}</h3>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4 px-6 py-6">
              <div className="border-b pb-2">
                <div className="text-sm text-muted-foreground">Minimum Deposit</div>
                <div className="text-xl font-bold">{minimumDeposit}</div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Maximum Leverage:</span>
                  <span className="text-sm font-medium">{accountType.maximum_leverage}</span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Leverage Value:</span>
                  <span className="text-sm font-medium">{accountType.leverage_value ?? '-'}</span>
                </div>
              </div>

              <div className="mt-auto space-y-2 border-t pt-4">
                {accountType.groups?.demo && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link
                      href={`/my_accounts/open-trading-account?mode=demo&type=${encodeURIComponent(accountType.name)}`}
                    >
                      Create Demo Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {accountType.groups?.live && (
                  <Button className="w-full" asChild>
                    <Link
                      href={`/my_accounts/open-trading-account?mode=live&type=${encodeURIComponent(accountType.name)}`}
                    >
                      Create Live Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
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
  );
}
