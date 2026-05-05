"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Key, RefreshCcw } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { userMT5AccountsApi } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";

type PasswordResetType = "main" | "investor";

type ClientMt5PasswordResetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: number | null;
  accountLabel?: string | null;
  token?: string | null;
};

const PASSWORD_LENGTH = 12;
const PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length: number = PASSWORD_LENGTH) {
  return Array.from({ length }, () => PASSWORD_CHARACTERS[Math.floor(Math.random() * PASSWORD_CHARACTERS.length)]).join("");
}

export function ClientMt5PasswordResetDialog({
  open,
  onOpenChange,
  accountId,
  accountLabel,
  token,
}: ClientMt5PasswordResetDialogProps) {
  const [passwordType, setPasswordType] = useState<PasswordResetType>("main");
  const [newPassword, setNewPassword] = useState(() => generatePassword());
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordTypeLabel = useMemo(
    () => (passwordType === "main" ? "Main Password" : "Investor Password"),
    [passwordType]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setPasswordType("main");
    setNewPassword(generatePassword());
    setResetPasswordResult(null);
    setIsSubmitting(false);
  }, [accountId, open]);

  const handleRegeneratePassword = () => {
    setNewPassword(generatePassword());
    setResetPasswordResult(null);
  };

  const handleCopy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleSubmit = async () => {
    if (!token || !accountId) {
      toast.error("Authentication required");
      return;
    }

    if (!newPassword.trim()) {
      toast.error("Enter a password to continue");
      return;
    }

    try {
      setIsSubmitting(true);
      setResetPasswordResult(null);

      const payload = { new_password: newPassword };
      let nextPassword = newPassword;
      let successMessage = `${passwordTypeLabel} reset successfully`;

      if (passwordType === "main") {
        const response = await userMT5AccountsApi.resetMainPassword(accountId, payload, token, newPassword.length);
        nextPassword = response.data?.main_password ?? newPassword;
        successMessage = response.message || successMessage;
      } else {
        const response = await userMT5AccountsApi.resetInvestorPassword(accountId, payload, token, newPassword.length);
        nextPassword = response.data?.investor_password ?? newPassword;
        successMessage = response.message || successMessage;
      }

      setNewPassword(nextPassword);
      setResetPasswordResult(nextPassword);
      toast.success(successMessage);
    } catch (error) {
      console.error(`Failed to reset ${passwordType} password for MT5 account ${accountId}:`, error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: `${passwordType} MT5 password`,
          action: "reset",
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-border/70 bg-card/95 p-0 shadow-xl sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-xl font-semibold text-foreground">Reset MT5 Password</DialogTitle>
          <DialogDescription>
            {accountLabel ? `Generate a new password for ${accountLabel}.` : "Generate a new MT5 password for this account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-1">
            <Button
              type="button"
              variant={passwordType === "main" ? "default" : "ghost"}
              className="rounded-lg"
              onClick={() => {
                setPasswordType("main");
                setResetPasswordResult(null);
              }}
            >
              Main Password
            </Button>
            <Button
              type="button"
              variant={passwordType === "investor" ? "default" : "ghost"}
              className="rounded-lg"
              onClick={() => {
                setPasswordType("investor");
                setResetPasswordResult(null);
              }}
            >
              Investor Password
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="mt5-password-reset-input" className="text-sm font-medium text-foreground">
                New {passwordTypeLabel}
              </label>
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={handleRegeneratePassword}>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="mt5-password-reset-input"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setResetPasswordResult(null);
                }}
                placeholder="Enter a new password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => void handleCopy(newPassword, passwordTypeLabel)}
                disabled={!newPassword}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The request sends the password length as <code>{newPassword.length || 0}</code> and uses the same value in the reset payload.
            </p>
          </div>

          {resetPasswordResult ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="h-4 w-4 text-primary" />
                Updated {passwordTypeLabel}
              </div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-semibold text-foreground">
                  {resetPasswordResult}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => void handleCopy(resetPasswordResult, `${passwordTypeLabel} result`)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-3 border-t border-border/60 px-6 py-5 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting || !newPassword.trim()}>
            {isSubmitting ? "Resetting..." : `Reset ${passwordTypeLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
