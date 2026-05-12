import toast from "react-hot-toast";
import { API_BASE_URL } from "../api";
import { getAdminFriendlyErrorMessage } from "../admin-friendly-errors";
import type { UsersByLevelResponse } from "./types";

export const fetchUsersByLevel = async (
  userId: number,
  token: string
): Promise<UsersByLevelResponse["data"] | null> => {
  if (!token) return null;

  const url = `${API_BASE_URL}/admin/ib-management/users-by-level?user_id=${userId}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
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