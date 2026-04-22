import { Badge } from "@/components/ui/badge";
import { formatDateTimeInIST } from "@/lib/formatters";

export type TransactionStatusOption = {
  value: string;
  label: string;
  featureKey: string;
  statuses: string[];
};

export const DEPOSIT_STATUS_OPTIONS: TransactionStatusOption[] = [
  { value: "pending", label: "Pending", featureKey: "pendingDepositList", statuses: ["pending"] },
  { value: "approved", label: "Approved", featureKey: "approveDepositList", statuses: ["approved"] },
  { value: "rejected", label: "Rejected", featureKey: "rejectDepositList", statuses: ["rejected"] },
];

export const WITHDRAWAL_STATUS_OPTIONS: TransactionStatusOption[] = [
  { value: "pending", label: "Pending", featureKey: "pendingWithdrawalList", statuses: ["pending"] },
  { value: "approved", label: "Approved", featureKey: "approveWithdrawalList", statuses: ["approved"] },
  { value: "rejected", label: "Rejected", featureKey: "rejectWithdrawalList", statuses: ["rejected"] },
];

export const fmtDateTime = (s?: string | null) => {
  if (!s) return "â€”";
  try {
    return formatDateTimeInIST(s);
  } catch {
    return s;
  }
};

export const formatAmount = (amount: string) => {
  try {
    const num = parseFloat(amount);
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  } catch {
    return amount;
  }
};

export const statusBadge = (status: string) => {
  switch (status) {
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          Pending
        </Badge>
      );
  }
};
