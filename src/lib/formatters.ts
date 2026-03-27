/**
 * Shared formatting utilities. Import from here instead of defining locally in each page.
 */

export { formatDate, formatCurrency } from "./format";

/**
 * Format a numeric amount with 2 decimal places, optionally with currency symbol.
 * e.g. formatAmount(1234.5) => "1,234.50"
 */
export function formatAmount(amount?: number | string | null, currency?: string): string {
  if (amount === undefined || amount === null) return currency ? `0.00 ${currency}` : "0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return currency ? `0.00 ${currency}` : "0.00";
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${formatted} ${currency}` : formatted;
}

/**
 * Format an ISO date-time string to locale date+time string.
 * e.g. formatDateTime("2024-01-15T10:30:00Z") => "Jan 15, 2024, 10:30 AM"
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Short alias for formatDateTime.
 */
export const fmtDateTime = formatDateTime;
