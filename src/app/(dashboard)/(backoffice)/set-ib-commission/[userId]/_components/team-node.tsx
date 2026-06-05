"use client";

import { Handle, Position, type NodeProps, type NodeTypes } from "@xyflow/react";
import clsx from "clsx";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User as UserIcon, XCircle } from "lucide-react";
import { levelColor, levelToDepth } from "@/lib/downline-tree/graph-helpers";
import { useIsDark } from "../_hooks/use-is-dark";
import type { GraphNode } from "../_types";

const formatLevelLabel = (level: string) => {
  if (level === "Level-IB" || level === "IB") return "Partner";
  return level;
};

const TeamNode = ({ data }: NodeProps<GraphNode>) => {
  const isDark = useIsDark();
  const levelNum = typeof data.level === "string" ? levelToDepth(data.level) : (data.level || 1);
  const color = data.isRoot ? "#0ea5e9" : levelColor(levelNum);
  const ring = isDark
    ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.10))"
    : "linear-gradient(180deg, rgba(255,255,255,0.80), rgba(255,255,255,0.95))";

  const highlightCls = data.highlighted
    ? "ring-4 ring-violet-500/60 ring-offset-2 ring-offset-background shadow-[0_0_0_6px_rgba(139,92,246,0.22)] animate-[pulse_1.2s_ease-in-out_3]"
    : "";

  // Determine border color based on user type
  const getBorderColor = () => {
    if (data.isRoot) return "border-sky-500 dark:border-sky-400 shadow-lg shadow-sky-500/20";
    if (data.isIb) return "border-amber-300 dark:border-amber-500/60";
    return "border-border";
  };

  // Determine text color for username
  const getUsernameColor = () => {
    if (data.isRoot) return "text-sky-700 dark:text-sky-300";
    if (data.isIb) return "text-amber-700 dark:text-amber-300";
    return "text-foreground";
  };

  return (
    <div
      className={clsx(
        "relative rounded-xl border shadow-sm px-3 py-2 w-[220px] h-[90px] flex items-center gap-3 backdrop-blur-sm",
        "bg-card text-foreground",
        getBorderColor(),
        highlightCls
      )}
      style={{ backgroundImage: ring }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: -12, pointerEvents: "none" }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, bottom: -12, pointerEvents: "none" }} />

      <div
        className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow"
        style={{ backgroundColor: color }}
        title={data.isRoot ? "Root Partner" : data.isIb ? "Partner" : "Client"}
      >
        <UserIcon className="h-4 w-4 opacity-90" />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className={clsx(
            "text-[13px] leading-tight font-semibold truncate",
            getUsernameColor()
          )}
          title={data.username}
        >
          {data.username}
        </div>

        {data.isRoot ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge className="text-[9px] h-4 px-1 py-0 bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Partner
            </Badge>
          </div>
        ) : (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {data.isIb ? (
              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                Partner
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">
                Client
              </Badge>
            )}
            <div className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {formatLevelLabel(typeof data.level === "string" ? data.level : `Level ${data.level}`)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export const nodeTypes = { teamNode: TeamNode } satisfies NodeTypes;
