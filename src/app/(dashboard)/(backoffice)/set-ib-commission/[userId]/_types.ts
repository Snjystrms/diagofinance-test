import type { Edge, Node } from "@xyflow/react";

export type IbUser = {
  id: number;
  name: string;
  email: string;
  sponsor_id?: string;
};

export type UserByLevel = {
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

export type UsersByLevelResponse = {
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

export interface TeamNodeData extends Record<string, unknown> {
  sponsorId: string;
  username: string;
  packageSum: number;
  totalBV?: number;
  level: number | string;
  status?: number;
  isRoot?: boolean;
  highlighted?: boolean;
  userId?: string | number;
}

export type GraphNode = Node<TeamNodeData, "teamNode">;
export type GraphEdge = Edge;

export type NodeRecord = {
  sponsorId: string;
  username: string;
  packageSum: number;
  totalBV?: number;
  status?: number;
  depth: number;
  isRoot?: boolean;
  userId?: number;
};
