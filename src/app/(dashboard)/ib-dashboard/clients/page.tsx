"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  ibRequestsApi,
  type IbSubIb,
  type IbClient,
  type IbRebate,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  RefreshCw,
  Search,
  ArrowLeft,
  Users,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

type TabType = "clients" | "sub-ibs" | "rebates";

export default function IbClientsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useQueryState("tab", {
    parse: (value) => (value === "clients" || value === "sub-ibs" || value === "rebates" ? value : "clients"),
    defaultValue: "clients",
  });

  // Clients state
  const [clients, setClients] = useState<IbClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [clientsPagination, setClientsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  // Sub IBs state
  const [subIbs, setSubIbs] = useState<IbSubIb[]>([]);
  const [subIbsLoading, setSubIbsLoading] = useState(false);
  const [subIbsError, setSubIbsError] = useState<string | null>(null);
  const [subIbsPagination, setSubIbsPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  // Rebates state
  const [rebates, setRebates] = useState<IbRebate[]>([]);
  const [rebatesLoading, setRebatesLoading] = useState(false);
  const [rebatesError, setRebatesError] = useState<string | null>(null);
  const [rebatesPagination, setRebatesPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  // Shared pagination and search
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState("limit", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(search || "");

  // Fetch Clients
  const fetchClients = useCallback(async () => {
    if (!token) {
      setClientsError("Authentication required");
      setClientsLoading(false);
      return;
    }

    try {
      setClientsLoading(true);
      setClientsError(null);
      const response = await ibRequestsApi.getClients(token, {
        page,
        limit,
        search: search || undefined,
      });

      if (response?.data) {
        setClients(response.data.clients || []);
        setClientsPagination(response.data.pagination);
      } else {
        setClientsError("Failed to load clients data");
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setClientsError(err instanceof Error ? err.message : "Failed to load clients");
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, [token, page, limit, search]);

  // Fetch Sub IBs
  const fetchSubIbs = useCallback(async () => {
    if (!token) {
      setSubIbsError("Authentication required");
      setSubIbsLoading(false);
      return;
    }

    try {
      setSubIbsLoading(true);
      setSubIbsError(null);
      const response = await ibRequestsApi.getSubIbs(token, {
        page,
        limit,
        search: search || undefined,
      });

      if (response?.data) {
        setSubIbs(response.data.sub_ibs || []);
        setSubIbsPagination(response.data.pagination);
      } else {
        setSubIbsError("Failed to load Sub IBs data");
      }
    } catch (err) {
      console.error("Failed to fetch Sub IBs:", err);
      setSubIbsError(err instanceof Error ? err.message : "Failed to load Sub IBs");
      setSubIbs([]);
    } finally {
      setSubIbsLoading(false);
    }
  }, [token, page, limit, search]);

  // Fetch Rebates
  const fetchRebates = useCallback(async () => {
    if (!token) {
      setRebatesError("Authentication required");
      setRebatesLoading(false);
      return;
    }

    try {
      setRebatesLoading(true);
      setRebatesError(null);
      const response = await ibRequestsApi.getRebates(token, {
        page,
        limit,
        search: search || undefined,
      });

      if (response?.data) {
        setRebates(response.data.rebates || []);
        setRebatesPagination(response.data.pagination);
      } else {
        setRebatesError("Failed to load rebates data");
      }
    } catch (err) {
      console.error("Failed to fetch rebates:", err);
      setRebatesError(err instanceof Error ? err.message : "Failed to load rebates");
      setRebates([]);
    } finally {
      setRebatesLoading(false);
    }
  }, [token, page, limit, search]);

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "clients") {
      void fetchClients();
    } else if (activeTab === "sub-ibs") {
      void fetchSubIbs();
    } else if (activeTab === "rebates") {
      void fetchRebates();
    }
  }, [activeTab, fetchClients, fetchSubIbs, fetchRebates]);

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, setPage]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput || null);
    setPage(1);
  }, [searchInput, setSearch, setPage]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handlePageChange = (newPage: number, pagination: typeof clientsPagination) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      setPage(newPage);
    }
  };

  const handleRefresh = () => {
    if (activeTab === "clients") {
      void fetchClients();
    } else if (activeTab === "sub-ibs") {
      void fetchSubIbs();
    } else if (activeTab === "rebates") {
      void fetchRebates();
    }
  };

  const isLoading = clientsLoading || subIbsLoading || rebatesLoading;
  const currentPagination =
    activeTab === "clients"
      ? clientsPagination
      : activeTab === "sub-ibs"
        ? subIbsPagination
        : rebatesPagination;

  return (
    <div className="min-h-full w-full bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ib-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Client Summary</h1>
              <p className="text-gray-600 dark:text-gray-400">View your Clients Activities</p>
            </div>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>View your Clients Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
              <TabsList className="mb-6">
                <TabsTrigger value="clients">Clients</TabsTrigger>
                <TabsTrigger value="sub-ibs">Sub IBs</TabsTrigger>
                <TabsTrigger value="rebates">Rebates</TabsTrigger>
              </TabsList>

              {/* Search Bar */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or client ID..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isLoading}>
                  Search
                </Button>
                {search && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchInput("");
                      setSearch(null);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Clients Tab */}
              <TabsContent value="clients" className="space-y-4">
                {clientsError && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">{clientsError}</p>
                  </div>
                )}

                {clientsLoading && clients.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : clients.length > 0 ? (
                  <>
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-900">
                            <TableHead className="font-semibold">Client ID</TableHead>
                            <TableHead className="font-semibold">Client Name</TableHead>
                            <TableHead className="font-semibold text-right">Lots Traded</TableHead>
                            <TableHead className="font-semibold text-right">Pending Rebates</TableHead>
                            <TableHead className="font-semibold text-right">Earned Rebates</TableHead>
                            <TableHead className="font-semibold">Registration Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clients.map((client) => (
                            <TableRow
                              key={client.client_id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <TableCell className="font-mono text-sm">
                                {client.client_id}
                              </TableCell>
                              <TableCell className="font-medium">{client.client_name}</TableCell>
                              <TableCell className="text-right font-medium">
                                {client.lots_traded.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(client.pending_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(client.earned_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(client.registration_date)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {currentPagination.total_pages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {(currentPagination.current_page - 1) * currentPagination.per_page + 1} to{" "}
                          {Math.min(
                            currentPagination.current_page * currentPagination.per_page,
                            currentPagination.total
                          )}{" "}
                          of {currentPagination.total} results
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page - 1, currentPagination)}
                            disabled={currentPagination.current_page === 1 || isLoading}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: currentPagination.total_pages }, (_, i) => i + 1)
                              .filter((pageNum) => {
                                if (pageNum === 1 || pageNum === currentPagination.total_pages) return true;
                                if (
                                  pageNum >= currentPagination.current_page - 1 &&
                                  pageNum <= currentPagination.current_page + 1
                                )
                                  return true;
                                return false;
                              })
                              .map((pageNum, index, array) => {
                                const showEllipsisBefore = index > 0 && pageNum - array[index - 1] > 1;
                                return (
                                  <div key={pageNum} className="flex items-center gap-1">
                                    {showEllipsisBefore && <span className="px-2 text-gray-500">...</span>}
                                    <Button
                                      variant={pageNum === currentPagination.current_page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handlePageChange(pageNum, currentPagination)}
                                      disabled={isLoading}
                                      className="min-w-[2.5rem]"
                                    >
                                      {pageNum}
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page + 1, currentPagination)}
                            disabled={currentPagination.current_page === currentPagination.total_pages || isLoading}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Clients Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {search
                        ? "No clients match your search criteria. Try adjusting your search terms."
                        : "You don't have any clients yet. Your clients will appear here once they register."}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Sub IBs Tab */}
              <TabsContent value="sub-ibs" className="space-y-4">
                {subIbsError && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">{subIbsError}</p>
                  </div>
                )}

                {subIbsLoading && subIbs.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : subIbs.length > 0 ? (
                  <>
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-900">
                            <TableHead className="font-semibold">Client ID</TableHead>
                            <TableHead className="font-semibold">Client Name</TableHead>
                            <TableHead className="font-semibold">Level</TableHead>
                            <TableHead className="font-semibold text-right">Lots Traded</TableHead>
                            <TableHead className="font-semibold text-right">Pending Rebates</TableHead>
                            <TableHead className="font-semibold text-right">Earned Rebates</TableHead>
                            <TableHead className="font-semibold">Registration Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subIbs.map((subIb) => (
                            <TableRow
                              key={subIb.client_id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <TableCell className="font-mono text-sm">
                                {subIb.client_id}
                              </TableCell>
                              <TableCell className="font-medium">{subIb.client_name}</TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  Level {subIb.level}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {subIb.lots_traded.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(subIb.pending_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(subIb.earned_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(subIb.registration_date)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {currentPagination.total_pages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {(currentPagination.current_page - 1) * currentPagination.per_page + 1} to{" "}
                          {Math.min(
                            currentPagination.current_page * currentPagination.per_page,
                            currentPagination.total
                          )}{" "}
                          of {currentPagination.total} results
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page - 1, currentPagination)}
                            disabled={currentPagination.current_page === 1 || isLoading}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: currentPagination.total_pages }, (_, i) => i + 1)
                              .filter((pageNum) => {
                                if (pageNum === 1 || pageNum === currentPagination.total_pages) return true;
                                if (
                                  pageNum >= currentPagination.current_page - 1 &&
                                  pageNum <= currentPagination.current_page + 1
                                )
                                  return true;
                                return false;
                              })
                              .map((pageNum, index, array) => {
                                const showEllipsisBefore = index > 0 && pageNum - array[index - 1] > 1;
                                return (
                                  <div key={pageNum} className="flex items-center gap-1">
                                    {showEllipsisBefore && <span className="px-2 text-gray-500">...</span>}
                                    <Button
                                      variant={pageNum === currentPagination.current_page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handlePageChange(pageNum, currentPagination)}
                                      disabled={isLoading}
                                      className="min-w-[2.5rem]"
                                    >
                                      {pageNum}
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page + 1, currentPagination)}
                            disabled={currentPagination.current_page === currentPagination.total_pages || isLoading}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Sub IBs Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {search
                        ? "No Sub IBs match your search criteria. Try adjusting your search terms."
                        : "You don't have any Sub IBs yet. Your Sub IBs will appear here once they register."}
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Rebates Tab */}
              <TabsContent value="rebates" className="space-y-4">
                {rebatesError && (
                  <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">{rebatesError}</p>
                  </div>
                )}

                {rebatesLoading && rebates.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : rebates.length > 0 ? (
                  <>
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 dark:bg-gray-900">
                            <TableHead className="font-semibold">Client ID</TableHead>
                            <TableHead className="font-semibold">Client Name</TableHead>
                            <TableHead className="font-semibold text-right">Lots Traded</TableHead>
                            <TableHead className="font-semibold text-right">Pending Rebates</TableHead>
                            <TableHead className="font-semibold text-right">Earned Rebates</TableHead>
                            <TableHead className="font-semibold">Registration Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rebates.map((rebate) => (
                            <TableRow
                              key={rebate.client_id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                              <TableCell className="font-mono text-sm">
                                {rebate.client_id}
                              </TableCell>
                              <TableCell className="font-medium">{rebate.client_name}</TableCell>
                              <TableCell className="text-right font-medium">
                                {rebate.lots_traded.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(rebate.pending_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(rebate.earned_rebates, "USD")}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                {formatDate(rebate.registration_date)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {currentPagination.total_pages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Showing {(currentPagination.current_page - 1) * currentPagination.per_page + 1} to{" "}
                          {Math.min(
                            currentPagination.current_page * currentPagination.per_page,
                            currentPagination.total
                          )}{" "}
                          of {currentPagination.total} results
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page - 1, currentPagination)}
                            disabled={currentPagination.current_page === 1 || isLoading}
                          >
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: currentPagination.total_pages }, (_, i) => i + 1)
                              .filter((pageNum) => {
                                if (pageNum === 1 || pageNum === currentPagination.total_pages) return true;
                                if (
                                  pageNum >= currentPagination.current_page - 1 &&
                                  pageNum <= currentPagination.current_page + 1
                                )
                                  return true;
                                return false;
                              })
                              .map((pageNum, index, array) => {
                                const showEllipsisBefore = index > 0 && pageNum - array[index - 1] > 1;
                                return (
                                  <div key={pageNum} className="flex items-center gap-1">
                                    {showEllipsisBefore && <span className="px-2 text-gray-500">...</span>}
                                    <Button
                                      variant={pageNum === currentPagination.current_page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => handlePageChange(pageNum, currentPagination)}
                                      disabled={isLoading}
                                      className="min-w-[2.5rem]"
                                    >
                                      {pageNum}
                                    </Button>
                                  </div>
                                );
                              })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPagination.current_page + 1, currentPagination)}
                            disabled={currentPagination.current_page === currentPagination.total_pages || isLoading}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Rebates Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {search
                        ? "No rebates match your search criteria. Try adjusting your search terms."
                        : "You don't have any rebates yet. Your rebates will appear here once clients start trading."}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
