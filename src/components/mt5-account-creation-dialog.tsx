"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight } from "lucide-react";

interface Mt5AccountCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAccount?: () => void;
  onSkip?: () => void;
}

export function Mt5AccountCreationDialog({
  open,
  onOpenChange,
  onCreateAccount,
  onSkip,
}: Mt5AccountCreationDialogProps) {
  const handleCreateAccount = () => {
    onOpenChange(false);
    onCreateAccount?.();
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSkip?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TrendingUp className="h-5 w-5 text-primary" />
            Create MT5 Account
          </DialogTitle>
          <DialogDescription className="pt-2 text-base text-muted-foreground">
            Set up your MT5 trading account to access global markets and start trading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4 backdrop-blur-sm">
            <div className="flex-shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="mb-1 text-sm font-semibold text-foreground">
                Ready to Trade?
              </h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Create your MT5 account to access forex, commodities, indices, and more.
              </p>
              <Button size="sm" onClick={handleCreateAccount}>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="border-border/80 bg-background/70"
          >
            I&apos;ll do this later
          </Button>
          <Button onClick={handleCreateAccount}>Create MT5 Account</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}