"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryState, parseAsInteger } from "nuqs";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Network,
  RefreshCw,
  Search,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { AccessDeniedPanel } from "@/components/errors/access-denied-panel";
import { ClientTablePageSkeleton } from "@/components/loading/client-page-skeletons";
import { Button } from "@/components/ui/button";
import {
  IbPageHeader,
  IbPageShell,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { useAuth } from "@/contexts/auth-context";
import { ApiRequestError } from "@/lib/api";
import {
  fetchClientUsersByLevel,
  NODE_H,
  NODE_W,
  levelColor,
  levelToDepth,
  type UserByLevel,
} from "@/lib/downline-tree";
import { paginatedNodeTypes } from "@/app/(dashboard)/(backoffice)/ib-users/_components/paginated-team-node";

type NodeRecord = {
  sponsorId: string;
  username: string;
  email?: string;
  depth: number;
  isRoot?: boolean;
  userId?: number;
  isIb?: boolean;
  planName?: string;
};

type TeamGraphNode = Node<
  {
    sponsorId: string;
    username: string;
    email?: string;
    level: number | string;
    isRoot?: boolean;
    userId?: number;
    isIb?: boolean;
    planName?: string;
  },
  "teamNode"
>;
type TeamGraphEdge = Edge;

const useIsDark = () => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

export default function IbTeamTreePage() {
  const { token } = useAuth();

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState("limit", parseAsInteger.withDefault(20));

  const [nodesById, setNodesById] = useState<Record<string, NodeRecord>>({});
  const [edges, setEdges] = useState<Array<{ source: string; target: string }>>([]);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const loadTree = useCallback(async () => {
    if (!token) {
      setLoadError(new Error("Authentication required"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setNodesById({});
    setEdges([]);

    try {
      const data = await fetchClientUsersByLevel(token, {
        page,
        page_size: limit,
        throwOnError: true,
      });

      if (!data) {
        setLoadError(new Error("Failed to load downline tree"));
        setLoading(false);
        return;
      }

      const ibUser = data.ib_user || data.specified_user;
      const usersByLevel = data.users_by_level || {};
      const pagination = data.pagination;

      if (!ibUser) {
        setLoading(false);
        setLoadError(new Error("IB user information not found"));
        return;
      }

      setUserName(ibUser.name);
      setTotalPages(
        pagination?.total_pages && pagination.total_pages > 0
          ? pagination.total_pages
          : 1,
      );

      const rootId =
        "sponsor_id" in ibUser && ibUser.sponsor_id
          ? ibUser.sponsor_id
          : `user_${ibUser.id}`;
      const root: NodeRecord = {
        sponsorId: rootId,
        username: ibUser.name,
        email: ibUser.email,
        depth: 0,
        isRoot: true,
        userId: ibUser.id,
        isIb: true,
        planName:
          "plan_name" in ibUser && ibUser.plan_name
            ? ibUser.plan_name
            : undefined,
      };

      const nextNodes: Record<string, NodeRecord> = { [rootId]: root };
      const nextEdges: Array<{ source: string; target: string }> = [];

      const allUsers: UserByLevel[] = [];
      Object.values(usersByLevel).forEach((users) => {
        if (Array.isArray(users)) allUsers.push(...users);
      });

      if (allUsers.length > 0) {
        const userMap = new Map<string, UserByLevel>();
        allUsers.forEach((user) => {
          const uid = user.sponsor_id || `user_${user.id}`;
          userMap.set(uid, user);
        });

        allUsers.forEach((user) => {
          const uid = user.sponsor_id || `user_${user.id}`;
          const depth = levelToDepth(user.level);

          if (!nextNodes[uid]) {
            nextNodes[uid] = {
              sponsorId: uid,
              username: user.name,
              email: user.email,
              depth,
              userId: user.id,
              isIb: !!user.plan_name,
              planName: user.plan_name,
            };
          }

          let parentId: string | null = null;
          if (user.sponsor_by) {
            if (user.sponsor_by === rootId) {
              parentId = rootId;
            } else {
              for (const [id, u] of userMap.entries()) {
                if (u.sponsor_id === user.sponsor_by || id === user.sponsor_by) {
                  parentId = id;
                  break;
                }
              }
              if (!parentId && "sponsor_id" in root && user.sponsor_by === root.sponsorId) {
                parentId = rootId;
              }
            }
          }

          if (!parentId && user.sponsor_by) parentId = rootId;
          const effectiveParent = parentId || rootId;
          const edgeKey = `${effectiveParent}->${uid}`;
          if (!nextEdges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
            nextEdges.push({ source: effectiveParent, target: uid });
          }
        });
      }

      setNodesById(nextNodes);
      setEdges(nextEdges);
    } catch (error) {
      console.error("Failed to load client downline tree:", error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit]);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  // Dagre layout
  const rfNodes = useMemo<TeamGraphNode[]>(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    Object.values(nodesById).forEach((n) => {
      g.setNode(n.sponsorId, { width: NODE_W, height: NODE_H + 40 });
    });
    edges.forEach((e) => g.setEdge(e.source, e.target));

    dagre.layout(g);

    return Object.values(nodesById).map((n) => {
      const { x, y } = g.node(n.sponsorId) || { x: 0, y: 0 };
      return {
        id: n.sponsorId,
        type: "teamNode" as const,
        position: { x: x - NODE_W / 2, y: y - (NODE_H + 40) / 2 },
        draggable: false,
        selectable: false,
        data: {
          sponsorId: n.sponsorId,
          username: n.username,
          email: n.email,
          level: n.depth === 0 ? "Level-IB" : `Level-${n.depth}`,
          isRoot: n.isRoot,
          userId: undefined,
          isIb: n.isIb,
          planName: n.planName,
        },
        style: { width: NODE_W, height: NODE_H + 40, pointerEvents: "all" },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });
  }, [nodesById, edges]);

  const rfEdges = useMemo<TeamGraphEdge[]>(
    () =>
      edges.map((e) => {
        const child = nodesById[e.target];
        const color = levelColor(child?.depth || 1);
        return {
          id: `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          type: "smoothstep",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
          style: { stroke: color, strokeWidth: 1.6, opacity: 0.95 },
        };
      }),
    [edges, nodesById],
  );

  function GraphCanvas({
    nodes,
    edges,
  }: {
    nodes: TeamGraphNode[];
    edges: TeamGraphEdge[];
  }) {
    const [query, setQuery] = useState("");
    const isDark = useIsDark();
    const rf = useReactFlow<TeamGraphNode, TeamGraphEdge>();

    const focusNode = useCallback(
      (needle: string) => {
        const term = needle.trim().toLowerCase();
        if (!term) return;
        const target = nodes.find(
          (n) =>
            n.data.username.toLowerCase().includes(term) ||
            (n.data.email ?? "").toLowerCase().includes(term),
        );
        if (target) {
          rf.setCenter(
            target.position.x + NODE_W / 2,
            target.position.y + (NODE_H + 40) / 2,
            { zoom: 1.1, duration: 600 },
          );
        } else {
          toast("No matching user on the graph", {
            icon: <Search className="h-4 w-4" />,
          });
        }
      },
      [nodes, rf],
    );

    const defaultEdgeOptions = useMemo(
      () => ({
        type: "smoothstep" as const,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: "#475569",
        },
        style: { stroke: "#475569", strokeWidth: 1.6 },
      }),
      [],
    );

    return (
      <div className="h-[calc(100vh-280px)] w-full bg-background rf-skin">
        <style jsx global>{`
          .rf-skin .react-flow__controls {
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: 0.5rem;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
            overflow: hidden;
          }
          .rf-skin .react-flow__controls-button {
            background: hsl(var(--muted));
            border-top: 1px solid hsl(var(--border));
            color: hsl(var(--foreground));
          }
          .rf-skin .react-flow__controls-button:hover {
            background: hsl(var(--muted) / 0.7);
          }
          .rf-skin .react-flow__controls-button svg {
            fill: currentColor;
            color: currentColor;
          }
          .rf-skin .react-flow__minimap {
            background: hsl(var(--card)) !important;
            border: 1px solid hsl(var(--border)) !important;
            border-radius: 0.5rem !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          }
        `}</style>

        <ReactFlow<TeamGraphNode, TeamGraphEdge>
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodeTypes={paginatedNodeTypes}
          nodesDraggable={false}
          elementsSelectable={false}
          defaultEdgeOptions={defaultEdgeOptions}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}
          />
          <MiniMap
            nodeColor={(n) => {
              const d = (n as TeamGraphNode).data;
              if (d?.isRoot) return "#0ea5e9";
              const levelNum =
                typeof d?.level === "string"
                  ? levelToDepth(d.level)
                  : d?.level || 1;
              return levelColor(levelNum);
            }}
            maskColor={isDark ? "rgba(2,6,23,0.35)" : "rgba(15,23,42,0.12)"}
            style={{ width: 220, height: 140 }}
          />
          <Controls
            position="bottom-right"
            className="border border-border bg-card/95 rounded-md"
          />
          <Panel
            position="top-left"
            className="rounded-lg bg-card/90 border border-border backdrop-blur px-3 py-2 shadow text-foreground"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Team - {userName}</span>
            </div>
          </Panel>
          <Panel
            position="top-right"
            className="rounded-lg bg-card/90 border border-border backdrop-blur px-3 py-2 shadow space-y-2 text-foreground"
          >
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-44 rounded border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Find username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && focusNode(query)}
              />
              <button
                className="h-8 rounded bg-sky-600 dark:bg-sky-500 px-3 text-white text-sm hover:bg-sky-700 dark:hover:bg-sky-600"
                onClick={() => focusNode(query)}
              >
                Go
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500 ring-1 ring-amber-400/40" />
                Partner
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                Client
              </span>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    );
  }

  const handlePerPageChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  if (loadError && Object.keys(nodesById).length === 0) {
    const isForbidden =
      loadError instanceof ApiRequestError && loadError.status === 403;
    return (
      <IbPageShell>
        <IbSectionCard title="Team tree" description="Your downline team structure">
          {isForbidden ? (
            <AccessDeniedPanel
              title="Access restricted"
              message="Your account does not have permission to view the level / tree chart."
              showBackButton={false}
            />
          ) : (
            <ApiErrorState
              error={loadError}
              audience="client"
              variant="panel"
              resource="downline tree"
              action="load"
              showStatusCode
              onRetry={() => void loadTree()}
            />
          )}
        </IbSectionCard>
      </IbPageShell>
    );
  }

  if (loading && Object.keys(nodesById).length === 0) {
    return (
      <IbPageShell>
        <ClientTablePageSkeleton />
      </IbPageShell>
    );
  }

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="My Team"
        title="Team tree"
        description={
          userName
            ? `Downline structure under ${userName}`
            : "Downline structure of your team"
        }
        actions={
          <Button
            variant="outline"
            onClick={() => void loadTree()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Pagination toolbar */}
      <IbSectionCard
        title="Team overview"
        description="Use the controls to page through your team and zoom the chart."
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="h-4 w-4" />
            <span>
              Page {page} of {totalPages} ({Object.keys(nodesById).length} members on this page)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={limit}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
            >
              {[10, 20, 30, 50, 100].map((opt) => (
                <option key={opt} value={opt}>
                  {opt} per page
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card text-card-foreground shadow-sm p-4">
          <ReactFlowProvider>
            <GraphCanvas nodes={rfNodes} edges={rfEdges} />
          </ReactFlowProvider>
        </div>
      </IbSectionCard>
    </IbPageShell>
  );
}
