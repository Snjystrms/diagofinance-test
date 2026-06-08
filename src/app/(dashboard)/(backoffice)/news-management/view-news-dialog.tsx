"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { adminNewsApi, type NewsItem } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTimeInIST } from "@/lib/formatters";

type ViewNewsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemType: "news" | "promotion";
  initialData?: DetailState | null;
};

type DetailState = {
  id: string;
  title: string;
  short_description: string;
  description: string;
  image?: string;
  image_url?: string;
  status: boolean;
  type: "news" | "promotion";
  created_at?: string;
  updated_at?: string;
};

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

const normalizeDetail = (item: NewsItem): DetailState => ({
  id: String(item.id),
  title: item.title ?? "",
  short_description: item.short_description ?? "",
  description: item.description ?? "",
  image: item.image,
  image_url: item.image_url,
  status: Number(item.status) === 1,
  type: (item.type as "news" | "promotion") ?? "news",
  created_at: item.created_at,
  updated_at: item.updated_at,
});

export function ViewNewsDialog({
  open,
  onOpenChange,
  itemId,
  itemType,
  initialData,
}: ViewNewsDialogProps) {
  const { token } = useAuth();
  const [data, setData] = useState<DetailState | null>(initialData ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    if (initialData) {
      setData(initialData);
      setError(null);
      return;
    }

    if (!token || !itemId) {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    adminNewsApi
      .get(itemId, token)
      .then((res) => {
        if (cancelled) return;
        const item = res?.data?.data;
        if (item) {
          setData(normalizeDetail(item));
        } else {
          setError(res?.message || "Failed to load details");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          getAdminFriendlyErrorMessage(e, {
            resource: itemType === "promotion" ? "promotions" : "news",
            action: "view",
          })
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, itemId, token, initialData, itemType]);

  const label = itemType === "promotion" ? "Promotion" : "News";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            View {label}
            {data?.id ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                #{data.id}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Detailed information for this {label.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 py-2">
            {data.image_url ? (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Image
                </div>
                <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.image_url}
                    alt={data.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Image
                </div>
                <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25">
                  <div className="text-center">
                    <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      No image available
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Title" value={data.title} />
              {/* <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Type
                </div>
                <div>
                  <Badge
                    className={
                      data.type === "promotion"
                        ? "bg-purple-100 text-purple-700 border-purple-300 capitalize"
                        : "bg-blue-100 text-blue-700 border-blue-300 capitalize"
                    }
                  >
                    {data.type}
                  </Badge>
                </div>
              </div> */}
            </div>

            <DetailField label="Short Description" value={data.short_description} />
            <DetailField
              label="Description"
              value={data.description}
              multiline
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </div>
                <div>
                  <Badge
                    variant="outline"
                    className={
                      data.status
                        ? "border-green-500 text-green-700 bg-green-50"
                        : "border-slate-400 text-slate-600 bg-slate-50"
                    }
                  >
                    {data.status ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <DetailField label="Created" value={fmtDate(data.created_at)} />
              <DetailField label="Updated" value={fmtDate(data.updated_at)} />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({
  label,
  value,
  multiline,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
}) {
  const display = value && value.length > 0 ? value : "-";
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {multiline ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap break-words">
          {display}
        </div>
      ) : (
        <div className="text-sm break-words">{display}</div>
      )}
    </div>
  );
}
