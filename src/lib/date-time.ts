export const IST_TIME_ZONE = "Asia/Kolkata";

type DateInput = Date | string | number | null | undefined;

const ISO_DATE_TIME_WITHOUT_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/;

const TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const DEFAULT_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function parseApiDate(value: DateInput): Date | null {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue =
    typeof value === "string" &&
    ISO_DATE_TIME_WITHOUT_ZONE.test(value.trim()) &&
    !TIME_ZONE_SUFFIX.test(value.trim())
      ? `${value.trim()}Z`
      : value;

  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatInIST(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_TIME_OPTIONS,
  fallback = "-",
): string {
  const date = parseApiDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat("en-US", {
    ...DEFAULT_DATE_TIME_OPTIONS,
    ...options,
    timeZone: IST_TIME_ZONE,
  }).format(date);
}

export function formatDateTimeInIST(value: DateInput, fallback = "-"): string {
  const formatted = formatInIST(value, DEFAULT_DATE_TIME_OPTIONS, "");
  if (!formatted) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  return `${formatted} IST`;
}

/**
 * Format an API datetime string that is ALREADY in IST (no timezone suffix).
 * Unlike formatDateTimeInIST which treats bare strings as UTC (appending Z),
 * this function treats them as IST by appending +05:30 before parsing.
 * e.g. formatApiDateTimeAsIST("2026-07-02T12:11:42") => "Jul 2, 2026, 12:11 PM IST"
 */
export function formatApiDateTimeAsIST(value: DateInput, fallback = "-"): string {
  if (value === undefined || value === null || value === "") return fallback;

  let normalized = value;
  if (
    typeof value === "string" &&
    ISO_DATE_TIME_WITHOUT_ZONE.test(value.trim()) &&
    !TIME_ZONE_SUFFIX.test(value.trim())
  ) {
    // Append IST offset so it's parsed as-is without UTC conversion
    normalized = `${value.trim()}+05:30`;
  }

  const date = new Date(normalized as string);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" && value.trim() ? value : fallback;
  }

  const formatted = new Intl.DateTimeFormat("en-US", {
    ...DEFAULT_DATE_TIME_OPTIONS,
    timeZone: IST_TIME_ZONE,
  }).format(date);

  return `${formatted} IST`;
}
