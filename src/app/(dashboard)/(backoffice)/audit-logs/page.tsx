"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { useAuth } from "@/contexts/auth-context";
import { adminAuditLogsApi, type AuditLogItem } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { Calendar, ClipboardList, RefreshCw } from "lucide-react";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { format } from "date-fns";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";


/* ---------------- Helpers ---------------- */
const formatDateTime = (dateString: string) => {
  try {
    return formatApiDateTimeAsIST(dateString);
  } catch {
    return dateString;
  }
};

const formatEntityLabel = (entity: string) => {
  if (entity === "kyc") return "KYC";
  if (entity === "usdt_deposit") return "USDT Deposit";
  if (entity === "mt5_account") return "MT5 Account";
  if (entity === "user_2fa") return "User 2FA";
  return entity
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};


const getActorTypeBadge = (actorType: string) => {
  switch (actorType) {
    case "admin":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Admin
        </Badge>
      );
    case "manager":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          Manager
        </Badge>
      );
    case "user":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          User
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {actorType}
        </Badge>
      );
  }
};

/* ---------------- Page ---------------- */
export default function AuditLogsPage() {
  const { token } = useAuth();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  
  // URL sync query parameters
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [actorType, setActorType] = useQueryState("actor_type", parseAsString);
  const [entity, setEntity] = useQueryState("entity", parseAsString);
  const [action, setAction] = useQueryState("action", parseAsString);
  const [actorId, setActorId] = useQueryState("actor_id", parseAsString);
  const [fromDateStr, setFromDateStr] = useQueryState("from_date", parseAsString);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  const [search, setSearch] = useQueryState("search", parseAsString);

  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  // Sync date state with query params
  useEffect(() => {
    if (fromDateStr) {
      const parsed = new Date(fromDateStr);
      if (!isNaN(parsed.getTime())) {
        setFromDate(parsed);
      }
    } else {
      setFromDate(undefined);
    }
  }, [fromDateStr]);

  useEffect(() => {
    if (toDateStr) {
      const parsed = new Date(toDateStr);
      if (!isNaN(parsed.getTime())) {
        setToDate(parsed);
      }
    } else {
      setToDate(undefined);
    }
  }, [toDateStr]);

  // Update query params when dates change
  useEffect(() => {
    if (fromDate) {
      setFromDateStr(format(fromDate, "yyyy-MM-dd"));
    } else {
      setFromDateStr(null);
    }
  }, [fromDate, setFromDateStr]);

  useEffect(() => {
    if (toDate) {
      setToDateStr(format(toDate, "yyyy-MM-dd"));
    } else {
      setToDateStr(null);
    }
  }, [toDate, setToDateStr]);

  const [availableEntities, setAvailableEntities] = useState<string[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const loadEntities = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingEntities(true);
      const response = await adminAuditLogsApi.entities(token);
      if (response && response.success && Array.isArray(response.data)) {
        setAvailableEntities(response.data);
      } else {
        // Fallback entities list in case of API failure/unwrapped format
        const resObj = response as unknown as { success?: boolean; data?: string[] };
        if (resObj && Array.isArray(resObj.data)) {
          setAvailableEntities(resObj.data);
        } else {
          setAvailableEntities([
            "account_type",
            "bank_deposit",
            "bank_detail",
            "bonus",
            "broker_bank",
            "broker_crypto_wallet",
            "currency_rate",
            "deposit",
            "ib_hierarchy",
            "ib_request",
            "ib_user_direct_rates",
            "internal_transfer",
            "kyc",
            "mt5_account",
            "transaction",
            "usdt_deposit",
            "user",
            "user_2fa",
            "withdrawal"
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading audit logs entities:", error);
      setAvailableEntities([
        "account_type",
        "bank_deposit",
        "bank_detail",
        "bonus",
        "broker_bank",
        "broker_crypto_wallet",
        "currency_rate",
        "deposit",
        "ib_hierarchy",
        "ib_request",
        "ib_user_direct_rates",
        "internal_transfer",
        "kyc",
        "mt5_account",
        "transaction",
        "usdt_deposit",
        "user",
        "user_2fa",
        "withdrawal"
      ]);
    } finally {
      setLoadingEntities(false);
    }
  }, [token]);

  useEffect(() => {
    void loadEntities();
  }, [loadEntities]);



  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  // Local filter inputs to allow search trigger
  const [actionInput, setActionInput] = useState(action || "");
  const [searchInput, setSearchInput] = useState(search || "");

  // Sync local inputs when query state changes (e.g. reset or back navigation)
  useEffect(() => {
    setActionInput(action || "");
  }, [action]);

  useEffect(() => {
    setSearchInput(search || "");
  }, [search]);

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setLoadError(null);
      
      const response = await adminAuditLogsApi.list({
        token,
        page,
        per_page: perPage,
        actor_type: actorType || undefined,
        entity: entity || undefined,
        action: action || undefined,
        actor_id: actorId || undefined,
        from_date: fromDateStr || undefined,
        to_date: toDateStr || undefined,
        search: search || undefined,
      });

      const resObj = response as unknown as {
        success?: boolean;
        message?: string;
        data?: {
          data?: AuditLogItem[];
          current_page?: number;
          per_page?: number;
          total?: number;
          last_page?: number;
        };
      };
      const isWrapped =
        resObj &&
        resObj.success === true &&
        resObj.data &&
        typeof resObj.data === "object" &&
        Array.isArray(resObj.data.data);

      const payload = isWrapped
        ? resObj.data
        : (resObj as unknown as {
            data?: AuditLogItem[];
            current_page?: number;
            per_page?: number;
            total?: number;
            last_page?: number;
          });

      if (payload && Array.isArray(payload.data)) {
        setLogs(payload.data);
        setPagination({
          current_page: payload.current_page ?? 1,
          per_page: payload.per_page ?? 10,
          total: payload.total ?? 0,
          total_pages: payload.last_page ?? 1,
        });
      } else {
        const failure = (resObj && resObj.message) || "Failed to load audit logs";
        setLoadError(failure);
        toast.error(
          getAdminFriendlyErrorMessage(failure, {
            resource: "audit logs",
            action: "load",
          })
        );
        setLogs([]);
      }
    } catch (error) {
      console.error("Error loading audit logs:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "audit logs", action: "load" })
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, actorType, entity, action, actorId, fromDateStr, toDateStr, search]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const handleApplyFilters = useCallback(() => {
    setPage(1);
    setAction(actionInput.trim() || null);
  }, [actionInput, setPage, setAction]);

  const handleResetFilters = useCallback(() => {
    setPage(1);
    setActorType(null);
    setEntity(null);
    setAction(null);
    setActionInput("");
    setSearch(null);
    setSearchInput("");
    setFromDate(undefined);
    setToDate(undefined);
    setFromDateStr(null);
    setToDateStr(null);
  }, [setPage, setActorType, setEntity, setAction, setSearch, setFromDateStr, setToDateStr]);

  const columns: ColumnDef<AuditLogItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} />
        ),
      },
      {
        id: "actor",
        header: "Actor",
        cell: ({ row }) => {
          const { actor_email, actor_type, actor_id } = row.original;
          return (
            <div className="space-y-1">
              <div className="font-medium text-sm">{actor_email || "—"}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                {getActorTypeBadge(actor_type)}
                {/* <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                  ID: {actor_id || "—"}
                </span> */}
              </div>
            </div>
          );
        },
      },
      {
        id: "user_email",
        header: "User Email",
        accessorKey: "user_email",
        cell: ({ row }) => (
          <span className="font-medium text-sm">
            {row.original.user_email || "—"}
          </span>
        ),
      },
      {
        id: "entity",
        header: "Entity",
        cell: ({ row }) => {
          const { entity, entity_id } = row.original;
          return (
            <div className="space-y-0.5">
              <div className="font-medium text-sm">{entity || "—"}</div>
              {/* {entity_id && (
                <div className="font-mono text-[10px] text-muted-foreground">ID: {entity_id}</div>
              )} */}
            </div>
          );
        },
      },
      {
        id: "description",
        header: "Description",
        accessorKey: "description",
        cell: ({ row }) => (
          <ViewContentDialog
            content={row.original.description}
            title="Audit Log Description"
            description="Full description of this audit event"
            triggerLabel="View"
            emptyLabel="—"
          />
        ),
      },
      {
        id: "ip_address",
        header: "IP Address",
        accessorKey: "ip_address",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.ip_address || "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Created At",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{formatDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    []
  );

  if (loadError && logs.length === 0) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="audit logs"
          action="load"
          onRetry={() => {
            void loadAuditLogs();
          }}
        />
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <ListPageSkeleton
        statsCount={0}
        actionCount={2}
        columnCount={7}
        rowCount={10}
        filterPillCount={4}
        showFilterPanel
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <ClipboardList className="h-6 w-6 text-primary" />
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              View system audit logs, actions, and history across all entity records
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void loadAuditLogs()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
            <ApiSearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={(value) => {
                void setSearch(value || null);
                void setPage(1);
              }}
              placeholder="Search by name or email"
              minimumLength={2}
              delay={300}
            />
            <Select
              value={actorType || "all"}
              onValueChange={(value) => {
                setPage(1);
                setActorType(value === "all" ? null : value);
              }}
            >
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue placeholder="Actor Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actor Types</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={entity || "all"}
              onValueChange={(value) => {
                setPage(1);
                setEntity(value === "all" ? null : value);
              }}
              disabled={loadingEntities}
            >
              <SelectTrigger className="h-9 w-[200px] text-sm">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                <SelectItem value="all">All Entities</SelectItem>
                {availableEntities.map((ent) => (
                  <SelectItem key={ent} value={ent}>
                    {formatEntityLabel(ent)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="action-filter"
              placeholder="Action (e.g. bank_detail.verify)"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              className="h-9 w-[220px] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyFilters();
                }
              }}
            />
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={(date) => {
                setFromDate(date);
                setPage(1);
              }}
              onToDateChange={(date) => {
                setToDate(date);
                setPage(1);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear Filters
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Page {pagination.current_page} of{" "}
            {Math.max(1, pagination.total_pages)} - {perPage} entries per page
            {" "}- {pagination.total} total records
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <AppDataTable<AuditLogItem>
            data={logs}
            columns={columns}
            pageCount={pagination.total_pages}
            advanced
          />
        </div>
      </div>
    </div>
  );
}
