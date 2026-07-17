"use client";

import { useState, useEffect } from "react";
import { Loader2, LogIn, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  adminLoginAsClient,
  adminLoginAsClientWith2FA,
  openClientPortalInNewTab,
  getClientPortalUrl,
} from "@/utils/admin-client-login";
import { adminUsersApi } from "@/lib/api-auth-admin";

interface AdminLoginAsClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userEmail: string;
  userPassword: string | null;
  adminToken: string;
}

export function AdminLoginAsClientDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  userPassword: initialPassword,
  adminToken,
}: AdminLoginAsClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [userPassword, setUserPassword] = useState<string | null>(initialPassword);
  const [decryptingPassword, setDecryptingPassword] = useState(false);

  // Decrypt password when dialog opens if not already decrypted
  useEffect(() => {
    if (open && !userPassword && !decryptingPassword && adminToken) {
      const decryptPassword = async () => {
        setDecryptingPassword(true);
        try {
          const response = await adminUsersApi.decryptPassword(String(userId), adminToken);
          const password = response.data?.password || null;
          setUserPassword(password);
          if (!password) {
            toast.error("Could not decrypt user password");
          }
        } catch (error) {
          console.error("Failed to decrypt password:", error);
          toast.error("Failed to decrypt user password");
        } finally {
          setDecryptingPassword(false);
        }
      };
      void decryptPassword();
    }
  }, [open, userPassword, userId, adminToken, decryptingPassword]);

  // Update password if provided externally
  useEffect(() => {
    if (initialPassword) {
      setUserPassword(initialPassword);
    }
  }, [initialPassword]);

  const handleLogin = async () => {
    if (!userPassword) {
      toast.error("Password not available. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const result = await adminLoginAsClient({
        userId,
        email: userEmail,
        password: userPassword,
        adminToken,
      });

      if (result.success && result.redirectUrl) {
        toast.success("Logging in as client...");
        
        // Open client portal in new tab with token
        openClientPortalInNewTab(result.redirectUrl, result.clientToken!);
        
        onOpenChange(false);
      } else if (result.requires2FA) {
        setRequires2FA(true);
        toast("This user has 2FA enabled. Please provide the 2FA code.");
      } else {
        toast.error(result.error || "Failed to login as client");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login as client");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit 2FA code");
      return;
    }

    setLoading(true);

    try {
      const result = await adminLoginAsClientWith2FA(userEmail, otpCode);

      if (result.success && result.redirectUrl) {
        toast.success("2FA verified! Logging in as client...");
        
        // Open client portal in new tab with token
        openClientPortalInNewTab(result.redirectUrl, result.clientToken!);
        
        onOpenChange(false);
        setRequires2FA(false);
        setOtpCode("");
      } else {
        toast.error(result.error || "Invalid 2FA code");
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error("Failed to verify 2FA code");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setRequires2FA(false);
    setOtpCode("");
  };

  const clientPortalUrl = getClientPortalUrl();
  const isReady = userPassword && !decryptingPassword;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Login to Client Portal
          </DialogTitle>
          <DialogDescription>
            {requires2FA
              ? "Enter the 2FA code from the user's authenticator app"
              : "Access the client portal as this user"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!requires2FA ? (
            <>
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  You will be logged in as <strong>{userEmail}</strong> and redirected to{" "}
                  <strong>{clientPortalUrl}</strong> in a new tab.
                </AlertDescription>
              </Alert>

              {decryptingPassword && (
                <Alert>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Decrypting user password...
                  </AlertDescription>
                </Alert>
              )}

              {!isReady && !decryptingPassword && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to decrypt user password. Please try closing and reopening this dialog.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>User Email</Label>
                <Input value={userEmail} disabled className="bg-muted" />
              </div>
            </>
          ) : (
            <>
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>
                  This user has two-factor authentication enabled. Please enter the 6-digit code from their authenticator app.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="otp-code">2FA Code</Label>
                <Input
                  id="otp-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from the authenticator app
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          {!requires2FA ? (
            <Button
              type="button"
              onClick={handleLogin}
              disabled={loading || !isReady}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login as Client
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleVerify2FA}
              disabled={loading || otpCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Verify & Login
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
