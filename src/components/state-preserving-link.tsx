"use client";

import Link from "next/link";
import { type ComponentProps, type MouseEvent } from "react";
import {
  IB_PROFILE_RETURN_STORAGE_KEY,
  tableStateStorage,
  USER_PROFILE_RETURN_STORAGE_KEY,
} from "@/lib/table-state-storage";

interface StatePreservingLinkProps extends ComponentProps<typeof Link> {
  /**
   * The storage key to use for preserving state.
   * This should match the page you're navigating FROM.
   * 
   * Examples:
   * - 'new-users' for /new-users page
   * - 'ib-users' for /ib-users page
   * - 'user-verification' for /user-verification page
   */
  storageKey: string;
}

/**
 * A Link component that automatically stores the current URL state
 * before navigation, allowing the user to return to the exact same
 * state (search, filters, pagination) when they navigate back.
 * 
 * @example
 * ```tsx
 * <StatePreservingLink
 *   storageKey="new-users"
 *   href={`/new-users/${userId}`}
 *   className="hover:underline"
 * >
 *   View User Profile
 * </StatePreservingLink>
 * ```
 */
export function StatePreservingLink({
  storageKey,
  onClick,
  ...props
}: StatePreservingLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    tableStateStorage.storeReturnUrl(storageKey);

    const href = props.href.toString();
    if (href.startsWith("/new-users/")) {
      tableStateStorage.storeReturnUrl(USER_PROFILE_RETURN_STORAGE_KEY);
    } else if (href.startsWith("/ib-users/")) {
      tableStateStorage.storeReturnUrl(IB_PROFILE_RETURN_STORAGE_KEY);
    }

    onClick?.(e);
  };

  return <Link {...props} onClick={handleClick} />;
}
