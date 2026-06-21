"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  Download,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

import { AppDataTable } from "@/components/app-data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  
  // Use query params for search and filter to enable data table pagination
  const [historySearch, setHistorySearch] = useQueryState(
    "search",
    parseAsString.withDefault("")
  );
  const [typeFilter, setTypeFilter] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  
  // Get page and perPage from URL (managed by useDataTable)
  const [urlPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [urlPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  // Build search term - only use if 3+ characters
  const searchTerm = useMemo(() => {
    const trimmed = historySearch.trim();
    return trimmed.length >= 3 ? trimmed : "";
  }, [historySearch]);

  const bonusListQueryKey = useMemo(
    () => ["admin-bonus-list", token, urlPage, urlPerPage, searchTerm, typeFilter] as const,
    [token, urlPage, urlPerPage, searchTerm, typeFilter]
  );
  const bonusUsersQueryKey = useMemo(
    () => ["admin-bonus-mt5-users", token, userSearch.trim().length >= 3 ? userSearch.trim() : ""] as const,
    [token, userSearch]
  );

  const {
    data: bonusListData,
    isLoading: isLoadingBonuses,
    isFetching: isFetchingBonuses,
    isError: isBonusListError,
    error: bonusListError,
  } = useQuery({
    queryKey: bonusListQueryKey,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: urlPage,
        per_page: urlPerPage,
      };

      // Add search if it's at least 3 characters
      if (searchTerm) {
        params.search = searchTerm;
      }

      // Add type filter if not "all"
      if (typeFilter && typeFilter !== "all") {
        params.type = typeFilter;
      }

      const response = await adminBonusApi.list(params, token!);
      return response.data ?? { bonuses: [], pagination: { current_page: 1, total_pages: 1, total_records: 0, per_page: urlPerPage } };
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
      const response = await adminBonusApi.listMt5Users(token!, userSearch.trim());
      return response.data ?? [];
    },
    enabled: Boolean(token) && canMutate && userSearch.trim().length >= 3,
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

  const selectedMt5User = useMemo(
    () => mt5Users.find((item) => item.account_id === form.mt5_id) ?? null,
    [form.mt5_id, mt5Users]
  );

  const allBonuses = useMemo(() => bonusListData?.bonuses ?? [], [bonusListData]);

  const pagination = useMemo(() => bonusListData?.pagination ?? {
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: urlPerPage,
  }, [bonusListData, urlPerPage]);

  const summary = useMemo(() => {
    const granted = allBonuses
      .filter((item) => isBonusIn(item.type))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const removed = allBonuses
      .filter((item) => !isBonusIn(item.type))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      totalRecords: pagination.total_records,
      granted,
      removed,
      net: granted - removed,
      activeAccounts: new Set(allBonuses.map((item) => item.mt5User?.account_id).filter(Boolean)).size,
    };
  }, [allBonuses, pagination]);

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
            <Link
              href={`/new-users/${row.original.user_id ?? ""}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              {row.original.mt5User?.name ?? "-"}
            </Link>
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount (USD)" />,
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
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateTimeInIST(row.original.created_at)}</span>
        ),
      },
    ],
    []
  );

  const handleExport = useCallback((formatType: "xlsx" | "csv") => {
    const exportToastId = `bonus-ledger-export-${formatType}`;
    try {
      if (allBonuses.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = allBonuses.map((bonus, index) => ({
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

      toast.success(`Exported ${allBonuses.length} bonus records to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "bonus ledger", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [allBonuses]);

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
      <div className="px-4 py-8 md:px-6">
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

          <div>
            <Card className="border-border/70">
              <CardHeader className="gap-4 border-b border-border/60">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ApiSearchBar
                      value={historySearch}
                      onChange={setHistorySearch}
                      onSearch={(value) => {
                        // Only update if empty (clearing) or if 3+ characters
                        if (!value || value.trim().length >= 3) {
                          void setHistorySearch(value);
                        }
                      }}
                      placeholder="Search account, user, email, comment"
                      minimumLength={3}
                      delay={500}
                    />
                    <Select
                      value={typeFilter}
                      onValueChange={(value) => {
                        void setTypeFilter(value as "all" | "IN" | "OUT");
                      }}
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
                ) : allBonuses.length > 0 ? (
                  <AppDataTable<AdminBonusLedgerItem>
                    data={allBonuses}
                    columns={columns}
                    pageCount={pagination.total_pages}
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Bonus</DialogTitle>
            <DialogDescription>
              Select an MT5 account and apply a credit or deduction from the same modal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 overflow-y-auto flex-1 pr-2">
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
                <Label>Find MT5 Account</Label>
                <ApiSearchBar
                  value={userSearch}
                  onChange={(value) => {
                    setUserSearch(value);
                    if (form.mt5_id) {
                      setForm((current) => ({ ...current, mt5_id: "" }));
                    }
                  }}
                  onSearch={() => {
                    void queryClient.invalidateQueries({ queryKey: bonusUsersQueryKey });
                  }}
                  placeholder="Type at least 3 letters to search MT5 accounts"
                  minimumLength={3}
                  delay={300}
                />
                {userSearch.trim().length >= 3 && !form.mt5_id && (
                  <Command className="max-h-60 rounded-lg border">
                    <CommandList>
                      {isFetchingMt5Users ? (
                        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading MT5 accounts...
                        </div>
                      ) : mt5Users.length === 0 ? (
                        <CommandEmpty>No MT5 accounts found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {mt5Users.slice(0, 50).map((item) => (
                            <CommandItem
                              key={item.account_id}
                              value={item.account_id}
                              onSelect={() => {
                                setUserSearch(item.account_id);
                                setForm((current) => ({ ...current, mt5_id: item.account_id }));
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{item.account_id}</span>
                                <span className="text-xs text-muted-foreground">{item.name} | {item.email} | {item.mode} | {item.account_type_name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                )}
                {userSearch.trim().length < 3 && !form.mt5_id && (
                  <p className="text-xs text-muted-foreground">Type at least 3 letters to search MT5 accounts.</p>
                )}
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
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "w-fit font-mono",
                          selectedMt5User.mode?.toLowerCase() === "live"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        )}
                      >
                        {selectedMt5User.mode?.toUpperCase() ?? "DEMO"}
                      </Badge>
                      <Badge variant="outline" className="w-fit font-mono">
                        {selectedMt5User.account_id}
                      </Badge>
                      {selectedMt5User.account_type_name && (
                        <Badge variant="outline" className="w-fit font-mono">
                          {selectedMt5User.account_type_name}
                        </Badge>
                      )}
                    </div>
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
                       {formatMoney(selectedMt5User.account_type_name === "CENT" ? selectedMt5User.current_balance * 100 : selectedMt5User.current_balance)} {selectedMt5User.account_type_name === "CENT" ? "USC" : "USD"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="bonus-amount">Amount (USD)</Label>
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
                {selectedMt5User?.account_type_name === "CENT" && form.amount && Number(form.amount) > 0 && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Conversion</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {formatMoney(Number(form.amount))} USD = {formatMoney(Number(form.amount) * 100)} USC
                    </p>
                  </div>
                )}
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



