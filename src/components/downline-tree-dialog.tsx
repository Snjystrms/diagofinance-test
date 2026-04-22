'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE_URL } from '@/lib/api';
import { User as UserIcon, CheckCircle2, XCircle } from 'lucide-react';

/* ======================== API types ======================== */

type IbUser = {
  id: number;
  name: string;
  email: string;
  sponsor_id?: string;
};

type UserByLevel = {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  sponsor_id?: string | null;
  sponsor_by?: string | null;
  ib_name?: string;
  level: string;
  created_at: string;
};

type UsersByLevelResponse = {
  success: boolean;
  data?: {
    ib_user?: IbUser;
    specified_user?: IbUser;
    users_by_level?: {
      IB?: UserByLevel[];
      "Level-1"?: UserByLevel[];
      "Level-2"?: UserByLevel[];
      "Level-3"?: UserByLevel[];
      "Level-4"?: UserByLevel[];
      "Level-5"?: UserByLevel[];
    };
    totals?: {
      IB?: number;
      "Level-1"?: number;
      "Level-2"?: number;
      "Level-3"?: number;
      "Level-4"?: number;
      "Level-5"?: number;
      total?: number;
    };
  };
  message?: string;
};

/* ======================== visuals ======================== */
const toastNoDownline = (who?: string) =>
  toast(who ? `No downline members under ${who}.` : `No downline members.`, {
    icon: '📭',
  });

const NODE_W = 220;
const NODE_H = 90;

const levelColor = (level: number | string = 1) => {
  const levelNum = typeof level === 'string' ? parseInt(level.replace('Level-', '')) || 0 : level;
  const map: Record<number, string> = {
    0: '#0ea5e9', // IB level
    1: '#2563eb',
    2: '#7c3aed',
    3: '#9333ea',
    4: '#db2777',
    5: '#ea580c',
    6: '#ca8a04',
    7: '#16a34a',
    8: '#0891b2',
    9: '#0ea5e9',
    10: '#0ea5e9',
  };
  return map[levelNum] ?? '#2563eb';
};

const levelToDepth = (level: string): number => {
  if (level === 'IB') return 0;
  const match = level.match(/Level-(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

const fmtNum = (n?: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Number(n || 0));
const fmtMoney = (n?: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(n || 0)
  );

/* ======================== Theme hook ======================== */

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const check = () =>
      setIsDark(document.documentElement.classList.contains('dark') || mq.matches);
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    mq.addEventListener('change', check);
    return () => {
      obs.disconnect();
      mq.removeEventListener('change', check);
    };
  }, []);
  return isDark;
}

/* ======================== Node component ======================== */

interface TeamNodeData extends Record<string, unknown> {
  sponsorId: string;
  username: string;
  packageSum: number;
  totalBV?: number;
  level: number | string;
  status?: number;
  isRoot?: boolean;
  highlighted?: boolean;
}

type GraphNode = Node<TeamNodeData, 'teamNode'>;
type GraphEdge = Edge;

const TeamNode: React.FC<NodeProps<GraphNode>> = ({ data }) => {
  const isDark = useIsDark();
  const levelNum = typeof data.level === 'string' ? levelToDepth(data.level) : (data.level || 1);
  const color = data.isRoot ? '#0ea5e9' : levelColor(levelNum);
  const ring = isDark
    ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10))'
    : 'linear-gradient(180deg, rgba(255,255,255,0.80), rgba(255,255,255,0.95))';

  const highlightCls =
    data.highlighted
      ? 'ring-4 ring-violet-500/60 ring-offset-2 ring-offset-background shadow-[0_0_0_6px_rgba(139,92,246,0.22)] animate-[pulse_1.2s_ease-in-out_3]'
      : '';

  return (
    <div
      className={clsx(
        'relative rounded-xl border shadow-sm px-3 py-2 w-[220px] h-[90px] flex items-center gap-3 backdrop-blur-sm cursor-pointer',
        'bg-card text-foreground',
        data.isRoot ? 'border-sky-300 dark:border-sky-500/60' : 'border-border',
        'hover:ring-2 hover:ring-sky-500/30',
        highlightCls
      )}
      style={{ backgroundImage: ring }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: -12, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -12, pointerEvents: 'none' }} />

      <div
        className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow"
        style={{ backgroundColor: color }}
        title={data.isRoot ? 'Root' : data.username}
      >
        <UserIcon className="h-4 w-4 opacity-90" />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            'text-[13px] leading-tight font-semibold truncate',
            data.isRoot ? 'text-sky-700 dark:text-sky-300' : 'text-foreground'
          )}
          title={data.username}
        >
          {data.isRoot ? 'Root' : data.username}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Package Sum: {fmtMoney(data.packageSum)}
        </div>
        <div className="text-[11px] text-muted-foreground">
          BV: {fmtNum(data.totalBV)}
        </div>

        {!data.isRoot && (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {typeof data.level === 'string' ? data.level : `Level ${data.level}`}
            {data.status === 1 ? (
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3 ml-1" />
              </span>
            ) : data.status === 0 ? (
              <span className="inline-flex items-center text-rose-600 dark:text-rose-400">
                <XCircle className="h-3 w-3 ml-1" />
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = { teamNode: TeamNode } satisfies NodeTypes;

/* ======================== Graph state ======================== */

type NodeRecord = {
  sponsorId: string;
  username: string;
  packageSum: number;
  totalBV?: number;
  status?: number;
  depth: number;
  isRoot?: boolean;
};

interface DownlineTreeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
}

export function DownlineTreeDialog({ open, onOpenChange, userId, userName }: DownlineTreeDialogProps) {
  const { token } = useAuth();

  const [nodesById, setNodesById] = useState<Record<string, NodeRecord>>({});
  const [edges, setEdges] = useState<Array<{ source: string; target: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    if (!open) return;
    
    let mounted = true;
    const run = async () => {
      if (!token) return;
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

      // Build root node
      const rootId = ibUser.sponsor_id || `user_${ibUser.id}`;
      const root: NodeRecord = {
        sponsorId: rootId,
        username: ibUser.name,
        packageSum: 0, // Not provided in response
        totalBV: 0, // Not provided in response
        status: 1,
        depth: 0,
        isRoot: true,
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
        toastNoDownline(userName);
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
            packageSum: 0, // Not provided in response
            totalBV: 0, // Not provided in response
            status: 1, // Assume active if not provided
            depth,
            isRoot: false,
          };
        }

        // Create edge based on sponsor_by
        if (user.sponsor_by) {
          // Find parent - could be root or another user
          let parentId: string | null = null;
          
          if (user.sponsor_by === rootId) {
            parentId = rootId;
          } else {
            // Find parent in the user map
            for (const [id, u] of userMap.entries()) {
              if (u.sponsor_id === user.sponsor_by || id === user.sponsor_by) {
                parentId = id;
                break;
              }
            }
            // If parent not found in users, it might be the root
            if (!parentId && user.sponsor_by === ibUser.sponsor_id) {
              parentId = rootId;
            }
          }

          if (parentId) {
            // Ensure parent node exists
            if (!nextNodes[parentId] && parentId === rootId) {
              // Root already exists
            } else if (!nextNodes[parentId]) {
              // Create parent node if it doesn't exist
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
                };
              }
            }

            // Add edge
            const edgeKey = `${parentId}->${userId}`;
            if (!nextEdges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
              nextEdges.push({ source: parentId, target: userId });
            }
          }
        } else {
          // If no sponsor_by, connect directly to root
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
  }, [open, userId, token, fetchUsersByLevel, userName]);

  // expand a node IN PLACE - fetch deeper levels
  const expandSponsor = useCallback(
    async (sponsorId: string) => {
      if (expanded[sponsorId]) return;

      const parent = nodesById[sponsorId];
      if (!parent) return;

      // Extract user ID from sponsorId if it's in format user_123
      const userIdMatch = sponsorId.match(/user_(\d+)/);
      const targetUserId = userIdMatch ? parseInt(userIdMatch[1], 10) : null;
      
      if (!targetUserId) {
        // Try to find user ID from existing nodes
        const node = Object.values(nodesById).find((n) => n.sponsorId === sponsorId);
        if (!node) {
          toast.error('Cannot expand: user ID not found');
          return;
        }
        // For now, just mark as expanded since we already have all data
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

      // Build user map
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
  }: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    onExpand: (sponsorId: string) => void;
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
          toast('No matching user on the graph', { icon: '🔍' });
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
      <div className="h-[600px] w-full bg-background rf-skin">
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
              <span className="text-xs text-muted-foreground">click any node to expand</span>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Downline Tree - {userName}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          {loading && Object.keys(nodesById).length === 0 ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="flex flex-col items-center space-y-3">
                <Spinner className="h-8 w-8" />
                <p className="text-sm text-muted-foreground">Loading downline tree…</p>
              </div>
            </div>
          ) : (
            <ReactFlowProvider>
              <GraphCanvas nodes={rfNodes} edges={rfEdges} onExpand={expandSponsor} />
            </ReactFlowProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}







