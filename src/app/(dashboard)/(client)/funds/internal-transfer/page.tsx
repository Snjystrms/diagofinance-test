"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import toast from "react-hot-toast";
import { Repeat, Wallet, ArrowLeftRight, ArrowRight, ArrowDown, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";

import {
  internalTransferApi,
  walletApi,
  type MT5Account,
  type WalletSummaryData,
} from "@/lib/api";
import { mt5AccountsApi, type MT5AccountBalance } from "@/lib/api-trading-ib";
import { formatCurrency } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { useAuth } from "@/contexts/auth-context";
import { notifyWalletRefresh } from "@/lib/client-events";

const amountFieldSchema = z
  .string()
  .min(1, "Amount is required")
  .refine((value) => {
    const num = Number(value);
    return !Number.isNaN(num) && num > 0;
  }, "Amount must be a positive number");

const mt5ToMt5Schema = z
  .object({
    fromAccountId: z.string().min(1, "Select an MT5 account"),
    toAccountId: z.string().min(1, "Select an MT5 account"),
    amount: amountFieldSchema,
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    message: "From and To accounts must be different",
    path: ["toAccountId"],
  });

const walletToWalletSchema = z
  .object({
    fromWalletType: z.string().min(1, "Select a source wallet"),
    toWalletType: z.string().min(1, "Select a destination wallet"),
    amount: amountFieldSchema,
    remarks: z.string().optional(),
  })
  .refine((values) => values.fromWalletType !== values.toWalletType, {
    message: "From and To wallets must be different",
    path: ["toWalletType"],
  });

const walletToMt5Schema = z.object({
  fromWalletType: z.string().min(1, "Select a wallet"),
  toAccountId: z.string().min(1, "Select an MT5 account"),
  amount: amountFieldSchema,
});

const mt5ToWalletSchema = z.object({
  fromAccountId: z.string().min(1, "Select an MT5 account"),
  toWalletType: z.string().min(1, "Select a wallet"),
  amount: amountFieldSchema,
});

type Mt5ToMt5FormValues = z.infer<typeof mt5ToMt5Schema>;
type WalletToWalletFormValues = z.infer<typeof walletToWalletSchema>;
type WalletToMt5FormValues = z.infer<typeof walletToMt5Schema>;
type Mt5ToWalletFormValues = z.infer<typeof mt5ToWalletSchema>;

type WalletOption = {
  value: string;
  label: string;
  balance: number;
  currency: string;
  isPrimary: boolean;
};

type TransferTab =
  | "wallet-to-wallet"
  | "wallet-to-mt5"
  | "mt5-to-wallet"
  | "mt5-to-mt5";

function sanitizeComment(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatWalletLabel(walletKey: string) {
  return walletKey
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

const isCentMt5Account = (account?: MT5Account | null) =>
  String(account?.account_type_name ?? "").trim().toLowerCase() === "cent";

const formatMt5Balance = (account: MT5Account, liveBalances: Record<string, number | null>) => {
  const isCent = isCentMt5Account(account);
  
  // ONLY use API balance from liveBalances - show "-" if null
  const balanceValue = liveBalances[account.account_id];
  
  if (balanceValue === null || balanceValue === undefined) {
    return "-"; // API failed or didn't return balance
  }
  
  const amount = isCent ? balanceValue * 100 : balanceValue;
  
  const formatted = Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isCent ? `¢${formatted}` : formatCurrency(amount);
};

const getMt5TransferCurrency = (account?: MT5Account | null) =>
  isCentMt5Account(account) ? "USC" : "USD";

const findMt5AccountById = (accounts: MT5Account[], accountId?: string) =>
  accounts.find((account) => account.account_id === accountId) ?? null;

function InternalTransferContent() {
  const { token, user } = useAuth();
  const searchParams = useSearchParams();
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([]);
  const [mt5Balances, setMt5Balances] = useState<Record<string, number | null>>({});
  const [walletSummary, setWalletSummary] = useState<WalletSummaryData | null>(
    null,
  );
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [walletError, setWalletError] = useState<unknown | null>(null);
  const [accountsError, setAccountsError] = useState<unknown | null>(null);
  const [activeTab, setActiveTab] = useState<TransferTab>("wallet-to-mt5");
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  const mt5ToMt5Form = useForm<Mt5ToMt5FormValues>({
    resolver: zodResolver(mt5ToMt5Schema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: "",
    },
  });

  const walletToWalletForm = useForm<WalletToWalletFormValues>({
    resolver: zodResolver(walletToWalletSchema),
    defaultValues: {
      fromWalletType: "main",
      toWalletType: "",
      amount: "",
      remarks: "",
    },
  });

  const walletToMt5Form = useForm<WalletToMt5FormValues>({
    resolver: zodResolver(walletToMt5Schema),
    defaultValues: {
      fromWalletType: "main",
      toAccountId: "",
      amount: "",
    },
  });

  const mt5ToWalletForm = useForm<Mt5ToWalletFormValues>({
    resolver: zodResolver(mt5ToWalletSchema),
    defaultValues: {
      fromAccountId: "",
      toWalletType: "main",
      amount: "",
    },
  });

  const loadTransferResources = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingResources(true);
    setWalletError(null);
    setAccountsError(null);

    const [walletResult, accountsResult] = await Promise.allSettled([
      walletApi.getSummary(token),
      mt5AccountsApi.getAll(token),
    ]);

    if (walletResult.status === "fulfilled") {
      const response = walletResult.value;
      if (response.success && response.data) {
        setWalletSummary(response.data);
      } else {
        setWalletSummary(null);
        setWalletError(response.message || "Unable to load wallet summary");
      }
    } else {
      console.error("Failed to load wallet summary", walletResult.reason);
      setWalletSummary(null);
      setWalletError(walletResult.reason);
    }

    if (accountsResult.status === "fulfilled") {
      const response = accountsResult.value;
      if (response.success && response.data?.mt5_accounts) {
        const accounts = response.data.mt5_accounts;
        setMt5Accounts(accounts);
        
        // Fetch live balances for all accounts - NO FALLBACK, ONLY USE API
        const balancePromises = accounts.map(async (account) => {
          try {
            const balanceResponse = await mt5AccountsApi.getBalance(account.mt5_id, token);
            console.log(`[MT5 Balance API] Account ${account.mt5_id}:`, balanceResponse);
            // ONLY use API balance - no fallback
            if (balanceResponse.success && balanceResponse.data?.balance !== undefined) {
              console.log(`[MT5 Balance] Using API balance ${balanceResponse.data.balance} for ${account.account_id}`);
              return { accountId: account.account_id, balance: balanceResponse.data.balance };
            }
            // If API doesn't return balance, return null to indicate failure
            console.warn(`[MT5 Balance] API failed for ${account.account_id}, no balance available`);
            return { accountId: account.account_id, balance: null }; // null = show "-"
          } catch (error) {
            console.error(`Failed to fetch balance for ${account.mt5_id}:`, error);
            return { accountId: account.account_id, balance: null }; // null = show "-"
          }
        });
        
        const balances = await Promise.all(balancePromises);
        const balanceMap = balances.reduce((acc, { accountId, balance }) => {
          acc[accountId] = balance;
          return acc;
        }, {} as Record<string, number | null>);
        
        setMt5Balances(balanceMap);
      } else {
        setMt5Accounts([]);
        setAccountsError("Unable to load MT5 accounts");
      }
    } else {
      console.error("Failed to load MT5 accounts", accountsResult.reason);
      setMt5Accounts([]);
      setAccountsError(accountsResult.reason);
    }

    setIsLoadingResources(false);
  }, [token]);

  useEffect(() => {
    void loadTransferResources();
  }, [loadTransferResources]);

  const liveMt5Accounts = useMemo(
    () => mt5Accounts.filter((a) => a.account_mode === "live"),
    [mt5Accounts],
  );

  const mt5AccountOptions = useMemo(
    () =>
      liveMt5Accounts.map((account) => ({
        id: account.account_id,
        label: `${account.account_id} • ${formatMt5Balance(account, mt5Balances)} • ${account.account_mode ?? "—"}`,
      })),
    [liveMt5Accounts, mt5Balances],
  );

  const walletOptions = useMemo<WalletOption[]>(() => {
    if (!walletSummary?.wallets) {
      return [];
    }

    return Object.entries(walletSummary.wallets).map(([walletKey, wallet]) => ({
      value: walletKey,
      label: formatWalletLabel(walletKey),
      balance: Number(wallet.balance ?? 0),
      currency: wallet.currency || "USD",
      isPrimary: Boolean(wallet.is_primary),
    }));
  }, [walletSummary]);

  const defaultWalletValue = useMemo(() => {
    if (walletOptions.length === 0) {
      return "main";
    }

    return (
      walletOptions.find((wallet) => wallet.isPrimary)?.value ||
      walletOptions.find((wallet) => wallet.value.toLowerCase() === "main")
        ?.value ||
      walletOptions[0]?.value ||
      "main"
    );
  }, [walletOptions]);

  const secondaryWalletValue = useMemo(
    () =>
      walletOptions.find((wallet) => wallet.value !== defaultWalletValue)
        ?.value || defaultWalletValue,
    [defaultWalletValue, walletOptions],
  );
  const requestedTab = searchParams.get("tab");
  const requestedAccountId = searchParams.get("accountId");

  useEffect(() => {
    if (!defaultWalletValue) {
      return;
    }

    if (!walletToWalletForm.getValues("fromWalletType")) {
      walletToWalletForm.setValue("fromWalletType", defaultWalletValue);
    }
    if (!walletToWalletForm.getValues("toWalletType")) {
      walletToWalletForm.setValue("toWalletType", secondaryWalletValue);
    }
    if (!walletToMt5Form.getValues("fromWalletType")) {
      walletToMt5Form.setValue("fromWalletType", defaultWalletValue);
    }
    if (!mt5ToWalletForm.getValues("toWalletType")) {
      mt5ToWalletForm.setValue("toWalletType", defaultWalletValue);
    }
  }, [
    defaultWalletValue,
    mt5ToWalletForm,
    secondaryWalletValue,
    walletToMt5Form,
    walletToWalletForm,
  ]);

  useEffect(() => {
    const validTabs: TransferTab[] = [
      "wallet-to-wallet",
      "wallet-to-mt5",
      "mt5-to-wallet",
      "mt5-to-mt5",
    ];
    if (requestedTab && validTabs.includes(requestedTab as TransferTab)) {
      setActiveTab(requestedTab as TransferTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!requestedAccountId || liveMt5Accounts.length === 0) {
      return;
    }

    const matchedAccount = liveMt5Accounts.find(
      (account) => account.account_id === requestedAccountId,
    );
    if (!matchedAccount) {
      return;
    }

    walletToMt5Form.setValue("toAccountId", matchedAccount.account_id, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [liveMt5Accounts, requestedAccountId, walletToMt5Form]);

  const mainWallet = useMemo(
    () =>
      walletOptions.find((wallet) => wallet.value === defaultWalletValue) ||
      walletOptions[0] ||
      null,
    [defaultWalletValue, walletOptions],
  );

  useEffect(() => {
    if (!mainWallet) return;
    if (mt5ToWalletForm.getValues("toWalletType") !== mainWallet.value) {
      mt5ToWalletForm.setValue("toWalletType", mainWallet.value, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [mainWallet, mt5ToWalletForm]);

  const selectedMt5ToWalletAccount = findMt5AccountById(
    liveMt5Accounts,
    mt5ToWalletForm.watch("fromAccountId"),
  );
  const selectedMt5ToMt5FromAccount = findMt5AccountById(
    liveMt5Accounts,
    mt5ToMt5Form.watch("fromAccountId"),
  );
  const selectedMt5ToMt5ToAccount = findMt5AccountById(
    liveMt5Accounts,
    mt5ToMt5Form.watch("toAccountId"),
  );
  const selectedWalletToMt5Account = findMt5AccountById(
    liveMt5Accounts,
    walletToMt5Form.watch("toAccountId"),
  );
  const mt5ToWalletCurrency = getMt5TransferCurrency(selectedMt5ToWalletAccount);
  
  // Check if "from" accounts have zero balance
  const mainWalletHasBalance = mainWallet ? mainWallet.balance > 0 : false;
  const mt5ToWalletAccountHasBalance = selectedMt5ToWalletAccount ? (mt5Balances[selectedMt5ToWalletAccount.account_id] ?? 0) > 0 : false;
  const mt5ToMt5FromAccountHasBalance = selectedMt5ToMt5FromAccount ? (mt5Balances[selectedMt5ToMt5FromAccount.account_id] ?? 0) > 0 : false;
  
  // MT5 to MT5: Always use USD when both accounts are CENT
  const mt5ToMt5Currency = useMemo(() => {
    const fromIsCent = isCentMt5Account(selectedMt5ToMt5FromAccount);
    const toIsCent = isCentMt5Account(selectedMt5ToMt5ToAccount);
    
    // If both are CENT, use USD (backend will handle conversion)
    if (fromIsCent && toIsCent) return "USD";
    
    // Otherwise use the "from" account currency
    return getMt5TransferCurrency(selectedMt5ToMt5FromAccount);
  }, [selectedMt5ToMt5FromAccount, selectedMt5ToMt5ToAccount]);

  // Filter "To" accounts in MT5 to MT5 based on "From" account currency type
  const filteredMt5ToMt5ToAccounts = useMemo(() => {
    const fromAccountId = mt5ToMt5Form.watch("fromAccountId");
    if (!selectedMt5ToMt5FromAccount) return mt5AccountOptions;
    
    const fromIsCent = isCentMt5Account(selectedMt5ToMt5FromAccount);
    return mt5AccountOptions.filter((option) => {
      // Exclude the "from" account
      if (option.id === fromAccountId) return false;
      
      const account = findMt5AccountById(liveMt5Accounts, option.id);
      const accountIsCent = isCentMt5Account(account);
      return fromIsCent === accountIsCent;
    });
  }, [selectedMt5ToMt5FromAccount, mt5AccountOptions, liveMt5Accounts, mt5ToMt5Form]);

  // Clear "To" account if it doesn't match the filtered list
  useEffect(() => {
    const toAccountId = mt5ToMt5Form.watch("toAccountId");
    if (!toAccountId || !selectedMt5ToMt5FromAccount) return;
    
    const isValidToAccount = filteredMt5ToMt5ToAccounts.some((opt) => opt.id === toAccountId);
    if (!isValidToAccount) {
      mt5ToMt5Form.setValue("toAccountId", "", { shouldValidate: false });
    }
  }, [selectedMt5ToMt5FromAccount, filteredMt5ToMt5ToAccounts, mt5ToMt5Form]);

  const handleMt5ToMt5Submit = async (values: Mt5ToMt5FormValues) => {
    if (!token || !user?.id) {
      toast.error("Authentication required");
      return;
    }

    try {
      const fromAccount = liveMt5Accounts.find(
        (account) => account.account_id === values.fromAccountId,
      );
      const toAccount = liveMt5Accounts.find(
        (account) => account.account_id === values.toAccountId,
      );
      const mt5ToMt5Comment = `from MT5-${fromAccount?.mt5_id ?? values.fromAccountId} to MT5-${toAccount?.mt5_id ?? values.toAccountId}`;

      const payload = {
        from_mt5_account_id: values.fromAccountId,
        to_mt5_account_id: values.toAccountId,
        amount: Number(values.amount),
        comment: mt5ToMt5Comment,
        from_mt5_user_id: String(user.id),
        to_mt5_user_id: String(user.id),
      };

      const response = await internalTransferApi.mt5ToMt5(payload, token);
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        await loadTransferResources();
        notifyWalletRefresh();
        mt5ToMt5Form.reset({
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amount: "",
        });
      }
    } catch (error) {
      console.error("MT5 to MT5 transfer failed", error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: "transfer",
          action: "submit",
        }),
      );
    }
  };

  const handleWalletToWalletSubmit = async (
    values: WalletToWalletFormValues,
  ) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      const payload = {
        from_wallet_type: values.fromWalletType,
        to_wallet_type: values.toWalletType,
        amount: Number(values.amount),
        remarks: sanitizeComment(values.remarks),
      };

      const response = await internalTransferApi.userWalletToUserWallet(
        payload,
        token,
      );
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        await loadTransferResources();
        notifyWalletRefresh();
        walletToWalletForm.reset({
          fromWalletType: values.fromWalletType,
          toWalletType: values.toWalletType,
          amount: "",
          remarks: "",
        });
      }
    } catch (error) {
      console.error("Wallet to wallet transfer failed", error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: "transfer",
          action: "submit",
        }),
      );
    }
  };

  const handleWalletToMt5Submit = async (values: WalletToMt5FormValues) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      const toAccount = liveMt5Accounts.find(
        (account) => account.account_id === values.toAccountId,
      );
      const walletToMt5Comment = `from wallet to MT5 - ${toAccount?.mt5_id ?? values.toAccountId}`;

      const payload = {
        account_ref: values.toAccountId,
        amount: Number(values.amount),
        comment: walletToMt5Comment,
      };

      const response = await internalTransferApi.userWalletToMt5(
        payload,
        token,
      );
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        await loadTransferResources();
        notifyWalletRefresh();
        walletToMt5Form.reset({
          fromWalletType: values.fromWalletType,
          toAccountId: values.toAccountId,
          amount: "",
        });
      }
    } catch (error) {
      console.error("Wallet to MT5 transfer failed", error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: "transfer",
          action: "submit",
        }),
      );
    }
  };

  const handleMt5ToWalletSubmit = async (values: Mt5ToWalletFormValues) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      const fromAccount = liveMt5Accounts.find(
        (account) => account.account_id === values.fromAccountId,
      );
      const mt5ToWalletComment = `from MT5 - ${fromAccount?.mt5_id ?? values.fromAccountId} to Wallet`;

      const payload = {
        from_mt5_account_id: values.fromAccountId,
        to_wallet_type: values.toWalletType,
        amount: Number(values.amount),
        remarks: mt5ToWalletComment,
      };

      const response = await internalTransferApi.mt5ToUserWallet(
        payload,
        token,
      );
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        await loadTransferResources();
        notifyWalletRefresh();
        mt5ToWalletForm.reset({
          fromAccountId: values.fromAccountId,
          toWalletType: values.toWalletType,
          amount: "",
        });
      }
    } catch (error) {
      console.error("MT5 to wallet transfer failed", error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: "transfer",
          action: "submit",
        }),
      );
    }
  };

  const walletSelectPlaceholder = isLoadingResources
    ? "Loading wallets..."
    : "Select wallet";
  const mt5SelectPlaceholder = isLoadingResources
    ? "Loading accounts..."
    : "Select MT5 account";
  const canTransferBetweenWallets = walletOptions.length > 1;

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Funds Management"
        title="Internal Transfers"
        description="Move funds seamlessly between your CRM wallets and linked MT5 trading accounts."
      />
      
      {walletError ? (
        <ApiErrorState
          error={walletError}
          audience="client"
          resource="wallet summary"
          action="load"
          variant="inline"
        />
      ) : null}
      {accountsError ? (
        <ApiErrorState
          error={accountsError}
          audience="client"
          resource="MT5 accounts"
          action="load"
          variant="inline"
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <IbMetricCard
          title="Main Wallet"
          value={
            isLoadingResources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : mainWallet ? (
              <span>{mainWallet.balance.toFixed(2)} USD</span>
            ) : (
              <span className="text-base">No data</span>
            )
          }
          description={
            mainWallet ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            ) : (
              "The primary CRM wallet is used by default for wallet to MT5 transfers."
            )
          }
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />

        <IbMetricCard
          title="Linked MT5 Accounts"
          value={
            isLoadingResources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <span>{liveMt5Accounts.length}</span>
            )
          }
          description={
            liveMt5Accounts.length > 0 ? (
              <div className="space-y-2 mt-2">
                <div className="space-y-1.5">
                  {(showAllAccounts ? liveMt5Accounts : liveMt5Accounts.slice(0, 2)).map((account) => (
                    <div key={account.account_id} className="flex items-center justify-between text-xs border-t border-border/50 pt-1.5 first:border-t-0 first:pt-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.account_id}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {account.account_mode}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground tabular-nums">{formatMt5Balance(account, mt5Balances)}</span>
                    </div>
                  ))}
                </div>
                {liveMt5Accounts.length > 3 && (
                  <button
                    onClick={() => setShowAllAccounts(!showAllAccounts)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium w-full justify-center pt-1.5 border-t border-border/50"
                  >
                    {showAllAccounts ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" />
                        Show {liveMt5Accounts.length - 3} more account{liveMt5Accounts.length - 3 !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              "No MT5 accounts found. Create an MT5 account before initiating transfers."
            )
          }
          icon={<ArrowLeftRight className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TransferTab)}
        className="space-y-4"
      >
        <TabsList className="ib-portal-surface inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl border p-1.5">
        <TabsTrigger value="wallet-to-mt5" className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 transition-colors">Wallet to MT5</TabsTrigger>
        <TabsTrigger value="mt5-to-wallet" className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 transition-colors">MT5 to Wallet</TabsTrigger>
        <TabsTrigger value="mt5-to-mt5" className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 transition-colors">MT5 to MT5</TabsTrigger>
        </TabsList>
        <TabsContent value="wallet-to-mt5">
          <IbSectionCard
            title="Wallet to MT5"
            description="Deposit funds from your primary CRM wallet into a linked MT5 account."
          >
            <Form {...walletToMt5Form}>
              <form
                onSubmit={walletToMt5Form.handleSubmit(
                  handleWalletToMt5Submit,
                )}
                className="space-y-6"
              >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Transfer route
                    </p>
                   <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2 sm:max-w-lg">
                      <FormField
                        control={walletToMt5Form.control}
                        name="fromWalletType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From wallet</FormLabel>
                            <Select value={field.value} disabled>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={walletSelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mainWallet && (
                                  <SelectItem value={mainWallet.value}>
                                    {mainWallet.label} ({mainWallet.balance.toFixed(2)}{" "}
                                    USD)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="flex h-8 sm:h-10 items-center justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                          <ArrowDown className="h-4 w-4 text-muted-foreground sm:hidden" />
                       </div>
                      <FormField
                        control={walletToMt5Form.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To MT5 account</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={
                                isLoadingResources || liveMt5Accounts.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={mt5SelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent 
                                side="bottom" 
                                align="start" 
                                sideOffset={4}
                                avoidCollisions={false}
                                className="max-h-[300px] overflow-y-auto"
                              >
                                {mt5AccountOptions.length > 0 ? (
                                  mt5AccountOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-accounts" disabled>
                                    No accounts available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Amount
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr] gap-4 items-start">
                      <FormField
                        control={walletToMt5Form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount to transfer</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  placeholder="0.00"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  className="pr-14"
                                  {...field}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                                  USD
                                </span>
                              </div>
                            </FormControl>
                              {walletToMt5Form.watch("amount") && Number(walletToMt5Form.watch("amount")) > 0 && selectedWalletToMt5Account && isCentMt5Account(selectedWalletToMt5Account) && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mt-3 max-w-xs">
                        <p className="text-xs text-muted-foreground">Conversion</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          {Number(walletToMt5Form.watch("amount")).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD = {(Number(walletToMt5Form.watch("amount")) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC
                        </p>
                      </div>
                    )}
                            {mainWallet && (
                              <p className="text-xs text-muted-foreground">
                                Max. {mainWallet.balance.toFixed(2)} USD
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {mainWallet && (
                        <div className="pt-6">
                          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-sm text-muted-foreground border">
                            <Wallet className="h-3.5 w-3.5" />
                            Available:{" "}
                            <span className="font-medium text-foreground">
                              {mainWallet.balance.toFixed(2)} USD
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        Funds arrive instantly
                      </p>
                      {!mainWalletHasBalance && mainWallet && (
                        <p className="text-xs text-destructive font-medium">
                          Insufficient balance in wallet
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        walletToMt5Form.formState.isSubmitting || !mainWallet || !mainWalletHasBalance
                      }
                    >
                      {walletToMt5Form.formState.isSubmitting
                        ? "Processing…"
                        : "Transfer funds"}
                    </Button>
                  </div>
                </form>
              </Form>
          </IbSectionCard>
        </TabsContent>

        <TabsContent value="mt5-to-wallet">
          <IbSectionCard
            title="MT5 to Wallet"
            description="Withdraw balances from an MT5 account back into one of your CRM wallets."
          >
            <Form {...mt5ToWalletForm}>
              <form
                onSubmit={mt5ToWalletForm.handleSubmit(
                  handleMt5ToWalletSubmit,
                )}
                className="space-y-6"
              >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Transfer route
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2 sm:max-w-lg">
                      <FormField
                        control={mt5ToWalletForm.control}
                        name="fromAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From MT5 account</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={
                                isLoadingResources || liveMt5Accounts.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={mt5SelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent 
                                side="bottom" 
                                align="start" 
                                sideOffset={4}
                                avoidCollisions={false}
                                className="max-h-[300px] overflow-y-auto"
                              >
                                {mt5AccountOptions.length > 0 ? (
                                  mt5AccountOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-accounts" disabled>
                                    No accounts available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="flex h-8 sm:h-10 items-center justify-center">
                            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                            <ArrowDown className="h-4 w-4 text-muted-foreground sm:hidden" />
                       </div>
                      <FormField
                        control={mt5ToWalletForm.control}
                        name="toWalletType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To wallet</FormLabel>
                            <Select
                              value={field.value}
                              disabled
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={walletSelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {mainWallet && (
                                  <SelectItem value={mainWallet.value}>
                                    {mainWallet.label} ({mainWallet.balance.toFixed(2)}{" "}
                                    USD)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Amount
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr] gap-4 items-start">
                      <FormField
                        control={mt5ToWalletForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount to transfer</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  placeholder="0.00"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  className="pr-14"
                                  {...field}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                                  USD
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {mt5ToWalletForm.watch("amount") && Number(mt5ToWalletForm.watch("amount")) > 0 && selectedMt5ToWalletAccount && isCentMt5Account(selectedMt5ToWalletAccount) && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mt-3 max-w-xs">
                          <p className="text-xs text-muted-foreground">Conversion</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5">
                            {Number(mt5ToWalletForm.watch("amount")).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD = {(Number(mt5ToWalletForm.watch("amount")) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        Funds arrive instantly
                      </p>
                      {selectedMt5ToWalletAccount && !mt5ToWalletAccountHasBalance && (
                        <p className="text-xs text-destructive font-medium">
                          Insufficient balance in MT5 account
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={mt5ToWalletForm.formState.isSubmitting || !selectedMt5ToWalletAccount || !mt5ToWalletAccountHasBalance}
                    >
                      {mt5ToWalletForm.formState.isSubmitting
                        ? "Processing…"
                        : "Transfer funds"}
                    </Button>
                  </div>
                </form>
              </Form>
          </IbSectionCard>
        </TabsContent>

        <TabsContent value="mt5-to-mt5">
          <IbSectionCard
            title="MT5 to MT5"
            description="Move funds directly between your linked MT5 accounts."
          >
            <Form {...mt5ToMt5Form}>
              <form
                onSubmit={mt5ToMt5Form.handleSubmit(handleMt5ToMt5Submit)}
                className="space-y-6"
              >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Transfer route
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-end gap-2 sm:max-w-lg">
                      <FormField
                        control={mt5ToMt5Form.control}
                        name="fromAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From MT5 account</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={
                                isLoadingResources || liveMt5Accounts.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={mt5SelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent 
                                side="bottom" 
                                align="start" 
                                sideOffset={4}
                                avoidCollisions={false}
                                className="max-h-[300px] overflow-y-auto"
                              >
                                {mt5AccountOptions.length > 0 ? (
                                  mt5AccountOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-accounts" disabled>
                                    No accounts available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div className="flex h-8 sm:h-10 items-center justify-center">
                        <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                        <ArrowDown className="h-4 w-4 text-muted-foreground sm:hidden" />
                       </div>
                      <FormField
                        control={mt5ToMt5Form.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To MT5 account</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={
                                isLoadingResources || liveMt5Accounts.length === 0
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={mt5SelectPlaceholder}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent 
                                side="bottom" 
                                align="start" 
                                sideOffset={4}
                                avoidCollisions={false}
                                className="max-h-[300px] overflow-y-auto"
                              >
                                {filteredMt5ToMt5ToAccounts.length > 0 ? (
                                  filteredMt5ToMt5ToAccounts.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.label}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-accounts" disabled>
                                    No accounts available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      Amount
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,200px)_1fr] gap-4 items-start">
                      <FormField
                        control={mt5ToMt5Form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount to transfer</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  placeholder="0.00"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  className="pr-14"
                                  {...field}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                                  {mt5ToMt5Currency}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       {mt5ToMt5Form.watch("amount") && Number(mt5ToMt5Form.watch("amount")) > 0 && selectedMt5ToMt5FromAccount && selectedMt5ToMt5ToAccount && isCentMt5Account(selectedMt5ToMt5FromAccount) && isCentMt5Account(selectedMt5ToMt5ToAccount) && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 mt-3 max-w-xs">
                        <p className="text-xs text-muted-foreground">Conversion</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          {Number(mt5ToMt5Form.watch("amount")).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD = {(Number(mt5ToMt5Form.watch("amount")) * 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        Funds arrive instantly
                      </p>
                      {selectedMt5ToMt5FromAccount && !mt5ToMt5FromAccountHasBalance && (
                        <p className="text-xs text-destructive font-medium">
                          Insufficient balance in source MT5 account
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={mt5ToMt5Form.formState.isSubmitting || !selectedMt5ToMt5FromAccount || !mt5ToMt5FromAccountHasBalance}
                    >
                      {mt5ToMt5Form.formState.isSubmitting
                        ? "Processing…"
                        : "Transfer funds"}
                    </Button>
                  </div>
                </form>
              </Form>
          </IbSectionCard>
        </TabsContent>
      </Tabs>
    </IbPageShell>
  );
}

export default function InternalTransferPage() {
  return <InternalTransferContent />;
}

