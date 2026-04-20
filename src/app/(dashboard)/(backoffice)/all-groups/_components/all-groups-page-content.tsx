"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Search, Users } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { adminGroupsApi, type AdminGroupItem } from "@/lib/api";

function normalizeGroups(groups?: AdminGroupItem[]) {
  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name ?? "",
  }));
}

function GroupsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[120px_1fr] gap-4 rounded-md border p-3">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-full max-w-sm" />
        </div>
      ))}
    </div>
  );
}

export function AllGroupsPageContent() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");

  const {
    data: groupsResponse,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin-groups", token],
    queryFn: async () => {
      const response = await adminGroupsApi.list(token!);
      return normalizeGroups(response.data);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const groups = useMemo(() => groupsResponse ?? [], [groupsResponse]);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      return group.name.toLowerCase().includes(query) || String(group.id).includes(query);
    });
  }, [groups, search]);

  return (
    <ProtectedRoute>
      <div className="container mx-auto space-y-6 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">All Groups</h1>
                <p className="text-sm text-muted-foreground">
                  View the trading groups available for account setup.
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Group List</CardTitle>
              <CardDescription>Search by group name or ID.</CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {filteredGroups.length} of {groups.length} groups
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups"
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <GroupsTableSkeleton />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">ID</TableHead>
                      <TableHead>Group Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{group.id}</TableCell>
                          <TableCell>{group.name}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          No groups found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
