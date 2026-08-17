import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureDisabledPanelProps {
  title: string;
  message: string;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function FeatureDisabledPanel({
  title,
  message,
  showBackButton = true,
  backHref = "/dashboard",
  backLabel = "Go Back to Dashboard",
}: FeatureDisabledPanelProps) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-12">
      <Card className="relative w-full max-w-lg overflow-hidden rounded-[28px] border-2 border-border/60 bg-card shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardContent className="flex flex-col items-center space-y-6 px-8 pb-10 pt-10 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10 shadow-md">
            <div className="absolute inset-0 animate-pulse rounded-3xl bg-amber-500/5" />
            <Lock className="h-10 w-10 text-amber-500" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>
          </div>

          {showBackButton && (
            <div className="w-full pt-4">
              <Button
                asChild
                className="h-12 w-full rounded-xl font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
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

interface FeatureDisabledNoteProps {
  title: string;
  message: string;
}

export function FeatureDisabledNote({ title, message }: FeatureDisabledNoteProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
        <Lock className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          {title}
        </p>
        <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
          {message}
        </p>
      </div>
    </div>
  );
}
