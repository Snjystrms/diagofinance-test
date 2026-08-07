"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { AdminIbCommissionItem } from "@/lib/api";
import { coerceBoolean } from "../_lib/ib-commission";

type IbCommissionViewDialogProps = {
  detail: AdminIbCommissionItem | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function IbCommissionViewDialog({
  detail,
  loading,
  open,
  onOpenChange,
  onEdit,
}: IbCommissionViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>IB Commission Assignment</DialogTitle>
          <DialogDescription>Details of the assigned IB commission.</DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="py-6 text-sm text-muted-foreground">
            Loading commission details...
          </div>
        ) : detail ? (
          <div className="py-2">
            <DetailRow
              label="User"
              value={
                <span>
                  <span className="block">{detail.user_name || "-"}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {detail.user_email || "-"}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {detail.user_uuid || "-"}
                  </span>
                </span>
              }
            />
            <DetailRow
              label="IB Plan"
              value={
                <span>
                  <span className="block">{detail.plan_name || "-"}</span>
                </span>
              }
            />
            <DetailRow
              label="Status"
              value={
                <Badge
                  variant={coerceBoolean(detail.status) ? "default" : "secondary"}
                  className="capitalize"
                >
                  {coerceBoolean(detail.status) ? "Active" : "Inactive"}
                </Badge>
              }
            />
            <DetailRow
              label="Assigned By"
              value={detail.assigned_by || "-"}
            />
            <DetailRow
              label="Created At"
              value={formatDateTime(detail.created_at)}
            />
            <DetailRow
              label="Updated At"
              value={formatDateTime(detail.updated_at)}
            />
          </div>
        ) : null}

        {onEdit ? (
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" onClick={onEdit}>
              Edit Commission
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
