"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  QrCode,
  RefreshCw,
  Search,
  ShieldOff,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import {
  adminClient2FAApi,
  adminManagedManager2FAApi,
  adminManagersApi,
  adminUsersApi,
  type AdminManagedTwoFactorSetupResponse,
  type AdminUsersListApiData,
  type ManagerItem,
  type PendingUser,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

type TwoFactorManagementMode = "user" | "manager";

type TwoFactorRow = {
  id: number | string;
  name: string;
  email: string;
  mobile: string;
  statusText: string;
  secondaryText: string;
  created_at?: string;
  twoFaEnabled: boolean;
};

type SetupResult = AdminManagedTwoFactorSetupResponse & {
  entityName: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  try {
    return formatDateTimeInIST(value);
  } catch {
    return value;
  }
};

const transformUser = (raw: Record<string, unknown>): PendingUser => {
  const email = String(raw.email ?? "");
  const username =
    String(raw.username ?? "").trim() ||
    (email.includes("@") ? email.split("@")[0] : "");

  return {
    id: typeof raw.id === "number" ? raw.id : Number(raw.id ?? 0) || 0,
    uuid: String(raw.uuid ?? ""),
    first_name: String(raw.first_name ?? ""),
    last_name: String(raw.last_name ?? ""),
    name:
      `${String(raw.first_name ?? "")} ${String(raw.last_name ?? "")}`.trim() ||
      String(raw.name ?? "-"),
    email,
    username,
    mobile: String(raw.mobile ?? ""),
    country: String(raw.country ?? ""),
    country_code: String(raw.country_code ?? ""),
    sponsor_id: String(raw.sponsor_id ?? ""),
    referral_code: String(raw.referral_code ?? ""),
    status: String(raw.status ?? ""),
    two_fa_enabled: raw.two_fa_enabled as boolean | number | string | undefined,
    email_verified:
      typeof raw.email_verified === "number"
        ? raw.email_verified
        : Number(raw.email_verified ?? 0) || 0,
    payment_verified:
      typeof raw.payment_verified === "number"
        ? raw.payment_verified
        : Number(raw.payment_verified ?? 0) || 0,
    created_at: String(raw.created_at ?? ""),
  };
};

const extractUsers = (payload?: AdminUsersListApiData | null): PendingUser[] => {
  if (!payload) return [];

  const pick = (value: unknown) =>
    Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];

  const directUsers = pick(payload.users);
  if (directUsers.length) return directUsers.map(transformUser);

  const directItems = pick(payload.items);
  if (directItems.length) return directItems.map(transformUser);

  if (Array.isArray(payload.data)) {
    return payload.data.map((item) => transformUser(item as unknown as Record<string, unknown>));
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>;
    const nestedUsers = pick(nested.users);
    if (nestedUsers.length) return nestedUsers.map(transformUser);
    const nestedItems = pick(nested.items);
    if (nestedItems.length) return nestedItems.map(transformUser);
    const nestedData = pick(nested.data);
    if (nestedData.length) return nestedData.map(transformUser);
  }

  return [];
};

const normalizeUserStatus = (status: string) => {
  const normalized = status?.toLowerCase?.() ?? "";

  switch (normalized) {
    case "1":
    case "active":
      return "Active";
    case "2":
    case "blocked":
      return "Blocked";
    case "0":
    case "pending":
      return "Pending";
    default:
      return status || "Unknown";
  }
};

const toBoolean = (value: boolean | number | string | null | undefined) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
};

const normalizeUserRow = (user: PendingUser): TwoFactorRow => ({
  id: user.id,
  name: user.name || "-",
  email: user.email || "-",
  mobile: user.mobile || "-",
  statusText: normalizeUserStatus(user.status),
  secondaryText: user.username ? `@${user.username}` : user.sponsor_id || "Client",
  created_at: user.created_at,
  twoFaEnabled: toBoolean(user.two_fa_enabled),
});

const normalizeManagerRow = (manager: ManagerItem): TwoFactorRow => ({
  id: manager.id,
  name: manager.name || "-",
  email: manager.email || "-",
  mobile: manager.mobile || "-",
  statusText: manager.status ? "Active" : "Inactive",
  secondaryText: manager.uuid || "Manager",
  created_at: manager.created_at,
  twoFaEnabled: toBoolean(manager.two_fa_enabled),
});

const getPageCopy = (mode: TwoFactorManagementMode) => {
  if (mode === "manager") {
    return {
      title: "Manager 2FA",
      description: "Enable or disable Google 2FA for manager accounts.",
      searchPlaceholder: "Search managers by name, email, or mobile",
      emptyLabel: "No managers found.",
      typeLabel: "Manager",
    };
  }

  return {
    title: "User 2FA",
    description: "Enable or disable Google 2FA for client accounts.",
    searchPlaceholder: "Search users by name, email, username, or mobile",
    emptyLabel: "No users found.",
    typeLabel: "Client",
  };
};

const getColumns = (
  rowsTypeLabel: string,
  actionLoadingKey: string | null,
  toggleDisabled: boolean,
  onToggle: (row: TwoFactorRow, nextChecked: boolean) => void
): ColumnDef<TwoFactorRow>[] => [
  {
    id: "person",
    header: ({ column }) => <DataTableColumnHeader column={column} title={rowsTypeLabel} />,
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.secondaryText}</div>
      </div>
    ),
  },
  {
    id: "contact",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Contact" />,
    cell: ({ row }) => (
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{row.original.email}</span>
        </div>
        <div className="text-muted-foreground">{row.original.mobile || "-"}</div>
      </div>
    ),
  },
  {
    id: "twoFa",
    accessorKey: "twoFaEnabled",
    header: ({ column }) => <DataTableColumnHeader column={column} title="2FA" />,
    cell: ({ row }) => {
      const isBusy =
        actionLoadingKey === `enable:${row.original.id}` ||
        actionLoadingKey === `disable:${row.original.id}`;

      return (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.original.twoFaEnabled}
            disabled={Boolean(actionLoadingKey) || toggleDisabled}
            onCheckedChange={(checked) => onToggle(row.original, checked)}
            aria-label={`Toggle 2FA for ${row.original.name}`}
          />
          {/* <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            row.original.twoFaEnabled
              ? "bg-green-50 text-green-700 border-green-600/30"
              : "bg-red-50 text-red-700 border-red-600/30"
          }`}>
            {isBusy
              ? row.original.twoFaEnabled ? "Disabling..." : "Enabling..."
              : row.original.twoFaEnabled ? "Active" : "Disabled"}
          </span> */}
        </div>
      );
    },
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "account",
    accessorKey: "statusText",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account" />,
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium">
        {row.original.statusText}
      </Badge>
    ),
  },
];

export function TwoFactorManagementPageContent({
  mode,
}: {
  mode: TwoFactorManagementMode;
}) {
  const { token } = useAuth();
  const copy = getPageCopy(mode);
  const { isManager, hasFeature } = useManagerPermissions();

  const canViewList =
    !isManager ||
    (mode === "user"
      ? hasFeature("settingsManagement", "user2faList")
      : hasFeature("settingsManagement", "manager2faList"));

  const canToggleExternal2fa =
    !isManager ||
    (mode === "user"
      ? hasFeature("settingsManagement", "enabledDisabledUser2fa")
      : hasFeature("settingsManagement", "enabledDisabledManager2fa"));

  const [rows, setRows] = useState<TwoFactorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [disableTarget, setDisableTarget] = useState<TwoFactorRow | null>(null);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value.trim());
  }, 400);

  const loadRows = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    if (isManager && !canViewList) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      if (mode === "manager") {
        const response = await adminManagersApi.list(token);
        const managers = (response?.data?.managers || []) as ManagerItem[];
        const normalizedManagers = managers
          .map(normalizeManagerRow)
          .filter((manager) => {
            if (!searchQuery) return true;
            const haystack = `${manager.name} ${manager.email} ${manager.mobile}`.toLowerCase();
            return haystack.includes(searchQuery.toLowerCase());
          });
        setRows(normalizedManagers);
      } else {
        const response = await adminUsersApi.list({
          token,
          page: 1,
          limit: searchQuery ? 100 : 250,
          search: searchQuery || undefined,
        });
        const users = extractUsers(response?.data ?? null).map(normalizeUserRow);
        setRows(users);
      }
    } catch (error) {
      console.error(`Failed to load ${mode} 2FA records:`, error);
      setLoadError(error);
      setRows([]);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: `${mode === "manager" ? "manager" : "user"} 2FA list`,
          action: "load",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [canViewList, isManager, mode, searchQuery, token]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleCopy = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  }, []);

  const handleEnable = useCallback(
    async (row: TwoFactorRow) => {
      if (!token) return;

      if (isManager && !canToggleExternal2fa) {
        toast.error("You do not have permission to enable 2FA");
        return;
      }

      try {
        setActionLoadingKey(`enable:${row.id}`);
        const response =
          mode === "manager"
            ? await adminManagedManager2FAApi.enable(row.id, token)
            : await adminClient2FAApi.enable(row.id, token);

        const data = response?.data;
        if (!data) {
          throw new Error("2FA setup response did not include data");
        }

        setSetupResult({
          ...data,
          entityName: row.name,
        });
        setRows((prev) =>
          prev.map((item) =>
            item.id === row.id ? { ...item, twoFaEnabled: true } : item
          )
        );

        toast.success(
          response?.message ||
            `${copy.typeLabel} 2FA enabled. Share the QR code or secret with the ${copy.typeLabel.toLowerCase()}.`
        );
      } catch (error) {
        console.error(`Failed to enable ${mode} 2FA:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: `${copy.typeLabel.toLowerCase()} 2FA`,
            action: "enable",
          })
        );
      } finally {
        setActionLoadingKey(null);
      }
    },
    [canToggleExternal2fa, copy.typeLabel, isManager, mode, token]
  );

  const handleDisableConfirm = useCallback(async () => {
    if (!token || !disableTarget) return;

    if (isManager && !canToggleExternal2fa) {
      toast.error("You do not have permission to disable 2FA");
      return;
    }

    try {
      setActionLoadingKey(`disable:${disableTarget.id}`);
      const response =
        mode === "manager"
          ? await adminManagedManager2FAApi.disable(disableTarget.id, token)
          : await adminClient2FAApi.disable(disableTarget.id, token);

      setRows((prev) =>
        prev.map((item) =>
          item.id === disableTarget.id ? { ...item, twoFaEnabled: false } : item
        )
      );
      toast.success(
        response?.message ||
          `${copy.typeLabel} 2FA disabled successfully`
      );
      setDisableTarget(null);
    } catch (error) {
      console.error(`Failed to disable ${mode} 2FA:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: `${copy.typeLabel.toLowerCase()} 2FA`,
          action: "disable",
        })
      );
    } finally {
      setActionLoadingKey(null);
    }
  }, [
    canToggleExternal2fa,
    copy.typeLabel,
    disableTarget,
    isManager,
    mode,
    token,
  ]);

  const columns = useMemo(
    () =>
      getColumns(
        copy.typeLabel,
        actionLoadingKey,
        isManager && !canToggleExternal2fa,
        (row, nextChecked) => {
          if (nextChecked) {
            void handleEnable(row);
            return;
          }

          setDisableTarget(row);
        }
      ),
    [
      actionLoadingKey,
      canToggleExternal2fa,
      copy.typeLabel,
      handleEnable,
      isManager,
    ]
  );

  const enabledCount = useMemo(
    () => rows.filter((row) => row.twoFaEnabled).length,
    [rows]
  );
  const disabledCount = rows.length - enabledCount;

  if (isManager && !canViewList) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <p className="text-muted-foreground">
            You do not have permission to view this section.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={loadError}
            audience="admin"
            variant="panel"
            resource={`${copy.typeLabel.toLowerCase()} 2FA`}
            action="load"
            onRetry={() => {
              void loadRows();
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  {mode === "manager" ? (
                    <UserCog className="h-6 w-6 text-primary" />
                  ) : (
                    <Users className="h-6 w-6 text-primary" />
                  )}
                  {copy.title}
                </h1>
                <p className="text-sm text-muted-foreground">{copy.description}</p>
              </div>
              <Button variant="outline" onClick={() => void loadRows()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="text-sm text-muted-foreground">Total {copy.typeLabel}s</div>
                <div className="mt-2 text-2xl font-semibold">{rows.length}</div>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-green-600" />
                  2FA Enabled
                </div>
                <div className="mt-2 text-2xl font-semibold">{enabledCount}</div>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldOff className="h-4 w-4 text-muted-foreground" />
                  2FA Disabled
                </div>
                <div className="mt-2 text-2xl font-semibold">{disabledCount}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="flex w-full max-w-md items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);
                    debouncedSetSearch(value);
                  }}
                  placeholder={copy.searchPlaceholder}
                  className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                {searchInput ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      setSearchQuery("");
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              {loading && rows.length === 0 ? (
                <TableSectionSkeleton columnCount={5} rowCount={8} />
              ) : rows.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {copy.emptyLabel}
                </div>
              ) : (
                <AppDataTable<TwoFactorRow>
                  data={rows}
                  columns={columns}
                  getRowId={(row) => String(row.id)}
                />
              )}
            </div>
          </div>
        </div>

        <Dialog
          open={Boolean(setupResult)}
          onOpenChange={(open) => {
            if (!open) {
              setSetupResult(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                {copy.typeLabel} 2FA Enabled
              </DialogTitle>
              <DialogDescription>
                Share this QR code or secret with {setupResult?.entityName || "the selected account"} to add it to an authenticator app.
              </DialogDescription>
            </DialogHeader>

            {setupResult ? (
              <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </div>
                  {setupResult.qrCode ? (
                    <img
                      src={setupResult.qrCode}
                      alt={`${copy.typeLabel} 2FA QR code`}
                      className="mx-auto h-auto w-full rounded-md border bg-white p-2"
                    />
                  ) : (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      QR code unavailable
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Account
                    </div>
                    <div className="mt-2 text-sm font-medium">{setupResult.entityName}</div>
                    <div className="text-sm text-muted-foreground">{setupResult.email}</div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <KeyRound className="h-4 w-4" />
                        Secret
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopy(setupResult.secret, "Secret")}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
                      {setupResult.secret}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">OTP Auth URL</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopy(setupResult.otpauthUrl, "OTP Auth URL")}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <div className="break-all rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                      {setupResult.otpauthUrl}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" onClick={() => setSetupResult(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(disableTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDisableTarget(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disable {copy.typeLabel} 2FA</DialogTitle>
              <DialogDescription>
                This will remove the current authenticator setup for {disableTarget?.name || "the selected account"}.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDisableTarget(null)}
                disabled={Boolean(actionLoadingKey)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDisableConfirm()}
                disabled={actionLoadingKey === `disable:${disableTarget?.id ?? ""}`}
              >
                {actionLoadingKey === `disable:${disableTarget?.id ?? ""}` ? "Disabling..." : "Disable 2FA"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </ProtectedRoute>
  );
}
