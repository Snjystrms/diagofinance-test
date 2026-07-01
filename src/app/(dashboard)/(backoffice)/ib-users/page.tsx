"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import toast from "react-hot-toast";
import { ChevronDown, Copy, Download, Eye, Landmark, Network, RefreshCw, Users } from "lucide-react";
import * as XLSX from "xlsx";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  API_BASE_URL,
  adminIbUsersApi,
  type AdminIbUser,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

import { PaginatedDownlineTree } from "./_components/paginated-downline-tree";
import { IbCommissionDialog } from "./_components/ib-commission-dialog";
import { IbDirectRatesDialog } from "./_components/ib-direct-rates-dialog";

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

const getIbStatusLabel = (status: number | string | boolean | undefined) => {
  const statusValue =
    typeof status === "boolean"
      ? status
        ? 1
        : 0
      : typeof status === "string"
        ? Number(status)
        : status ?? 0;

  return statusValue === 1 || status === "1" || status === true ? "Active" : "Inactive";
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
const derivePartnerWallet = (user: AdminIbUser): string => {
  const val = user.partner_wallet;
  return val != null ? String(val) : "-";
};
const deriveMainWallet = (user: AdminIbUser): string => {
  const val = user.main_wallet;
  return val != null ? String(val) : "-";
};

const derivePartnerId = (user: AdminIbUser) => user.referral_code ?? "-";

const deriveReferredBy = (user: AdminIbUser) => {
  if (!user.referred_by) return null;
  return user.referred_by;
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
      return Number(trimmedId);
    }
  }

  return null;
};

type RowActionType = "tree";

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
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [commissionTargetUser, setCommissionTargetUser] = useState<AdminIbUser | null>(null);
  const [directRatesDialogOpen, setDirectRatesDialogOpen] = useState(false);
  const [directRatesTargetUser, setDirectRatesTargetUser] = useState<AdminIbUser | null>(null);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [searchQuery, setSearchQuery] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );

  // Local search state for immediate UI updates
  const [searchInput, setSearchInput] = useState(searchQuery ?? "");

  const loadUsers = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const trimmedSearch = searchQuery?.trim() || "";
      const validSearch = trimmedSearch.length >= 3 ? trimmedSearch : undefined;

      const response = await adminIbUsersApi.list({
        token,
        page,
        per_page: perPage,
        search: validSearch,
      });

      const payload = response?.data;
      const payloadObj = payload as Record<string, unknown>;
      const responseObj = response as unknown as Record<string, unknown>;

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
          : undefined) ??
        (responseObj?.pagination as Record<string, unknown> | undefined)
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
  }, [token, page, perPage, searchQuery]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    const exportToastId = `ib-users-export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const trimmedSearch = searchQuery?.trim() || "";
      const validSearch = trimmedSearch.length >= 3 ? trimmedSearch : undefined;
      
      const response = await adminIbUsersApi.list({
        token,
        page: 1,
        per_page: Math.max(pagination.total, users.length, 10000),
        search: validSearch,
      });

      const payload = response?.data;
      const dataObj = payload as Record<string, unknown>;
      const exportUsers = (() => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload as AdminIbUser[];
        if (Array.isArray(dataObj.items)) return dataObj.items as AdminIbUser[];
        if (Array.isArray(dataObj.users)) return dataObj.users as AdminIbUser[];
        if (Array.isArray(dataObj.data)) return dataObj.data as AdminIbUser[];
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).items)) {
          return (dataObj.data as Record<string, unknown>).items as AdminIbUser[];
        }
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).data)) {
          return (dataObj.data as Record<string, unknown>).data as AdminIbUser[];
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as AdminIbUser[];
        return [];
      })();

      if (exportUsers.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      const exportData = exportUsers.map((user, index) => ({
        "Sr. No.": index + 1,
        Name: deriveFullName(user),
        Email: deriveEmail(user),
        Phone: derivePhone(user),
        "Total Commission": deriveTotalCommission(user),
        "Partner ID": derivePartnerId(user),
        "Referred By": user.referred_by?.name ?? "-",
        // "Sponsor ID": deriveSponsorId(user),
        "Partner Plan Name": user.ib_plan_name || "-",
        Status: getIbStatusLabel(user.status ?? user.is_ib_user),
        Created: formatDateTime(user.created_at),
        "Referral Link": deriveReferralLink(user) || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `ib-users-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "IB Users");
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

      toast.success(`Exported ${exportUsers.length} IB users to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB users", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [token, pagination.total, users.length, searchQuery]);

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

      // Directly open tree view - validation happens in tree component
      setSelectedTreeUserId(userId);
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
              <Link
                href={`/ib-users/${user.id ?? user.uuid ?? ""}`}
                className="font-medium hover:underline"
              >
                {deriveFullName(user)}
              </Link>
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
        id: "partner_wallet",
        header: "Partner Wallet",
        cell: ({ row }) => {
          const user = row.original;
          const partnerWallet = derivePartnerWallet(user);
          return (
            <div className="space-y-1 text-sm">
              {partnerWallet !== "-" ? (
                <div className="text-center">
                  {partnerWallet}
                </div>
              ) : null}
            </div>
          );
        },
      },
        {
        id: "main_wallet",
        header: "Main Wallet",
        cell: ({ row }) => {
          const user = row.original;
          const mainWallet = deriveMainWallet(user);
          return (
            <div className="space-y-1 text-sm">
              {mainWallet !== "-" ? (
                <div className="text-center">
                  {mainWallet}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "referral_code",
        header: "Partner ID",
        cell: ({ row }) => {
          const user = row.original;
          const ibName = deriveIbName(user);
          const partnerId = derivePartnerId(user);
          const sponsorId = deriveSponsorId(user);
          const totalCommission = deriveTotalCommission(user);
          return (
            <div className="space-y-1 text-sm">
              {/* {totalCommission !== "-" ? (
                <div className="text-center">
                  {totalCommission}
                </div>
              ) : null} */}

              {partnerId !== "-" ? (
                <div>
                  <span className="font-medium">{partnerId}</span> 
                </div>
              ) : null}
              {/* {sponsorId !== "-" ? (
                <div>
                  <span className="font-medium">Sponsor ID:</span> {sponsorId}
                </div>
              ) : null} */}
            </div>
          );
        },
      },
      {
        id: "referred_by",
        header: "Referred By",
        cell: ({ row }) => {
          const ref = deriveReferredBy(row.original);
          if (!ref) {
            return <div className="text-sm text-muted-foreground">-</div>;
          }
          return (
            <div className="space-y-1">
              <div className="text-sm font-medium">{ref.name ?? "-"}</div>
              <div className="text-xs text-muted-foreground">{ref.email ?? ""}</div>
            </div>
          );
        },
      },
      // {
      //   id: "ib_plan_name",
      //   header: "Partner Plan Name",
      //   accessorFn: (row) => row.ib_plan_name ?? "-",
      //   cell: ({ row }) => {
      //     const planName = row.original.ib_plan_name;
      //     if (!planName) {
      //       return <div className="text-sm text-muted-foreground pl-4">-</div>;
      //     }
      //     return (
      //       <div className="text-sm">
      //         {planName}
      //       </div>
      //     );
      //   },
      // },
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
            <div className="text-sm text-muted-foreground whitespace-nowrap">
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
            <div className="flex items-center gap-1">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 w-8 rounded-md border-slate-200 bg-background p-0 text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300"
              >
                <Link
                  href={`/ib-users/${user.id ?? user.uuid ?? ""}`}
                  aria-label={`View Partner portal for ${deriveFullName(user)}`}
                  title="View Partner portal"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </Button>
              {/* <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  handleOpenUpdatePlanDialog(user);
                }}
                disabled={loadingPlan}
                className="h-8 rounded-md border-slate-200 bg-background px-2.5 text-xs text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300"
              >
                {loadingPlan ? (
                  <Spinner className="mr-1 h-3 w-3" />
                ) : null}
                Plan
              </Button> */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleOpenTreeChart(user);
                }}
                disabled={loadingTree}
                aria-label={`View Teams for ${deriveFullName(user)}`}
                title="View Teams"
                className="h-8 rounded-md border-slate-200 bg-background px-2.5 text-xs text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300"
              >
                {loadingTree ? (
                  <Spinner className="mr-1 h-3 w-3" />
                ) : (
                  <Network className="mr-1 h-3 w-3" />
                )}
                Teams
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDirectRatesTargetUser(user);
                  setDirectRatesDialogOpen(true);
                }}
                aria-label={`View Commissions for ${deriveFullName(user)}`}
                title="View Commissions"
                className="h-8 rounded-md border-slate-200 bg-background px-2.5 text-xs text-slate-600 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300"
              >
                <Landmark className="mr-1 h-3 w-3" />
                Comm
              </Button>
            </div>
          );
        },
      },
    ],
    [handleOpenTreeChart, isRowActionPending],
  );

  if (selectedTreeUserId !== null) {
    return (
      <PaginatedDownlineTree
        userId={selectedTreeUserId}
        onBack={() => {
          setSelectedTreeUserId(null);
        }}
        backLabel="Back to Partner Users"
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
            No Partner Users
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no Partner users matching your filters. Adjust the
            filters or refresh to check for new users.
          </p>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleExport("csv")}>
                  Export CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
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
        <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-6 w-6 text-primary" />
              Partner Users
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage all Partner users in the system.
            </p>
          </div>
         <div className="flex items-center gap-2">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
        Export Excel (.xlsx)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => void handleExport("csv")}>
        Export CSV (.csv)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <Button variant="outline" onClick={loadUsers} disabled={loading}>
    <RefreshCw
      className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
    />
    Refresh
  </Button>
</div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                void setPage(1);
                const trimmed = value.trim();
                // Only update query state if 3+ chars or empty (to clear)
                void setSearchQuery(trimmed.length === 0 || trimmed.length >= 3 ? trimmed || null : searchQuery);
              }}
              placeholder="Search by name, email, mobile, or sponsor ID"
              minimumLength={3}
              delay={300}
            />
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

        <IbCommissionDialog
          open={commissionDialogOpen}
          onOpenChange={(open) => {
            setCommissionDialogOpen(open);
            if (!open) setCommissionTargetUser(null);
          }}
          user={commissionTargetUser}
          token={token ?? ""}
        />
        <IbDirectRatesDialog
          open={directRatesDialogOpen}
          onOpenChange={(open) => {
            setDirectRatesDialogOpen(open);
            if (!open) setDirectRatesTargetUser(null);
          }}
          user={directRatesTargetUser}
          token={token ?? ""}
        />
        </div>
  );
}



