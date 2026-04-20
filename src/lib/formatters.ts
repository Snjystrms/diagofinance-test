/**
 * Shared formatting utilities. Import from here instead of defining locally in each page.
 */

import { formatDateTimeInIST } from "./date-time";

export { formatDate, formatCurrency } from "./format";
export { formatInIST, formatDateTimeInIST, IST_TIME_ZONE, parseApiDate } from "./date-time";

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
 * Format API timestamps in IST.
 * e.g. formatDateTime("2026-04-20T08:46:35") => "Apr 20, 2026, 02:16 PM IST"
 */
export function formatDateTime(value?: string | null): string {
  return formatDateTimeInIST(value, "-");
}

/**
 * Short alias for formatDateTime.
 */
export const fmtDateTime = formatDateTime;
