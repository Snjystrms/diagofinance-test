"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import toast from "react-hot-toast";
import {
  CircleDollarSign,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { adminIbUsersApi } from "@/lib/api";
import {
  adminIbUserCommissionsApi,
  type UserCommission,
  type UserCommissionResponse,
} from "@/lib/api-trading-ib";
import { formatDateTimeInIST } from "@/lib/formatters";

interface IbUserForCommission {
  id: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  ib_name: string;
  total_commission: number;
  available_commission: number;
  referral_link: string;
  referral_code: string;
  marketing_name: string;
  status: number;
  created_at: string;
}

type EditableCommissionFields = Pick<
  UserCommission,
  | "rate_ib"
  | "rate_sub_ib_1"
  | "rate_sub_ib_2"
  | "rate_sub_ib_3"
  | "rate_sub_ib_4"
  | "rate_sub_ib_5"
  | "status"
>;

type EditableCommissionFieldKey = keyof EditableCommissionFields;

type CommissionGroup = {
  key: string;
  accountTypeId: number;
  accountTypeName: string;
  commissions: UserCommission[];
};

const COMMISSION_LEVEL_ORDER: Record<string, number> = {
  IB: 0,
  "Level-1": 1,
  "Level-2": 2,
  "Level-3": 3,
  "Level-4": 4,
  "Level-5": 5,
};

const EDITABLE_RATE_FIELDS = [
  "rate_ib",
  "rate_sub_ib_1",
  "rate_sub_ib_2",
  "rate_sub_ib_3",
  "rate_sub_ib_4",
  "rate_sub_ib_5",
] as const satisfies readonly Exclude<EditableCommissionFieldKey, "status">[];

const rateDraftKey = (commissionId: number, field: string) => `${commissionId}:${field}`;

/** Allow only digits and a single decimal point so users can type naturally (e.g. "12.", "0.5"). */
const sanitizeCommissionRateInput = (raw: string) => {
  let out = "";
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (ch === "." && !seenDot) {
      seenDot = true;
      out += ".";
    }
  }
  return out;
};

const commissionRateStringFromApi = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return String(n);
};

const parseCommissionRateDraft = (s: string) => {
  const t = s.trim();
  if (t === "" || t === ".") return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDateTimeInIST(value);
};

const formatCommissionAmount = (value?: number | null) => {
  const normalizedValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `$${normalizedValue.toFixed(2)}`;
};

const groupCommissionsByAccount = (commissions: UserCommission[]) => {
  const grouped = commissions.reduce<Record<string, CommissionGroup>>(
    (accumulator, commission) => {
      const key = `${commission.account_type_id}`;

      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          accountTypeId: commission.account_type_id,
          accountTypeName: commission.account_type_name,
          commissions: [],
        };
      }

      accumulator[key].commissions.push(commission);
      return accumulator;
    },
    {},
  );

  return Object.values(grouped).map((group) => ({
    ...group,
    commissions: [...group.commissions].sort((left, right) => {
      return (
        (COMMISSION_LEVEL_ORDER[left.level] ?? 99) -
        (COMMISSION_LEVEL_ORDER[right.level] ?? 99)
      );
    }),
  }));
};

export default function SetIbCommissionPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<IbUserForCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });
  const [pendingCommissionUserId, setPendingCommissionUserId] = useState<number | null>(null);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [commissionData, setCommissionData] = useState<UserCommissionResponse["data"] | null>(null);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [editingCommissionId, setEditingCommissionId] = useState<number | null>(null);
  const [editedCommissions, setEditedCommissions] = useState<
    Record<number, EditableCommissionFields>
  >({});
  /** Raw strings while editing commission rates (avoid forced decimals / fighting `type="number"`). */
  const [commissionRateDrafts, setCommissionRateDrafts] = useState<Record<string, string>>({});
  const [savingCommissionId, setSavingCommissionId] = useState<number | null>(null);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [searchInput, setSearchInput] = useState(search ?? "");

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    void setPage(1);
    void setSearch(value.trim() ? value : null);
  }, 500);

  const loadUsers = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminIbUsersApi.list({
        token,
        page,
        per_page: perPage,
        search: search?.trim() ? search : undefined,
      });

      const payload = response?.data;
      const payloadObj = payload as Record<string, unknown>;

      const extractItems = (data: unknown): IbUserForCommission[] => {
        const dataObj = data as Record<string, unknown>;

        if (!data) return [];
        if (Array.isArray(data)) return data as IbUserForCommission[];
        if (Array.isArray(dataObj.items)) return dataObj.items as IbUserForCommission[];
        if (Array.isArray(dataObj.users)) return dataObj.users as IbUserForCommission[];
        if (Array.isArray(dataObj.data)) return dataObj.data as IbUserForCommission[];
        if (
          dataObj.data &&
          Array.isArray((dataObj.data as Record<string, unknown>).items)
        ) {
          return (dataObj.data as Record<string, unknown>)
            .items as IbUserForCommission[];
        }
        if (
          dataObj.data &&
          Array.isArray((dataObj.data as Record<string, unknown>).data)
        ) {
          return (dataObj.data as Record<string, unknown>)
            .data as IbUserForCommission[];
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as IbUserForCommission[];
        return [];
      };

      const items = extractItems(payload);
      setUsers(items);

      const paginationSource = (
        (payload &&
          (payloadObj.pagination as Record<string, unknown> | undefined)) ??
        (payload &&
          ((payloadObj.meta as Record<string, unknown> | undefined)
            ?.pagination as Record<string, unknown> | undefined)) ??
        (payload && payloadObj.data && !Array.isArray(payloadObj.data)
          ? ((payloadObj.data as Record<string, unknown>).pagination as
              | Record<string, unknown>
              | undefined) ??
            ((payloadObj.data as Record<string, unknown>).meta as
              | Record<string, unknown>
              | undefined)?.pagination
          : undefined)
      ) as Record<string, unknown> | undefined;

      const total =
        (paginationSource?.total as number | undefined) ??
        (paginationSource?.total_items as number | undefined) ??
        (paginationSource?.totalUsers as number | undefined) ??
        (payload?.total as number | undefined) ??
        items.length;

      const perPageValue =
        (paginationSource?.per_page as number | undefined) ??
        (paginationSource?.perPage as number | undefined) ??
        (paginationSource?.limit as number | undefined) ??
        perPage;

      const totalPages =
        (paginationSource?.total_pages as number | undefined) ??
        (paginationSource?.last_page as number | undefined) ??
        (perPageValue ? Math.max(1, Math.ceil(total / perPageValue)) : 1);

      setPagination({
        current_page:
          (paginationSource?.current_page as number | undefined) ??
          (paginationSource?.page as number | undefined) ??
          page,
        per_page: perPageValue,
        total_pages: totalPages,
        total,
      });
    } catch (error: unknown) {
      console.error("Failed to load IB users:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB users",
          action: "load",
        }),
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const resetCommissionDialogState = useCallback(() => {
    setCommissionDialogOpen(false);
    setSelectedUserId(null);
    setCommissionData(null);
    setLoadingCommissions(false);
    setEditingCommissionId(null);
    setEditedCommissions({});
    setCommissionRateDrafts({});
    setSavingCommissionId(null);
  }, []);

  const loadUserCommissions = useCallback(
    async (user: IbUserForCommission) => {
      if (!token) {
        toast.error("Authentication is required");
        return;
      }

      try {
        setPendingCommissionUserId(user.id);
        setSelectedUserId(user.id);
        setCommissionData(null);
        setEditingCommissionId(null);
        setEditedCommissions({});
        setCommissionRateDrafts({});
        setCommissionDialogOpen(true);
        setLoadingCommissions(true);

        const response = await adminIbUserCommissionsApi.getUserCommissions(
          user.id,
          token,
        );

        const payload = response.data as
          | UserCommissionResponse["data"]
          | undefined;

        if (!response.success || !payload) {
          throw new Error("Failed to load commission data");
        }

        setCommissionData(payload);
      } catch (error: unknown) {
        console.error("Failed to load user commissions:", error);
        resetCommissionDialogState();
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "commissions",
            action: "load",
          }),
        );
      } finally {
        setLoadingCommissions(false);
        setPendingCommissionUserId(null);
      }
    },
    [resetCommissionDialogState, token],
  );

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetCommissionDialogState();
      return;
    }

    setCommissionDialogOpen(true);
  };

  const handleEditCommission = (commission: UserCommission) => {
    setEditingCommissionId(commission.id);
    setEditedCommissions({
      [commission.id]: {
        rate_ib: commission.rate_ib,
        rate_sub_ib_1: commission.rate_sub_ib_1,
        rate_sub_ib_2: commission.rate_sub_ib_2,
        rate_sub_ib_3: commission.rate_sub_ib_3,
        rate_sub_ib_4: commission.rate_sub_ib_4,
        rate_sub_ib_5: commission.rate_sub_ib_5,
        status: Boolean(commission.status),
      },
    });
    const drafts: Record<string, string> = {};
    for (const field of EDITABLE_RATE_FIELDS) {
      drafts[rateDraftKey(commission.id, field)] = commissionRateStringFromApi(
        commission[field],
      );
    }
    setCommissionRateDrafts(drafts);
  };

  const handleCancelEdit = () => {
    setEditingCommissionId(null);
    setEditedCommissions({});
    setCommissionRateDrafts({});
  };

  const handleUpdateCommissionField = (
    commissionId: number,
    field: EditableCommissionFieldKey,
    value: number | boolean,
  ) => {
    setEditedCommissions((previous) => ({
      ...previous,
      [commissionId]: {
        ...previous[commissionId],
        [field]: value,
      } as EditableCommissionFields,
    }));
  };

  const handleSaveCommission = useCallback(
    async (commission: UserCommission) => {
      if (!token || !selectedUserId) {
        return;
      }

      const editedData = editedCommissions[commission.id];
      if (!editedData) {
        return;
      }

      try {
        setSavingCommissionId(commission.id);

        const parsedRates: Pick<
          UserCommission,
          | "rate_ib"
          | "rate_sub_ib_1"
          | "rate_sub_ib_2"
          | "rate_sub_ib_3"
          | "rate_sub_ib_4"
          | "rate_sub_ib_5"
        > = {
          rate_ib: 0,
          rate_sub_ib_1: 0,
          rate_sub_ib_2: 0,
          rate_sub_ib_3: 0,
          rate_sub_ib_4: 0,
          rate_sub_ib_5: 0,
        };
        for (const field of EDITABLE_RATE_FIELDS) {
          const key = rateDraftKey(commission.id, field);
          const draft =
            key in commissionRateDrafts
              ? commissionRateDrafts[key]
              : commissionRateStringFromApi(commission[field]);
          parsedRates[field] = parseCommissionRateDraft(draft);
        }

        const updatedCommission: UserCommission = {
          ...commission,
          ...editedData,
          ...parsedRates,
        };

        await adminIbUserCommissionsApi.patchUserCommission(
          selectedUserId,
          updatedCommission,
          token,
        );

        setCommissionData((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            commissions: previous.commissions.map((item) =>
              item.id === commission.id ? updatedCommission : item,
            ),
          };
        });

        toast.success("Commission updated successfully");
        setEditingCommissionId(null);
        setEditedCommissions({});
        setCommissionRateDrafts({});
      } catch (error: unknown) {
        console.error("Failed to update commission:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "commissions",
            action: "update",
          }),
        );
      } finally {
        setSavingCommissionId(null);
      }
    },
    [commissionRateDrafts, editedCommissions, selectedUserId, token],
  );

  const groupedCommissions = useMemo(() => {
    return commissionData ? groupCommissionsByAccount(commissionData.commissions) : [];
  }, [commissionData]);

  const commissionSummary = useMemo(() => {
    return {
      accountCount: groupedCommissions.length,
    };
  }, [groupedCommissions.length]);

  const renderCommissionInput = (
    commissionId: number,
    field: Exclude<EditableCommissionFieldKey, "status">,
    fallbackFromApi?: number | null,
  ) => {
    const key = rateDraftKey(commissionId, field);
    const displayValue =
      key in commissionRateDrafts
        ? commissionRateDrafts[key]
        : commissionRateStringFromApi(fallbackFromApi);

    return (
      <div className="relative min-w-[112px]">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          $
        </span>
        <Input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={displayValue}
          onChange={(event) => {
            setCommissionRateDrafts((previous) => ({
              ...previous,
              [key]: sanitizeCommissionRateInput(event.target.value),
            }));
          }}
          className="h-9 pl-7 text-right"
        />
      </div>
    );
  };

  const columns: ColumnDef<IbUserForCommission>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="space-y-1">
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">{user.phone || "-"}</div>
            </div>
          );
        },
      },
      {
        id: "ib_info",
        header: "IB Information",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">IB Name:</span> {user.ib_name || "-"}
              </div>
              <div>
                <span className="font-medium">Marketing Name:</span>{" "}
                {user.marketing_name || "-"}
              </div>
              <div>
                <span className="font-medium">Referral Code:</span>{" "}
                {user.referral_code || "-"}
              </div>
            </div>
          );
        },
      },
      {
        id: "country",
        header: "Country",
        cell: ({ row }) => <div className="text-sm">{row.original.country || "-"}</div>,
      },
      {
        id: "commission",
        header: "Commission",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Total:</span>{" "}
                {formatCommissionAmount(user.total_commission)}
              </div>
              <div>
                <span className="font-medium">Available:</span>{" "}
                {formatCommissionAmount(user.available_commission)}
              </div>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isPending = pendingCommissionUserId === user.id;

          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void loadUserCommissions(user);
              }}
              disabled={isPending}
              className="h-9 rounded-full border-primary/20 bg-primary/5 px-3.5 text-primary shadow-sm transition-colors hover:bg-primary/10"
            >
              {isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <CircleDollarSign className="mr-2 h-4 w-4" />
              )}
              View Commission
            </Button>
          );
        },
      },
    ],
    [loadUserCommissions, pendingCommissionUserId],
  );

  const renderTableSection = () => {
    if (loadError && users.length === 0) {
      return (
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="IB users"
          action="load"
          onRetry={() => {
            void loadUsers();
          }}
        />
      );
    }

    if (loading && users.length === 0) {
      return <TableSectionSkeleton columnCount={5} rowCount={9} />;
    }

    if (!loading && users.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No IB Users
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no IB users matching your filters. Adjust the
            filters or refresh to check for new users.
          </p>
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <AppDataTable<IbUserForCommission>
        data={users}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => String(row.id)}
      />
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <CircleDollarSign className="h-6 w-6 text-primary" />
                Set IB Commission
              </h1>
              <p className="text-sm text-muted-foreground">
                Review IB users and update commission rules from a grouped,
                account-level modal.
              </p>
            </div>
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSearchInput(value);
                    debouncedApplySearch(value);
                  }}
                  placeholder="Search by name, email, phone, or IB name"
                  className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                />
                {searchInput ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSearchInput("");
                      void setSearch(null);
                      void setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing page {pagination.current_page} of {pagination.total_pages} |
              {" "}{pagination.total} total users
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            {renderTableSection()}
          </div>
        </div>
      </div>

      <Dialog open={commissionDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[98vw] max-w-[98vw] flex-col overflow-hidden p-0 sm:w-[78vw] sm:max-w-[78vw]">
          <DialogHeader className="border-b border-border/60 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Commission Matrix
            </DialogTitle>
            <DialogDescription>
              Open a user, review commission blocks by account type, then edit only
              the rows you want to change.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {loadingCommissions ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Spinner className="h-8 w-8" />
                <p className="text-sm text-muted-foreground">
                  Loading commission rules...
                </p>
              </div>
            ) : commissionData ? (
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div className="rounded-3xl border border-border/60 bg-card px-5 py-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Selected User
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-foreground">
                          {commissionData.user.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {commissionData.user.email}
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        User ID {commissionData.user.id}
                      </Badge>
                    </div>
                    <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Rates are grouped by account type. Expand a
                      section, edit a level, and save only that row.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-1">
                    <div className="rounded-3xl border border-border/60 bg-card px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Account Types
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {commissionSummary.accountCount}
                      </p>
                    </div>
                  </div>
                </div>

                {groupedCommissions.length > 0 ? (
                  <Accordion
                    type="multiple"
                    defaultValue={groupedCommissions.map((group) => group.key)}
                    className="rounded-3xl border border-border/60 bg-muted/10"
                  >
                    {groupedCommissions.map((group) => {
                      const hasEditingRow = group.commissions.some(
                        (commission) => commission.id === editingCommissionId,
                      );

                      return (
                        <AccordionItem
                          key={group.key}
                          value={group.key}
                          className="border-border/60 px-5"
                        >
                          <AccordionTrigger className="py-5 text-left hover:no-underline">
                            <div className="flex flex-1 flex-wrap items-center gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Account Type
                                </p>
                                <p className="mt-1 text-lg font-semibold text-foreground">
                                  {group.accountTypeName}
                                </p>
                              </div>
                              {/* <Badge variant="outline" className="rounded-full">
                                ID: {group.accountTypeId}
                              </Badge> */}
                              <Badge variant="outline" className="rounded-full">
                                {group.commissions.length} levels
                              </Badge>
                              {hasEditingRow ? (
                                <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                                  Editing
                                </Badge>
                              ) : null}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-5">
                            <div className="flex flex-col gap-4">
                              <div className="rounded-3xl border border-border/60 bg-card px-4 py-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      Commission Levels
                                    </p>
                                    <p className="mt-1 text-base font-semibold text-foreground">
                                      {group.commissions.length} levels configured
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    <ShieldCheck className="h-4 w-4" />
                                    Ready for review
                                  </div>
                                </div>
                              </div>

                              <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/30">
                                        <TableHead className="min-w-[110px]">Level</TableHead>
                                        <TableHead>Rate IB</TableHead>
                                        <TableHead>Sub IB 1</TableHead>
                                        <TableHead>Sub IB 2</TableHead>
                                        <TableHead>Sub IB 3</TableHead>
                                        <TableHead>Sub IB 4</TableHead>
                                        <TableHead>Sub IB 5</TableHead>
                                        {/* <TableHead className="min-w-[110px] text-center">
                                          Status
                                        </TableHead> */}
                                        <TableHead className="min-w-[140px]">
                                          Updated
                                        </TableHead>
                                        <TableHead className="min-w-[160px] text-right">
                                          Action
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.commissions.map((commission) => {
                                        const editedData = editedCommissions[commission.id];
                                        const currentCommission = editedData
                                          ? { ...commission, ...editedData }
                                          : commission;
                                        const isEditing =
                                          editingCommissionId === commission.id;
                                        const isSaving =
                                          savingCommissionId === commission.id;

                                        return (
                                          <TableRow key={commission.id}>
                                            <TableCell className="font-medium">
                                              {commission.level}
                                            </TableCell>
                                            {isEditing ? (
                                              <>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_ib",
                                                    currentCommission.rate_ib,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_sub_ib_1",
                                                    currentCommission.rate_sub_ib_1,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_sub_ib_2",
                                                    currentCommission.rate_sub_ib_2,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_sub_ib_3",
                                                    currentCommission.rate_sub_ib_3,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_sub_ib_4",
                                                    currentCommission.rate_sub_ib_4,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {renderCommissionInput(
                                                    commission.id,
                                                    "rate_sub_ib_5",
                                                    currentCommission.rate_sub_ib_5,
                                                  )}
                                                </TableCell>
                                                {/* <TableCell className="text-center">
                                                  <div className="flex items-center justify-center gap-2">
                                                    <Switch
                                                      checked={Boolean(
                                                        currentCommission.status,
                                                      )}
                                                      onCheckedChange={(checked) => {
                                                        handleUpdateCommissionField(
                                                          commission.id,
                                                          "status",
                                                          checked,
                                                        );
                                                      }}
                                                    />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                      {currentCommission.status
                                                        ? "Active"
                                                        : "Inactive"}
                                                    </span>
                                                  </div>
                                                </TableCell> */}
                                              </>
                                            ) : (
                                              <>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_ib,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_sub_ib_1,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_sub_ib_2,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_sub_ib_3,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_sub_ib_4,
                                                  )}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCommissionAmount(
                                                    commission.rate_sub_ib_5,
                                                  )}
                                                </TableCell>
                                                {/* <TableCell className="text-center">
                                                  {Boolean(commission.status) ? (
                                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                      Active
                                                    </Badge>
                                                  ) : (
                                                    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
                                                      Inactive
                                                    </Badge>
                                                  )}
                                                </TableCell> */}
                                              </>
                                            )}
                                            <TableCell className="text-sm text-muted-foreground">
                                              {formatDateTime(commission.updated_at)}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex justify-end gap-2">
                                                {isEditing ? (
                                                  <>
                                                    <Button
                                                      size="sm"
                                                      onClick={() => {
                                                        void handleSaveCommission(
                                                          commission,
                                                        );
                                                      }}
                                                      disabled={isSaving}
                                                    >
                                                      {isSaving ? (
                                                        <Spinner className="mr-2 h-4 w-4" />
                                                      ) : (
                                                        <Save className="mr-2 h-4 w-4" />
                                                      )}
                                                      Save
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={handleCancelEdit}
                                                      disabled={isSaving}
                                                    >
                                                      <X className="mr-2 h-4 w-4" />
                                                      Cancel
                                                    </Button>
                                                  </>
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                      handleEditCommission(commission);
                                                    }}
                                                  >
                                                    <PencilLine className="mr-2 h-4 w-4" />
                                                    Edit
                                                  </Button>
                                                )}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
                    No commission rules were returned for this user.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
                No commission data available.
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/60 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}



