"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  RefreshCw,
  Search,
  Plus,
  Ticket,
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { ticketApi, type TicketItem, type CreateTicketRequest } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Open", value: "0" },
  { label: "In Progress", value: "1" },
  { label: "Resolved", value: "2" },
  { label: "Closed", value: "3" },
];

const enquiryTypeOptions = [
  { label: "Other", value: 1 },
  { label: "Deposit", value: 2 },
  { label: "Withdrawal", value: 3 },
  { label: "KYC", value: 4 },
  { label: "MT5 Account", value: 5 },
  { label: "IB", value: 6 },
];

const priorityOptions = [
  { label: "Low", value: 1 },
  { label: "Medium", value: 2 },
  { label: "High", value: 3 },
];

const getStatusLabel = (status: number): string => {
  switch (status) {
    case 0:
      return "Open";
    case 1:
      return "In Progress";
    case 2:
      return "Resolved";
    case 3:
      return "Closed";
    default:
      return "Unknown";
  }
};

const getStatusBadge = (status: number) => {
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
      return (
        <Badge className="bg-muted text-muted-foreground">
          Unknown
        </Badge>
      );
  }
};

const getPriorityBadge = (priority: number) => {
  switch (priority) {
    case 1:
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800">
          Low
        </Badge>
      );
    case 2:
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800">
          Medium
        </Badge>
      );
    case 3:
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800">
          High
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Unknown
        </Badge>
      );
  }
};

const getEnquiryTypeLabel = (enquiryType: number): string => {
  const option = enquiryTypeOptions.find((opt) => opt.value === enquiryType);
  return option?.label || "Unknown";
};

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

export default function RaiseTicketPage() {
  const { token } = useAuth();

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTicketRequest>({
    title: "",
    enquiry_type: 1,
    description: "",
    priority: 1,
  });

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString.withDefault("all"),
  );
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

  const loadTickets = useCallback(async () => {
    if (!token) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await ticketApi.list(token, page, perPage);

      console.log("Ticket API Response:", response);

      // Handle different response structures
      let ticketsData: TicketItem[] = [];
      let paginationData: { current_page?: number; per_page?: number; total?: number; total_pages?: number; last_page?: number } | null = null;

      if (response.success) {
        // Check if response.data is the TicketListResponse object
        if (response.data) {
          const data = response.data as unknown as Record<string, unknown>;
          // Case 1: response.data is TicketListResponse { success, data, pagination }
          if (data.success !== undefined && Array.isArray(data.data)) {
            ticketsData = data.data as TicketItem[];
            paginationData = data.pagination as { current_page?: number; per_page?: number; total?: number; total_pages?: number; last_page?: number } | null;
          }
          // Case 2: response.data is directly the array
          else if (Array.isArray(response.data)) {
            ticketsData = response.data as TicketItem[];
            // Try to get pagination from response
            paginationData = (response as unknown as Record<string, unknown>).pagination as { current_page?: number; per_page?: number; total?: number; total_pages?: number; last_page?: number } | null;
          }
          // Case 3: response.data is an object with data property
          else if (data && Array.isArray(data.data)) {
            ticketsData = data.data as TicketItem[];
            paginationData = (data.pagination || (response as unknown as Record<string, unknown>).pagination) as { current_page?: number; per_page?: number; total?: number; total_pages?: number; last_page?: number } | null;
          }
        }
      }

      console.log("Extracted tickets:", ticketsData);
      console.log("Extracted pagination:", paginationData);

      // Apply status filter
      if (statusFilter && statusFilter !== "all") {
        ticketsData = ticketsData.filter(
          (ticket) => ticket.status === Number(statusFilter)
        );
      }

      // Apply search filter
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        ticketsData = ticketsData.filter(
          (ticket) =>
            ticket.title.toLowerCase().includes(searchLower) ||
            ticket.description.toLowerCase().includes(searchLower) ||
            (ticket.enquiry_type_label?.toLowerCase().includes(searchLower) ?? false)
        );
      }

      setTickets(ticketsData);

      // Set pagination
      if (paginationData) {
        setPagination({
          current_page: paginationData.current_page || page,
          per_page: paginationData.per_page || perPage,
          total_pages: paginationData.last_page || paginationData.total_pages || 1,
          total: paginationData.total || ticketsData.length,
        });
      } else {
        setPagination({
          current_page: page,
          per_page: perPage,
          total_pages: 1,
          total: ticketsData.length,
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load tickets:", error);
      setLoadError(error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, search]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const handleCreateTicket = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    if (!createForm.title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!createForm.description.trim()) {
      toast.error("Description is required");
      return;
    }

    try {
      setIsSubmitting(true);

      // Import ticketApi dynamically to ensure it's loaded
      const { ticketApi: api } = await import("@/lib/api");
      
      if (!api || !api.create) {
        throw new Error("Ticket API is not available");
      }

      const response = await api.create(createForm, token);

      if (response.success) {
        toast.success(response.message || "Ticket created successfully");
        setIsCreateDialogOpen(false);
        setCreateForm({
          title: "",
          enquiry_type: 1,
          description: "",
          priority: 1,
        });
        await loadTickets();
      } else {
        throw new Error(response.message || "Failed to create ticket");
      }
    } catch (error: unknown) {
      console.error("Failed to create ticket:", error);
      toast.error(getFriendlyErrorMessage(error, {
        audience: "client",
        resource: "support ticket",
        action: "create",
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [token, createForm, loadTickets]);

  const columns: ColumnDef<TicketItem>[] = useMemo(
    () => [
        {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: "title",
        header: "Title",
        accessorFn: (row) => row.title,
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium">{ticket.title}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {ticket.description}
              </div>
            </div>
          );
        },
      },
      {
        id: "enquiry_type",
        header: "Type",
        accessorFn: (row) => row.enquiry_type,
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <Badge variant="outline">
              {ticket.enquiry_type_label || getEnquiryTypeLabel(ticket.enquiry_type)}
            </Badge>
          );
        },
      },
      {
        id: "priority",
        header: "Priority",
        accessorFn: (row) => row.priority,
        cell: ({ row }) => {
          const ticket = row.original;
          return getPriorityBadge(ticket.priority);
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => {
          const ticket = row.original;
          return getStatusBadge(ticket.status);
        },
      },
      {
        id: "reply_note",
        header: "Response",
        cell: ({ row }) => {
          const ticket = row.original;
          if (!ticket.reply_note) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          return (
            <div className="text-sm text-muted-foreground line-clamp-2">
              {ticket.reply_note}
            </div>
          );
        },
      },
      {
        id: "created_at",
        header: "Created",
        cell: ({ row }) => {
          const ticket = row.original;
          return (
            <div className="text-sm text-muted-foreground">
              {formatDateTime(ticket.created_at)}
            </div>
          );
        },
      },
    ],
    [],
  );

  const renderTableSection = () => {
    if (loading && tickets.length === 0) {
      return <TableSectionSkeleton columnCount={6} rowCount={9} />;
    }

    if (loadError && tickets.length === 0) {
      return (
        <ApiErrorState
          error={loadError}
          audience="client"
          resource="support tickets"
          action="load"
          variant="empty"
          onRetry={loadTickets}
        />
      );
    }

    if (!loading && tickets.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No Tickets
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            {search || statusFilter !== "all"
              ? "No tickets match your filters. Adjust the filters or create a new ticket."
              : "You haven't created any support tickets yet. Click 'Raise a Ticket' to get started."}
          </p>
          {!search && statusFilter === "all" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Raise a Ticket
            </Button>
          )}
        </div>
      );
    }

    return (
      <AppDataTable<TicketItem>
        data={tickets}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => String(row.id || row.uuid)}
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
                <Ticket className="h-6 w-6 text-primary" />
                Support Tickets
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage your support tickets. Create new tickets for assistance.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Raise a Ticket
              </Button>
              <Button variant="outline" onClick={loadTickets} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
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
                  placeholder="Search by title or description"
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
                  {statusFilters.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing page {pagination.current_page} of {pagination.total_pages} •{" "}
              {pagination.total} total tickets
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {loadError && tickets.length > 0 ? (
              <ApiErrorState
                error={loadError}
                audience="client"
                resource="support tickets"
                action="load"
                variant="inline"
                className="mb-4"
                onRetry={loadTickets}
              />
            ) : null}
            {renderTableSection()}
          </div>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Raise a Support Ticket
            </DialogTitle>
            <DialogDescription>
              Fill out the form below to submit a new support request. Our team will respond as soon as possible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Brief description of your issue"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="enquiry_type">
                Enquiry Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(createForm.enquiry_type)}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, enquiry_type: Number(value) }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select enquiry type" />
                </SelectTrigger>
                <SelectContent>
                  {enquiryTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={String(createForm.priority)}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({ ...prev, priority: Number(value) }))
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Provide detailed information about your issue..."
                rows={6}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Please provide as much detail as possible to help us assist you better.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-4 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setCreateForm({
                  title: "",
                  enquiry_type: 1,
                  description: "",
                  priority: 1,
                });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTicket}
              disabled={
                isSubmitting ||
                !createForm.title.trim() ||
                !createForm.description.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Submit Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
