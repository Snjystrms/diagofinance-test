import toast from "react-hot-toast";
import { API_BASE_URL, ApiRequestError, handle401Redirect } from "../api";
import { getAdminFriendlyErrorMessage } from "../admin-friendly-errors";
import type { UsersByLevelResponse } from "./types";

const USERS_BY_LEVEL_ENDPOINT = "/admin/ib-management/users-by-level";

export const fetchUsersByLevel = async (
  userId: number,
  token: string,
  options?: {
    page?: number;
    page_size?: number;
    search?: string;
    level?: string;
    // When true, HTTP/API failures (e.g. 403 missing "View Level / Tree chart")
    // are thrown as ApiRequestError so the caller can render an error card with
    // the real status + backend message instead of a generic toast.
    throwOnError?: boolean;
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

  const url = `${API_BASE_URL}${USERS_BY_LEVEL_ENDPOINT}?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (handle401Redirect(res, !!token)) return null;

    let json: UsersByLevelResponse | undefined;
    try {
      json = (await res.json()) as UsersByLevelResponse;
    } catch {
      json = undefined;
    }

    if (!res.ok || !json?.success || !json?.data) {
      const message = json?.message || "Failed to fetch downline users";
      if (options?.throwOnError) {
        throw new ApiRequestError({
          message,
          status: res.status,
          statusText: res.statusText,
          endpoint: USERS_BY_LEVEL_ENDPOINT,
          payload: json ?? null,
        });
      }
      toast.error(
        getAdminFriendlyErrorMessage(message, {
          resource: "downline users",
          action: "load",
        })
      );
      return null;
    }

    return json.data;
  } catch (error) {
    // Re-throw so opt-in callers can surface the real error in a card.
    if (options?.throwOnError) {
      throw error;
    }
    console.error("Failed to fetch users by level:", error);
    toast.error(
      getAdminFriendlyErrorMessage(error, { resource: "downline users", action: "load" })
    );
    return null;
  }
};
