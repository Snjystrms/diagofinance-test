"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  Download,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";

import { AppDataTable } from "@/components/app-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { SearchSelectFieldEnhanced } from "@/components/ui/search-select-field-enhanced";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminBonusApi,
  type AdminBonusLedgerItem,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type BonusActionMode = "give" | "remove";

type BonusFormState = {
  mt5_id: string;
  amount: string;
  comment: string;
};

const emptyForm = (): BonusFormState => ({
  mt5_id: "",
  amount: "",
  comment: "",
});

const formatMoney = (value?: number | null) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const isBonusIn = (value: string) => value.toUpperCase() === "IN";

const getExportTimestamp = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const formatExportDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function BonusManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { hasFeature } = useManagerPermissions();

  const canList = hasFeature("bonusManagement", "bonusList");
  const canGive = hasFeature("bonusManagement", "giveBonus");
  const canRemove = hasFeature("bonusManagement", "removeBonus");
  const canMutate = canGive || canRemove;

  const [actionMode, setActionMode] = useState<BonusActionMode>(canGive ? "give" : "remove");
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [form, setForm] = useState<BonusFormState>(emptyForm);
  const [userSearch, setUserSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "IN" | "OUT">("all");

  const deferredUserSearch = useDeferredValue(userSearch.trim().toLowerCase());
  const deferredHistorySearch = useDeferredValue(historySearch.trim().toLowerCase());

  const bonusListQueryKey = useMemo(() => ["admin-bonus-list", token] as const, [token]);
  const bonusUsersQueryKey = useMemo(() => ["admin-bonus-mt5-users", token] as const, [token]);

  const {
    data: bonusListData,
    isLoading: isLoadingBonuses,
    isFetching: isFetchingBonuses,
    isError: isBonusListError,
    error: bonusListError,
  } = useQuery({
    queryKey: bonusListQueryKey,
    queryFn: async () => {
      const response = await adminBonusApi.list({ page: 1, per_page: 100 }, token!);
      return response.data ?? { bonuses: [], pagination: { current_page: 1, total_pages: 1, total_records: 0, per_page: 100 } };
    },
    enabled: Boolean(token) && canList,
    staleTime: 60 * 1000,
  });

  const {
    data: mt5Users = [],
    isLoading: isLoadingMt5Users,
    isFetching: isFetchingMt5Users,
    isError: isMt5UsersError,
    error: mt5UsersError,
  } = useQuery({
    queryKey: bonusUsersQueryKey,
    queryFn: async () => {
      const response = await adminBonusApi.listMt5Users(token!);
      return response.data ?? [];
    },
    enabled: Boolean(token) && canMutate,
    staleTime: 60 * 1000,
  });

  const refreshAll = async () => {
    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: bonusListQueryKey }),
      queryClient.invalidateQueries({ queryKey: bonusUsersQueryKey }),
    ]);
  };

  const mutation = useMutation({
    mutationFn: async ({ mode, values }: { mode: BonusActionMode; values: BonusFormState }) => {
      const amount = Number(values.amount);
      const payload = {
        mt5_id: values.mt5_id,
        amount,
        comment: values.comment.trim() || undefined,
      };

      if (mode === "give") {
        return adminBonusApi.give(payload, token!);
      }

      return adminBonusApi.remove(payload, token!);
    },
    onSuccess: async (response, variables) => {
      toast.success(
        response.message || (variables.mode === "give" ? "Bonus added successfully" : "Bonus removed successfully")
      );
      setForm(emptyForm());
      setUserSearch("");
      setIsActionDialogOpen(false);
      await refreshAll();
    },
    onError: (error, variables) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "bonus",
          action: variables.mode === "give" ? "create" : "update",
        })
      );
    },
  });

  const filteredMt5Users = useMemo(() => {
    if (deferredUserSearch.length < 3) return [];

    return mt5Users.filter((item) => {
      const haystack = `${item.account_id} ${item.name} ${item.email}`.toLowerCase();
      return haystack.includes(deferredUserSearch);
    }).slice(0, 50);
  }, [deferredUserSearch, mt5Users]);

  const selectedMt5User = useMemo(
    () => mt5Users.find((item) => item.account_id === form.mt5_id) ?? null,
    [form.mt5_id, mt5Users]
  );

  const allBonuses = useMemo(() => bonusListData?.bonuses ?? [], [bonusListData]);

  const filteredBonuses = useMemo(() => {
    return allBonuses.filter((item) => {
      const matchesType = typeFilter === "all" ? true : item.type?.toUpperCase() === typeFilter;
      if (!matchesType) return false;

      if (!deferredHistorySearch || deferredHistorySearch.length < 3) return true;

      const haystack = [
        item.mt5User?.account_id,
        item.mt5User?.name,
        item.user?.email,
        item.comment,
        item.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(deferredHistorySearch);
    });
  }, [allBonuses, deferredHistorySearch, typeFilter]);

  const summary = useMemo(() => {
    const granted = allBonuses
      .filter((item) => isBonusIn(item.type))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const removed = allBonuses
      .filter((item) => !isBonusIn(item.type))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      totalRecords: bonusListData?.pagination?.total_records ?? allBonuses.length,
      granted,
      removed,
      net: granted - removed,
      activeAccounts: new Set(allBonuses.map((item) => item.mt5User?.account_id).filter(Boolean)).size,
    };
  }, [allBonuses, bonusListData]);

  const columns = useMemo<ColumnDef<AdminBonusLedgerItem>[]>(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: "account",
        header: ({ column }) => <DataTableColumnHeader column={column} title="MT5 Account" />,
        accessorFn: (row) => row.mt5User?.account_id ?? "",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">{row.original.mt5User?.account_id ?? "-"}</div>
            <div className="text-xs text-muted-foreground">{row.original.mt5User?.name ?? "-"}</div>
          </div>
        ),
      },
      {
        id: "email",
        header: ({ column }) => <DataTableColumnHeader column={column} title="User Email" />,
        accessorFn: (row) => row.user?.email ?? "",
        cell: ({ row }) => row.original.user?.email ?? "-",
      },
      {
        id: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        accessorFn: (row) => row.type,
        cell: ({ row }) => {
          const incoming = isBonusIn(row.original.type);

          return (
            <Badge
              variant="outline"
              className={cn(
                "gap-1 border px-2.5 py-0.5",
                incoming
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              )}
            >
              {incoming ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
              {incoming ? "Given" : "Removed"}
            </Badge>
          );
        },
      },
      {
        id: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        accessorFn: (row) => row.amount,
        cell: ({ row }) => (
          <span className="font-semibold">{formatMoney(row.original.amount)}</span>
        ),
      },
      // {
      //   id: "equity",
      //   header: ({ column }) => <DataTableColumnHeader column={column} title="Equity Ref." />,
      //   accessorFn: (row) => row.equity,
      //   cell: ({ row }) => formatMoney(row.original.equity),
      // },
      {
        id: "comment",
        header: "Comment",
        accessorFn: (row) => row.comment ?? "",
        cell: ({ row }) => (
          <p className="max-w-[280px] truncate text-sm text-muted-foreground">
            {row.original.comment || "-"}
          </p>
        ),
      },
      {
        id: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        accessorFn: (row) => row.created_at,
        cell: ({ row }) => formatDateTimeInIST(row.original.created_at),
      },
    ],
    []
  );

  const handleExport = useCallback((formatType: "xlsx" | "csv") => {
    const exportToastId = `bonus-ledger-export-${formatType}`;
    try {
      if (filteredBonuses.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = filteredBonuses.map((bonus, index) => ({
        "Sr. No.": index + 1,
        "MT5 Account": bonus.mt5User?.account_id ?? "-",
        Name: bonus.mt5User?.name ?? "-",
        Email: bonus.user?.email ?? "-",
        Type: isBonusIn(bonus.type) ? "Given" : "Removed",
        Amount: Number(bonus.amount ?? 0),
        "Equity Ref.": Number(bonus.equity ?? 0),
        Comment: bonus.comment || "-",
        Created: formatExportDateTime(bonus.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `bonus-ledger-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bonus Ledger");
        XLSX.writeFile(workbook, filename);
      } else {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        filename = `${filenameBase}.csv`;
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      }

      toast.success(`Exported ${filteredBonuses.length} bonus records to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "bonus ledger", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [filteredBonuses]);

  const handleSubmit = () => {
    const amount = Number(form.amount);

    if (!form.mt5_id.trim()) {
      toast.error("Please select an MT5 account");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (actionMode === "give" && !canGive) {
      toast.error("You do not have permission to give bonus");
      return;
    }

    if (actionMode === "remove" && !canRemove) {
      toast.error("You do not have permission to remove bonus");
      return;
    }

    mutation.mutate({ mode: actionMode, values: form });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsActionDialogOpen(open);

    if (!open) {
      setForm(emptyForm());
      setUserSearch("");
      setActionMode(canGive ? "give" : "remove");
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
                <Gift className="h-7 w-7 text-primary" />
                Bonus Management
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Credit or remove bonus against MT5 accounts and review the complete bonus ledger from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={!canList}>
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export CSV (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {canMutate ? (
                <Button onClick={() => handleDialogOpenChange(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Bonus
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => void refreshAll()}
                disabled={isFetchingBonuses || isFetchingMt5Users}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", (isFetchingBonuses || isFetchingMt5Users) && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Ledger Records", value: summary.totalRecords, tone: "text-foreground", icon: Gift },
              { label: "Bonus Added", value: formatMoney(summary.granted), tone: "text-emerald-600", icon: ArrowUpCircle },
              { label: "Bonus Removed", value: formatMoney(summary.removed), tone: "text-rose-600", icon: ArrowDownCircle },
              { label: "Active MT5 Accounts", value: summary.activeAccounts, tone: "text-primary", icon: Wallet },
            ].map(({ label, value, tone, icon: Icon }) => (
              <Card key={label} className="overflow-hidden">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className={cn("text-2xl font-semibold", tone)}>{value}</p>
                  </div>
                  <span className="rounded-2xl border border-border/70 bg-muted/40 p-3">
                    <Icon className={cn("h-5 w-5", tone)} />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <Card className="border-border/70">
              <CardHeader className="gap-4 border-b border-border/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle className="text-xl">Bonus Ledger</CardTitle>
                    <CardDescription>
                      Review all recent bonus credits and deductions across MT5 accounts.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ApiSearchBar
                      value={historySearch}
                      onChange={(value) => setHistorySearch(value)}
                      onSearch={(value) => setHistorySearch(value)}
                      placeholder="Search account, user, email, comment"
                      minimumLength={3}
                      delay={300}
                    />
                    <Select
                      value={typeFilter}
                      onValueChange={(value) => setTypeFilter(value as "all" | "IN" | "OUT")}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="IN">Given Bonus</SelectItem>
                        <SelectItem value="OUT">Removed Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {!canList ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    You do not have permission to view the bonus ledger.
                  </div>
                ) : isLoadingBonuses ? (
                  <TableSectionSkeleton columnCount={6} rowCount={6} />
                ) : isBonusListError ? (
                  <ApiErrorState
                    error={bonusListError}
                    audience="admin"
                    resource="bonus ledger"
                    action="load"
                  />
                ) : filteredBonuses.length > 0 ? (
                  <AppDataTable<AdminBonusLedgerItem>
                    data={filteredBonuses}
                    columns={columns}
                    pageCount={1}
                    getRowId={(row) => String(row.id)}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center">
                    <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">No bonus records found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Try changing the filters or create a new bonus action for an MT5 account.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isActionDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage Bonus</DialogTitle>
            <DialogDescription>
              Select an MT5 account and apply a credit or deduction from the same modal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <Tabs
              value={actionMode}
              onValueChange={(value) => setActionMode(value as BonusActionMode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="give" disabled={!canGive}>
                  Give Bonus
                </TabsTrigger>
                <TabsTrigger value="remove" disabled={!canRemove}>
                  Remove Bonus
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-5">
              <div className="space-y-2">
                <SearchSelectFieldEnhanced
                  id="bonus-user-search"
                  label="Find MT5 Account"
                  options={filteredMt5Users}
                  searchValue={userSearch}
                  selectedValue={form.mt5_id}
                  placeholder="Type at least 3 letters to search MT5 accounts"
                  loading={userSearch.trim().length >= 3 ? isLoadingMt5Users : false}
                  loadingMessage="Loading MT5 accounts..."
                  idleMessage="Type at least 3 letters to search MT5 accounts."
                  emptyMessage="No MT5 accounts found."
                  minimumSearchLength={3}
                  onSearchValueChange={(value: string) => {
                    setUserSearch(value);
                    setForm((current) => ({ ...current, mt5_id: "" }));
                  }}
                  onOptionSelect={(item: { account_id: string; name: string; email?: string }) => {
                    setUserSearch(item.account_id);
                    setForm((current) => ({ ...current, mt5_id: item.account_id }));
                  }}
                  getOptionValue={(item: { account_id: string }) => item.account_id}
                  getOptionLabel={(item: { account_id: string }) => item.account_id}
                  getOptionDescription={(item: { name: string; email?: string }) => `${item.name} | ${item.email}`}
                />
                {isMt5UsersError ? (
                  <p className="text-xs text-destructive">
                    {getAdminFriendlyErrorMessage(mt5UsersError, { resource: "MT5 users", action: "load" })}
                  </p>
                ) : null}
              </div>

              {selectedMt5User ? (
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{selectedMt5User.name}</p>
                      <p className="truncate text-sm text-muted-foreground sm:max-w-[320px]">
                        {selectedMt5User.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="w-fit font-mono">
                      {selectedMt5User.account_id}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Action</p>
                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                        {actionMode === "give" ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-rose-600" />
                        )}
                        {actionMode === "give" ? "Credit bonus to wallet" : "Remove bonus from wallet"}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current Balance</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {formatMoney(selectedMt5User.current_balance)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="bonus-amount">Amount</Label>
                <Input
                  id="bonus-amount"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="1"
                  placeholder={actionMode === "give" ? "Enter bonus amount" : "Enter amount to remove"}
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus-comment">Comment</Label>
                <Textarea
                  id="bonus-comment"
                  rows={4}
                  placeholder="Add internal note for this bonus action"
                  value={form.comment}
                  onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={mutation.isPending || isLoadingMt5Users || !canMutate}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionMode === "give" ? (
                <>
                  <ArrowUpCircle className="mr-2 h-4 w-4" />
                  Give Bonus
                </>
              ) : (
                <>
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Remove Bonus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}



