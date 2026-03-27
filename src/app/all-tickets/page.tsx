"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  Hash,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Ticket,
  User,
  XCircle,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { MainLayout } from "@/components/main-layout";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import {
  adminTicketApi,
  type AdminTicketItem,
  type AdminTicketCloseRequest,
  type AdminTicketReplyRequest,
} from "@/lib/api";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "0" },
  { label: "In Progress", value: "1" },
  { label: "Closed", value: "3" },
];

const PRIORITY_OPTIONS = [
  { label: "All priorities", value: "all" },
  { label: "Low", value: "1" },
  { label: "Medium", value: "2" },
  { label: "High", value: "3" },
];

const ENQUIRY_OPTIONS = [
  { label: "All enquiry types", value: "all" },
  { label: "Other", value: "1" },
  { label: "Deposit", value: "2" },
  { label: "Withdrawal", value: "3" },
  { label: "KYC", value: "4" },
  { label: "MT5 Account", value: "5" },
  { label: "IB", value: "6" },
];

const statusBadge = (status: number) => {
  switch (status) {
    case 0:
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          Open
        </Badge>
      );
    case 1:
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          In Progress
        </Badge>
      );
    case 2:
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Resolved
        </Badge>
      );
    case 3:
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
          Closed
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const priorityBadge = (priority: number) => {
  switch (priority) {
    case 1:
      return (
        <Badge variant="outline" className="border-green-200 text-green-700 dark:border-green-800 dark:text-green-300">
          Low
        </Badge>
      );
    case 2:
      return (
        <Badge variant="outline" className="border-yellow-200 text-yellow-700 dark:border-yellow-800 dark:text-yellow-300">
          Medium
        </Badge>
      );
    case 3:
      return (
        <Badge variant="outline" className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
          High
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

import { formatDateTime } from "@/lib/formatters";

const formatEnquiryType = (value: number) => {
  const option = ENQUIRY_OPTIONS.find((opt) => Number(opt.value) === value);
  return option?.label ?? "Unknown";
};

export default function AdminTicketsPage() {
  const { token } = useAuth();

  const [statsLoading, setStatsLoading] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  });

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault("all"));
  const [priorityFilter, setPriorityFilter] = useQueryState("priority", parseAsString.withDefault("all"));
  const [enquiryFilter, setEnquiryFilter] = useQueryState("type", parseAsString.withDefault("all"));
  const [userIdFilter, setUserIdFilter] = useQueryState("user", parseAsString.withDefault(""));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");

  const [selectedTicket, setSelectedTicket] = useState<AdminTicketItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [replyNote, setReplyNote] = useState("");
  const [replyAdminNotes, setReplyAdminNotes] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [closeAdminNotes, setCloseAdminNotes] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    void setPage(1);
    void setSearch(value.trim() ? value : null);
  }, 400);

  const loadStats = useCallback(async () => {
    if (!token) return;
    try {
      setStatsLoading(true);
      const response = await adminTicketApi.stats(token);
      if (response.success && response.data) {
        setStats({
          total: response.data.total ?? 0,
          open: response.data.open ?? 0,
          in_progress: response.data.in_progress ?? 0,
          resolved: response.data.resolved ?? 0,
          closed: response.data.closed ?? 0,
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load ticket statistics:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load ticket statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const { data: ticketsQueryResult, isLoading: loading } = useQuery({
    queryKey: ["adminTickets", token, page, perPage, statusFilter, priorityFilter, enquiryFilter, userIdFilter, search],
    queryFn: async () => {
      const response = await adminTicketApi.list(token!, {
        page,
        limit: perPage,
        status: statusFilter && statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter && priorityFilter !== "all" ? priorityFilter : undefined,
        enquiry_type: enquiryFilter && enquiryFilter !== "all" ? enquiryFilter : undefined,
        user_id: userIdFilter?.trim() ? userIdFilter.trim() : undefined,
        search: search?.trim() ? search.trim() : undefined,
      });
      return response?.data;
    },
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  const tickets = ticketsQueryResult?.tickets ?? [];
  const pagination = ticketsQueryResult?.pagination
    ? {
        current_page: ticketsQueryResult.pagination.current_page ?? page,
        per_page: ticketsQueryResult.pagination.per_page ?? perPage,
        total_pages: ticketsQueryResult.pagination.last_page ?? 1,
        total: ticketsQueryResult.pagination.total ?? tickets.length,
      }
    : { current_page: page, per_page: perPage, total_pages: 1, total: tickets.length };

  const loadTickets = useCallback(() => {}, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const openDetail = useCallback((ticket: AdminTicketItem) => {
    setSelectedTicket(ticket);
    setReplyNote(ticket.reply_note ?? "");
    setReplyAdminNotes("");
    setResolutionNote("");
    setCloseAdminNotes("");
    setIsDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedTicket(null);
    setReplyNote("");
    setReplyAdminNotes("");
    setResolutionNote("");
    setCloseAdminNotes("");
    setIsReplying(false);
    setIsClosing(false);
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!token || !selectedTicket) return;
    if (!replyNote.trim()) {
      toast.error("Reply note is required");
      return;
    }

    try {
      setIsReplying(true);
      const payload: AdminTicketReplyRequest = {
        reply_note: replyNote.trim(),
        admin_notes: replyAdminNotes.trim() || undefined,
      };
      await adminTicketApi.reply(selectedTicket.id ?? selectedTicket.uuid, payload, token);
      toast.success("Reply submitted successfully");
      await loadTickets();
      closeDetail();
    } catch (error: unknown) {
      console.error("Failed to submit reply:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit reply");
    } finally {
      setIsReplying(false);
    }
  }, [token, selectedTicket, replyNote, replyAdminNotes, loadTickets, closeDetail]);

  const handleCloseSubmit = useCallback(async () => {
    if (!token || !selectedTicket) return;
    if (!resolutionNote.trim()) {
      toast.error("Resolution note is required");
      return;
    }

    try {
      setIsClosing(true);
      const payload: AdminTicketCloseRequest = {
        resolution_note: resolutionNote.trim(),
        admin_notes: closeAdminNotes.trim() || undefined,
      };
      await adminTicketApi.close(selectedTicket.id ?? selectedTicket.uuid, payload, token);
      toast.success("Ticket closed successfully");
      await loadTickets();
      await loadStats();
      closeDetail();
    } catch (error: unknown) {
      console.error("Failed to close ticket:", error);
      toast.error(error instanceof Error ? error.message : "Failed to close ticket");
    } finally {
      setIsClosing(false);
    }
  }, [token, selectedTicket, resolutionNote, closeAdminNotes, loadTickets, loadStats, closeDetail]);

  const handleStatusChange = useCallback(async (newStatus: 1 | 3) => {
    if (!token || !selectedTicket) return;

    try {
      setIsChangingStatus(true);
      
      if (newStatus === 1) {
        // Change to In Progress - use reply endpoint
        // The API automatically changes status to 1 when replying
        const payload: AdminTicketReplyRequest = {
          reply_note: "Status changed to In Progress",
          admin_notes: `Status changed to In Progress by admin`,
        };
        await adminTicketApi.reply(selectedTicket.id ?? selectedTicket.uuid, payload, token);
        toast.success("Ticket status changed to In Progress");
        await loadTickets();
        await loadStats();
        closeDetail();
      } else if (newStatus === 3) {
        // For closing, we need resolution note
        if (!resolutionNote.trim()) {
          toast.error("Please enter a resolution note before closing the ticket");
          setIsChangingStatus(false);
          return;
        }
        const payload: AdminTicketCloseRequest = {
          resolution_note: resolutionNote.trim(),
          admin_notes: closeAdminNotes.trim() || "Ticket closed by admin",
        };
        await adminTicketApi.close(selectedTicket.id ?? selectedTicket.uuid, payload, token);
        toast.success("Ticket closed successfully");
        await loadTickets();
        await loadStats();
        closeDetail();
      }
    } catch (error: unknown) {
      console.error("Failed to change status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to change status");
      setIsChangingStatus(false);
    }
  }, [token, selectedTicket, resolutionNote, closeAdminNotes, loadTickets, loadStats, closeDetail]);

  const columns: ColumnDef<AdminTicketItem>[] = useMemo(
    () => [
      {
        id: "ticket",
        header: "Ticket",
        accessorFn: (row) => row.id,
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="space-y-1 text-sm">
              <div className="font-semibold">#{ticket.id}</div>
              <div className="text-muted-foreground text-xs">{ticket.uuid.slice(0, 8)}...</div>
            </div>
          );
        },
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const ticket = row.original;
          const user = ticket.user;
          return (
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                {user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{user?.email ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{user?.uuid ?? ""}</div>
            </div>
          );
        },
      },
      {
        id: "title",
        header: "Title",
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="space-y-1 text-sm">
              <div className="font-medium">{ticket.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</div>
            </div>
          );
        },
      },
      {
        id: "type",
        header: "Type",
        accessorFn: (row) => row.enquiry_type,
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <Badge variant="outline">
              {ticket.enquiry_type_label || formatEnquiryType(ticket.enquiry_type)}
            </Badge>
          );
        },
      },
      {
        id: "priority",
        header: "Priority",
        accessorFn: (row) => row.priority,
        cell: ({ row }) => priorityBadge(row.original.priority),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateTime(row.original.created_at)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" onClick={() => openDetail(row.original)} aria-label="View ticket">
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [openDetail],
  );

  const renderTable = () => {
    if (loading && tickets.length === 0) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      );
    }

    if (!loading && tickets.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No Tickets
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are no tickets that match your filters. Adjust the filters or refresh to check for new submissions.
          </p>
          <Button variant="outline" onClick={loadTickets}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <AppDataTable<AdminTicketItem>
        data={tickets}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => String(row.uuid ?? row.id ?? Math.random())}
      />
    );
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
              <p className="text-sm text-muted-foreground">
                Monitor and respond to user support tickets. Use the filters to narrow down specific tickets.
              </p>
            </div>
            <Button variant="outline" onClick={() => { void loadTickets(); void loadStats(); }}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Tickets", value: stats.total, icon: Ticket, color: "text-primary" },
              { label: "Open", value: stats.open, icon: AlertCircle, color: "text-blue-500" },
              { label: "In Progress", value: stats.in_progress, icon: MessageSquare, color: "text-amber-500" },
              { label: "Closed", value: stats.closed, icon: CheckCircle2, color: "text-green-500" },
            ].map((card) => (
              <Card key={card.label} className="border-muted bg-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{statsLoading ? "—" : card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="rounded-lg border bg-card p-4 shadow-sm space-y-4">
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
                  placeholder="Search tickets"
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

              <Select
                value={statusFilter ?? "all"}
                onValueChange={(value) => {
                  void setStatusFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter ?? "all"}
                onValueChange={(value) => {
                  void setPriorityFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={enquiryFilter ?? "all"}
                onValueChange={(value) => {
                  void setEnquiryFilter(value === "all" ? null : value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[200px] text-sm">
                  <SelectValue placeholder="Enquiry Type" />
                </SelectTrigger>
                <SelectContent>
                  {ENQUIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={userIdFilter ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setUserIdFilter(value.trim() ? value : null);
                  void setPage(1);
                }}
                placeholder="User ID"
                className="h-9 w-full max-w-[180px] text-sm"
              />

              <Button variant="outline" onClick={() => { void loadTickets(); }}>
                Apply
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {renderTable()}
          </div>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={(open) => (open ? null : closeDetail())}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Ticket className="h-4 w-4 text-primary" />
              Ticket #{selectedTicket?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedTicket ? (
            <div className="space-y-4">
              {/* Compact Ticket & User Info */}
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{selectedTicket.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{selectedTicket.description}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {statusBadge(selectedTicket.status)}
                    {priorityBadge(selectedTicket.priority)}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">User: </span>
                    <span className="font-medium">
                      {selectedTicket.user
                        ? `${selectedTicket.user.first_name ?? ""} ${selectedTicket.user.last_name ?? ""}`.trim() ||
                          selectedTicket.user.email
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span className="font-medium break-all">{selectedTicket.user?.email ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDateTime(selectedTicket.created_at)}
                  </div>
                </div>
              </div>

              {/* Status Change - Simplified */}
              {/* {selectedTicket.status === 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg border-2 border-amber-500/20 bg-amber-500/5">
                  <div className="text-sm font-medium">Change Status</div>
                  <Button
                    onClick={() => handleStatusChange(1)}
                    disabled={isChangingStatus}
                    variant="outline"
                    size="sm"
                    className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-950/20"
                  >
                    {isChangingStatus ? (
                      <>
                        <Spinner className="mr-2 h-3.5 w-3.5" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="mr-2 h-3.5 w-3.5" />
                        Mark as In Progress
                      </>
                    )}
                  </Button>
                </div>
              )} */}

              {/* Close Ticket Section - Only show if status is 1 (In Progress) */}
              {selectedTicket.status === 1 && (
                <div className="space-y-3 p-3 rounded-lg border-2 border-destructive/20 bg-destructive/5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Close Ticket
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resolution-note" className="text-xs">Resolution Note (required)</Label>
                    <Textarea
                      id="resolution-note"
                      placeholder="Enter resolution message..."
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <Button
                      onClick={handleCloseSubmit}
                      disabled={isClosing || !resolutionNote.trim()}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      {isClosing ? (
                        <>
                          <Spinner className="mr-2 h-3.5 w-3.5" />
                          Closing...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-3.5 w-3.5" />
                          Close Ticket
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Reply Section - Only show if status is 0 (Open) */}
              {selectedTicket.status === 0 && (
                <div className="space-y-3 p-3 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Respond to Ticket
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Reply note (visible to user)..."
                      value={replyNote}
                      onChange={(e) => setReplyNote(e.target.value)}
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <Button
                      onClick={handleReplySubmit}
                      disabled={isReplying || !replyNote.trim()}
                      size="sm"
                      className="w-full"
                    >
                      {isReplying ? (
                        <>
                          <Spinner className="mr-2 h-3.5 w-3.5" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-3.5 w-3.5" />
                          Send Reply
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
              Select a ticket to view details.
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" size="sm" onClick={closeDetail}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

