"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { userPaymentMethodsApi, type UserPaymentMethod } from "@/lib/api-auth-admin";
import { walletApi, type WalletSummaryData } from "@/lib/api";
import { CLIENT_WALLET_REFRESH_EVENT } from "@/lib/client-events";
import { DepositPageSkeleton } from "./deposit-page-skeleton";
import { Banknote, Building2, Clock, QrCode, Shield, Wallet, WalletMinimal } from "lucide-react";
import { ComingSoonTab } from "./deposit-shared";
import { OnChainDepositTab } from "./on-chain-deposit-tab";
import { BinancePayDepositTab } from "./binance-pay-deposit-tab";
import { CoinsBuyDepositTab } from "./coinsbuy-deposit-tab";
import { CregisDepositTab } from "./cregis-deposit-tab";
import { BankDepositTab } from "./bank-deposit-tab";
import { CashDepositTab } from "./cash-deposit-tab";

const KNOWN_TYPES = [
  "local",
  "binance_pay",
  "coinsbuy",
  "cregis",
  "bank_transfer",
  "cash",
];

function USDTDepositContent() {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Map between internal tab values and URL-friendly names
  const tabToUrl = (tab: string): string => {
    const mapping: Record<string, string> = {
      local: "on-chain",
      binance_pay: "binance-pay",
      coinsbuy: "coinsbuy",
      cregis: "cryptocurrency",
      bank: "bank-deposit",
      cash: "cash",
    };
    return mapping[tab] || tab;
  };

  const urlToTab = (urlTab: string): string => {
    const mapping: Record<string, string> = {
      "on-chain": "local",
      "binance-pay": "binance_pay",
      coinsbuy: "coinsbuy",
      cryptocurrency: "cregis",
      "bank-deposit": "bank",
      cash: "cash",
    };
    return mapping[urlTab] || urlTab;
  };

  // Check for pending Cregis deposit on initialization to set the correct tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      // First check URL parameter
      const urlTabParam = new URLSearchParams(window.location.search).get(
        "tab",
      );
      if (urlTabParam) {
        return urlToTab(urlTabParam);
      }

      // Then check for pending Cregis deposit
      const pendingOutTradeNo = localStorage.getItem("cregis_pending_deposit");
      if (pendingOutTradeNo) {
        return "cregis";
      }
    }
    return "";
  });

  // Handle tab change and update URL
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);

    // Update URL with the new tab parameter
    if (newTab) {
      const urlFriendlyTab = tabToUrl(newTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", urlFriendlyTab);
      router.push(`?${params.toString()}`, { scroll: false });
    } else {
      // Remove tab parameter if no tab is selected
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : window.location.pathname, {
        scroll: false,
      });
    }
  };

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const wallets = walletData ? Object.values(walletData.wallets || {}) : [];
  const primaryWallet =
    wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const totalBalance = walletData?.total_balance ?? 0;
  const availableBalance = primaryWallet?.balance ?? totalBalance;

  const formatAmount = (value: number) =>
    value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });

  const recentDeposit = walletData?.recent_transactions?.find(
    (tx) =>
      tx.type?.toLowerCase() === "deposit" ||
      tx.type?.toLowerCase() === "credit",
  );
  const recentDepositAmount = recentDeposit
    ? parseFloat(String(recentDeposit.amount ?? 0))
    : null;
  const recentDepositLabel = recentDepositAmount
    ? `${formatAmount(recentDepositAmount)} USD`
    : "No recent deposits";

  // Derive which tabs to show from API response
  const hasLocal = paymentMethods.some((p) => p.type === "local");
  const hasBinance = paymentMethods.some((p) => p.type === "binance_pay");
  const hasCoinsbuy = paymentMethods.some((p) => p.type === "coinsbuy");
  const hasCregis = paymentMethods.some((p) => p.type === "cregis");
  const hasBank = paymentMethods.some((p) => p.type === "bank_transfer");
  const hasCash = paymentMethods.some((p) => p.type === "cash");
  const comingSoonMethods = paymentMethods.filter(
    (p) => !KNOWN_TYPES.includes(p.type),
  );

  // Fetch active payment methods
  useEffect(() => {
    if (!token) {
      setPmLoading(false);
      return;
    }
    userPaymentMethodsApi
      .list(token)
      .then((res) => {
        const methods =
          (res as unknown as { data?: UserPaymentMethod[] })?.data ?? [];
        setPaymentMethods(methods);
        setActiveTab((prev) => prev || "");
      })
      .catch(() => {})
      .finally(() => setPmLoading(false));
  }, [token]);

  const fetchWalletSummary = async () => {
    if (!token) {
      setWalletLoading(false);
      return;
    }

    try {
      setWalletLoading(true);
      const response = await walletApi.getSummary(token);
      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (fetchError) {
      console.error("Failed to load wallet summary:", fetchError);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    const handleWalletRefresh = () => {
      void fetchWalletSummary();
    };

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    return () => {
      window.removeEventListener(
        CLIENT_WALLET_REFRESH_EVENT,
        handleWalletRefresh,
      );
    };
  }, [token]);

  // Show full page skeleton during initial load
  if (pmLoading && walletLoading) {
    return <DepositPageSkeleton />;
  }

  return (
    <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Fund Deposit
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Choose a payment method below, follow the transfer instructions,
              then submit your payment details for review.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Main Wallet
              </p>
              <p className="text-sm font-semibold text-foreground">
                {walletLoading ? "--" : `${formatAmount(availableBalance)} USD`}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Last Deposit
              </p>
              <p className="text-sm font-semibold text-foreground">
                {walletLoading ? "--" : recentDepositLabel}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Method
              </p>
              <p className="text-sm font-semibold text-foreground">
                {activeTab === "bank"
                  ? "Bank"
                  : activeTab === "cash"
                    ? "Cash"
                    : activeTab === "binance_pay"
                      ? "Binance"
                      : activeTab === "coinsbuy"
                        ? "CoinsBuy"
                        : activeTab === "cregis"
                          ? "Crypto Currency"
                          : activeTab === "local"
                            ? "On-Chain"
                            : "Not selected"}
              </p>
            </div>
          </div>
        </div>

        {/* Deposit type toggle */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {pmLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ) : (
            <TabsList className="ib-portal-surface inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl border p-1.5">
              {hasLocal && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="local"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  On-Chain
                </TabsTrigger>
              )}
              {hasBinance && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="binance_pay"
                >
                  <WalletMinimal className="h-4 w-4 mr-2" />
                  Binance Pay
                </TabsTrigger>
              )}
              {hasCoinsbuy && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="coinsbuy"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  CoinsBuy
                </TabsTrigger>
              )}
              {hasCregis && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="cregis"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Crypto Currency
                </TabsTrigger>
              )}
              {hasBank && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="bank"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Bank Deposit
                </TabsTrigger>
              )}
              {hasCash && (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  value="cash"
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Cash
                </TabsTrigger>
              )}
              {comingSoonMethods.map((p) => (
                <TabsTrigger
                  className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:!text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20 [&[data-state=active]>svg]:!text-sidebar-primary"
                  key={p.type}
                  value={p.type}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {!pmLoading && !activeTab && (
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/30 to-muted/40 p-6 shadow-[0_20px_80px_-30px_hsl(var(--primary)/0.45)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-accent/35 blur-3xl" />
              <div className="relative grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
                    <Wallet className="h-3.5 w-3.5" />
                    Start Deposit
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Pick your transfer rail
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Choose a method from the tabs above to unlock tailored
                    instructions, fields, and settlement details.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Available methods
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hasLocal && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        On-Chain
                      </Badge>
                    )}
                    {hasBinance && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        Binance Pay
                      </Badge>
                    )}
                    {hasCoinsbuy && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        CoinsBuy
                      </Badge>
                    )}
                    {hasCregis && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        Crypto Currency
                      </Badge>
                    )}
                    {hasBank && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        Bank Deposit
                      </Badge>
                    )}
                    {hasCash && (
                      <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">
                        Cash
                      </Badge>
                    )}
                    {comingSoonMethods.length > 0 && (
                      <Badge variant="outline" className="rounded-full">
                        More options
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasLocal && (
            <TabsContent value="local" className="space-y-6">
              <OnChainDepositTab token={token} />
            </TabsContent>
          )}

          {hasBinance && (
            <TabsContent value="binance_pay" className="space-y-8">
              <BinancePayDepositTab token={token} />
            </TabsContent>
          )}

          {hasCoinsbuy && (
            <TabsContent value="coinsbuy" className="space-y-8">
              <CoinsBuyDepositTab token={token} />
            </TabsContent>
          )}

          {hasCregis && (
            <TabsContent value="cregis" className="space-y-8">
              <CregisDepositTab token={token} />
            </TabsContent>
          )}

          {hasBank && (
            <TabsContent value="bank" className="space-y-8">
              <BankDepositTab token={token} />
            </TabsContent>
          )}

          {hasCash && (
            <TabsContent value="cash" className="space-y-8">
              <CashDepositTab token={token} />
            </TabsContent>
          )}

          {/* Coming-soon tabs for unrecognised payment method types */}
          {comingSoonMethods.map((p) => (
            <TabsContent key={p.type} value={p.type} className="space-y-8">
              <ComingSoonTab name={p.name} description={p.description} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export function USDTDepositPageContent() {
  return <USDTDepositContent />;
}
