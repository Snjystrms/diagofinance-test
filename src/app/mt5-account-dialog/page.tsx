"use client";

import { useState } from "react";
import { Mt5AccountCreationDialog } from "@/components/mt5-account-creation-dialog";
import { Button } from "@/components/ui/button";

export default function Mt5AccountDialogPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--primary)_8%,transparent),transparent_55%)]" />

      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-primary">
          Temporary preview
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          MT5 Account Creation Dialog
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          The dialog opens automatically. Press Escape or click outside to
          close it, then use the button below to reopen it.
        </p>
        <Button onClick={() => setOpen(true)} className="mt-6">
          Reopen dialog
        </Button>
      </main>

      <Mt5AccountCreationDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
