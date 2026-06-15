import { Badge } from "@/components/ui/badge";
import { formatDateTimeInIST } from "@/lib/formatters";

export const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return formatDateTimeInIST(s);
  } catch {
    return s;
  }
};

/** API returns processed_at already in IST (no zone suffix). Append IST offset so it is not treated as UTC. */
export const fmtISTDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return formatDateTimeInIST(`${s}+05:30`);
  } catch {
    return s;
  }
};

export const formatAmount = (amount?: string | number | null) => {
  if (amount === undefined || amount === null) return "0.00";
  try {
    const num = typeof amount === "number" ? amount : parseFloat(String(amount));
    if (Number.isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return String(amount);
  }
};

export const statusBadge = (status: string) => {
  switch (status) {
    case "completed":
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 capitalize">
          {status}
        </Badge>
      );
    case "rejected":
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 capitalize">
          {status}
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300 capitalize">
          {status}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 capitalize">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export const transactionTypeLabel = (type?: string | null): string => {
  if (!type) return "-";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
