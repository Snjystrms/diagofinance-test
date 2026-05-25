'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import toast from 'react-hot-toast';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { BackofficeDetailDialogSkeleton } from '@/components/loading/backoffice-page-skeletons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Edit, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE_URL, adminIbUserCommissionsApi, type UserCommission, type UserCommissionResponse } from '@/lib/api';
import { getAdminFriendlyErrorMessage } from '@/lib/admin-friendly-errors';
import { nodeTypes } from './team-node';
import { formatDateTimeInIST } from '@/lib/formatters';
import { fetchUsersByLevel, NODE_H, NODE_W, levelColor, levelToDepth, toastNoDownline, type UserByLevel, type UsersByLevelResponse } from '@/lib/downline-tree';
import type { GraphEdge, GraphNode, NodeRecord, TeamNodeData } from '../_types';
import { useIsDark } from '../_hooks/use-is-dark';

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

const USD_COMMISSION_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatCommissionAmount = (value?: number | null) => {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return USD_COMMISSION_FORMATTER.format(amount);
};

type DownlineTreePageContentProps = {
  userId?: number | null;
  onBack?: () => void;
  backHref?: string;
  backLabel?: string;
};

export function DownlineTreePageContent({
  userId: userIdProp,
  onBack,
  backHref = '/set-ib-commission',
  backLabel = 'Back to Set IB Commission',
}: DownlineTreePageContentProps = {}) {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const routeUserId = params?.userId ? parseInt(String(params.userId), 10) : null;
  const userId = userIdProp ?? routeUserId;

  const [nodesById, setNodesById] = useState<Record<string, NodeRecord>>({});
  const [edges, setEdges] = useState<Array<{ source: string; target: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [userName, setUserName] = useState<string>('');
  const [reloadKey, setReloadKey] = useState(0);

  // Commission dialog state
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [commissionData, setCommissionData] = useState<UserCommissionResponse["data"] | null>(null);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [editingCommission, setEditingCommission] = useState<UserCommission | null>(null);
  const [editedCommissions, setEditedCommissions] = useState<Record<number, Partial<UserCommission>>>({});
  const [savingCommission, setSavingCommission] = useState<number | null>(null);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    router.push(backHref);
  }, [backHref, onBack, router]);

  // ============ data fetching ============
  const fetchDownlineUsers = useCallback(
    async (targetUserId: number) => {
      if (!token) return null;
      return fetchUsersByLevel(targetUserId, token);
    },
    [token]
  );

  // bootstrap: load initial user and their downline
  useEffect(() => {
    if (!userId || !token) return;
    
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      setNodesById({});
      setEdges([]);
      setExpanded({});
      setHighlightId(null);

      const data = await fetchDownlineUsers(userId);
      if (!mounted || !data) {
        if (!data) {
          setLoadError(new Error("Failed to load downline tree"));
        }
        setLoading(false);
        return;
      }

      // Extract IB user as root
      const ibUser = data.ib_user || data.specified_user;
      const usersByLevel = data.users_by_level || {};

      if (!ibUser) {
        setLoading(false);
        setLoadError(new Error("IB user information not found"));
        toast.error('IB user information not found');
        return;
      }

      setUserName(ibUser.name);

      // Build root node
      const rootId = ibUser.sponsor_id || `user_${ibUser.id}`;
      const root: NodeRecord = {
        sponsorId: rootId,
        username: ibUser.name,
        packageSum: 0,
        totalBV: 0,
        status: 1,
        depth: 0,
        isRoot: true,
        userId: ibUser.id,
        isIb: true,
      };

      const nextNodes: Record<string, NodeRecord> = { [rootId]: root };
      const nextEdges: Array<{ source: string; target: string }> = [];

      // Collect all users from all levels
      const allUsers: UserByLevel[] = [];
      Object.values(usersByLevel).forEach((users) => {
        if (Array.isArray(users)) {
          allUsers.push(...users);
        }
      });

      if (allUsers.length === 0) {
        setNodesById(nextNodes);
        setEdges(nextEdges);
        setExpanded((e) => ({ ...e, [rootId]: true }));
        setLoading(false);
        toastNoDownline(ibUser.name);
        return;
      }

      // Build a map of users by their identifier
      const userMap = new Map<string, UserByLevel>();
      allUsers.forEach((user) => {
        const userId = user.sponsor_id || `user_${user.id}`;
        userMap.set(userId, user);
      });

      // Build nodes and edges based on sponsor_by relationships
      allUsers.forEach((user) => {
        const userId = user.sponsor_id || `user_${user.id}`;
        const depth = levelToDepth(user.level);

        // Create node
        if (!nextNodes[userId]) {
          nextNodes[userId] = {
            sponsorId: userId,
            username: user.name,
            packageSum: 0,
            totalBV: 0,
            status: 1,
            depth,
            isRoot: false,
            userId: user.id,
            isIb: !!user.ib_name,
          };
        }

        // Create edge based on sponsor_by
        if (user.sponsor_by) {
          let parentId: string | null = null;
          
          if (user.sponsor_by === rootId) {
            parentId = rootId;
          } else {
            for (const [id, u] of userMap.entries()) {
              if (u.sponsor_id === user.sponsor_by || id === user.sponsor_by) {
                parentId = id;
                break;
              }
            }
            if (!parentId && user.sponsor_by === ibUser.sponsor_id) {
              parentId = rootId;
            }
          }

          if (parentId) {
            if (!nextNodes[parentId] && parentId !== rootId) {
              const parentUser = userMap.get(parentId);
              if (parentUser) {
                const parentDepth = levelToDepth(parentUser.level);
                nextNodes[parentId] = {
                  sponsorId: parentId,
                  username: parentUser.name,
                  packageSum: 0,
                  totalBV: 0,
                  status: 1,
                  depth: parentDepth,
                  isRoot: false,
                  userId: parentUser.id,
                  isIb: !!parentUser.ib_name,
                };
              }
            }

            const edgeKey = `${parentId}->${userId}`;
            if (!nextEdges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
              nextEdges.push({ source: parentId, target: userId });
            }
          }
        } else {
          const edgeKey = `${rootId}->${userId}`;
          if (!nextEdges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
            nextEdges.push({ source: rootId, target: userId });
          }
        }
      });

      setNodesById(nextNodes);
      setEdges(nextEdges);
      setExpanded((e) => ({ ...e, [rootId]: true }));
      setLoading(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, [fetchDownlineUsers, reloadKey, token, userId]);

  // expand a node IN PLACE - fetch deeper levels
  const expandSponsor = useCallback(
    async (sponsorId: string) => {
      if (expanded[sponsorId]) return;

      const parent = nodesById[sponsorId];
      if (!parent) return;

      const userIdMatch = sponsorId.match(/user_(\d+)/);
      const targetUserId = userIdMatch ? parseInt(userIdMatch[1], 10) : null;
      
      if (!targetUserId) {
        const node = Object.values(nodesById).find((n) => n.sponsorId === sponsorId);
        if (!node) {
          toast.error('Cannot expand: user ID not found');
          return;
        }
        setExpanded((e) => ({ ...e, [sponsorId]: true }));
        return;
      }

      setHighlightId(sponsorId);
      const data = await fetchDownlineUsers(targetUserId);
      if (!data) {
        setHighlightId(null);
        return;
      }

      const usersByLevel = data.users_by_level || {};
      const allUsers: UserByLevel[] = [];
      Object.values(usersByLevel).forEach((users) => {
        if (Array.isArray(users)) {
          allUsers.push(...users);
        }
      });

      if (allUsers.length === 0) {
        toastNoDownline(parent.username || sponsorId);
        setExpanded((e) => ({ ...e, [sponsorId]: true }));
        setTimeout(() => setHighlightId((id) => (id === sponsorId ? null : id)), 500);
        return;
      }

      const userMap = new Map<string, UserByLevel>();
      allUsers.forEach((user) => {
        const userId = user.sponsor_id || `user_${user.id}`;
        userMap.set(userId, user);
      });

      setNodesById((prev) => {
        const copy = { ...prev };
        for (const user of allUsers) {
          const id = user.sponsor_id || `user_${user.id}`;
          if (!copy[id]) {
            const depth = levelToDepth(user.level);
            copy[id] = {
              sponsorId: id,
              username: user.name,
              packageSum: 0,
              totalBV: 0,
              status: 1,
              depth: (parent.depth ?? 0) + depth,
              userId: user.id,
              isIb: !!user.ib_name,
            };
          }
        }
        return copy;
      });

      setEdges((prev) => {
        const asSet = new Set(prev.map((e) => `${e.source}->${e.target}`));
        const appended: Array<{ source: string; target: string }> = [];
        
        for (const user of allUsers) {
          const id = user.sponsor_id || `user_${user.id}`;
          if (user.sponsor_by === sponsorId || user.sponsor_by === parent.sponsorId) {
            const key = `${sponsorId}->${id}`;
            if (!asSet.has(key)) {
              appended.push({ source: sponsorId, target: id });
              asSet.add(key);
            }
          }
        }
        return [...prev, ...appended];
      });

      setExpanded((e) => ({ ...e, [sponsorId]: true }));
      setTimeout(() => setHighlightId((id) => (id === sponsorId ? null : id)), 1500);
    },
    [expanded, nodesById, fetchDownlineUsers]
  );

  // Load user commissions
  const loadUserCommissions = useCallback(async (targetUserId: string | number) => {
    if (!token || !targetUserId) {
      return false;
    }

    try {
      setLoadingCommissions(true);
      setSelectedUserId(targetUserId);
      setCommissionData(null);
      setCommissionDialogOpen(true);
      setEditedCommissions({});
      setEditingCommission(null);
      const response = await adminIbUserCommissionsApi.getUserCommissions(targetUserId, token);
      
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

  const renderCommissionAmountInput = (
    commissionId: number,
    field: keyof UserCommission,
    value?: number | null,
  ) => {
    const normalizedValue =
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          step="1"
          min="1"
          value={normalizedValue.toFixed(2)}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
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

  // Handle node click for commission view
  const handleNodeClickForCommission = useCallback((nodeData: TeamNodeData) => {
    if (nodeData.userId) {
      void loadUserCommissions(nodeData.userId);
    } else {
      toast.error("User ID not available for this node");
    }
  }, [loadUserCommissions]);

  /* ======================== Build RF nodes/edges with auto layout ======================== */

  const { rfNodes, rfEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 110 });
    g.setDefaultEdgeLabel(() => ({}));

    Object.values(nodesById).forEach((n) => {
      g.setNode(n.sponsorId, { width: NODE_W, height: NODE_H });
    });

    edges.forEach((e) => g.setEdge(e.source, e.target));

    dagre.layout(g);

    const rfNodes: GraphNode[] = Object.values(nodesById).map((n) => {
      const { x, y } = g.node(n.sponsorId) || { x: 0, y: 0 };
      return {
        id: n.sponsorId,
        type: 'teamNode',
        position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
        draggable: false,
        selectable: true,
        data: {
          sponsorId: n.sponsorId,
          username: n.username,
          packageSum: n.packageSum,
          totalBV: n.totalBV ?? 0,
          level: n.depth === 0 ? 'IB' : `Level-${n.depth}`,
          status: n.status ?? 1,
          isRoot: n.isRoot,
          highlighted: highlightId === n.sponsorId,
          userId: n.userId,
          isIb: n.isIb,
        },
        style: { width: NODE_W, height: NODE_H },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      };
    });

    const rfEdges: GraphEdge[] = edges.map((e) => {
      const child = nodesById[e.target];
      const color = levelColor(child?.depth || 1);
      return {
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
        style: { stroke: color, strokeWidth: 1.6, opacity: 0.95 },
      };
    });

    return { rfNodes, rfEdges };
  }, [nodesById, edges, highlightId]);

  /* ======================== Canvas ======================== */

  function GraphCanvas({
    nodes,
    edges,
    onExpand,
    onNodeClickForCommission,
  }: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onExpand: (sponsorId: string) => void;
    onNodeClickForCommission: (nodeData: TeamNodeData) => void;
  }) {
    const [query, setQuery] = useState('');
    const isDark = useIsDark();
    const rf = useReactFlow<GraphNode, GraphEdge>();

    const focusNode = useCallback(
      (needle: string) => {
        const term = needle.trim().toLowerCase();
        if (!term) return;
        const target = nodes.find((n) =>
          (n.data as TeamNodeData).username.toLowerCase().includes(term)
        );
        if (target) {
          rf.setCenter(target.position.x + NODE_W / 2, target.position.y + NODE_H / 2, {
            zoom: 1.1,
            duration: 600,
          });
        } else {
          toast('No matching user on the graph', { icon: '??' });
        }
      },
      [nodes, rf]
    );

    const defaultEdgeOptions = useMemo(
      () => ({
        type: 'smoothstep' as const,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#475569' },
        style: { stroke: '#475569', strokeWidth: 1.6 },
      }),
      []
    );

    return (
      <div className="h-[calc(100vh-200px)] w-full bg-background rf-skin">
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

        <ReactFlow<GraphNode, GraphEdge>
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodeClick={(_, node) => {
            const d = node.data as TeamNodeData;
            // Show commission dialog on node click
            onNodeClickForCommission(d);
          }}
          onNodeDoubleClick={(_, node) => {
            // Expand on double click
            const d = node.data as TeamNodeData;
            onExpand(d.sponsorId);
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={18}
            size={1}
            color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
          />

          <MiniMap
            nodeColor={(n) => {
              const d = (n as GraphNode).data as TeamNodeData;
              if (d?.isRoot) return '#0ea5e9';
              const levelNum = typeof d?.level === 'string' ? levelToDepth(d.level) : (d?.level || 1);
              return levelColor(levelNum);
            }}
            maskColor={isDark ? 'rgba(2,6,23,0.35)' : 'rgba(15,23,42,0.12)'}
            style={{ width: 220, height: 140 }}
          />

          <Controls position="bottom-right" className="border border-border bg-card/95 rounded-md" />

          <Panel position="top-left" className="rounded-lg bg-card/90 border border-border backdrop-blur px-3 py-2 shadow text-foreground">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Downline Tree - {userName}</span>
              <span className="text-xs text-muted-foreground">click node to view commission, double-click to expand</span>
            </div>
          </Panel>

          <Panel position="top-right" className="rounded-lg bg-card/90 border border-border backdrop-blur px-3 py-2 shadow space-y-2 text-foreground">
            <div className="flex items-center gap-2">
              <input
                className="h-8 w-44 rounded border border-input bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Find username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && focusNode(query)}
              />
              <button
                className="h-8 rounded bg-sky-600 dark:bg-sky-500 px-3 text-white text-sm hover:bg-sky-700 dark:hover:bg-sky-600"
                onClick={() => focusNode(query)}
              >
                Go
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    );
  }

  /* ======================== Render ======================== */

  if (!userId) {
    return (
      <>
        <div className="p-8 flex items-center justify-center h-[70vh] bg-background">
          <div className="flex flex-col items-center space-y-3">
            <p className="text-sm text-muted-foreground">Invalid user ID</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (loadError && Object.keys(nodesById).length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="downline tree"
          action="load"
          onRetry={() => {
            setReloadKey((current) => current + 1);
          }}
        />
      </div>
    );
  }

  if (loading && Object.keys(nodesById).length === 0) {
    return (
      <>
        <div className="p-8 flex items-center justify-center h-[70vh] bg-background">
          <BackofficeDetailDialogSkeleton fieldCount={6} sectionCount={2} className="w-full max-w-3xl" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Downline Tree</h1>
              <p className="text-sm text-muted-foreground">
                {userName ? `Viewing downline for ${userName}` : 'Viewing downline structure'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <ReactFlowProvider>
              <GraphCanvas 
                nodes={rfNodes} 
                edges={rfEdges} 
                onExpand={expandSponsor}
                onNodeClickForCommission={handleNodeClickForCommission}
              />
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      {/* Commission Dialog */}
      <Dialog open={commissionDialogOpen} onOpenChange={setCommissionDialogOpen}>
        <DialogContent className="!max-w-[78vw] !w-[78vw] max-h-[95vh] overflow-y-auto sm:!max-w-[78vw]">
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
            commissionData.commissions && commissionData.commissions.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  All commission values in this table are shown in USD.
                </div>
                {/* Group commissions by Account Type */}
                {(() => {
                  const groupedByAccount = commissionData.commissions.reduce(
                  (acc, commission) => {
                    const key = `${commission.account_type_id}`;
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
                          {firstCommission.account_type_name}
                        </h3>
                        <Badge variant="outline">
                          ID: {firstCommission.account_type_id}
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
                                            'rate_ib',
                                            currentCommission.rate_ib
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            'rate_sub_ib_1',
                                            currentCommission.rate_sub_ib_1
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            'rate_sub_ib_2',
                                            currentCommission.rate_sub_ib_2
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            'rate_sub_ib_3',
                                            currentCommission.rate_sub_ib_3
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            'rate_sub_ib_4',
                                            currentCommission.rate_sub_ib_4
                                          )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                          {renderCommissionAmountInput(
                                            commission.id,
                                            'rate_sub_ib_5',
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
                No MT5 accounts
              </div>
            )
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



