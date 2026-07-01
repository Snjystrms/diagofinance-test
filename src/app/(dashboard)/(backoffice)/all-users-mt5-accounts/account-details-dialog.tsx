"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminMT5Account } from "@/lib/api";
import { adminMT5AccountsApi, mt5AccountsApi, type MT5AccountBalance } from "@/lib/api-trading-ib";
import { useAuth } from "@/contexts/auth-context";
import { formatDateTimeInIST } from "@/lib/formatters";

interface AccountDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdminMT5Account | null;
  loading?: boolean;
}

const emptyValue = "-";

const displayValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return emptyValue;
  return String(value);
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return emptyValue;
  return formatDateTimeInIST(value);
};

const statusLabel = (status: AdminMT5Account["status"]) => {
  const value = typeof status === "string" ? status.toLowerCase() : status;
  return value === 1 || value === "1" || value === "active" ? "Active" : "Inactive";
};

const getName = (account: AdminMT5Account) => {
  if (account.name) return account.name;
  const user = account.user ?? account.User;
  if (user?.name) return user.name;
  const firstName = account.first_name ?? user?.first_name;
  const lastName = account.last_name ?? user?.last_name;
  return [firstName, lastName].filter(Boolean).join(" ").trim() || emptyValue;
};

const getAccountTypeName = (account: AdminMT5Account) => {
  return account.accountType?.name ?? account.AdminMT5AccountType?.name ?? account.account_type ?? emptyValue;
};

const getMt5BalanceCurrency = (account: AdminMT5Account) =>
  getAccountTypeName(account).trim().toLowerCase() === "cent" ? "USC" : "USD";

const formatWalletBalance = (account: AdminMT5Account, liveBalance?: number | null, fetchFailed?: boolean) => {
  // If API failed, return "-"
  if (fetchFailed) {
    return emptyValue;
  }
  
  // Use live balance if available (API returns correct value)
  if (liveBalance !== null && liveBalance !== undefined) {
    const currency = getMt5BalanceCurrency(account);
    return `${displayValue(liveBalance)} ${currency}`;
  }
  
  // Fallback to cached balance
  if (account.self_wallet === undefined || account.self_wallet === null) {
    return emptyValue;
  }
  const isCent = getAccountTypeName(account).trim().toLowerCase() === "cent";
  const balance = isCent ? account.self_wallet * 100 : account.self_wallet;
  return `${displayValue(balance)} ${getMt5BalanceCurrency(account)}`;
};

const DetailItem = ({ label, value }: { label: string; value: unknown }) => (
  <div className="space-y-1 rounded-md border bg-background p-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium text-foreground">{displayValue(value)}</dd>
  </div>
);

export function AccountDetailsDialog({
  open,
  onOpenChange,
  account,
  loading = false,
}: AccountDetailsDialogProps) {
  const { token } = useAuth();
  const [liveBalance, setLiveBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceFetchFailed, setBalanceFetchFailed] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);

  // Fetch live balance when account changes
  useEffect(() => {
    if (!account || !token || !open) {
      setLiveBalance(null);
      setBalanceFetchFailed(false);
      return;
    }

    const fetchBalance = async () => {
      const mt5Login = account.mt5_id ?? account.account_id ?? account.id;
      if (!mt5Login) return;

      setLoadingBalance(true);
      setBalanceFetchFailed(false);
      try {
        const response = await mt5AccountsApi.getAdminBalance(mt5Login, token) as unknown as MT5AccountBalance;
        if (response.success && response.balance !== undefined) {
          setLiveBalance(response.balance);
          setBalanceFetchFailed(false);
        } else {
          setLiveBalance(null);
          setBalanceFetchFailed(true);
        }
      } catch (error) {
        console.error("Failed to fetch MT5 balance:", error);
        setLiveBalance(null);
        setBalanceFetchFailed(true);
      } finally {
        setLoadingBalance(false);
      }
    };

    void fetchBalance();
  }, [account, token, open]);

  const handleResendCredentials = async () => {
    if (!token || !account) return;
    
    const mt5Id = account.mt5_id ?? account.account_id ?? account.id;
    if (!mt5Id) {
      toast.error("Cannot resend: MT5 ID not found on this account.");
      return;
    }
    try {
      setSendingCredentials(true);
      const response = await adminMT5AccountsApi.resendCredentialsEmail(mt5Id, token);
      toast.success(response.data?.message ?? "MT5 credentials email resent successfully");
    } catch (error) {
      console.error("Failed to resend MT5 credentials email:", error);
      toast.error("Failed to resend MT5 credentials email. Please try again.");
    } finally {
      setSendingCredentials(false);
    }
  };

  const user = account?.user ?? account?.User;
  const group = account?.group;
  const accountType = account?.accountType;
  const mode = account?.account_mode ? String(account.account_mode).toUpperCase() : emptyValue;
  const status = statusLabel(account?.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>MT5 Account Details</DialogTitle>
          <DialogDescription>
            Complete account information fetched from the selected MT5 account.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <BackofficeDetailDialogSkeleton fieldCount={9} sectionCount={3} />
        ) : !account ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Account details are not available.
          </div>
        ) : (
          <div className="space-y-5">
           <div className="flex flex-wrap items-center gap-2">
    <Badge variant="outline">{mode}</Badge>
    <span className="text-sm font-medium">{getName(account)}</span>
    
    {/* Added ml-auto to push this badge to the far right */}
    <Badge
      className={`ml-auto ${
        status === "Active"
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {status}
    </Badge>
  </div>


            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Account</h3>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Account ID" value={account.account_id} />
                <DetailItem label="MT5 Login" value={account.mt5_id} />
                <DetailItem label="Server" value={account.server} />
                <DetailItem label="Account Type" value={getAccountTypeName(account)} />
                <DetailItem label="Leverage" value={account.leverage ? `1:${account.leverage}` : emptyValue} />
                <DetailItem label="Wallet Balance" value={
                  loadingBalance ? (
                    <span className="flex items-center gap-2 text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    formatWalletBalance(account, liveBalance, balanceFetchFailed)
                  )
                } />
                <DetailItem label="Main Password" value={account.main_password} />
                <DetailItem label="Investor Password" value={account.investor_password} />
                <DetailItem label="Created" value={formatDate(account.created_at)} />
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">User</h3>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Name" value={getName(account)} />
                <DetailItem label="Email" value={user?.email ?? account.email} />
                <DetailItem label="Mobile" value={user?.mobile ?? account.mobile} />
                {/* <DetailItem label="User ID" value={account.user_id ?? user?.id} /> */}
                <DetailItem label="IB ID" value={account.sponsor_id ?? user?.sponsor_id} />
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Group and Trading Settings</h3>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* <DetailItem label="Group ID" value={account.group_id ?? group?.id} /> */}
                <DetailItem label="Group Name" value={group?.name} />
                <DetailItem label="MT5 Group" value={account.mt5_group_name ?? group?.mt5_group_name} />
                <DetailItem label="Minimum Deposit" value={account.minimum_deposit ?? group?.minimum_deposit} />
                {/* <DetailItem label="Spread From" value={account.spread_from ?? accountType?.spread_from} /> */}
                {/* <DetailItem label="Maximum Leverage" value={account.maximum_leverage ?? accountType?.maximum_leverage} />
                <DetailItem label="Leverage Type" value={account.leverage_type ?? accountType?.leverage_type} /> */}
                {/* <DetailItem label="Stop Out Level" value={account.stop_out_level ?? accountType?.stop_out_level} /> */}
                {/* <DetailItem label="Hedge Margin" value={account.hedge_margin ?? accountType?.hedge_margin} /> */}
                {/* <DetailItem label="Swap Free" value={account.swap_free_option ?? accountType?.swap_free_option} /> */}
                {/* <DetailItem label="Base Currencies" value={account.base_currency ?? accountType?.base_currency} /> */}
                <DetailItem label="Updated" value={formatDate(account.updated_at)} />
              </dl>
            </section>
          </div>
        )}

        {!loading && account && (
          <div className="flex justify-end border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResendCredentials}
              disabled={sendingCredentials}
              className="gap-2"
            >
              {sendingCredentials ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {sendingCredentials ? "Sending..." : "Resend MT5 Credentials Email"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
