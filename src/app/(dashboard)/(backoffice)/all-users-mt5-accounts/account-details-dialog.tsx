"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  User as UserIcon,
  Wallet,
  Layers,
} from "lucide-react";
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
import {
  adminMT5AccountsApi,
  mt5AccountsApi,
  type MT5AccountBalance,
} from "@/lib/api-trading-ib";
import { useAuth } from "@/contexts/auth-context";
import { useModuleCapabilities } from "@/hooks/use-permission-capabilities";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  return formatApiDateTimeAsIST(value);
};

const statusLabel = (status: AdminMT5Account["status"]) => {
  const value = typeof status === "string" ? status.toLowerCase() : status;
  return value === 1 || value === "1" || value === "active"
    ? "Active"
    : "Inactive";
};

const getName = (account: AdminMT5Account) => {
  if (account.name) return account.name;
  const user = account.user ?? account.User;
  if (user?.name) return user.name;
  const firstName = account.first_name ?? user?.first_name;
  const lastName = account.last_name ?? user?.last_name;
  return [firstName, lastName].filter(Boolean).join(" ").trim() || emptyValue;
};

const getInitials = (name: string) => {
  if (!name || name === emptyValue) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "?";
};

const getAccountTypeName = (account: AdminMT5Account) => {
  return (
    account.accountType?.name ??
    account.AdminMT5AccountType?.name ??
    account.account_type ??
    emptyValue
  );
};

const getMt5BalanceCurrency = (account: AdminMT5Account) =>
  getAccountTypeName(account).trim().toLowerCase() === "cent" ? "USC" : "USD";

const formatWalletBalance = (
  account: AdminMT5Account,
  liveBalance?: number | null,
  fetchFailed?: boolean,
) => {
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

const CopyButton = ({ value }: { value: unknown }) => {
  const [copied, setCopied] = useState(false);
  const text = displayValue(value);
  const disabled = text === emptyValue;

  const handleCopy = async () => {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={cn(
        "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
      )}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

const DetailItem = ({
  label,
  value,
  copyable = false,
  copyValue,
}: {
  label: string;
  value: unknown;
  copyable?: boolean;
  copyValue?: unknown;
}) => (
  <div className="space-y-1 rounded-md border bg-background p-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="flex items-center justify-between gap-2 break-words text-sm font-medium text-foreground">
      <span className="break-words">{displayValue(value)}</span>
      {copyable && <CopyButton value={copyValue ?? value} />}
    </dd>
  </div>
);

const PasswordItem = ({ label, value }: { label: string; value: unknown }) => {
  const [visible, setVisible] = useState(false);
  const text = displayValue(value);
  const disabled = text === emptyValue;

  return (
    <div className="space-y-1 rounded-md border bg-background p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
        <span className="font-mono tracking-wide">
          {disabled ? emptyValue : visible ? text : "•".repeat(Math.min(text.length, 10))}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>
          <CopyButton value={value} />
        </div>
      </dd>
    </div>
  );
};

const SectionHeading = ({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) => (
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <h3 className="text-sm font-semibold">{title}</h3>
  </div>
);

export function AccountDetailsDialog({
  open,
  onOpenChange,
  account,
  loading = false,
}: AccountDetailsDialogProps) {
  const { token } = useAuth();
  const { can: canUserCapability } = useModuleCapabilities("userManagement");
  const canResendMt5DataMail = canUserCapability("resendMt5DataMail");
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
        const response = (await mt5AccountsApi.getAdminBalance(
          mt5Login,
          token,
        )) as unknown as MT5AccountBalance;
        if (response.success && response.equity !== undefined) {
          setLiveBalance(response.equity);
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
      const response = await adminMT5AccountsApi.resendCredentialsEmail(
        mt5Id,
        token,
      );
      toast.success(
        response.data?.message ?? "MT5 credentials email resent successfully",
      );
    } catch (error) {
      console.error("Failed to resend MT5 credentials email:", error);
      toast.error("Failed to resend MT5 credentials email. Please try again.");
    } finally {
      setSendingCredentials(false);
    }
  };

  const user = account?.user ?? account?.User;
  const group = account?.group;
  const mode = account?.account_mode
    ? String(account.account_mode).toUpperCase()
    : emptyValue;
  const status = statusLabel(account?.status);
  const name = account ? getName(account) : emptyValue;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>MT5 Account Details</DialogTitle>
              <DialogDescription>
                Complete account information fetched from the selected MT5 account.
              </DialogDescription>
            </div>

            {!loading && account && canResendMt5DataMail && (
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
                {sendingCredentials ? "Sending..." : "Resend Credentials Email"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <BackofficeDetailDialogSkeleton fieldCount={9} sectionCount={3} />
        ) : !account ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Account details are not available.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {getInitials(name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {name}
                  </span>
                  <Badge variant="outline">{mode}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {user?.email ?? account.email ?? emptyValue}
                </span>
              </div>
              <Badge
                className={cn(
                  status === "Active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
                )}
              >
                {status}
              </Badge>
            </div>

            <section className="space-y-3">
              <SectionHeading icon={Layers} title="Account" />
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem
                  label="Account ID"
                  value={account.account_id}
                  copyable
                />
                <DetailItem
                  label="MT5 Login"
                  value={account.mt5_id}
                  copyable
                />
                <DetailItem label="Server" value={account.server} />
                <DetailItem
                  label="Group Type"
                  value={getAccountTypeName(account)}
                />
                <DetailItem
                  label="Leverage"
                  value={
                    account.leverage ? `1:${account.leverage}` : emptyValue
                  }
                />
                <div className="space-y-1 rounded-md border bg-background p-3">
                  <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    Wallet Balance
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {loadingBalance ? (
                      <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      formatWalletBalance(
                        account,
                        liveBalance,
                        balanceFetchFailed,
                      )
                    )}
                  </dd>
                </div>
                <PasswordItem label="Main Password" value={account.main_password} />
                <PasswordItem
                  label="Investor Password"
                  value={account.investor_password}
                />
                <DetailItem
                  label="Created"
                  value={formatDate(account.created_at)}
                />
              </dl>
            </section>

            <section className="space-y-3">
              <SectionHeading icon={UserIcon} title="User" />
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Name" value={name} />
                <DetailItem
                  label="Email"
                  value={user?.email ?? account.email}
                  copyable
                />
                <DetailItem
                  label="Mobile"
                  value={user?.mobile ?? account.mobile}
                  copyable
                />
                <DetailItem
                  label="IB ID"
                  value={account.sponsor_id ?? user?.sponsor_id}
                />
              </dl>
            </section>

            <section className="space-y-3">
              <SectionHeading icon={Layers} title="Group and Trading Settings" />
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Group Name" value={group?.name} />
                <DetailItem
                  label="MT5 Group"
                  value={account.mt5_group_name ?? group?.mt5_group_name}
                />
                <DetailItem
                  label="Minimum Deposit"
                  value={account.minimum_deposit ?? group?.minimum_deposit}
                />
                <DetailItem
                  label="Updated"
                  value={formatDate(account.updated_at)}
                />
              </dl>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}