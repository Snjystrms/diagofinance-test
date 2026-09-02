"use client";

import { useState } from "react";
import { Eye, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { mt5AccountsApi, type MT5AccountBalance } from "@/lib/api-trading-ib";
import { formatAmount } from "../_lib/transaction-format";

interface TransactionBalanceCellProps {
  transaction: {
    wallet_type?: string | null;
    balance?: number | null;
    mt5_account_id?: string | null;
    wallet_currency?: string;
    wallet_balance?: number | null;
  };
}

export function TransactionBalanceCell({
  transaction,
}: TransactionBalanceCellProps) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  const isMt5 = transaction.wallet_type === "mt5";
  const mt5Login = transaction.mt5_account_id
    ? transaction.mt5_account_id.replace(/^MT/i, "")
    : "";

  const fetchBalance = async () => {
    if (!token || !mt5Login) return;
    setIsLoading(true);
    setHasError(false);

    try {
      const response = (await mt5AccountsApi.getAdminBalance(
        String(mt5Login),
        token,
      )) as unknown as MT5AccountBalance;
      if (response.success && response.equity !== undefined) {
        setLiveBalance(response.equity);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error("Failed to fetch MT5 balance:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const canFetch = Boolean(token && mt5Login);

  if (!isMt5) {
    return (
      <span className="tabular-nums text-sm text-muted-foreground whitespace-nowrap">
         {transaction.wallet_balance} {transaction.wallet_currency}
      </span>
    );
  }

  if (liveBalance !== null) {
    return (
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {formatAmount(liveBalance)} {transaction.wallet_currency}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => void fetchBalance()}
          disabled={isLoading || !canFetch}
        >
          <RefreshCw
            className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
    );
  }

  if (hasError) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void fetchBalance()}
        disabled={isLoading || !canFetch}
        className="text-red-600"
      >
        {isLoading ? (
          <Spinner className="h-3 w-3 mr-1" size="sm" />
        ) : (
          <RefreshCw className="h-3 w-3 mr-1" />
        )}
        Retry
      </Button>
    );
  }

  return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void fetchBalance()}
        disabled={isLoading || !canFetch}
      >
      {isLoading ? (
        <>
          <Spinner className="h-3 w-3 mr-1" size="sm" />
          Loading...
        </>
      ) : (
        <>
          <Eye className="h-3 w-3 mr-1" />
          Show Balance
        </>
      )}
    </Button>
  );
}