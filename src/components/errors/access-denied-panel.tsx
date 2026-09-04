import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AccessDeniedPanelProps {
  title?: string;
  message?: string;
  variant?: "default" | "inline";
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function AccessDeniedPanel({
  title = "Access restricted",
  message = "Your account does not have permission to access this page or feature.",
  variant = "default",
  showBackButton = true,
  backHref = "/dashboard",
  backLabel = "Go Back to Dashboard",
}: AccessDeniedPanelProps) {
  if (variant === "inline") {
    return (
      <div className="flex min-h-[30vh] w-full items-center justify-center px-4 py-6">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="relative h-24 w-24">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-red-400/25 via-rose-400/20 to-amber-400/10 blur-xl" />
            <Image
              src="/service_unavailable.png"
              alt="Access restricted"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-8">
      <Card className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/30 shadow-lg">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        <CardContent className="relative flex flex-col items-center space-y-4 px-6 pb-7 pt-8 text-center">
          <div className="relative h-50 w-50">
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-red-400/25 via-rose-400/20 to-amber-400/10 blur-2xl" />
            <Image
              src="/service_unavailable.png"
              alt="Access restricted"
              fill
              className="object-contain drop-shadow-md"
              priority
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>

          {showBackButton && (
            <div className="w-full pt-2">
              <Button
                asChild
                size="sm"
                className="h-9 w-full rounded-lg font-medium shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <Link href={backHref}>
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  {backLabel}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface AccessDeniedNoteProps {
  title: string;
  message: string;
}

export function AccessDeniedNote({
  title,
  message,
}: AccessDeniedNoteProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-left dark:border-red-900 dark:bg-red-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
        <Lock className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-900 dark:text-red-100">
          {title}
        </p>
        <p className="text-sm text-red-800/80 dark:text-red-300/80">
          {message}
        </p>
      </div>
    </div>
  );
}
