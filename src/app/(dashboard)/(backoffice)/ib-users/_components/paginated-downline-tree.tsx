'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import toast from 'react-hot-toast';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { BackofficeDetailDialogSkeleton } from '@/components/loading/backoffice-page-skeletons';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import type { AdminIbUser } from '@/lib/api';
import { fetchUsersByLevel, NODE_H, NODE_W, levelColor, levelToDepth, type UserByLevel, type DirectRate } from '@/lib/downline-tree';
import { paginatedNodeTypes, type PaginatedTeamNodeData } from './paginated-team-node';
import { IbDirectRatesDialog } from './ib-direct-rates-dialog';

type NodeRecord = {
  sponsorId: string;
  username: string;
  packageSum: number;
  totalBV?: number;
  status?: number;
  depth: number;
  isRoot?: boolean;
  userId?: number;
  isIb?: boolean;
  direct_rates?: DirectRate[];
  currentPage?: number;
  totalPages?: number;
  hasMoreChildren?: boolean;
};

type PaginatedGraphNode = Node<PaginatedTeamNodeData, "teamNode">;
type GraphEdge = Edge;

const useIsDark = () => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
};

type PaginatedDownlineTreeProps = {
  userId: number;
  onBack?: () => void;
  backLabel?: string;
};

export function PaginatedDownlineTree({
  userId,
  onBack,
  backLabel = 'Back to Partner Users',
}: PaginatedDownlineTreeProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [nodesById, setNodesById] = useState<Record<string, NodeRecord>>({});
  const [edges, setEdges] = useState<Array<{ source: string; target: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loadingChildren, setLoadingChildren] = useState<Record<number, boolean>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  
  // Direct rates dialog state
  const [directRatesDialogOpen, setDirectRatesDialogOpen] = useState(false);
  const [selectedDirectRateUser, setSelectedDirectRateUser] = useState<AdminIbUser | null>(null);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    router.push('/ib-users');
  }, [onBack, router]);

  const handleOpenDirectRates = useCallback((user: AdminIbUser) => {
    setSelectedDirectRateUser(user);
    setDirectRatesDialogOpen(true);
  }, []);

  // Load initial user tree
  useEffect(() => {
    if (!userId || !token) return;
    
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      setNodesById({});
      setEdges([]);

      try {
        const data = await fetchUsersByLevel(userId, token, { page: 1, page_size: 20 });
        
        if (!mounted || !data) {
          if (!data) {
            setLoadError(new Error("Failed to load downline tree"));
          }
          setLoading(false);
          return;
        }

        const ibUser = data.ib_user || data.specified_user;
        const usersByLevel = data.users_by_level || {};
        const pagination = data.pagination;

        if (!ibUser) {
          setLoading(false);
          setLoadError(new Error("IB user information not found"));
          toast.error('IB user information not found');
          return;
        }

        setUserName(ibUser.name);

        // Build root node - handle both IbUser and specified_user types
        const rootId = ('sponsor_id' in ibUser && ibUser.sponsor_id) ? ibUser.sponsor_id : `user_${ibUser.id}`;
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
          direct_rates: ('direct_rates' in ibUser) ? ibUser.direct_rates : undefined,
          currentPage: pagination?.page || 1,
          totalPages: pagination?.total_pages || 1,
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
          setLoading(false);
          toast(`${ibUser.name} has no downline users yet`, { icon: 'ℹ️' });
          return;
        }

        // Build a map of users by their identifier
        const userMap = new Map<string, UserByLevel>();
        allUsers.forEach((user) => {
          const userId = user.sponsor_id || `user_${user.id}`;
          userMap.set(userId, user);
        });

        // Build nodes and edges
        allUsers.forEach((user) => {
          const userId = user.sponsor_id || `user_${user.id}`;
          const depth = levelToDepth(user.level);
          
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
              direct_rates: user.direct_rates,
              currentPage: 1,
              totalPages: 1,
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
              if (!parentId && ('sponsor_id' in root && user.sponsor_by === root.sponsorId)) {
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
                    direct_rates: parentUser.direct_rates,
                    currentPage: 0,
                    totalPages: 0,
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
        setLoading(false);
        // Mark root as expanded
        setExpandedNodes(new Set([ibUser.id]));
      } catch (error) {
        console.error('Failed to load downline tree:', error);
        setLoadError(error);
        setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [userId, token]);

  // Load more children for a specific user
  const handleLoadMoreChildren = useCallback(async (targetUserId: number) => {
    if (!token || loadingChildren[targetUserId]) return;

    // Find the node
    const targetNode = Object.values(nodesById).find(n => n.userId === targetUserId);
    if (!targetNode) return;

    const nextPage = (targetNode.currentPage || 0) + 1;

    setLoadingChildren(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const data = await fetchUsersByLevel(targetUserId, token, { 
        page: nextPage, 
        page_size: 20 
      });

      if (!data) {
        toast.error('Failed to load more children');
        return;
      }

      const usersByLevel = data.users_by_level || {};
      const pagination = data.pagination;

      // Collect new users
      const newUsers: UserByLevel[] = [];
      Object.values(usersByLevel).forEach((users) => {
        if (Array.isArray(users)) {
          newUsers.push(...users);
        }
      });

      if (newUsers.length === 0) {
        toast('No more children to load', { icon: 'ℹ️' });
        return;
      }

      setNodesById(prev => {
        const updated = { ...prev };
        const targetNodeKey = targetNode.sponsorId;

      // Update target node pagination info
        if (updated[targetNodeKey]) {
          updated[targetNodeKey] = {
            ...updated[targetNodeKey],
            currentPage: pagination?.page || nextPage,
            totalPages: pagination?.total_pages || nextPage,
          };
        }

        return updated;
      });

      setEdges(prev => {
        const newEdges = [...prev];
        const userMap = new Map<string, UserByLevel>();
        
        newUsers.forEach((user) => {
          const userId = user.sponsor_id || `user_${user.id}`;
          userMap.set(userId, user);
        });

        // Add new nodes and edges
        newUsers.forEach((user) => {
          const userId = user.sponsor_id || `user_${user.id}`;
          const depth = levelToDepth(user.level);

          setNodesById(prev2 => {
            if (prev2[userId]) return prev2; // Already exists
            
            return {
              ...prev2,
              [userId]: {
                sponsorId: userId,
                username: user.name,
                packageSum: 0,
                totalBV: 0,
                status: 1,
                depth,
                isRoot: false,
                userId: user.id,
                isIb: !!user.ib_name,
                direct_rates: user.direct_rates,
                currentPage: 0,
                totalPages: 0,
              }
            };
          });

          // Find parent and create edge
          let parentId = targetNode.sponsorId;
          
          if (user.sponsor_by && user.sponsor_by !== targetNode.sponsorId) {
            for (const [id, u] of userMap.entries()) {
              if (u.sponsor_id === user.sponsor_by || id === user.sponsor_by) {
                parentId = id;
                break;
              }
            }
          }

          const edgeKey = `${parentId}->${userId}`;
          if (!newEdges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
            newEdges.push({ source: parentId, target: userId });
          }
        });

        return newEdges;
      });

      toast.success(`Loaded ${newUsers.length} more users`);
      
      // Mark this node as expanded
      setExpandedNodes(prev => new Set([...prev, targetUserId]));
    } catch (error) {
      console.error('Failed to load more children:', error);
      toast.error('Failed to load more children');
    } finally {
      setLoadingChildren(prev => ({ ...prev, [targetUserId]: false }));
    }
  }, [token, nodesById, loadingChildren]);

  // Build RF nodes/edges with auto layout
  const { rfNodes, rfEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 48, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    Object.values(nodesById).forEach((n) => {
      g.setNode(n.sponsorId, { width: NODE_W, height: NODE_H + 40 }); // Extra height for button
    });

    edges.forEach((e) => g.setEdge(e.source, e.target));

    dagre.layout(g);

    const rfNodes: PaginatedGraphNode[] = Object.values(nodesById).map((n) => {
      const { x, y } = g.node(n.sponsorId) || { x: 0, y: 0 };
      const isExpanded = n.userId ? expandedNodes.has(n.userId) : false;
      
      // Show button if:
      // 1. User is IB and has userId
      // 2. Either not expanded yet OR has more pages to load
      const hasMorePages = !!(n.currentPage && n.totalPages && n.currentPage < n.totalPages);
      const showButton = !!(n.isIb && n.userId && (!isExpanded || hasMorePages));
      
      return {
        id: n.sponsorId,
        type: 'teamNode',
        position: { x: x - NODE_W / 2, y: y - (NODE_H + 40) / 2 },
        draggable: false,
        selectable: false,
        data: {
          sponsorId: n.sponsorId,
          username: n.username,
          packageSum: n.packageSum,
          totalBV: n.totalBV ?? 0,
          level: n.depth === 0 ? 'Level-IB' : `Level-${n.depth}`,
          status: n.status ?? 1,
          isRoot: n.isRoot,
          highlighted: false,
          userId: n.userId,
          isIb: n.isIb,
          direct_rates: n.direct_rates,
          hasChildren: showButton,
          currentPage: n.currentPage,
          totalPages: n.totalPages,
          isLoadingChildren: n.userId ? (loadingChildren[n.userId] ?? false) : false,
          onLoadMore: handleLoadMoreChildren,
        },
        style: { width: NODE_W, height: NODE_H + 40 },
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
  }, [nodesById, edges, loadingChildren, handleLoadMoreChildren, expandedNodes]);

  // Canvas component
  function GraphCanvas({ nodes, edges }: { nodes: PaginatedGraphNode[]; edges: GraphEdge[] }) {
    const [query, setQuery] = useState('');
    const isDark = useIsDark();
    const rf = useReactFlow<PaginatedGraphNode, GraphEdge>();

    const focusNode = useCallback(
      (needle: string) => {
        const term = needle.trim().toLowerCase();
        if (!term) return;
        const target = nodes.find((n) =>
          n.data.username.toLowerCase().includes(term)
        );
        if (target) {
          rf.setCenter(target.position.x + NODE_W / 2, target.position.y + (NODE_H + 40) / 2, {
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

        <ReactFlow<PaginatedGraphNode, GraphEdge>
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodeTypes={paginatedNodeTypes}
          nodesDraggable={false}
          elementsSelectable={false}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodeClick={(_, node) => {
            const d = node.data;
            if (d?.userId != null) {
              handleOpenDirectRates({
                id: d.userId,
                name: d.username,
              } as AdminIbUser);
            }
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
              const d = (n as PaginatedGraphNode).data;
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
              <span className="text-sm font-semibold">Team - {userName}</span>
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

  // Render
  if (!userId) {
    return (
      <div className="p-8 flex items-center justify-center h-[70vh] bg-background">
        <div className="flex flex-col items-center space-y-3">
          <p className="text-sm text-muted-foreground">Invalid user ID</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Button>
        </div>
      </div>
    );
  }

  if (loadError && Object.keys(nodesById).length === 0) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="downline tree"
          action="load"
          onRetry={() => {
            setLoading(true);
            setLoadError(null);
            // Trigger reload by updating key
            window.location.reload();
          }}
        />
      </div>
    );
  }

  if (loading && Object.keys(nodesById).length === 0) {
    return (
      <div className="p-8 flex items-center justify-center h-[70vh] bg-background">
        <BackofficeDetailDialogSkeleton fieldCount={6} sectionCount={2} className="w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
              <p className="text-sm text-muted-foreground">
                {userName ? `Viewing team of ${userName}` : 'Viewing team structure'}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            <ReactFlowProvider>
              <GraphCanvas nodes={rfNodes} edges={rfEdges} />
            </ReactFlowProvider>
          </div>
        </div>
      </div>

      <IbDirectRatesDialog
        open={directRatesDialogOpen}
        onOpenChange={setDirectRatesDialogOpen}
        user={selectedDirectRateUser}
        token={token ?? ''}
      />
    </>
  );
}
