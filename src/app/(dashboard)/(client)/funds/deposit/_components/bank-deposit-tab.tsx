"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  bankDepositApi,
  type BankDepositRecord,
  type BankDepositTarget,
} from "@/lib/api";
import {
  userBrokerBankDetailsApi,
  userCurrencyRatesApi,
  type BrokerBankDetailItem,
  type CurrencyRateItem,
} from "@/lib/api-auth-admin";
import { mt5AccountsApi, type MT5Account } from "@/lib/api-trading-ib";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  FileText,
  Hash,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  DepositInfoPanel,
  formatDateTime,
  isBrokerBankDetailActive,
  MINIMUM_DEPOSIT_AMOUNT,
  UPIQRCodeDisplay,
} from "./deposit-shared";

export function BankDepositTab({ token }: { token: string | null }) {
  const [bankTarget, setBankTarget] = useState<BankDepositTarget>("wallet");
  const [bankAccountRef, setBankAccountRef] = useState("");
  const [bankAmount, setBankAmount] = useState("");
  const [bankTxId, setBankTxId] = useState("");
  const [bankComment, setBankComment] = useState("");
  const [bankPaymentProof, setBankPaymentProof] = useState<File | null>(null);
  const [bankPaymentProofPreview, setBankPaymentProofPreview] = useState<
    string | null
  >(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankSubmitResult, setBankSubmitResult] = useState<{
    id: number;
    status: string;
    created_at: string;
    target: BankDepositTarget;
    mt5_account_id: string | null;
    mt5_login: number | null;
  } | null>(null);
  const [bankRequests, setBankRequests] = useState<BankDepositRecord[]>([]);
  const [bankRequestsLoading, setBankRequestsLoading] = useState(false);
  const [brokerBankDetails, setBrokerBankDetails] = useState<
    BrokerBankDetailItem[]
  >([]);
  const [brokerBankDetailsLoading, setBrokerBankDetailsLoading] =
    useState(false);
  const [brokerBankDetailsError, setBrokerBankDetailsError] = useState<
    string | null
  >(null);
  const [selectedBankDetailId, setSelectedBankDetailId] = useState<
    number | null
  >(null);
  const [bankCurrency, setBankCurrency] = useState("INR");
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateItem[]>([]);
  const [currencyRatesLoading, setCurrencyRatesLoading] = useState(false);
  const [bankRequestStatusFilter, setBankRequestStatusFilter] =
    useState<string>("all");
  const [bankMt5Accounts, setBankMt5Accounts] = useState<MT5Account[]>([]);
  const [bankMt5AccountsLoading, setBankMt5AccountsLoading] = useState(false);

  const visibleBrokerBankDetails = useMemo(() => {
    const activeDetails = brokerBankDetails.filter((detail) =>
      isBrokerBankDetailActive(detail),
    );
    return activeDetails.length > 0 ? activeDetails : brokerBankDetails;
  }, [brokerBankDetails]);
  const selectedBankDetail =
    visibleBrokerBankDetails.find((d) => d.id === selectedBankDetailId) ||
    visibleBrokerBankDetails[0] ||
    null;
  const availableBankCurrencies = useMemo(() => {
    const activeRates = currencyRates.filter((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return (
        rate.from_currency?.toUpperCase() === "USD" &&
        (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
      );
    });
    const unique = Array.from(
      new Set(
        activeRates
          .map((rate) => rate.to_currency?.toUpperCase())
          .filter(Boolean),
      ),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [currencyRates]);
  const selectedUsdToBankRate = useMemo(() => {
    return currencyRates.find((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return (
        rate.from_currency?.toUpperCase() === "USD" &&
        rate.to_currency?.toUpperCase() === bankCurrency.toUpperCase() &&
        (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
      );
    });
  }, [bankCurrency, currencyRates]);
  const bankAmountNum = parseFloat(bankAmount);
  const selectedDepositRate = Number(selectedUsdToBankRate?.deposit_rate ?? 0);
  const convertedUsdAmount =
    !isNaN(bankAmountNum) && bankAmountNum > 0 && selectedDepositRate > 0
      ? bankAmountNum / selectedDepositRate
      : null;
  const selectedBankMt5Account = bankMt5Accounts.find(
    (acc) => String(acc.account_id) === bankAccountRef,
  );

  const fetchBankRequests = useCallback(async () => {
    if (!token) return;
    try {
      setBankRequestsLoading(true);
      const statusParam =
        bankRequestStatusFilter !== "all" ? bankRequestStatusFilter : undefined;
      const res = await bankDepositApi.listRequests(token, 1, 50, statusParam);
      const raw = res as unknown as {
        success: boolean;
        data: { requests: BankDepositRecord[] };
      };
      if (raw.success && Array.isArray(raw.data?.requests)) {
        const sorted = [...raw.data.requests].sort((a, b) => {
          const idA = typeof a.id === "number" ? a.id : 0;
          const idB = typeof b.id === "number" ? b.id : 0;
          return idA - idB;
        });
        setBankRequests(sorted);
      }
    } catch (e) {
      console.error("Failed to fetch bank requests:", e);
    } finally {
      setBankRequestsLoading(false);
    }
  }, [token, bankRequestStatusFilter]);

  const fetchBrokerBankDetails = useCallback(async () => {
    if (!token) {
      setBrokerBankDetails([]);
      setBrokerBankDetailsError(null);
      return;
    }

    try {
      setBrokerBankDetailsLoading(true);
      setBrokerBankDetailsError(null);
      const response = await userBrokerBankDetailsApi.list(token);
      const details = Array.isArray(response.data) ? response.data : [];
      setBrokerBankDetails(details);
      if (details.length > 0 && selectedBankDetailId === null) {
        setSelectedBankDetailId(details[0].id);
      }
    } catch (fetchError) {
      console.error("Failed to fetch broker bank details:", fetchError);
      setBrokerBankDetails([]);
      setBrokerBankDetailsError(
        getFriendlyErrorMessage(fetchError, {
          audience: "client",
          resource: "bank account details",
          action: "load",
        }),
      );
    } finally {
      setBrokerBankDetailsLoading(false);
    }
  }, [token]);

  const fetchBankMt5Accounts = useCallback(async () => {
    if (!token) {
      setBankMt5Accounts([]);
      return;
    }
    try {
      setBankMt5AccountsLoading(true);
      const response = await mt5AccountsApi.getAll(token);
      const accounts = Array.isArray(response.data?.mt5_accounts)
        ? response.data.mt5_accounts
        : [];
      setBankMt5Accounts(accounts);
    } catch (fetchError) {
      console.error("Failed to fetch MT5 accounts:", fetchError);
      setBankMt5Accounts([]);
    } finally {
      setBankMt5AccountsLoading(false);
    }
  }, [token]);

  const fetchCurrencyRates = useCallback(async () => {
    if (!token) {
      setCurrencyRates([]);
      return;
    }
    try {
      setCurrencyRatesLoading(true);
      const response = await userCurrencyRatesApi.list({
        token,
        page: 1,
        per_page: 500,
      });
      const rates = Array.isArray(response.data?.currencyRates)
        ? response.data.currencyRates
        : [];
      setCurrencyRates(rates);
    } catch (fetchError) {
      console.error("Failed to fetch currency rates:", fetchError);
      setCurrencyRates([]);
    } finally {
      setCurrencyRatesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchBankRequests();
    void fetchBrokerBankDetails();
    void fetchBankMt5Accounts();
    void fetchCurrencyRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (availableBankCurrencies.length === 0) return;
    if (!availableBankCurrencies.includes(bankCurrency.toUpperCase())) {
      setBankCurrency(availableBankCurrencies[0]);
    }
  }, [availableBankCurrencies, bankCurrency]);

  const handleBankPaymentProofChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setBankPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () =>
        setBankPaymentProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBankRemovePaymentProof = () => {
    setBankPaymentProof(null);
    setBankPaymentProofPreview(null);
  };

  const handleNewBankDeposit = () => {
    setBankSubmitResult(null);
    setBankError(null);
    setBankPaymentProof(null);
    setBankPaymentProofPreview(null);
    setBankAmount("");
    setBankTxId("");
    setBankTarget("wallet");
    setBankAccountRef("");
  };

  const handleBankSubmit = async () => {
    setBankError(null);
    const amountNum = parseFloat(bankAmount);
    if (!bankAmount.trim() || isNaN(amountNum) || amountNum <= 0) {
      setBankError("Please enter a valid amount");
      return;
    }
    if (!bankTxId.trim()) {
      setBankError("Transaction ID is required");
      return;
    }
    if (bankTarget === "mt5" && !bankAccountRef.trim()) {
      setBankError("Please select an MT5 account to credit the deposit");
      return;
    }
    if (!token) {
      setBankError("Authentication required");
      return;
    }
    if (!convertedUsdAmount || convertedUsdAmount <= 0) {
      setBankError(
        "Deposit conversion rate is currently unavailable for this currency",
      );
      return;
    }
    try {
      setIsSubmittingBank(true);

      const res = await bankDepositApi.submit(
        {
          target: bankTarget,
          account_ref: bankTarget === "mt5" ? bankAccountRef.trim() : undefined,
          amount: convertedUsdAmount,
          transaction_id: bankTxId.trim(),
          payment_proof: bankPaymentProof || undefined,
          comment: bankComment.trim() || undefined,
        },
        token,
      );
      const raw = res as unknown as {
        success: boolean;
        message?: string;
        data?: {
          id: number;
          status: string;
          created_at: string;
          target: BankDepositTarget;
          mt5_account_id: string | null;
          mt5_login: number | null;
        };
      };
      if (raw.success && raw.data) {
        setBankSubmitResult(raw.data);
        setBankAmount("");
        setBankTxId("");
        setBankComment("");
        toast.success(
          raw.message || "Bank deposit request submitted successfully",
        );
        void fetchBankRequests();
        notifyWalletRefresh();
      } else {
        setBankError(
          (raw as { message?: string }).message || "Submission failed",
        );
      }
    } catch (e) {
      console.error("Bank deposit error:", e);
      setBankError(
        getFriendlyErrorMessage(e, {
          audience: "client",
          resource: "bank deposit",
          action: "submit",
        }),
      );
    } finally {
      setIsSubmittingBank(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left — Bank account details */}
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  Bank Account Details
                </CardTitle>
                <CardDescription>
                  {visibleBrokerBankDetails.length > 1
                    ? "Select a bank account and transfer funds, then submit the Transaction ID."
                    : "Transfer funds to the approved account below, then submit the Transaction ID."}
                  {selectedBankDetail?.upi_qr_code_url && (
                    <span className="block mt-1 text-primary font-medium">
                      UPI payments are available for this bank account.
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedBankDetail) return;
                    const lines = [
                      `Bank: ${selectedBankDetail.bank_name}`,
                      `Account Name: ${selectedBankDetail.account_holder_name || "-"}`,
                      `Account Number: ${selectedBankDetail.account_number || "-"}`,
                      selectedBankDetail.iban_number
                        ? `IBAN: ${selectedBankDetail.iban_number}`
                        : null,
                      `IFSC / SWIFT: ${selectedBankDetail.swift_ifsc_code || "-"}`,
                      `Address: ${selectedBankDetail.address || "-"}`,
                      `Country: ${selectedBankDetail.country || "-"}`,
                    ].filter(Boolean);
                    navigator.clipboard
                      .writeText(lines.join("\n"))
                      .then(() => {
                        toast.success("Bank details copied to clipboard");
                      });
                  }}
                  disabled={!selectedBankDetail}
                  aria-label="Copy bank details"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBrokerBankDetails}
                  disabled={brokerBankDetailsLoading}
                  aria-label="Refresh bank account details"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${brokerBankDetailsLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {brokerBankDetailsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-border/50 bg-muted/20 p-4"
                    >
                      <Skeleton className="mb-3 h-5 w-40" />
                      <div className="grid gap-3 md:grid-cols-2">
                        {[1, 2, 3, 4].map((field) => (
                          <div key={field} className="space-y-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : brokerBankDetailsError ? (
                <ApiErrorState
                  message={brokerBankDetailsError}
                  audience="client"
                  resource="bank account details"
                  action="load"
                  variant="inline"
                />
              ) : visibleBrokerBankDetails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                  Bank deposit details are not available right now. Please
                  contact support before sending funds.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bank Selector - show if multiple accounts */}
                  {visibleBrokerBankDetails.length > 1 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">
                        Select Bank Account
                      </Label>
                      <div className="grid gap-2">
                        {visibleBrokerBankDetails.map((detail) => {
                          const active = isBrokerBankDetailActive(detail);
                          return (
                            <button
                              key={detail.id}
                              type="button"
                              onClick={() => setSelectedBankDetailId(detail.id)}
                              className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                                selectedBankDetailId === detail.id
                                  ? "border-primary bg-primary/5"
                                  : "border-border/60 bg-muted/20 hover:border-primary/40"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  selectedBankDetailId === detail.id
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-foreground truncate">
                                  {detail.bank_name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate">
                                  {detail.account_number ||
                                    detail.iban_number ||
                                    "-"}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  active
                                    ? selectedBankDetailId === detail.id
                                      ? "default"
                                      : "secondary"
                                    : "outline"
                                }
                                className="shrink-0"
                              >
                                {active ? "Active" : "Inactive"}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected Bank Details */}
                  {selectedBankDetail && (
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm">
                      {visibleBrokerBankDetails.length <= 1 && (
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-foreground">
                              {selectedBankDetail.bank_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selectedBankDetail.country}
                            </div>
                          </div>
                          <Badge
                            variant={
                              isBrokerBankDetailActive(selectedBankDetail)
                                ? "default"
                                : "secondary"
                            }
                          >
                            {isBrokerBankDetailActive(selectedBankDetail)
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        {[
                          {
                            label: "Account Name",
                            value: selectedBankDetail.account_holder_name,
                          },
                          {
                            label: "Account Number",
                            value: selectedBankDetail.account_number,
                          },
                          {
                            label: "IBAN Number",
                            value: selectedBankDetail.iban_number,
                          },
                          {
                            label: "IFSC / SWIFT",
                            value: selectedBankDetail.swift_ifsc_code,
                          },
                          {
                            label: "Address",
                            value: selectedBankDetail.address,
                          },
                        ].map(({ label, value }) => (
                          <div
                            key={`${selectedBankDetail.id}-${label}`}
                            className="rounded-xl border border-border/50 bg-background/80 px-4 py-3"
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {label}
                            </div>
                            <div className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                              {value || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UPI QR Code Section */}
                  {selectedBankDetail?.upi_qr_code_url && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                          <QrCode className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">
                          Make UPI Payment
                        </h3>
                      </div>

                      <p className="mb-4 text-sm text-muted-foreground">
                        You can make your payment using UPI by scanning the QR
                        code below with any UPI app (Google Pay, PhonePe, Paytm,
                        etc.)
                      </p>

                      <div className="flex justify-center mb-4">
                        <div className="relative rounded-xl border-2 border-primary/30 bg-white p-4 shadow-lg">
                          <UPIQRCodeDisplay
                            qrCodeUrl={selectedBankDetail.upi_qr_code_url}
                            bankName={selectedBankDetail.bank_name}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-primary/20 bg-background/80 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div className="text-xs text-foreground space-y-1">
                            <p className="font-semibold">
                              How to pay using UPI:
                            </p>
                            <ul className="space-y-0.5 list-none ml-0">
                              <li>1. Open your UPI app (GPay, PhonePe, Paytm, etc.)</li>
                              <li>2. Scan the QR code above</li>
                              <li>3. Enter the amount and complete the payment</li>
                              <li>4. Note down the Transaction ID from your app</li>
                              <li>5. Submit the Transaction ID in the form on the right</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <DepositInfoPanel
                title="Bank deposit flow"
                tagline="Transfer to the approved account, then submit your payment details for review."
                steps={[
                  {
                    icon: DollarSign,
                    title: "Choose currency",
                    text: "Pick your deposit currency and live USD rate.",
                  },
                  {
                    icon: Banknote,
                    title: "Transfer funds",
                    text: "Send to the approved bank account or scan the UPI QR code.",
                  },
                  {
                    icon: FileText,
                    title: "Submit details",
                    text: "Enter the Transaction ID and attach your payment proof.",
                  },
                ]}
                verifyTitle="What to verify"
                verify={[
                  {
                    icon: Hash,
                    title: "Record",
                    text: "Keep your Transaction / Reference ID safe.",
                  },
                  {
                    icon: Clock,
                    title: "Processing time",
                    text: "Transfers typically reflect within 1-2 business days.",
                  },
                  {
                    icon: Banknote,
                    title: "Minimum deposit",
                    text: `${MINIMUM_DEPOSIT_AMOUNT} USD equivalent is required.`,
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right — Submit form + history */}
        <div className="space-y-6">
          {/* Submit form */}
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Submit Transfer
              </CardTitle>
              <CardDescription>
                Select your transfer currency, enter amount, and transaction ID
                from your bank transfer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {bankSubmitResult ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    Deposit Submitted
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    Your bank deposit request is under review and will be
                    credited soon!.
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20 space-y-2 text-left">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        The admin team is reviewing your deposit and will credit
                        the funds once approved.
                      </p>
                      <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
                        <span className="font-medium">Credit target</span>
                        <span className="capitalize">
                          {bankSubmitResult.target === "mt5"
                            ? "MT5 Account"
                            : "Main Wallet"}
                        </span>
                      </div>
                      {bankSubmitResult.target === "mt5" && (
                        <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
                          <span className="font-medium">MT5 Account</span>
                          <span className="font-mono">
                            {bankSubmitResult.mt5_account_id ||
                              bankSubmitResult.mt5_login ||
                              "-"}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      onClick={handleNewBankDeposit}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Make New Bank Deposit
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {bankError && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {bankError}
                    </div>
                  )}

                  {/* Target */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Credit to <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBankTarget("wallet")}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                          bankTarget === "wallet"
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            bankTarget === "wallet"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Main Wallet
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Credit to wallet
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBankTarget("mt5")}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                          bankTarget === "mt5"
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            bankTarget === "mt5"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            MT5 Account
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Credit to trading account
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* MT5 account selector */}
                  {bankTarget === "mt5" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        MT5 Account <span className="text-destructive">*</span>
                      </Label>
                      {bankMt5AccountsLoading ? (
                        <Skeleton className="h-11 w-full rounded-xl" />
                      ) : bankMt5Accounts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-4 text-center text-sm text-muted-foreground">
                          No MT5 accounts available right now.
                        </div>
                      ) : (
                        <select
                          value={bankAccountRef}
                          onChange={(e) => setBankAccountRef(e.target.value)}
                          disabled={isSubmittingBank}
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select an MT5 account</option>
                          {bankMt5Accounts.map((acc) => (
                            <option key={acc.id} value={acc.account_id}>
                              {acc.account_id} · {acc.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {selectedBankMt5Account && (
                        <p className="text-xs text-muted-foreground">
                          Crediting to {selectedBankMt5Account.account_id} (
                          {selectedBankMt5Account.name})
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bank-currency" className="text-sm font-semibold">
                      Deposit Currency{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="bank-currency"
                      value={bankCurrency}
                      onChange={(e) => setBankCurrency(e.target.value)}
                      disabled={
                        isSubmittingBank ||
                        currencyRatesLoading ||
                        availableBankCurrencies.length === 0
                      }
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {availableBankCurrencies.length === 0 ? (
                        <option value="INR">No currencies available</option>
                      ) : (
                        availableBankCurrencies.map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-amount" className="text-sm font-semibold">
                      Amount ({bankCurrency.toUpperCase()}){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="bank-amount"
                        type="number"
                        step="1"
                        min="1"
                        value={bankAmount}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onChange={(e) => setBankAmount(e.target.value)}
                        className="pl-9 h-11 rounded-xl"
                        placeholder="100.00"
                        disabled={isSubmittingBank}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedDepositRate > 0
                        ? `Rate: 1 USD = ${selectedDepositRate.toFixed(2)} ${bankCurrency.toUpperCase()}`
                        : "USD conversion rate is currently unavailable for this currency."}
                    </p>
                    {convertedUsdAmount !== null && (
                      <p className="text-xs font-medium text-foreground">
                        USD equivalent: ${convertedUsdAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-txid" className="text-sm font-semibold">
                      Transaction / Reference ID{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="bank-txid"
                        value={bankTxId}
                        onChange={(e) => setBankTxId(e.target.value)}
                        className="pl-9 h-11 rounded-xl"
                        placeholder="e.g. TXN1234567890"
                        disabled={isSubmittingBank}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Found on your bank statement or payment receipt.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-comment" className="text-sm font-semibold">
                      Comment{" "}
                      <span className="text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <textarea
                      id="bank-comment"
                      value={bankComment}
                      onChange={(e) => setBankComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border-2 border-border focus:border-primary bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none transition-colors"
                      placeholder="Add any additional notes for this deposit (optional)"
                      disabled={isSubmittingBank}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-payment-proof" className="text-sm font-semibold">
                      Payment Proof<span className="text-destructive">*</span>
                    </Label>
                    {!bankPaymentProof ? (
                      <div className="rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50">
                        <label
                          htmlFor="bank-payment-proof"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <p className="text-xs text-foreground mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, WEBP up to 5MB
                          </p>
                        </label>
                        <input
                          id="bank-payment-proof"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleBankPaymentProofChange}
                          className="hidden"
                          disabled={isSubmittingBank}
                        />
                      </div>
                    ) : (
                      <div className="relative border-2 border-border rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          {bankPaymentProofPreview && (
                            <img
                              src={bankPaymentProofPreview}
                              alt="Payment proof preview"
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {bankPaymentProof.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(bankPaymentProof.size / 1024 / 1024).toFixed(2)}{" "}
                              MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleBankRemovePaymentProof}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot of your bank transfer receipt (JPEG,
                      PNG, or WebP, max 5MB)
                    </p>
                  </div>

                  <Button
                    onClick={handleBankSubmit}
                    disabled={
                      isSubmittingBank ||
                      !bankAmount.trim() ||
                      !bankTxId.trim() ||
                      !bankPaymentProof ||
                      visibleBrokerBankDetails.length === 0 ||
                      !convertedUsdAmount ||
                      convertedUsdAmount < MINIMUM_DEPOSIT_AMOUNT ||
                      (bankTarget === "mt5" && !bankAccountRef.trim())
                    }
                    className="h-11 w-full rounded-xl text-base font-semibold"
                  >
                    {isSubmittingBank ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Submit Deposit Request
                      </>
                    )}
                  </Button>
                  {convertedUsdAmount !== null &&
                    convertedUsdAmount > 0 &&
                    convertedUsdAmount < MINIMUM_DEPOSIT_AMOUNT && (
                      <p className="text-xs text-destructive font-medium">
                        Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
                        (equivalent:{" "}
                        {(MINIMUM_DEPOSIT_AMOUNT * selectedDepositRate).toFixed(
                          2,
                        )}{" "}
                        {bankCurrency.toUpperCase()})
                      </p>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request history — full width below the grid */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Your Requests
            </CardTitle>
            <CardDescription className="text-xs">
              Recent bank deposit submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bankRequestStatusFilter}
              onChange={(e) => setBankRequestStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBankRequests}
              disabled={bankRequestsLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${bankRequestsLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bankRequestsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : bankRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">No bank deposit requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Sr. No.</TableHead>
                    <TableHead className="text-xs">Amount (USD)</TableHead>
                    <TableHead className="text-xs">Txn ID</TableHead>
                    <TableHead className="text-xs">Target</TableHead>
                    <TableHead className="text-xs">MT5 Account</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankRequests.map((req, index) => {
                    const statusColor =
                      req.status === "approved"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                        : req.status === "rejected"
                          ? "border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                          : "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20";
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="text-sm font-semibold">
                          ${Number(req.amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[80px] truncate">
                          {req.transaction_id}
                        </TableCell>
                        <TableCell className="text-xs capitalize">
                          {req.target === "mt5" ? "MT5 Account" : "Wallet"}
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[120px] truncate">
                          {req.mt5_account_id || req.mt5_login || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${statusColor}`}
                          >
                            {req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(req.created_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
