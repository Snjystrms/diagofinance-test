"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  BadgePercent,
  HandCoins,
  Loader2,
  RefreshCw,
  Settings2,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import {
  adminDefaultSettingsApi,
  type DefaultSettingsItem,
  type DefaultSettingsUpdateBody,
} from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

type SettingKey = keyof DefaultSettingsUpdateBody;

type SettingDefinition = {
  key: SettingKey;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "disable_account",
    title: "Disable Account Registration",
    description:
      "Block new client accounts from being registered on the platform.",
    icon: UserPlus,
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  },
  {
    key: "disable_deposit",
    title: "Disable Deposits",
    description: "Stop clients from depositing funds into their wallets.",
    icon: Wallet,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  {
    key: "disable_withdraw",
    title: "Disable Withdrawals",
    description: "Prevent clients from withdrawing funds from their wallets.",
    icon: HandCoins,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    key: "disable_transfer",
    title: "Disable Internal Transfers",
    description: "Block all internal transfers between wallets and accounts.",
    icon: ArrowLeftRight,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    key: "disable_ib_withdraw",
    title: "Disable IB Withdrawals",
    description: "Prevent IB partners from withdrawing their earnings.",
    icon: Users,
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  {
    key: "disable_mt5_to_wallet",
    title: "Disable MT5 to Wallet",
    description: "Block transfers from MT5 trading accounts to wallets.",
    icon: ArrowDownToLine,
    tone: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  {
    key: "disable_wallet_to_mt5",
    title: "Disable Wallet to MT5",
    description: "Block transfers from wallets to MT5 trading accounts.",
    icon: ArrowUpFromLine,
    tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
  },
  {
    key: "disable_ib_commission",
    title: "Disable IB Commission",
    description: "Stop accrual of new IB commissions.",
    icon: BadgePercent,
    tone: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
];

const buildUpdateBody = (
  settings: DefaultSettingsItem,
  key: SettingKey,
  value: boolean,
): DefaultSettingsUpdateBody => ({
  disable_account:
    key === "disable_account" ? value : settings.disable_account,
  disable_deposit:
    key === "disable_deposit" ? value : settings.disable_deposit,
  disable_withdraw:
    key === "disable_withdraw" ? value : settings.disable_withdraw,
  disable_transfer:
    key === "disable_transfer" ? value : settings.disable_transfer,
  disable_ib_withdraw:
    key === "disable_ib_withdraw" ? value : settings.disable_ib_withdraw,
  disable_mt5_to_wallet:
    key === "disable_mt5_to_wallet" ? value : settings.disable_mt5_to_wallet,
  disable_wallet_to_mt5:
    key === "disable_wallet_to_mt5" ? value : settings.disable_wallet_to_mt5,
  disable_ib_commission:
    key === "disable_ib_commission" ? value : settings.disable_ib_commission,
});

const normalizeSettings = (data: DefaultSettingsItem): DefaultSettingsItem => ({
  disable_account: Boolean(data.disable_account),
  disable_deposit: Boolean(data.disable_deposit),
  disable_withdraw: Boolean(data.disable_withdraw),
  disable_transfer: Boolean(data.disable_transfer),
  disable_ib_withdraw: Boolean(data.disable_ib_withdraw),
  disable_mt5_to_wallet: Boolean(data.disable_mt5_to_wallet),
  disable_wallet_to_mt5: Boolean(data.disable_wallet_to_mt5),
  disable_ib_commission: Boolean(data.disable_ib_commission),
  updated_by: data.updated_by ?? null,
  updated_at: data.updated_at ?? null,
});

export default function DefaultSettingsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [settings, setSettings] = useState<DefaultSettingsItem | null>(null);
  const [pendingKey, setPendingKey] = useState<SettingKey | null>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["default-settings", token],
    queryFn: async () => {
      const res = await adminDefaultSettingsApi.get(token!);
      if (!res?.data) {
        throw new Error(res?.message || "Failed to load default settings");
      }
      return normalizeSettings(res.data);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (data) setSettings(data);
  }, [data]);

  const handleToggle = async (key: SettingKey) => {
    if (!token || !settings || pendingKey) return;
    const previous = settings;
    const nextValue = !settings[key];

    setSettings({ ...previous, [key]: nextValue });
    setPendingKey(key);

    try {
      const res = await adminDefaultSettingsApi.update(
        buildUpdateBody(previous, key, nextValue),
        token,
      );
      if (res?.data) {
        setSettings(normalizeSettings(res.data));
      }
      toast.success(res?.message || "Setting updated");
      void queryClient.invalidateQueries({
        queryKey: ["default-settings", token],
      });
    } catch (error) {
      setSettings(previous);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "default settings",
          action: "update",
        }),
      );
    } finally {
      setPendingKey(null);
    }
  };

  const disabledCount =
    settings === null
      ? 0
      : SETTING_DEFINITIONS.filter(
          (item) => settings[item.key] === true,
        ).length;

  return (
    <ProtectedRoute>
      <div className="px-4 md:px-6 lg:px-8 py-10 max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Settings2 className="h-6 w-6 text-primary" />
              Default Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Control which trading and wallet features are disabled across the
              platform.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {settings && (
              <Badge
                variant={disabledCount > 0 ? "default" : "secondary"}
                className="h-9 px-3"
              >
                {disabledCount} of {SETTING_DEFINITIONS.length} features
                disabled
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load default settings.{" "}
            <button onClick={() => refetch()} className="underline">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 rounded-2xl border p-4"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">
                Feature Availability
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Toggle each switch to enable or disable a feature. Changes are
                saved immediately.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              {SETTING_DEFINITIONS.map((item) => {
                const enabled = settings?.[item.key] === true;
                const isPending = pendingKey === item.key;
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="group relative flex items-start justify-between gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={enabled}
                        disabled={!settings || pendingKey !== null}
                        onCheckedChange={() => void handleToggle(item.key)}
                        aria-label={item.title}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {settings && (
          <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              Last updated:{" "}
              {settings.updated_at
                ? formatApiDateTimeAsIST(settings.updated_at)
                : "Never"}
            </span>
            {settings.updated_by && (
              <span>
                Updated by:{" "}
                <span className="font-medium text-foreground">
                  {settings.updated_by}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
