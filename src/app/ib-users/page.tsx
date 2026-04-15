"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  Copy,
  Edit,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { MainLayout } from "@/components/main-layout";
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
import { Label } from "@/components/ui/label";
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
  adminIbUsersApi,
  adminIbUserCommissionsApi,
  type AdminIbUser,
  type UserCommission,
  type UserCommissionResponse,
} from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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

  const [users, setUsers] = useState<AdminIbUser[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadUserCommissions = useCallback(async (userId: string | number) => {
    if (!token || !userId) {
      return;
    }

    try {
      setLoadingCommissions(true);
      const response = await adminIbUserCommissionsApi.getUserCommissions(userId, token);
      
      if (response.success && response.data) {
        const data = (response as unknown as { data: UserCommissionResponse["data"] }).data;
        setCommissionData(data);
        setSelectedUserId(userId);
        setCommissionDialogOpen(true);
      } else {
        toast.error("Failed to load commission data");
      }
    } catch (error: unknown) {
      console.error("Failed to load user commissions:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load commissions";
      toast.error(errorMessage);
    } finally {
      setLoadingCommissions(false);
    }
  }, [token]);

  const handleViewCommission = useCallback((user: AdminIbUser) => {
    const userId = user.id ?? user.uuid;
    if (!userId) {
      toast.error("User ID not available");
      return;
    }
    setEditedCommissions({});
    setEditingCommission(null);
    void loadUserCommissions(userId);
  }, [loadUserCommissions]);

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
      const errorMessage = error instanceof Error ? error.message : "Failed to update commission";
      toast.error(errorMessage);
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
              variant="destructive"
              onClick={handleCopy}
              className="bg-red-600 hover:bg-red-700 text-white"
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

          const handleViewLevel = () => {
            // TODO: Implement view level functionality
            const userId = user.id ?? user.uuid;
            toast(`View Level for user: ${userId}`);
          };

          const handleViewCommissionClick = () => {
            handleViewCommission(user);
          };

          const handleTreeChart = () => {
            // TODO: Implement tree chart functionality
            const userId = user.id ?? user.uuid;
            toast(`Tree Chart for user: ${userId}`);
          };

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleViewLevel}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                View Level
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleViewCommissionClick}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                View Commission
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleTreeChart}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Tree Chart
              </Button>
            </div>
          );
        },
      },
    ],
    [handleViewCommission],
  );

  const renderTableSection = () => {
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
            `${row.email ?? row.name ?? Math.random().toString(36).slice(2)}`;
          return String(identifier);
        }}
      />
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">IB Users</h1>
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
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : commissionData ? (
            <div className="space-y-4">
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
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_ib ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_ib",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_sub_ib_1 ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_sub_ib_1",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_sub_ib_2 ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_sub_ib_2",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_sub_ib_3 ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_sub_ib_3",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_sub_ib_4 ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_sub_ib_4",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
                                        </TableCell>
                                        <TableCell className="p-2">
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={((currentCommission.rate_sub_ib_5 ?? 0) * 100).toFixed(2)}
                                            onChange={(e) =>
                                              handleUpdateCommissionField(
                                                commission.id,
                                                "rate_sub_ib_5",
                                                parseFloat(e.target.value) / 100
                                              )
                                            }
                                            className="w-full h-8 text-center"
                                          />
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
                                        <TableCell className="text-center">{(commission.rate_ib * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{(commission.rate_sub_ib_1 * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{(commission.rate_sub_ib_2 * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{(commission.rate_sub_ib_3 * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{(commission.rate_sub_ib_4 * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{(commission.rate_sub_ib_5 * 100).toFixed(2)}%</TableCell>
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
    </MainLayout>
  );
}
