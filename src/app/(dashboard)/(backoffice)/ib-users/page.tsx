"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import toast from "react-hot-toast";
import { Copy, Network, RefreshCw, Search, Users } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { API_BASE_URL, adminIbUsersApi, type AdminIbUser } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

import { DownlineTreePageContent } from "../set-ib-commission/[userId]/_components/downline-tree-page-content";

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

const deriveFullName = (user: AdminIbUser) => {
  const pieces = [
    user.name,
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
  ].filter((name) => typeof name === "string" && name.trim().length > 0);

  return pieces.length > 0 ? (pieces[0] as string) : "-";
};

const deriveEmail = (user: AdminIbUser) => user.email ?? "-";

const derivePhone = (user: AdminIbUser) => user.mobile ?? user.phone ?? "-";

const deriveSponsorId = (user: AdminIbUser) => user.sponsor_id ?? "-";

const deriveIbName = (user: AdminIbUser) => user.ib_name ?? "-";

const deriveTotalCommission = (user: AdminIbUser): string => {
  const val = user.total_commission;
  return val != null ? String(val) : "-";
};

const derivePartnerId = (user: AdminIbUser) => user.partner_id ?? "-";

const getUserActionKey = (user: AdminIbUser) => {
  return String(user.id ?? user.uuid ?? user.email ?? user.name ?? "");
};

const resolveNumericUserId = (user: AdminIbUser) => {
  if (typeof user.id === "number" && Number.isFinite(user.id)) {
    return user.id;
  }

  if (typeof user.id === "string") {
    const trimmedId = user.id.trim();
    if (trimmedId.length > 0 && !Number.isNaN(Number(trimmedId))) {
      return Number(trimmedId);
    }
  }

  return null;
};

type RowActionType = "tree";

type UsersByLevelPreviewResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

const deriveReferralLink = (user: AdminIbUser): string => {
  if (user.referral_link) {
    return user.referral_link;
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  if (user.partner_id) {
    return `${baseUrl}/register?ref=${user.partner_id}`;
  }

  if (user.sponsor_id) {
    return `${baseUrl}/register?ref=${user.sponsor_id}`;
  }

  return "";
};

const getStatusBadge = (status: number | string | boolean | undefined) => {
  const statusValue =
    typeof status === "boolean"
      ? status
        ? 1
        : 0
      : typeof status === "string"
        ? Number(status)
        : status ?? 0;

  const isActive = statusValue === 1 || status === "1" || status === true;

  return isActive ? (
    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
      Active
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
      Inactive
    </Badge>
  );
};

export default function IbUsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<AdminIbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });
  const [rowActionState, setRowActionState] = useState<{
    action: RowActionType | null;
    userKey: string | null;
  }>({
    action: null,
    userKey: null,
  });
  const [selectedTreeUserId, setSelectedTreeUserId] = useState<number | null>(
    null,
  );

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

      const extractItems = (data: unknown): AdminIbUser[] => {
        const dataObj = data as Record<string, unknown>;

        if (!data) return [];
        if (Array.isArray(data)) return data as AdminIbUser[];
        if (Array.isArray(dataObj.items)) return dataObj.items as AdminIbUser[];
        if (Array.isArray(dataObj.users)) return dataObj.users as AdminIbUser[];
        if (Array.isArray(dataObj.data)) return dataObj.data as AdminIbUser[];
        if (
          dataObj.data &&
          Array.isArray((dataObj.data as Record<string, unknown>).items)
        ) {
          return (dataObj.data as Record<string, unknown>).items as AdminIbUser[];
        }
        if (
          dataObj.data &&
          Array.isArray((dataObj.data as Record<string, unknown>).data)
        ) {
          return (dataObj.data as Record<string, unknown>).data as AdminIbUser[];
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as AdminIbUser[];
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

  const handleOpenTreeChart = useCallback(
    async (user: AdminIbUser) => {
      if (!token) {
        toast.error("Authentication is required");
        return;
      }

      const userId = resolveNumericUserId(user);
      if (!userId) {
        toast.error("User ID not available");
        return;
      }

      setRowActionState({
        action: "tree",
        userKey: getUserActionKey(user),
      });

      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/ib-management/users-by-level?user_id=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as UsersByLevelPreviewResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || "Failed to load downline users");
        }

        setSelectedTreeUserId(userId);
      } catch (error: unknown) {
        console.error("Failed to open tree chart:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "downline users",
            action: "load",
          }),
        );
      } finally {
        setRowActionState({
          action: null,
          userKey: null,
        });
      }
    },
    [token],
  );

  const isRowActionPending = useCallback(
    (user: AdminIbUser, action: RowActionType) => {
      return (
        rowActionState.userKey === getUserActionKey(user) &&
        rowActionState.action === action
      );
    },
    [rowActionState],
  );

  const columns: ColumnDef<AdminIbUser>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row }) => <span className="font-medium">{row.index + 1}</span>,
        enableSorting: false,
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="space-y-1">
              <div className="font-medium">{deriveFullName(user)}</div>
              <div className="text-sm text-muted-foreground">
                {deriveEmail(user)}
              </div>
              <div className="text-xs text-muted-foreground">
                {derivePhone(user)}
              </div>
            </div>
          );
        },
      },
      {
        id: "ib_info",
        header: "Total Commission",
        cell: ({ row }) => {
          const user = row.original;
          const ibName = deriveIbName(user);
          const partnerId = derivePartnerId(user);
          const sponsorId = deriveSponsorId(user);
          const totalCommission = deriveTotalCommission(user);
          return (
            <div className="space-y-1 text-sm">
              {totalCommission !== "-" ? (
                <div className="text-center">
                  {totalCommission}
                </div>
              ) : null}
              
              {partnerId !== "-" ? (
                <div>
                  <span className="font-medium">Partner ID:</span> {partnerId}
                </div>
              ) : null}
              {sponsorId !== "-" ? (
                <div>
                  <span className="font-medium">Sponsor ID:</span> {sponsorId}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status ?? row.is_ib_user,
        cell: ({ row }) => {
          const user = row.original;
          return getStatusBadge(user.status ?? user.is_ib_user);
        },
      },
      {
        id: "created_at",
        header: "Created",
        cell: ({ row }) => {
          return (
            <div className="text-sm text-muted-foreground">
              {formatDateTime(row.original.created_at)}
            </div>
          );
        },
      },
      {
        id: "referral_link",
        header: "Referral Link",
        enableSorting: false,
        cell: ({ row }) => {
          const referralLink = deriveReferralLink(row.original);

          const handleCopy = async () => {
            if (!referralLink) {
              toast.error("No referral link available");
              return;
            }

            try {
              await navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied to clipboard");
            } catch {
              const textArea = document.createElement("textarea");
              textArea.value = referralLink;
              textArea.style.position = "fixed";
              textArea.style.opacity = "0";
              document.body.appendChild(textArea);
              textArea.select();

              try {
                document.execCommand("copy");
                toast.success("Referral link copied to clipboard");
              } catch {
                toast.error("Failed to copy referral link");
              }

              document.body.removeChild(textArea);
            }
          };

          if (!referralLink) {
            return <span className="text-sm text-muted-foreground">-</span>;
          }

          return (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-9 rounded-full border-slate-200 bg-background px-3.5 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200 dark:hover:bg-slate-900/70"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
          );
        },
      },
      {
        id: "actions",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const loadingTree = isRowActionPending(user, "tree");

          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void handleOpenTreeChart(user);
              }}
              disabled={loadingTree}
              className="h-9 rounded-full border-amber-200 bg-amber-50 px-3.5 text-amber-700 shadow-sm transition-colors hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {loadingTree ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Network className="mr-2 h-4 w-4" />
              )}
              Tree Chart
            </Button>
          );
        },
      },
    ],
    [handleOpenTreeChart, isRowActionPending],
  );

  if (selectedTreeUserId !== null) {
    return (
      <DownlineTreePageContent
        userId={selectedTreeUserId}
        onBack={() => {
          setSelectedTreeUserId(null);
        }}
        backLabel="Back to IB Users"
      />
    );
  }

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
      return <TableSectionSkeleton columnCount={6} rowCount={9} />;
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
      <AppDataTable<AdminIbUser>
        data={users}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => {
          const identifier =
            row.id ??
            row.uuid ??
            row.email ??
            row.name ??
            getUserActionKey(row);
          return String(identifier);
        }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-6 w-6 text-primary" />
              IB Users
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage all Introducing Broker users in the system.
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
                placeholder="Search by name, email, mobile, or sponsor ID"
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
  );
}
