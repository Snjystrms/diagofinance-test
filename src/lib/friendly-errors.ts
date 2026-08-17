export type FriendlyErrorAudience = "client" | "admin";
export type FriendlyErrorSeverity = "info" | "warning" | "error";

export interface FriendlyErrorOptions {
  audience?: FriendlyErrorAudience;
  resource?: string;
  action?: "load" | "create" | "update" | "delete" | "submit" | "export" | "verify" | string;
  fallbackTitle?: string;
  fallbackMessage?: string;
  validationMessage?: string;
  notFoundMessage?: string;
  unauthorizedMessage?: string;
  forbiddenMessage?: string;
}

export interface FriendlyError {
  title: string;
  message: string;
  status?: number;
  severity: FriendlyErrorSeverity;
  canRetry: boolean;
}

type ErrorParts = {
  status?: number;
  message: string;
  detail: string;
  payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiRequestError(value: unknown): value is Error & {
  status: number;
  payload: unknown;
} {
  return (
    value instanceof Error &&
    isRecord(value) &&
    value.name === "ApiRequestError" &&
    typeof value.status === "number" &&
    "payload" in value
  );
}

function getStringField(value: unknown, key: string) {
  if (!isRecord(value)) return "";
  const field = value[key];
  return typeof field === "string" ? field : "";
}

function collectStringsDeep(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringsDeep(item, seen));
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((item) => collectStringsDeep(item, seen));
}

function collectValidationMessages(payload: unknown) {
  if (!isRecord(payload)) return "";

  const directErrors = payload.errors;
  const nestedErrors = isRecord(payload.data) ? payload.data.errors : undefined;
  const candidates = [directErrors, nestedErrors].filter(Boolean);

  for (const candidate of candidates) {
    const messages = collectStringsDeep(candidate)
      .map((item) => item.trim())
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return "";
}

function extractStatusFromMessage(message: string) {
  const match = message.match(/\b(?:HTTP\s*)?([1-5]\d{2})\b/i);
  return match ? Number(match[1]) : undefined;
}

export function getErrorParts(error: unknown): ErrorParts {
  if (isApiRequestError(error)) {
    const validationMessages = collectValidationMessages(error.payload);
    return {
      status: error.status,
      message: error.message,
      detail:
        getStringField(error.payload, "detail") ||
        getStringField(error.payload, "error") ||
        validationMessages ||
        getStringField(error.payload, "message"),
      payload: error.payload,
    };
  }

  if (error instanceof Error) {
    return {
      status: extractStatusFromMessage(error.message),
      message: error.message,
      detail: "",
      payload: undefined,
    };
  }

  if (isRecord(error)) {
    const statusField = error.status ?? error.statusCode ?? error.code;
    const status = typeof statusField === "number" ? statusField : undefined;
    const validationMessages = collectValidationMessages(error);

    return {
      status,
      message: getStringField(error, "message") || getStringField(error, "error"),
      detail: getStringField(error, "detail") || validationMessages,
      payload: error,
    };
  }

  return {
    status: undefined,
    message: typeof error === "string" ? error : "",
    detail: "",
    payload: undefined,
  };
}

function makeResourceLabel(resource?: string) {
  return resource?.trim() || "this information";
}

function makeActionLabel(action?: FriendlyErrorOptions["action"]) {
  switch (action) {
    case "create":
      return "create";
    case "update":
      return "update";
    case "delete":
      return "delete";
    case "submit":
      return "submit";
    case "export":
      return "export";
    case "verify":
      return "verify";
    case "load":
    default:
      return "load";
  }
}

function getDefaultFallback(options: FriendlyErrorOptions) {
  const resource = makeResourceLabel(options.resource);
  const action = makeActionLabel(options.action);

  return options.fallbackMessage || `We could not ${action} ${resource} right now. Please try again.`;
}

function getKnownFriendlyMessage(
  combinedMessage: string,
  audience: FriendlyErrorAudience
) {
  if (combinedMessage.includes("email already exists")) {
    return audience === "admin"
      ? "This email address is already in use. Enter a different email address and try again."
      : "This email address is already in use. Please enter a different one.";
  }

  if (
    combinedMessage.includes("mobile already exists") ||
    combinedMessage.includes("phone already exists")
  ) {
    return audience === "admin"
      ? "This mobile number is already in use. Enter a different mobile number and try again."
      : "This mobile number is already in use. Please enter a different one.";
  }

  if (
    combinedMessage.includes("already exists") ||
    combinedMessage.includes("already taken") ||
    combinedMessage.includes("duplicate")
  ) {
    return audience === "admin"
      ? "A record with the same details already exists. Review the entered values and try again."
      : "A matching record already exists. Please review the details and try again.";
  }

  return "";
}

export function getFriendlyError(error: unknown, options: FriendlyErrorOptions = {}): FriendlyError {
  const audience = options.audience ?? "client";
  const resource = makeResourceLabel(options.resource);
  const parts = getErrorParts(error);
  const combinedMessage = `${parts.message} ${parts.detail}`.trim().toLowerCase();
  const status = parts.status;
  const knownFriendlyMessage = getKnownFriendlyMessage(combinedMessage, audience);

  // Backend marks feature-disabled responses with code FEATURE_DISABLED and a
  // human-readable message. Surface that message instead of a generic 403.
  if (
    parts.payload &&
    isRecord(parts.payload) &&
    parts.payload.code === "FEATURE_DISABLED"
  ) {
    const featureMessage = getStringField(parts.payload, "message");
    if (featureMessage) {
      return {
        title: "Service temporarily unavailable",
        message: featureMessage,
        status,
        severity: "warning",
        canRetry: false,
      };
    }
  }

  if (!combinedMessage || combinedMessage === "failed to fetch" || combinedMessage.includes("networkerror")) {
    return {
      title: "Connection issue",
      message: "Unable to connect right now. Please check your connection and try again.",
      status,
      severity: "warning",
      canRetry: true,
    };
  }

  if (
    combinedMessage.includes("dealrequest") ||
    combinedMessage.includes("dealrequestbylogins") ||
    combinedMessage.includes("manager api")
  ) {
    return {
      title: "No trade records found",
      message: "No trade records were found for this account and date range. Please check the MT5 login or choose a different date range.",
      status,
      severity: "info",
      canRetry: true,
    };
  }

  if (combinedMessage.includes("authentication required")) {
    return {
      title: "Sign in required",
      message: "Please sign in again to continue.",
      status: status ?? 401,
      severity: "warning",
      canRetry: false,
    };
  }

  if (knownFriendlyMessage) {
    return {
      title: "Check the details",
      message: knownFriendlyMessage,
      status,
      severity: "warning",
      canRetry: true,
    };
  }

  switch (status) {
    case 400:
      return {
        title: "Check the details",
        message:
          parts.detail ||
          parts.message ||
          options.validationMessage ||
          (audience === "admin"
            ? "The request could not be processed. Review the filters or form values and try again."
            : "Some information looks incorrect. Please review the details and try again."),
        status,
        severity: "warning",
        canRetry: true,
      };
    case 401:
      return {
        title: "Session expired",
        message: options.unauthorizedMessage || "Your session has expired. Please sign in again.",
        status,
        severity: "warning",
        canRetry: false,
      };
    case 403:
      return {
        title: "Access restricted",
        message:
          options.forbiddenMessage ||
          (audience === "admin"
            ? "Your account does not have permission to perform this admin action."
            : "You do not have permission to access this information."),
        status,
        severity: "warning",
        canRetry: false,
      };
    case 404:
      return {
        title: "Not found",
        message:
          options.notFoundMessage ||
          `${resource.charAt(0).toUpperCase()}${resource.slice(1)} was not found. It may have been removed or is no longer available.`,
        status,
        severity: "info",
        canRetry: true,
      };
    case 409:
      return {
        title: "Refresh needed",
        message: "This record may have changed. Refresh the page and try again.",
        status,
        severity: "warning",
        canRetry: true,
      };
    case 422:
      return {
        title: "Review required",
        message: parts.detail || parts.message || options.validationMessage || "Some information needs correction. Please review the details and try again.",
        status,
        severity: "warning",
        canRetry: true,
      };
    case 429:
      return {
        title: "Too many attempts",
        message: "Please wait a moment before trying again.",
        status,
        severity: "warning",
        canRetry: true,
      };
    case 500:
      return {
        title: "Something went wrong",
        message: "Something went wrong on our side. Please try again in a moment.",
        status,
        severity: "error",
        canRetry: true,
      };
    case 502:
    case 503:
    case 504:
      return {
        title: "Service unavailable",
        message: "The service is temporarily unavailable. Please try again in a moment.",
        status,
        severity: "warning",
        canRetry: true,
      };
    default:
      return {
        title: options.fallbackTitle || "Unable to complete request",
        message: getDefaultFallback(options),
        status,
        severity: "error",
        canRetry: true,
      };
  }
}

export function getFriendlyErrorMessage(error: unknown, options: FriendlyErrorOptions = {}) {
  return getFriendlyError(error, options).message;
}
