"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  CircleDollarSign,
  Copy,
  Edit,
  Layers3,
  Network,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import {
  API_BASE_URL,
  adminIbUsersApi,
  adminIbUserCommissionsApi,
  type AdminIbUser,
  type UserCommission,
  type UserCommissionResponse,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatDateTimeInIST(value);
};

const USD_COMMISSION_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCommissionAmount = (value?: number | null) => {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return USD_COMMISSION_FORMATTER.format(amount);
};

const deriveFullName = (user: AdminIbUser) => {
  const pieces = [
    user.name,
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim(),
  ].filter((name) => typeof name === "string" && name.trim().length > 0);

  if (pieces.length > 0) {
    return pieces[0] as string;
  }

  return "—";
};

const deriveEmail = (user: AdminIbUser) => {
  return user.email ?? "—";
};

const derivePhone = (user: AdminIbUser) => {
  return user.mobile ?? user.phone ?? "—";
};

const deriveSponsorId = (user: AdminIbUser) => {
  return user.sponsor_id ?? "—";
};

const deriveIbName = (user: AdminIbUser) => {
  return user.ib_name ?? "—";
};

const derivePartnerId = (user: AdminIbUser) => {
  return user.partner_id ?? "—";
};

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
      return trimmedId;
    }
  }

  return null;
};

type RowActionType = "level" | "commission" | "tree";

type UsersByLevelPreviewResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
};

const deriveReferralLink = (user: AdminIbUser): string => {
  // First check if referral_link is directly available
  if (user.referral_link) {
    return user.referral_link;
  }
  
  // If partner_id is available, construct referral link
  if (user.partner_id) {
    // Assuming the referral link format is based on partner_id
    // Adjust the base URL as needed
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/register?ref=${user.partner_id}`;
  }
  
  // If sponsor_id is available, use that
  if (user.sponsor_id) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/register?ref=${user.sponsor_id}`;
  }
  
  return "";
};

const getStatusBadge = (status: number | string | boolean | undefined) => {
  const statusValue = typeof status === "boolean" ? (status ? 1 : 0) : (typeof status === "string" ? Number(status) : status ?? 0);
  const isActive = statusValue === 1 || status === "1" || status === true;
  
  if (isActive) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Active
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
      Inactive
    </Badge>
  );
};

export default function IbUsersPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminIbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });

  // Commission dialog state
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [commissionData, setCommissionData] = useState<UserCommissionResponse["data"] | null>(null);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [editingCommission, setEditingCommission] = useState<UserCommission | null>(null);
  const [editedCommissions, setEditedCommissions] = useState<Record<number, Partial<UserCommission>>>({});
  const [savingCommission, setSavingCommission] = useState<number | null>(null);
  const [rowActionState, setRowActionState] = useState<{
    action: RowActionType | null;
    userKey: string | null;
  }>({
    action: null,
    userKey: null,
  });

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

      const extractItems = (data: unknown): AdminIbUser[] => {
        const dataObj = data as Record<string, unknown>;
        if (!data) return [];
        if (Array.isArray(data)) return data as AdminIbUser[];
        if (Array.isArray(dataObj.items)) return dataObj.items as AdminIbUser[];
        if (Array.isArray(dataObj.users)) return dataObj.users as AdminIbUser[];
        if (Array.isArray(dataObj.data)) return dataObj.data as AdminIbUser[];
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).items)) {
          return ((dataObj.data as Record<string, unknown>).items as AdminIbUser[]);
        }
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).data)) {
          return ((dataObj.data as Record<string, unknown>).data as AdminIbUser[]);
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as AdminIbUser[];
        return [];
      };

      const items = extractItems(payload);
      setUsers(items);

      const payloadObj = payload as Record<string, unknown>;
      const paginationSource =
        ((payload && (payloadObj.pagination as Record<string, unknown> | undefined)) ??
        (payload && ((payloadObj.meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined)) ??
        ((payload &&
          payloadObj.data &&
          !Array.isArray(payloadObj.data)) ? 
          (((payloadObj.data as Record<string, unknown>).pagination as Record<string, unknown> | undefined) ?? 
          ((payloadObj.data as Record<string, unknown>).meta as Record<string, unknown> | undefined)?.pagination as Record<string, unknown> | undefined) :
          undefined));

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
        getAdminFriendlyErrorMessage(error, { resource: "IB users", action: "load" })
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const loadUserCommissions = useCallback(async (userId: string | number) => {
    if (!token || !userId) {
      return false;
    }

    try {
      setLoadingCommissions(true);
      setSelectedUserId(userId);
      setCommissionData(null);
      setCommissionDialogOpen(true);
      const response = await adminIbUserCommissionsApi.getUserCommissions(userId, token);
      
      if (response.success && response.data) {
        const data = (response as unknown as { data: UserCommissionResponse["data"] }).data;
        setCommissionData(data);
        return true;
      } else {
        setCommissionDialogOpen(false);
        toast.error(
          getAdminFriendlyErrorMessage("Failed to load commission data", {
            resource: "commission data",
            action: "load",
          })
        );
        return false;
      }
    } catch (error: unknown) {
      setCommissionDialogOpen(false);
      console.error("Failed to load user commissions:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "commissions", action: "load" })
      );
      return false;
    } finally {
      setLoadingCommissions(false);
    }
  }, [token]);

  const handleViewCommission = useCallback(async (user: AdminIbUser) => {
    const userId = resolveNumericUserId(user);
    if (!userId) {
      toast.error("User ID not available");
      return;
    }

    setEditedCommissions({});
    setEditingCommission(null);
    setRowActionState({
      action: "commission",
      userKey: getUserActionKey(user),
    });

    try {
      await loadUserCommissions(userId);
    } finally {
      setRowActionState({
        action: null,
        userKey: null,
      });
    }
  }, [loadUserCommissions]);

  const handleOpenDownline = useCallback(
    async (user: AdminIbUser, action: Extract<RowActionType, "level" | "tree">) => {
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
        action,
        userKey: getUserActionKey(user),
      });

      let keepPendingUntilRouteChange = false;

      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/ib-management/users-by-level?user_id=${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const payload = (await response.json()) as UsersByLevelPreviewResponse;

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.message || "Failed to load downline users");
        }

        keepPendingUntilRouteChange = true;
        router.push(`/set-ib-commission/${userId}`);
      } catch (error: unknown) {
        console.error("Failed to open downline view:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "downline users",
            action: "load",
          })
        );
      } finally {
        if (!keepPendingUntilRouteChange) {
          setRowActionState({
            action: null,
            userKey: null,
          });
        }
      }
    },
    [router, token]
  );

  const handleEditCommission = (commission: UserCommission) => {
    setEditingCommission(commission);
    setEditedCommissions({
      [commission.id]: {
        rate_ib: commission.rate_ib,
        rate_sub_ib_1: commission.rate_sub_ib_1,
        rate_sub_ib_2: commission.rate_sub_ib_2,
        rate_sub_ib_3: commission.rate_sub_ib_3,
        rate_sub_ib_4: commission.rate_sub_ib_4,
        rate_sub_ib_5: commission.rate_sub_ib_5,
        status: commission.status,
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingCommission(null);
    setEditedCommissions({});
  };

  const handleSaveCommission = useCallback(async (commission: UserCommission) => {
    if (!token || !selectedUserId) {
      return;
    }

    const editedData = editedCommissions[commission.id];
    if (!editedData) {
      return;
    }

    try {
      setSavingCommission(commission.id);
      
      // Merge edited data with original commission
      const updatedCommission: UserCommission = {
        ...commission,
        ...editedData,
      };
      
      // Use PATCH for updating existing commission
      await adminIbUserCommissionsApi.patchUserCommission(
        selectedUserId,
        updatedCommission,
        token
      );

      // Update local state
      if (commissionData) {
        const updatedCommissions = commissionData.commissions.map((c) =>
          c.id === commission.id
            ? updatedCommission
            : c
        );
        setCommissionData({
          ...commissionData,
          commissions: updatedCommissions,
        });
      }

      toast.success("Commission updated successfully");
      setEditingCommission(null);
      setEditedCommissions({});
    } catch (error: unknown) {
      console.error("Failed to update commission:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "commissions", action: "update" })
      );
    } finally {
      setSavingCommission(null);
    }
  }, [token, selectedUserId, editedCommissions, commissionData]);

  const handleUpdateCommissionField = (commissionId: number, field: keyof UserCommission, value: number | boolean) => {
    setEditedCommissions((prev) => ({
      ...prev,
      [commissionId]: {
        ...prev[commissionId],
        [field]: value,
      },
    }));
  };

  const isRowActionPending = useCallback(
    (user: AdminIbUser, action: RowActionType) => {
      return (
        rowActionState.userKey === getUserActionKey(user) &&
        rowActionState.action === action
      );
    },
    [rowActionState]
  );

  const renderCommissionAmountInput = (
    commissionId: number,
    field: keyof UserCommission,
    value?: number | null,
  ) => {
    const normalizedValue =
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={normalizedValue.toFixed(2)}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            handleUpdateCommissionField(
              commissionId,
              field,
              Number.isFinite(nextValue) ? nextValue : 0,
            );
          }}
          className="h-9 border-dashed pl-7 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    );
  };

  const columns: ColumnDef<AdminIbUser>[] = useMemo(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          const fullName = deriveFullName(user);
          const email = deriveEmail(user);
          const phone = derivePhone(user);

          return (
            <div className="space-y-1">
              <div className="font-medium">{fullName}</div>
              <div className="text-sm text-muted-foreground">{email}</div>
              <div className="text-xs text-muted-foreground">{phone}</div>
            </div>
          );
        },
      },
      {
        id: "ib_info",
        header: "IB Information",
        cell: ({ row }) => {
          const user = row.original;
          const ibName = deriveIbName(user);
          const partnerId = derivePartnerId(user);
          const sponsorId = deriveSponsorId(user);

          return (
            <div className="space-y-1 text-sm">
              {ibName !== "—" && (
                <div>
                  <span className="font-medium">IB Name:</span> {ibName}
                </div>
              )}
              {partnerId !== "—" && (
                <div>
                  <span className="font-medium">Partner ID:</span> {partnerId}
                </div>
              )}
              {sponsorId !== "—" && (
                <div>
                  <span className="font-medium">Sponsor ID:</span> {sponsorId}
                </div>
              )}
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
          const status = user.status ?? user.is_ib_user;
          return getStatusBadge(status);
        },
      },
      {
        id: "created_at",
        header: "Created",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="text-sm text-muted-foreground">
              {formatDateTime(user.created_at)}
            </div>
          );
        },
      },
      {
        id: "referral_link",
        header: "Referral Link",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const referralLink = deriveReferralLink(user);

          const handleCopy = async () => {
            if (!referralLink) {
              toast.error("No referral link available");
              return;
            }

            try {
              await navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied to clipboard!");
            } catch (error) {
              // Fallback for older browsers
              const textArea = document.createElement("textarea");
              textArea.value = referralLink;
              textArea.style.position = "fixed";
              textArea.style.opacity = "0";
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand("copy");
                toast.success("Referral link copied to clipboard!");
              } catch (err) {
                toast.error("Failed to copy referral link");
              }
              document.body.removeChild(textArea);
            }
          };

          if (!referralLink) {
            return <span className="text-sm text-muted-foreground">—</span>;
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
          const loadingLevel = isRowActionPending(user, "level");
          const loadingCommission = isRowActionPending(user, "commission");
          const loadingTree = isRowActionPending(user, "tree");

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleOpenDownline(user, "level");
                }}
                disabled={loadingLevel || loadingCommission || loadingTree}
                className="h-9 rounded-full border-sky-200 bg-sky-50 px-3.5 text-sky-700 shadow-sm transition-colors hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200"
              >
                {loadingLevel ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Layers3 className="mr-2 h-4 w-4" />
                )}
                View Level
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleViewCommission(user);
                }}
                disabled={loadingLevel || loadingCommission || loadingTree}
                className="h-9 rounded-full border-emerald-200 bg-emerald-50 px-3.5 text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200"
              >
                {loadingCommission ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                )}
                View Commission
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleOpenDownline(user, "tree");
                }}
                disabled={loadingLevel || loadingCommission || loadingTree}
                className="h-9 rounded-full border-amber-200 bg-amber-50 px-3.5 text-amber-700 shadow-sm transition-colors hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"
              >
                {loadingTree ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Network className="mr-2 h-4 w-4" />
                )}
                Tree Chart
              </Button>
            </div>
          );
        },
      },
    ],
    [handleOpenDownline, handleViewCommission, isRowActionPending],
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
      return <TableSectionSkeleton columnCount={7} rowCount={9} />;
    }

    if (!loading && users.length === 0) {
      return (
        <div className="flex  min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No IB Users
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no IB users matching your filters. Adjust the filters or refresh to check for new users.
          </p>
          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
    <>
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
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
              Showing page {pagination.current_page} of {pagination.total_pages} •{" "}
              {pagination.total} total users
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {renderTableSection()}
          </div>
        </div>
      </div>

      {/* Commission Dialog */}
      <Dialog  open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent className="!max-w-[78vw] !w-[78vw] max-h-[95vh] overflow-y-auto  sm:!max-w-[78vw]">
          <DialogHeader>
            <DialogTitle>User Commissions</DialogTitle>
            <DialogDescription>
              {commissionData?.user && (
                <>
                  Commission details for {commissionData.user.name} ({commissionData.user.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingCommissions ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">Loading commissions...</p>
            </div>
          ) : commissionData ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                All commission values in this table are shown in USD.
              </div>
              {/* Group commissions by MT5 Account */}
              {(() => {
                const groupedByAccount = commissionData.commissions.reduce(
                  (acc, commission) => {
                    const key = `${commission.mt5_account_id}_${commission.account_type_id}`;
                    if (!acc[key]) {
                      acc[key] = [];
                    }
                    acc[key].push(commission);
                    return acc;
                  },
                  {} as Record<string, UserCommission[]>
                );

                return Object.entries(groupedByAccount).map(([key, commissions]) => {
                  const firstCommission = commissions[0];
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="font-semibold text-lg">
                          MT5 Account: {firstCommission.mt5_account_id}
                        </h3>
                        <Badge variant="outline">
                          Account Type ID: {firstCommission.account_type_id}
                        </Badge>
                      </div>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-left">Level</TableHead>
                              <TableHead className="text-center">Rate IB</TableHead>
                              <TableHead className="text-center">Sub IB-1</TableHead>
                              <TableHead className="text-center">Sub IB-2</TableHead>
                              <TableHead className="text-center">Sub IB-3</TableHead>
                              <TableHead className="text-center">Sub IB-4</TableHead>
                              <TableHead className="text-center">Sub IB-5</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-center">Created</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {commissions
                              .sort((a, b) => {
                                // Sort by level: IB first, then Level-1 to Level-5
                                const levelOrder: Record<string, number> = {
                                  IB: 0,
                                  "Level-1": 1,
                                  "Level-2": 2,
                                  "Level-3": 3,
                                  "Level-4": 4,
                                  "Level-5": 5,
                                };
                                return (
                                  (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99)
                                );
                              })
                              .map((commission) => {
                                const isEditing = editingCommission?.id === commission.id;
                                const editedData = editedCommissions[commission.id];
                                const currentCommission = editedData
                                  ? { ...commission, ...editedData }
                                  : commission;
                                const isSaving = savingCommission === commission.id;

                                return (
                                  <TableRow key={commission.id}>
                                    <TableCell className="font-medium">{commission.level}</TableCell>
                                    {isEditing ? (
                                      <>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_ib",
                                            currentCommission.rate_ib
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_sub_ib_1",
                                            currentCommission.rate_sub_ib_1
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_sub_ib_2",
                                            currentCommission.rate_sub_ib_2
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_sub_ib_3",
                                            currentCommission.rate_sub_ib_3
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_sub_ib_4",
                                            currentCommission.rate_sub_ib_4
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            "rate_sub_ib_5",
                                            currentCommission.rate_sub_ib_5
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2 text-center">
                                          <select
                                            value={currentCommission.status ? "true" : "false"}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "status",
                                                e.target.value === "true"
                                              )
                                            }
                                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm text-center"
                                          >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                          </select>
                                        </TableCell>
                                      </>
                                    ) : (
                                      <>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_ib)}</TableCell>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_sub_ib_1)}</TableCell>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_sub_ib_2)}</TableCell>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_sub_ib_3)}</TableCell>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_sub_ib_4)}</TableCell>
                                        <TableCell className="text-center font-medium">{formatCommissionAmount(commission.rate_sub_ib_5)}</TableCell>
                                        <TableCell className="text-center">
                                          {commission.status ? (
                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                              Active
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
                                              Inactive
                                            </Badge>
                                          )}
                                        </TableCell>
                                      </>
                                    )}
                                    <TableCell className="text-sm text-muted-foreground text-center">
                                      {formatDateTime(commission.created_at)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {isEditing ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleSaveCommission(commission)}
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
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditCommission(commission)}
                                          >
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No commission data available
            </div>
          )}
        </DialogContent>
      </Dialog> 
    </>
  );
}
