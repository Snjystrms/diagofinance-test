"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentKind = "image" | "pdf" | "file";

interface AuthenticatedDocumentViewerProps {
  src?: string | null;
  fileName?: string | null;
  label: string;
  mode?: "thumbnail" | "embedded";
  previewClassName?: string;
  dialogClassName?: string;
  imageFit?: "contain" | "cover";
  allowDialog?: boolean;
  emptyText?: string;
}

const guessDocumentKind = (
  value?: string | null,
  mimeType?: string | null,
): DocumentKind => {
  const normalizedValue = (value || "").toLowerCase();
  const normalizedType = (mimeType || "").toLowerCase();

  if (
    normalizedType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(normalizedValue)
  ) {
    return "image";
  }

  if (
    normalizedType.includes("pdf") ||
    /\.pdf(\?|#|$)/i.test(normalizedValue)
  ) {
    return "pdf";
  }

  return "file";
};

const isDirectBrowserUrl = (value: string) =>
  value.startsWith("blob:") || value.startsWith("data:");

export function AuthenticatedDocumentViewer({
  src,
  fileName,
  label,
  mode = "thumbnail",
  previewClassName,
  dialogClassName,
  imageFit = "contain",
  allowDialog = true,
  emptyText = "No document uploaded",
}: AuthenticatedDocumentViewerProps) {
  const { token } = useAuth();
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [detectedMimeType, setDetectedMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(src));
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [inlinePdfLoading, setInlinePdfLoading] = useState(true);
  const [dialogPdfLoading, setDialogPdfLoading] = useState(true);

  const documentKind = useMemo(
    () => guessDocumentKind(fileName || src, detectedMimeType),
    [detectedMimeType, fileName, src],
  );

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      setDetectedMimeType(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (isDirectBrowserUrl(src)) {
      setResolvedSrc(src);
      setDetectedMimeType(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(src, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }

        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
        setDetectedMimeType(blob.type || null);
        setLoading(false);
      } catch (fetchError) {
        console.error("Failed to load authenticated document:", fetchError);
        if (!cancelled) {
          setResolvedSrc(null);
          setDetectedMimeType(null);
          setError("Failed to load document");
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, token]);

  useEffect(() => {
    setInlinePdfLoading(documentKind === "pdf");
  }, [documentKind, resolvedSrc, mode]);

  useEffect(() => {
    if (open) {
      setDialogPdfLoading(documentKind === "pdf");
    }
  }, [documentKind, open, resolvedSrc]);

  const renderLoading = (className?: string) => (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );

  const renderError = (className?: string) => (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border border-dashed bg-muted/20 px-3 text-xs text-muted-foreground",
        className,
      )}
    >
      {error || "Failed to load document"}
    </div>
  );

  const renderEmpty = (className?: string) => (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 px-3 text-muted-foreground",
        className,
      )}
    >
      <FileText className="h-8 w-8 opacity-60" />
      <span className="text-xs">{emptyText}</span>
    </div>
  );

  const renderPdfFrame = ({
    className,
    loadingState,
    setLoadingState,
  }: {
    className?: string;
    loadingState: boolean;
    setLoadingState: (value: boolean) => void;
  }) => {
    if (!resolvedSrc) return renderError(className);

    return (
      <div className={cn("relative", className)}>
        {loadingState ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border bg-background/80">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        <iframe
          src={resolvedSrc}
          title={label}
          className={cn("h-full w-full rounded-md border", className)}
          onLoad={() => setLoadingState(false)}
        />
      </div>
    );
  };

  const renderPreviewContent = (renderMode: "thumbnail" | "embedded" | "dialog") => {
    const computedClassName =
      renderMode === "dialog"
        ? "h-[80vh] w-full"
        : previewClassName;

    if (loading) return renderLoading(computedClassName);
    if (!src) return renderEmpty(computedClassName);
    if (!resolvedSrc) return renderError(computedClassName);

    if (documentKind === "image") {
      return (
        <img
          src={resolvedSrc}
          alt={label}
          className={cn(
            "rounded-md",
            imageFit === "cover" ? "object-cover" : "object-contain",
            renderMode === "dialog" ? "max-h-[80vh] w-auto max-w-full" : computedClassName,
          )}
        />
      );
    }

    if (documentKind === "pdf") {
      if (renderMode === "thumbnail") {
        return (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 px-3 text-center",
              computedClassName,
            )}
          >
            <FileText className="h-8 w-8 text-rose-600" />
            <span className="text-xs font-medium text-muted-foreground">PDF Document</span>
          </div>
        );
      }

      return renderPdfFrame({
        className: computedClassName,
        loadingState: renderMode === "dialog" ? dialogPdfLoading : inlinePdfLoading,
        setLoadingState: renderMode === "dialog" ? setDialogPdfLoading : setInlinePdfLoading,
      });
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border bg-muted/30 px-3 text-center",
          computedClassName,
        )}
      >
        <FileText className="h-8 w-8 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Document Preview</span>
      </div>
    );
  };

  const canOpenDialog = allowDialog && !loading && !!resolvedSrc;

  return (
    <>
      {mode === "thumbnail" ? (
        <button
          type="button"
          onClick={() => canOpenDialog && setOpen(true)}
          disabled={!canOpenDialog}
          className={cn(
            "block text-left",
            canOpenDialog ? "cursor-pointer" : "cursor-default",
          )}
        >
          {renderPreviewContent("thumbnail")}
        </button>
      ) : (
        <div className="relative">
          {renderPreviewContent("embedded")}
          {canOpenDialog ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8 shadow-sm"
              onClick={() => setOpen(true)}
            >
              <Eye className="h-4 w-4 text-foreground/80" />
              <span className="sr-only">Open preview</span>
            </Button>
          ) : null}
        </div>
      )}

      {allowDialog ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className={cn("max-w-5xl", dialogClassName)}>
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
              <DialogDescription>
                View the uploaded document without leaving this page.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center">
              {renderPreviewContent("dialog")}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
