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
import { nodeTypes } from './team-node';
import { formatDateTimeInIST } from '@/lib/formatters';
import { NODE_H, NODE_W, levelColor, levelToDepth, toastNoDownline } from '../_lib/graph-helpers';
import { useIsDark } from '../_hooks/use-is-dark';
import type { GraphEdge, GraphNode, NodeRecord, TeamNodeData, UserByLevel, UsersByLevelResponse } from '../_types';

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

export function DownlineTreePageContent() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const userId = params?.userId ? parseInt(String(params.userId), 10) : null;

  const [nodesById, setNodesById] = useState<Record<string, NodeRecord>>({});
  const [edges, setEdges] = useState<Array<{ source: string; target: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [userName, setUserName] = useState<string>('');

  // Commission dialog state
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [commissionData, setCommissionData] = useState<UserCommissionResponse["data"] | null>(null);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [editingCommission, setEditingCommission] = useState<UserCommission | null>(null);
  const [editedCommissions, setEditedCommissions] = useState<Record<number, Partial<UserCommission>>>({});
  const [savingCommission, setSavingCommission] = useState<number | null>(null);

  // ============ data fetching ============
  const fetchUsersByLevel = useCallback(
    async (targetUserId: number): Promise<UsersByLevelResponse['data'] | null> => {
      if (!token) return null;
      const url = `${API_BASE_URL}/admin/ib-management/users-by-level?user_id=${targetUserId}`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json: UsersByLevelResponse = await res.json();
        if (!json.success || !json.data) {
          toast.error(json?.message || 'Failed to fetch downline users');
          return null;
        }
        return json.data;
      } catch (error) {
        console.error('Failed to fetch users by level:', error);
        toast.error('Failed to fetch downline users');
        return null;
      }
    },
    [token]
  );

  // bootstrap: load initial user and their downline
  useEffect(() => {
    if (!userId || !token) return;
    
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setNodesById({});
      setEdges([]);
      setExpanded({});
      setHighlightId(null);

      const data = await fetchUsersByLevel(userId);
      if (!mounted || !data) {
        setLoading(false);
        return;
      }

      // Extract IB user as root
      const ibUser = data.ib_user || data.specified_user;
      const usersByLevel = data.users_by_level || {};

      if (!ibUser) {
        setLoading(false);
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
  }, [userId, token, fetchUsersByLevel]);

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
      const data = await fetchUsersByLevel(targetUserId);
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
    [expanded, nodesById, fetchUsersByLevel]
  );

  // Load user commissions
  const loadUserCommissions = useCallback(async (targetUserId: string | number) => {
    if (!token || !targetUserId) {
      return;
    }

    try {
      setLoadingCommissions(true);
      const response = await adminIbUserCommissionsApi.getUserCommissions(targetUserId, token);
      
      if (response.success && response.data) {
        const data = (response as unknown as { data: UserCommissionResponse["data"] }).data;
        setCommissionData(data);
        setSelectedUserId(targetUserId);
        setCommissionDialogOpen(true);
        setEditedCommissions({});
        setEditingCommission(null);
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
            <Button onClick={() => router.push('/set-ib-commission')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Set IB Commission
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (loading && Object.keys(nodesById).length === 0) {
    return (
      <>
        <div className="p-8 flex items-center justify-center h-[70vh] bg-background">
          <div className="flex flex-col items-center space-y-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading downline tree…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push('/set-ib-commission')}>
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
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : commissionData ? (
            commissionData.commissions && commissionData.commissions.length > 0 ? (
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






