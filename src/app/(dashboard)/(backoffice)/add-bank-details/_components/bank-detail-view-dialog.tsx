"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import type { AdminBankDetailItem } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

type BankDetailViewDialogProps = {
  detail: AdminBankDetailItem | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify?: (status: "approved" | "rejected", adminNotes: string) => void;
  verifying?: boolean;
  canMutate?: boolean;
  onRefresh?: () => void;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value || "-"}</span>
    </div>
  );
}

export function BankDetailViewDialog({
  detail,
  loading,
  open,
  onOpenChange,
  onVerify,
  verifying = false,
  canMutate = false,
  onRefresh,
}: BankDetailViewDialogProps) {
  const { token } = useAuth();
  const [showPassbook, setShowPassbook] = useState(false);
  const [verifyDecision, setVerifyDecision] = useState<"approved" | "rejected">("approved");
  const [adminNotes, setAdminNotes] = useState("");
  const [authorizedFileUrls, setAuthorizedFileUrls] = useState<Record<string, string>>({});
  const createdObjectUrlsRef = useRef<string[]>([]);

  const isPending = detail?.status === "pending";
  const canVerify = canMutate && Boolean(onVerify);

  // Get passbook URL if it exists
  const passbookUrl = detail?.passbook_photo_url;

  // Sync verification decision with current status when dialog opens
  useEffect(() => {
    if (!open || !detail) return;
    if (detail.status === "rejected") {
      setVerifyDecision("rejected");
    } else {
      setVerifyDecision("approved");
    }
    setAdminNotes("");
  }, [open, detail?.uuid, detail?.status]);

  // Fetch protected image with auth token
  useEffect(() => {
    if (!token || !passbookUrl || !open) return;
    if (authorizedFileUrls[passbookUrl]) return;

    let cancelled = false;

    const loadAuthorizedImage = async () => {
      try {
        const response = await fetch(passbookUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          console.error("Failed to fetch protected image:", response.status);
          return;
        }
        
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        
        createdObjectUrlsRef.current.push(objectUrl);
        setAuthorizedFileUrls((prev) => ({ ...prev, [passbookUrl]: objectUrl }));
      } catch (error) {
        console.error("Failed to fetch protected file:", error);
      }
    };

    void loadAuthorizedImage();

    return () => {
      cancelled = true;
    };
  }, [token, passbookUrl, open, authorizedFileUrls]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      createdObjectUrlsRef.current = [];
    };
  }, []);

  const handleVerifySubmit = () => {
    if (!onVerify || !detail) return;
    if (verifyDecision === "rejected" && !adminNotes.trim()) {
      return;
    }
    onVerify(verifyDecision, adminNotes.trim());
    setAdminNotes("");
    setVerifyDecision("approved");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!detail) return null;

  // Get the authorized URL or fallback to original
  const resolvedPassbookUrl = passbookUrl && token ? authorizedFileUrls[passbookUrl] : passbookUrl;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Bank Detail</DialogTitle>
            <DialogDescription>Review the selected bank-details record.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Information */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <h3 className="mb-3 text-sm font-semibold">User Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Name" value={detail.user?.name} />
                <DetailRow label="Email" value={detail.user?.email} />
                <DetailRow label="Mobile" value={detail.user?.mobile} />
                <DetailRow label="User UUID" value={detail.user?.uuid} />
              </div>
            </div>

            {/* Bank Details */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <h3 className="mb-3 text-sm font-semibold">Bank Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Account Holder" value={detail.account_holder_name} />
                <DetailRow label="Bank Name" value={detail.bank_name} />
                <DetailRow label="Account Number" value={detail.account_number} />
                <DetailRow label="IBAN" value={detail.iban_number} />
                <DetailRow label="SWIFT/IFSC Code" value={detail.swift_ifsc_code} />
                <DetailRow label="Country" value={detail.country} />
                <div className="sm:col-span-2">
                  <DetailRow label="Address" value={detail.address} />
                </div>
              </div>
            </div>

            {/* Passbook Photo */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Passbook Photo</h3>
                {resolvedPassbookUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPassbook(true)}
                  >
                    View Full Size
                  </Button>
                )}
              </div>
              {passbookUrl ? (
                resolvedPassbookUrl ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                    <Image
                      src={resolvedPassbookUrl}
                      alt="Passbook"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                    Loading passbook...
                  </div>
                )
              ) : (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
                  <span className="font-medium">Passbook not provided</span>
                  <span className="text-xs">The user has not uploaded a passbook photo for this bank account.</span>
                </div>
              )}
            </div>

            {/* Verification Status */}
            <div className="rounded-lg border bg-muted/40 p-4">
              <h3 className="mb-3 text-sm font-semibold">Verification Status</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Status" value={detail.status || "pending"} />
                {detail.verified_at && (
                  <DetailRow
                    label="Verified At"
                    value={formatDateTimeInIST(detail.verified_at)}
                  />
                )}
                {detail.admin_notes && (
                  <div className="sm:col-span-2">
                    <DetailRow label="Admin Notes" value={detail.admin_notes} />
                  </div>
                )}
              </div>
            </div>

            {/* Verification Actions */}
            {canVerify && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      {isPending ? "Verification Decision" : "Update Verification"}
                    </Label>
                    {!isPending && (
                      <p className="text-xs text-muted-foreground">
                        This record is already{" "}
                        <span className="font-medium capitalize">{detail.status}</span>. You can change the verification status below.
                      </p>
                    )}
                    <Tabs
                      value={verifyDecision}
                      onValueChange={(value) => {
                        if (value === "approved" || value === "rejected") {
                          setVerifyDecision(value);
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-muted/50 p-1">
                        <TabsTrigger value="approved" className="rounded-xl">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="rounded-xl">
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admin-notes" className="text-sm font-semibold">
                      Admin Notes{" "}
                      {verifyDecision === "rejected" && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    <Textarea
                      id="admin-notes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={
                        verifyDecision === "rejected"
                          ? "Please provide a reason for rejection..."
                          : "Optional notes about this verification..."
                      }
                      className="min-h-[100px]"
                    />
                    {verifyDecision === "rejected" && (
                      <p className="text-xs text-muted-foreground">
                        Rejection reason is required
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={verifying}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            {canVerify && (
              <Button
                type="button"
                onClick={handleVerifySubmit}
                disabled={verifying || (verifyDecision === "rejected" && !adminNotes.trim())}
                className={`w-full sm:w-auto ${
                  verifyDecision === "approved"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {verifying ? (
                  "Processing..."
                ) : verifyDecision === "approved" ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Image Dialog */}
      {resolvedPassbookUrl && (
        <Dialog open={showPassbook} onOpenChange={setShowPassbook}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Passbook Photo - Full View</DialogTitle>
            </DialogHeader>
            <div className="relative min-h-[400px] w-full">
              <Image
                src={resolvedPassbookUrl}
                alt="Passbook Full View"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
