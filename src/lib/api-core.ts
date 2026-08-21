// API base URL is configured via .env only
const normalizeApiBaseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");

  if (
    /^https?:\/\//i.test(withoutTrailingSlash) ||
    withoutTrailingSlash.startsWith("//")
  ) {
    return withoutTrailingSlash;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(withoutTrailingSlash)) {
    return `http://${withoutTrailingSlash}`;
  }

  return withoutTrailingSlash.startsWith("/")
    ? withoutTrailingSlash
    : `/${withoutTrailingSlash}`;
};

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || "",
);

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  status?: string;
  requires_usdt_transaction?: boolean;
  requires_2fa?: boolean;
  data?: T;
  error?: string;
}

const AUTH_TOKEN_STORAGE_KEY = "auth_token";
const AUTH_USER_STORAGE_KEY = "auth_user";
const ADMIN_SESSION_TOKEN_STORAGE_KEY = "authToken";
const ADMIN_SESSION_USER_STORAGE_KEY = "user";
const ADMIN_SESSION_FLAG_STORAGE_KEY = "isAdminSession";
const AUTH_TOKEN_REFRESHED_EVENT = "auth-token-refreshed";
export const AUTH_TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let refreshTokenPromise: Promise<string | null> | null = null;

const isAdminSession = () => {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_FLAG_STORAGE_KEY) === "true";
};

const getStoredAuthToken = () => {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(ADMIN_SESSION_TOKEN_STORAGE_KEY) ||
    localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );
};

const getStoredUserType = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(ADMIN_SESSION_USER_STORAGE_KEY) ||
      localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { type?: unknown };
    return typeof parsed?.type === "string" ? parsed.type.toLowerCase() : null;
  } catch {
    return null;
  }
};

const extractBearerToken = (authorization?: string | null) => {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const getAuthorizationHeader = (headers: Record<string, string>) => {
  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === "authorization",
  );
  return key ? headers[key] : null;
};

const setAuthorizationHeader = (
  headers: Record<string, string>,
  token: string,
) => {
  Object.keys(headers).forEach((header) => {
    if (header.toLowerCase() === "authorization") {
      delete headers[header];
    }
  });
  headers.Authorization = `Bearer ${token}`;
};

const getTokenFromRefreshResponse = (json: unknown) => {
  if (!json || typeof json !== "object") return null;

  const response = json as {
    token?: unknown;
    access_token?: unknown;
    data?: {
      token?: unknown;
      access_token?: unknown;
    };
  };

  const token =
    response.data?.token ??
    response.data?.access_token ??
    response.token ??
    response.access_token;

  return typeof token === "string" && token.trim() ? token : null;
};

export async function refreshCurrentAuthToken(tokenOverride?: string | null) {
  if (!API_BASE_URL || typeof window === "undefined") return null;
  if (isAdminSession()) return tokenOverride ?? getStoredAuthToken();

  const token = tokenOverride ?? getStoredAuthToken();
  if (!token) return null;

  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // If refresh endpoint returns 401, return the old token to keep user logged in
      // The old token will continue to be used until other API calls get 401
      if (response.status === 401) {
        console.warn(
          "Token refresh returned 401 - continuing with existing token",
        );
        return token; // Return the old token instead of null
      }

      const json = await response.json().catch(() => ({}));
      const newToken = response.ok ? getTokenFromRefreshResponse(json) : null;

      if (!newToken) {
        const currentStoredToken = getStoredAuthToken();
        return currentStoredToken && currentStoredToken !== token
          ? currentStoredToken
          : token;
      }

      if (isAdminSession()) {
        sessionStorage.setItem(ADMIN_SESSION_TOKEN_STORAGE_KEY, newToken);
      } else {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, newToken);
      }
      window.dispatchEvent(
        new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, {
          detail: { token: newToken },
        }),
      );
      return newToken;
    } catch (error) {
      // Catch any network errors and return old token without redirect
      console.error("Token refresh error:", error);
      return token; // Return the old token instead of null
    }
  })().finally(() => {
    refreshTokenPromise = null;
  });

  return refreshTokenPromise;
}

export function handle401Redirect(
  response: Response,
  hasAuth: boolean,
): boolean {
  if (response.status === 401 && hasAuth) {
    // Sub-admins / managers must never be auto-logged-out on 401:
    // the backend returns 401 for permission-restricted endpoints too
    // (e.g. /admin/ib-plans/list). Let the caller surface the API error instead.
    const userType = getStoredUserType();
    if (userType === "subadmin" || userType === "manager") {
      return false;
    }

    if (typeof window !== "undefined") {
      if (isAdminSession()) {
        sessionStorage.removeItem(ADMIN_SESSION_TOKEN_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_USER_STORAGE_KEY);
        sessionStorage.removeItem(ADMIN_SESSION_FLAG_STORAGE_KEY);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      }
      window.location.replace("/login");
    }
    return true;
  }
  return false;
}

export class ApiRequestError extends Error {
  status: number;
  statusText: string;
  endpoint: string;
  payload: unknown;

  constructor({
    message,
    status,
    statusText,
    endpoint,
    payload,
  }: {
    message: string;
    status: number;
    statusText: string;
    endpoint: string;
    payload: unknown;
  }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.payload = payload;
  }
}

export type PaginationMeta = {
  page?: number;
  current_page?: number;
  per_page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  last_page?: number;
};

export const toFormBody = (obj: Record<string, unknown>) => {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    params.set(key, value === null || value === undefined ? "" : String(value));
  });
  return params.toString();
};

export type ApiCallOptions = RequestInit & {
  skipAuthRedirect?: boolean;
};

const fetchWithConfig = async (
  url: string,
  config: RequestInit,
  endpoint: string,
) => {
  try {
    return await fetch(url, config);
  } catch (networkError) {
    if (
      networkError instanceof TypeError &&
      networkError.message === "Failed to fetch"
    ) {
      throw new ApiRequestError({
        message:
          "Unable to connect to the server. Please check your internet connection or try again later.",
        status: 0,
        statusText: "Network Error",
        endpoint,
        payload: null,
      });
    }
    throw networkError;
  }
};

export async function apiCall<T>(
  endpoint: string,
  options: ApiCallOptions = {},
): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const url = `${API_BASE_URL}${endpoint}`;

  if (endpoint.includes("ib-requests/status")) {
  }

  const {
    headers: optionHeaders,
    skipAuthRedirect = false,
    ...restOptions
  } = options;

  const normalizedHeaders = (() => {
    if (!optionHeaders) return {};
    if (optionHeaders instanceof Headers) {
      return Object.fromEntries(optionHeaders.entries());
    }
    if (Array.isArray(optionHeaders)) {
      return Object.fromEntries(optionHeaders);
    }
    return optionHeaders;
  })();

  const isFormData = restOptions.body instanceof FormData;
  const finalHeaders: Record<string, string> = { ...normalizedHeaders };

  if (!isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  } else {
    delete finalHeaders["Content-Type"];
  }

  const config: RequestInit = {
    ...restOptions,
    headers: finalHeaders,
  };

  if (
    process.env.NODE_ENV !== "production" &&
    typeof config.body === "string" &&
    endpoint.startsWith("/user/internal-transfer/")
  ) {
    try {
    } catch {}
  }

  if (endpoint.includes("ib-requests/status")) {
  }

  let response = await fetchWithConfig(url, config, endpoint);

  if (endpoint.includes("ib-requests/status")) {
  }

  const authorizationHeader = getAuthorizationHeader(finalHeaders);
  const hasAuth = !!authorizationHeader;

  let didAttemptRefresh = false;
  let refreshReturnedToken = false;

  if (!skipAuthRedirect && response.status === 401 && hasAuth) {
    didAttemptRefresh = true;
    const requestToken = extractBearerToken(authorizationHeader);
    const storedToken = getStoredAuthToken();
    const retryToken =
      storedToken && requestToken && storedToken !== requestToken
        ? storedToken
        : await refreshCurrentAuthToken(requestToken);

    if (retryToken) {
      refreshReturnedToken = true;
      setAuthorizationHeader(finalHeaders, retryToken);
      response = await fetchWithConfig(
        url,
        { ...config, headers: finalHeaders },
        endpoint,
      );
    }
  }

  // Redirect to login ONLY if:
  // 1. We got a retry token from refresh (either new or old), AND
  // 2. The retry with that token STILL returned 401
  // This means: if refresh gave us ANY token (new or old) and the API still rejects it, the session is truly invalid
  if (
    !skipAuthRedirect &&
    response.status === 401 &&
    hasAuth &&
    didAttemptRefresh &&
    refreshReturnedToken
  ) {
    if (handle401Redirect(response, hasAuth)) {
      return new Promise<ApiResponse<T>>(() => {});
    }
  }

  const json = await response.json().catch(() => ({}));

  if (endpoint.includes("ib-requests/status")) {
  }

  if (!response.ok || (json && json.success === false)) {
    if (endpoint.includes("ib-requests/status")) {
      console.error(
        "[apiCall] Request failed:",
        json?.message || `HTTP ${response.status}`,
      );
    }

    throw new ApiRequestError({
      message: json?.message || json?.error || `HTTP ${response.status}`,
      status: response.status,
      statusText: response.statusText,
      endpoint,
      payload: json,
    });
  }

  return json;
}
