import { AlertCircle, LockKeyhole, RefreshCw, SearchX, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getFriendlyError,
  type FriendlyError,
  type FriendlyErrorAudience,
  type FriendlyErrorOptions,
} from "@/lib/friendly-errors";
import { cn } from "@/lib/utils";

type ApiErrorStateVariant = "inline" | "panel" | "empty";

interface ApiErrorStateProps extends FriendlyErrorOptions {
  error?: unknown;
  friendlyError?: FriendlyError;
  title?: string;
  message?: string;
  audience?: FriendlyErrorAudience;
  variant?: ApiErrorStateVariant;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showStatusCode?: boolean;
}

function getIcon(friendlyError: FriendlyError) {
  if (friendlyError.title.toLowerCase().includes("connection")) {
    return WifiOff;
  }

  if (friendlyError.status === 401 || friendlyError.status === 403) {
    return LockKeyhole;
  }

  if (friendlyError.status === 404 || friendlyError.severity === "info") {
    return SearchX;
  }

  return AlertCircle;
}

function getToneClasses(friendlyError: FriendlyError) {
  switch (friendlyError.severity) {
    case "info":
      return {
        container: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100",
        icon: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
      };
    case "warning":
      return {
        container: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
        icon: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
      };
    case "error":
    default:
      return {
        container: "border-destructive/35 bg-destructive/10 text-destructive dark:border-destructive/40",
        icon: "bg-destructive/10 text-destructive",
      };
  }
}

export function ApiErrorState({
  error,
  friendlyError,
  title,
  message,
  audience = "client",
  resource,
  action,
  fallbackTitle,
  fallbackMessage,
  validationMessage,
  notFoundMessage,
  unauthorizedMessage,
  forbiddenMessage,
  variant = "inline",
  className,
  onRetry,
  retryLabel = "Try again",
  showStatusCode = false,
}: ApiErrorStateProps) {
  const normalizedError =
    friendlyError ||
    (message && !error
      ? {
          title: title || fallbackTitle || "Action needed",
          message,
          severity: "warning" as const,
          canRetry: false,
        }
      : getFriendlyError(error, {
          audience,
          resource,
          action,
          fallbackTitle,
          fallbackMessage,
          validationMessage,
          notFoundMessage,
          unauthorizedMessage,
          forbiddenMessage,
        }));

  const displayTitle = title || normalizedError.title;
  const displayMessage = message || normalizedError.message;
  const tone = getToneClasses(normalizedError);
  const Icon = getIcon(normalizedError);

  if (variant === "empty") {
    return (
      <div className={cn("rounded-lg border border-dashed px-6 py-12 text-center", tone.container, className)}>
        <div className={cn("mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full", tone.icon)}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold">{displayTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm opacity-85">{displayMessage}</p>
        {showStatusCode && normalizedError.status && (
          <p className="mt-2 text-xs opacity-70">Error code: {normalizedError.status}</p>
        )}
        {onRetry && normalizedError.canRetry && (
          <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-3 my-3 flex flex-col gap-3 rounded-lg border p-4 sm:mx-0 sm:my-4 sm:flex-row",
        variant === "panel" && "p-5 shadow-sm sm:p-5",
        tone.container,
        className
      )}
      role="alert"
    >
      <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone.icon)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{displayTitle}</div>
        <div className="mt-1 text-sm opacity-85">{displayMessage}</div>
        {showStatusCode && normalizedError.status && (
          <div className="mt-1 text-xs opacity-70">Error code: {normalizedError.status}</div>
        )}
      </div>
      {onRetry && normalizedError.canRetry && (
        <Button type="button" variant="outline" size="sm" className="w-full shrink-0 self-start sm:w-auto" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
