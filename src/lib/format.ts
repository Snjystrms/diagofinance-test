import { formatInIST } from "./date-time";

export function formatDate(
  date: Date | string | number | undefined,
  opts: Intl.DateTimeFormatOptions = {},
) {
  if (!date) return "";

  try {
    return formatInIST(date, {
      month: opts.month ?? "long",
      day: opts.day ?? "numeric",
      year: opts.year ?? "numeric",
      ...opts,
    }, "");
  } catch (_err) {
    return "";
  }
}

export function formatCurrency(
  amount: number | string | undefined,
  currency: string = "USD",
): string {
  if (amount === undefined || amount === null) return `0.00 ${currency}`;

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(numAmount)) return `0.00 ${currency}`;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  } catch (_err) {
    return `${numAmount.toFixed(2)} ${currency}`;
  }
}
