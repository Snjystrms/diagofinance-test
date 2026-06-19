// API base URL is configured via .env only
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

// Debug: Log the API base URL being used
console.log("API_BASE_URL:", API_BASE_URL);

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
const AUTH_TOKEN_REFRESHED_EVENT = "auth-token-refreshed";
export const AUTH_TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let refreshTokenPromise: Promise<string | null> | null = null;

const getStoredAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

const extractBearerToken = (authorization?: string | null) => {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

const getAuthorizationHeader = (headers: Record<string, string>) => {
  const key = Object.keys(headers).find((header) => header.toLowerCase() === "authorization");
  return key ? headers[key] : null;
};

const setAuthorizationHeader = (headers: Record<string, string>, token: string) => {
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

  const token = tokenOverride ?? getStoredAuthToken();
  if (!token) return null;

  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    const json = await response.json().catch(() => ({}));
    const newToken = response.ok ? getTokenFromRefreshResponse(json) : null;

    if (!newToken) {
      const currentStoredToken = getStoredAuthToken();
      return currentStoredToken && currentStoredToken !== token ? currentStoredToken : null;
    }

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, newToken);
    window.dispatchEvent(
      new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, { detail: { token: newToken } })
    );
    return newToken;
  })().finally(() => {
    refreshTokenPromise = null;
  });

  return refreshTokenPromise;
}

export function handle401Redirect(response: Response, hasAuth: boolean): boolean {
  if (response.status === 401 && hasAuth) {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
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

const fetchWithConfig = async (url: string, config: RequestInit, endpoint: string) => {
  try {
    return await fetch(url, config);
  } catch (networkError) {
    if (networkError instanceof TypeError && networkError.message === "Failed to fetch") {
      throw new ApiRequestError({
        message: "Unable to connect to the server. Please check your internet connection or try again later.",
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
  options: ApiCallOptions = {}
): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const url = `${API_BASE_URL}${endpoint}`;

  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] IB Status endpoint detected:", endpoint);
    console.log("[apiCall] Full URL:", url);
    console.log("[apiCall] Method:", options.method || "GET");
    console.log("[apiCall] Headers:", options.headers);
  }

  const { headers: optionHeaders, skipAuthRedirect = false, ...restOptions } = options;

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
      console.log("apiCall payload:", endpoint, JSON.parse(config.body));
    } catch {
      console.log("apiCall payload (raw):", endpoint, config.body);
    }
  }

  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Making fetch request to:", url);
    console.log("[apiCall] Config:", { method: config.method, headers: config.headers });
  }

  let response = await fetchWithConfig(url, config, endpoint);

  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Response status:", response.status, response.statusText);
  }

  const authorizationHeader = getAuthorizationHeader(finalHeaders);
  const hasAuth = !!authorizationHeader;

  if (!skipAuthRedirect && response.status === 401 && hasAuth) {
    const requestToken = extractBearerToken(authorizationHeader);
    const storedToken = getStoredAuthToken();
    const retryToken =
      storedToken && requestToken && storedToken !== requestToken
        ? storedToken
        : await refreshCurrentAuthToken(requestToken);

    if (retryToken) {
      setAuthorizationHeader(finalHeaders, retryToken);
      response = await fetchWithConfig(url, { ...config, headers: finalHeaders }, endpoint);
    }
  }

  if (!skipAuthRedirect && handle401Redirect(response, hasAuth)) {
    return new Promise<ApiResponse<T>>(() => {});
  }

  const json = await response.json().catch(() => ({}));

  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Response JSON:", json);
  }

  if (!response.ok || (json && json.success === false)) {
    if (endpoint.includes("ib-requests/status")) {
      console.error("[apiCall] Request failed:", json?.message || `HTTP ${response.status}`);
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
