import {
  getFriendlyError,
  getFriendlyErrorMessage,
  type FriendlyErrorOptions,
} from "@/lib/friendly-errors";

export type AdminFriendlyErrorOptions = Omit<FriendlyErrorOptions, "audience">;

export function getAdminFriendlyError(
  error: unknown,
  options: AdminFriendlyErrorOptions = {}
) {
  return getFriendlyError(error, { audience: "admin", ...options });
}

export function getAdminFriendlyErrorMessage(
  error: unknown,
  options: AdminFriendlyErrorOptions = {}
) {
  return getFriendlyErrorMessage(error, { audience: "admin", ...options });
}
