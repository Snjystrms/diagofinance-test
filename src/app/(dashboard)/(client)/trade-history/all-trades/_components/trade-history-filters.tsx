"use client";

import { Search } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserMT5AccountListItem } from "@/lib/api";

import { DatePickerButton } from "./date-picker-button";

type TradeHistoryFiltersProps = {
  accounts: UserMT5AccountListItem[];
  fromDt?: Date;
  isLoadingAccounts: boolean;
  isLoadingTrades: boolean;
  login: string;
  onFromDateChange: (date: Date | undefined) => void;
  onLoginChange: (value: string) => void;
  onPerPageChange: (value: number) => void;
  onToDateChange: (date: Date | undefined) => void;
  perPage: number;
  toDt?: Date;
};

export function TradeHistoryFilters({
  accounts,
  fromDt,
  isLoadingAccounts,
  isLoadingTrades,
  login,
  onFromDateChange,
  onLoginChange,
  onPerPageChange,
  onToDateChange,
  perPage,
  toDt,
}: TradeHistoryFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Filters
        </CardTitle>
        <CardDescription>
          Choose account, date range, and page size.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {accounts.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="linked-mt5-login">Linked Account</Label>

              <Select
                value={login ? String(login) : undefined}
                onValueChange={onLoginChange}
                disabled={isLoadingAccounts || isLoadingTrades}
              >
                <SelectTrigger
                  id="linked-mt5-login"
                  className="w-full max-w-[260px]"
                >
                  <SelectValue placeholder="Select MT5 login" />
                </SelectTrigger>

                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.mt5_id)}>
                      {account.mt5_id} - {account.account_id} -{" "}
                      {account.account_mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="mt5-login">MT5 Login</Label>
            <Input
              id="mt5-login"
              inputMode="numeric"
              value={login}
              onChange={(event) => onLoginChange(event.target.value)}
              placeholder="Enter login, e.g. 111096"
              disabled={isLoadingTrades}
            />
          </div>

          <div className="space-y-2">
            <Label>From Date</Label>
            <DatePickerButton
              date={fromDt}
              onSelect={onFromDateChange}
              placeholder="Select start date"
              disabled={isLoadingTrades}
            />
          </div>

          <div className="space-y-2">
            <Label>To Date</Label>
            <DatePickerButton
              date={toDt}
              onSelect={onToDateChange}
              placeholder="Select end date"
              disabled={isLoadingTrades}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
