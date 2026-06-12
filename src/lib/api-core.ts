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

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
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

  const { headers: optionHeaders, ...restOptions } = options;

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

  let response: Response;

  try {
    response = await fetch(url, config);
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

  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Response status:", response.status, response.statusText);
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
