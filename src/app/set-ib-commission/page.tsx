"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { Search, RefreshCw, Network } from "lucide-react";

import { useRouter } from "next/navigation";
import { AppDataTable } from "@/components/app-data-table";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import {
  adminIbUsersApi,
} from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";


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

export default function SetIbCommissionPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<IbUserForCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
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

      const response = await adminIbUsersApi.list({
        token,
        page,
        per_page: perPage,
        search: search?.trim() ? search : undefined,
      });

      const payload = response?.data;

      const extractItems = (data: unknown): IbUserForCommission[] => {
        const dataObj = data as Record<string, unknown>;
        if (!data) return [];
        if (Array.isArray(data)) return data as IbUserForCommission[];
        if (Array.isArray(dataObj.items)) return dataObj.items as IbUserForCommission[];
        if (Array.isArray(dataObj.users)) return dataObj.users as IbUserForCommission[];
        if (Array.isArray(dataObj.data)) return dataObj.data as IbUserForCommission[];
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).items)) {
          return ((dataObj.data as Record<string, unknown>).items as IbUserForCommission[]);
        }
        if (dataObj.data && Array.isArray((dataObj.data as Record<string, unknown>).data)) {
          return ((dataObj.data as Record<string, unknown>).data as IbUserForCommission[]);
        }
        if (Array.isArray(dataObj.results)) return dataObj.results as IbUserForCommission[];
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
      const errorMessage = error instanceof Error ? error.message : "Failed to load IB users";
      toast.error(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleViewDownline = useCallback((user: IbUserForCommission) => {
    router.push(`/set-ib-commission/${user.id}`);
  }, [router]);

  const columns: ColumnDef<IbUserForCommission>[] = useMemo(
    () => [
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="text-xs text-muted-foreground">{user.phone}</div>
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
                <span className="font-medium">IB Name:</span> {user.ib_name}
              </div>
              <div>
                <span className="font-medium">Marketing Name:</span> {user.marketing_name}
              </div>
              <div>
                <span className="font-medium">Referral Code:</span> {user.referral_code}
              </div>
            </div>
          );
        },
      },
      {
        id: "country",
        header: "Country",
        accessorKey: "country",
        cell: ({ row }) => (
          <div className="text-sm">{row.original.country}</div>
        ),
      },
      {
        id: "commission",
        header: "Commission",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Total:</span> {user.total_commission.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Available:</span> {user.available_commission.toFixed(2)}
              </div>
            </div>
          );
        },
      },
      {
        id: "tree",
        header: "Tree",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDownline(user)}
              className="flex items-center gap-2"
            >
              <Network className="h-4 w-4" />
              View Downline
            </Button>
          );
        },
      },
    ],
    [handleViewDownline],
  );

  const renderTableSection = () => {
    if (loading && users.length === 0) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    if (!loading && users.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
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
      <AppDataTable<IbUserForCommission>
        data={users}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => String(row.id)}
      />
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Set IB Commission</h1>
              <p className="text-sm text-muted-foreground">
                View and manage IB users for commission settings.
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
              Showing page {pagination.current_page} of {pagination.total_pages} •{" "}
              {pagination.total} total users
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {renderTableSection()}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

