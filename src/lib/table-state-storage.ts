/**
 * Utility for persisting and restoring table state (pagination, search, filters)
 * when navigating between list and detail pages.
 * 
 * This allows users to maintain their search/filter/pagination state when
 * viewing details and returning to the list view.
 */

export interface TableStateStorage {
  /**
   * Store the current page URL to return to later
   * @param storageKey Unique key for this table (e.g., 'new-users', 'ib-users')
   */
  storeReturnUrl: (storageKey: string) => void;

  /**
   * Get the stored return URL and optionally clear it
   * @param storageKey Unique key for this table
   * @param clearAfterRead Whether to clear the stored URL after reading (default: true)
   * @returns The stored URL or null if not found
   */
  getReturnUrl: (storageKey: string, clearAfterRead?: boolean) => string | null;

  /**
   * Clear the stored return URL
   * @param storageKey Unique key for this table
   */
  clearReturnUrl: (storageKey: string) => void;

  /**
   * Navigate back to the stored URL using Next.js router
   * Falls back to defaultPath if no stored URL exists
   * @param router Next.js router instance
   * @param storageKey Unique key for this table
   * @param defaultPath Fallback path if no stored URL exists
   */
  navigateBack: (router: { push: (url: string) => void }, storageKey: string, defaultPath: string) => void;
}

const STORAGE_PREFIX = 'table-return-url-';
export const USER_PROFILE_RETURN_STORAGE_KEY = "new-users-profile";
export const IB_PROFILE_RETURN_STORAGE_KEY = "ib-users-profile";

/**
 * Get the full storage key with prefix
 */
function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function isSafeRelativeUrl(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

/**
 * Check if sessionStorage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const test = '__storage_test__';
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export const tableStateStorage: TableStateStorage = {
  storeReturnUrl: (storageKey: string) => {
    if (!isStorageAvailable()) return;
    try {
      const fullKey = getStorageKey(storageKey);
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem(fullKey, currentUrl);
    } catch (error) {
      console.warn('Failed to store return URL:', error);
    }
  },

  getReturnUrl: (storageKey: string, clearAfterRead = true) => {
    if (!isStorageAvailable()) return null;
    try {
      const fullKey = getStorageKey(storageKey);
      const storedUrl = sessionStorage.getItem(fullKey);
      if (storedUrl && clearAfterRead) {
        sessionStorage.removeItem(fullKey);
      }
      return storedUrl && isSafeRelativeUrl(storedUrl) ? storedUrl : null;
    } catch (error) {
      console.warn('Failed to get return URL:', error);
      return null;
    }
  },

  clearReturnUrl: (storageKey: string) => {
    if (!isStorageAvailable()) return;
    try {
      const fullKey = getStorageKey(storageKey);
      sessionStorage.removeItem(fullKey);
    } catch (error) {
      console.warn('Failed to clear return URL:', error);
    }
  },

  navigateBack: (router, storageKey, defaultPath) => {
    const returnUrl = tableStateStorage.getReturnUrl(storageKey, true);
    router.push(returnUrl || defaultPath);
  },
};

/**
 * Hook for easier usage in React components
 */
export function useTableStateStorage(storageKey: string) {
  return {
    storeReturnUrl: () => tableStateStorage.storeReturnUrl(storageKey),
    getReturnUrl: (clearAfterRead = true) => tableStateStorage.getReturnUrl(storageKey, clearAfterRead),
    clearReturnUrl: () => tableStateStorage.clearReturnUrl(storageKey),
    navigateBack: (router: { push: (url: string) => void }, defaultPath: string) =>
      tableStateStorage.navigateBack(router, storageKey, defaultPath),
  };
}
