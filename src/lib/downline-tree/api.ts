import toast from "react-hot-toast";
import { API_BASE_URL, handle401Redirect } from "../api";
import { getAdminFriendlyErrorMessage } from "../admin-friendly-errors";
import type { UsersByLevelResponse } from "./types";

export const fetchUsersByLevel = async (
  userId: number,
  token: string,
  options?: {
    page?: number;
    page_size?: number;
    search?: string;
    level?: string;
  }
): Promise<UsersByLevelResponse["data"] | null> => {
  if (!token) return null;

  const params = new URLSearchParams();
  params.append("user_id", String(userId));
  params.append("page", String(options?.page ?? 1));
  params.append("page_size", String(options?.page_size ?? 20));
  if (options?.search) {
    params.append("search", options.search);
  }
  if (options?.level) {
    params.append("level", options.level);
  }

  const url = `${API_BASE_URL}/admin/ib-management/users-by-level?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (handle401Redirect(res, !!token)) return null;
    const json: UsersByLevelResponse = await res.json();
    if (!json.success || !json.data) {
      toast.error(
        getAdminFriendlyErrorMessage(json?.message || "Failed to fetch downline users", {
          resource: "downline users",
          action: "load",
        })
      );
      return null;
    }
    return json.data;
  } catch (error) {
    console.error("Failed to fetch users by level:", error);
    toast.error(
      getAdminFriendlyErrorMessage(error, { resource: "downline users", action: "load" })
    );
    return null;
  }
};