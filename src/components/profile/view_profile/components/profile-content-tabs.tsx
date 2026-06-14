"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import type { UserBankDetailsData } from "@/lib/api";

type LoginHistoryItem = {
  date: string;
  time: string;
  ip_address: string;
  browser: string;
};

type BankDetailsFormState = {
  accountName: string;
  accountNumber: string;
  ifscSwiftCode: string;
  ibanNumber: string;
  bankName: string;
  bankAddress: string;
  country: string;
  bookBankFileName: string;
};

type BankDetailsField =
  | "accountName"
  | "accountNumber"
  | "ifscSwiftCode"
  | "ibanNumber"
  | "bankName"
  | "bankAddress"
  | "country"
  | "bookBankFileName";

type CountryOption = {
  id: number;
  name: string;
};

type LocationMode = "select" | "other";

const LOCATION_OTHER_VALUE = "__other__";

function utcToIST(utcDate: string, utcTime: string): { date: string; time: string } {
  try {
    const dateParts = utcDate.trim().split(" ");
    const day = parseInt(dateParts[0], 10);
    const monthStr = dateParts[1];
    const year = parseInt(dateParts[2], 10);

    const monthMap: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const month = monthMap[monthStr];
    if (month === undefined) return { date: utcDate, time: utcTime };

    const [timePart, period] = utcTime.trim().split(" ");
    const [hStr, mStr, sStr] = timePart.split(":");
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    const seconds = parseInt(sStr, 10);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const utcMs = Date.UTC(year, month, day, hours, minutes, seconds);
    const istMs = utcMs + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const date = `${ist.getUTCDate()} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;

    let h = ist.getUTCHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const time = `${String(h).padStart(2, "0")}:${String(ist.getUTCMinutes()).padStart(2, "0")}:${String(ist.getUTCSeconds()).padStart(2, "0")} ${ampm}`;

    return { date, time };
  } catch {
    return { date: utcDate, time: utcTime };
  }
}

type ActivityTabProps = {
  loginHistory: LoginHistoryItem[];
  paginatedHistory: LoginHistoryItem[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onSetCurrentPage: (page: number | ((prev: number) => number)) => void;
};

export function ProfileActivityTab({
  loginHistory,
  paginatedHistory,
  currentPage,
  totalPages,
  itemsPerPage,
  onSetCurrentPage,
}: ActivityTabProps) {
  return (
    <TabsContent value="activity" className="space-y-6">
      <Card className="overflow-hidden rounded-[28px] border border-border/70 shadow-sm ib-portal-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Account Activity Logs</CardTitle>
          <CardDescription>Login History</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loginHistory.length > 0 ? (
            <>
              <div className="rounded-2xl border border-border/60 bg-background/80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Browser</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedHistory.map((log, index) => (
                      <TableRow key={`${log.date}-${log.time}-${index}`}>
                        <TableCell className="font-medium">{utcToIST(log.date, log.time).date}</TableCell>
                        <TableCell>{utcToIST(log.date, log.time).time}</TableCell>
                        <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                        <TableCell>{log.browser}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 ? (
                <div className="mt-5 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, loginHistory.length)} of{" "}
                    {loginHistory.length} entries
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSetCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => onSetCurrentPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSetCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="py-10 text-center text-muted-foreground">No login history available</div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

type SecurityTabProps = {
  isLoading2FAStatus: boolean;
  is2FAEnabled: boolean;
  onOpenTwoFactorModal: () => void;
};

export function ProfileSecurityTab({
  isLoading2FAStatus,
  is2FAEnabled,
  onOpenTwoFactorModal,
}: SecurityTabProps) {
  return (
    <TabsContent value="security" className="space-y-6">
      <Card className="overflow-hidden rounded-[28px] border border-border/70 shadow-sm ib-portal-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Manage your account security and authentication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="rounded-2xl border border-border/60 bg-muted/15 p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isLoading2FAStatus ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : is2FAEnabled ? (
                  <>
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300"
                    >
                      Enabled
                    </Badge>
                    <Button variant="outline" size="sm" onClick={onOpenTwoFactorModal}>
                      Configure
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="outline">Disabled</Badge>
                    <Button variant="default" size="sm" onClick={onOpenTwoFactorModal}>
                      Enable 2FA
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

type BankTabProps = {
  bankDetails: BankDetailsFormState;
  bankDetailsList: UserBankDetailsData[];
  bankValidationErrors: Partial<Record<BankDetailsField, string>>;
  bankCountryMode: LocationMode;
  selectedBankCountryId: number | null;
  countryOptions: CountryOption[];
  bankDetailsSaving: boolean;
  bankDetailsRecordId: number | null;
  bankDetailsDeletingId: number | null;
  isBankEditing: boolean;
  onBankCountrySelection: (value: string) => void;
  onUpdateBankDetails: (field: keyof BankDetailsFormState, value: string) => void;
  onPassbookPhotoFileChange: (file: File | null) => void;
  passbookPhotoFileName: string | null;
  passbookPhotoFile: File | null;
  onSubmitBankDetails: () => void;
  onCancelBankEditing: () => void;
  onStartAddBankDetails: () => void;
  onStartEditBankDetails: (entry: UserBankDetailsData) => void;
  onRequestDeleteBankDetails: (id: number) => void;
  onConfirmDeleteBankDetails: () => void;
  onCancelDeleteBankDetails: () => void;
  pendingDeleteBankId: number | null;
  sanitizePersonText: (value: string) => string;
  sanitizeIdentifierInput: (value: string, maxLength?: number) => string;
};

const maskAccountNumber = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= 4) return `****${trimmed}`;
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
};

const renderBankStatusBadge = (status?: string | null) => {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "verified" || normalized === "completed") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        Verified
      </Badge>
    );
  }
  if (normalized === "rejected") {
    return (
      <Badge className="border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
        <XCircle className="mr-1 size-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300">
      <Loader2 className="mr-1 size-3" />
      Pending
    </Badge>
  );
};

export function ProfileBankDetailsTab({
  bankDetails,
  bankDetailsList,
  bankValidationErrors,
  bankCountryMode,
  selectedBankCountryId,
  countryOptions,
  bankDetailsSaving,
  bankDetailsRecordId,
  bankDetailsDeletingId,
  isBankEditing,
  onBankCountrySelection,
  onUpdateBankDetails,
  onPassbookPhotoFileChange,
  passbookPhotoFileName,
  passbookPhotoFile,
  onSubmitBankDetails,
  onCancelBankEditing,
  onStartAddBankDetails,
  onStartEditBankDetails,
  onRequestDeleteBankDetails,
  onConfirmDeleteBankDetails,
  onCancelDeleteBankDetails,
  pendingDeleteBankId,
  sanitizePersonText,
  sanitizeIdentifierInput,
}: BankTabProps) {
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [newFilePreview, setNewFilePreview] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(100);

  // Cleanup preview URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (newFilePreview) {
        // Clean up object URL if needed (FileReader returns data URL, so no cleanup needed)
        setNewFilePreview(null);
      }
    };
  }, [newFilePreview]);

  // Reset zoom when dialog closes
  useEffect(() => {
    if (!imageViewerOpen) {
      setImageZoom(100);
    }
  }, [imageViewerOpen]);

  // Generate preview URL for newly selected file
  const handleFileChange = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewFilePreview(null);
    }
    onPassbookPhotoFileChange(file);
  };

  const handleViewImage = (isNewFile = false) => {
    if (isNewFile && newFilePreview) {
      setPreviewImageUrl(newFilePreview);
      setImageViewerOpen(true);
    } else if (bankDetails.bookBankFileName) {
      // If it's already a URL (existing file from server)
      if (bankDetails.bookBankFileName.startsWith("http")) {
        setPreviewImageUrl(bankDetails.bookBankFileName);
      } else {
        // If it's just a filename, construct the URL (adjust this based on your server setup)
        setPreviewImageUrl(bankDetails.bookBankFileName);
      }
      setImageViewerOpen(true);
    }
  };

  const handleDownload = () => {
    if (previewImageUrl) {
      const link = document.createElement("a");
      link.href = previewImageUrl;
      link.download = passbookPhotoFile?.name ?? "passbook-photo.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <TabsContent value="bank" className="space-y-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Your Bank Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Save one or more bank accounts. Each account must be verified before it can be used for withdrawals.
          </p>
        </div>
        {!isBankEditing ? (
          <Button
            type="button"
            onClick={onStartAddBankDetails}
            size="lg"
            className="self-start gap-2 sm:self-auto"
          >
            <Plus className="size-4" />
            Add Bank Details
          </Button>
        ) : null}
      </div>

      {bankDetailsList.length > 0 ? (
        <div className="mx-auto grid w-full max-w-5xl gap-3 md:grid-cols-2">
          {bankDetailsList.map((entry) => {
            const isActiveEdit = isBankEditing && entry.id === bankDetailsRecordId;
            const isDeleting = bankDetailsDeletingId === entry.id;
            return (
              <Card
                key={entry.id}
                className={
                  isActiveEdit
                    ? "overflow-hidden rounded-2xl border-primary/60 shadow-sm ring-1 ring-primary/30"
                    : "overflow-hidden rounded-2xl border-border/60 shadow-sm"
                }
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="size-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {entry.bank_name || "Bank Account"}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {entry.account_holder_name || "—"}
                          </p>
                        </div>
                        {renderBankStatusBadge(entry.status)}
                      </div>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <span className="truncate">
                          Account:{" "}
                          <span className="font-mono text-foreground">
                            {maskAccountNumber(entry.account_number)}
                          </span>
                        </span>
                        <span className="truncate">Country: {entry.country || "—"}</span>
                      </div>
                      {entry.admin_notes ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                          Admin note: {entry.admin_notes}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onStartEditBankDetails(entry)}
                          disabled={bankDetailsSaving || bankDetailsDeletingId !== null}
                          className="gap-1"
                        >
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onRequestDeleteBankDetails(entry.id)}
                          disabled={isDeleting}
                          className="gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : !isBankEditing ? (
        <Card className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <CreditCard className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">No bank accounts saved yet</p>
              <p className="text-xs text-muted-foreground">
                Click &quot;Add Bank Details&quot; above to save your first account.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isBankEditing ? (
        <Card className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-border/70 shadow-sm ib-portal-surface">
          <CardHeader className="border-b border-border/60">
            <CardTitle>
              {bankDetailsRecordId ? "Edit Bank Details" : "Add Bank Details"}
            </CardTitle>
            <CardDescription>
              {bankDetailsRecordId
                ? "Update your saved bank account. Submit to apply changes."
                : "Add a new bank account. All fields marked required must be filled in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <fieldset disabled={bankDetailsSaving} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="account_name">Account Holder Name</Label>
                <Input
                  id="account_name"
                  value={bankDetails.accountName}
                  onChange={(e) => onUpdateBankDetails("accountName", sanitizePersonText(e.target.value).slice(0, 80))}
                  className={bankValidationErrors.accountName ? "border-destructive" : ""}
                  placeholder="Enter account holder name"
                />
                {bankValidationErrors.accountName ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.accountName}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_number">Account No.</Label>
                <Input
                  id="account_number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => onUpdateBankDetails("accountNumber", sanitizeIdentifierInput(e.target.value, 34))}
                  className={bankValidationErrors.accountNumber ? "border-destructive" : ""}
                  placeholder="Enter account number"
                />
                {bankValidationErrors.accountNumber ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.accountNumber}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc_swift_code">IFSC / Swift Code</Label>
                <Input
                  id="ifsc_swift_code"
                  value={bankDetails.ifscSwiftCode}
                  onChange={(e) => onUpdateBankDetails("ifscSwiftCode", sanitizeIdentifierInput(e.target.value, 20))}
                  className={bankValidationErrors.ifscSwiftCode ? "border-destructive" : ""}
                  placeholder="Enter IFSC / Swift code"
                />
                {bankValidationErrors.ifscSwiftCode ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.ifscSwiftCode}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban_number">IBAN No. <span className="text-muted-foreground">(Optional)</span></Label>
                <Input
                  id="iban_number"
                  value={bankDetails.ibanNumber}
                  onChange={(e) => onUpdateBankDetails("ibanNumber", sanitizeIdentifierInput(e.target.value, 34))}
                  className={bankValidationErrors.ibanNumber ? "border-destructive" : ""}
                  placeholder="Enter IBAN number"
                />
                {bankValidationErrors.ibanNumber ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.ibanNumber}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={bankDetails.bankName}
                  onChange={(e) => onUpdateBankDetails("bankName", sanitizePersonText(e.target.value).slice(0, 80))}
                  className={bankValidationErrors.bankName ? "border-destructive" : ""}
                  placeholder="Enter bank name"
                />
                {bankValidationErrors.bankName ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.bankName}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_address">Address</Label>
                <Input
                  id="bank_address"
                  value={bankDetails.bankAddress}
                  onChange={(e) => onUpdateBankDetails("bankAddress", e.target.value)}
                  className={bankValidationErrors.bankAddress ? "border-destructive" : ""}
                  placeholder="Enter bank address"
                />
                {bankValidationErrors.bankAddress ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.bankAddress}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_country">Country</Label>
                <Select
                  value={bankCountryMode === "other" ? LOCATION_OTHER_VALUE : selectedBankCountryId ? String(selectedBankCountryId) : ""}
                  onValueChange={onBankCountrySelection}
                >
                  <SelectTrigger id="bank_country" className={bankValidationErrors.country ? "w-full border-destructive" : "w-full"}>
                    <SelectValue placeholder="Please choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={LOCATION_OTHER_VALUE}>Other</SelectItem>
                  </SelectContent>
                </Select>
                {bankCountryMode === "other" ? (
                  <Input
                    value={bankDetails.country}
                    onChange={(e) => onUpdateBankDetails("country", sanitizePersonText(e.target.value).slice(0, 80))}
                    className={bankValidationErrors.country ? "border-destructive" : ""}
                    placeholder="Enter country manually"
                  />
                ) : null}
                {bankValidationErrors.country ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.country}</p>
                ) : null}
              </div>
              <div className="space-y-3 md:col-span-2 xl:col-span-3">
                <Label htmlFor="passbook_photo">Passbook Photo</Label>
                <Input
                  id="passbook_photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className={bankValidationErrors.bookBankFileName ? "border-destructive" : ""}
                />
                {/* <p className="text-xs text-muted-foreground">
                  {passbookPhotoFileName
                    ? `Selected file: ${passbookPhotoFileName}`
                    : bankDetails.bookBankFileName
                      ? `Existing file: ${bankDetails.bookBankFileName}`
                      : "Upload passbook photo from your device."}
                </p> */}
                {bankValidationErrors.bookBankFileName ? (
                  <p className="text-sm text-destructive">{bankValidationErrors.bookBankFileName}</p>
                ) : null}
                
                {/* Preview for newly selected file */}
                {newFilePreview && passbookPhotoFile ? (
                  <Card className="mt-3 overflow-hidden border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="relative size-20 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          <img
                            src={newFilePreview}
                            alt="Preview"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="flex flex-1 flex-col gap-2">
                          <div>
                            <p className="text-sm font-medium">New file selected</p>
                            <p className="text-xs text-muted-foreground">{passbookPhotoFile.name}</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewImage(true)}
                            className="w-fit gap-2"
                          >
                            <Eye className="size-4" />
                            View Full Size
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : bankDetails.bookBankFileName && !passbookPhotoFileName ? (
                  <Card className="mt-3 overflow-hidden border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                            <Eye className="size-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Passbook photo uploaded</p>
                            <p className="text-xs text-muted-foreground">Click to view your uploaded document</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewImage(false)}
                          className="gap-2"
                        >
                          <Eye className="size-4" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          </fieldset>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancelBankEditing}
              disabled={bankDetailsSaving}
              size="lg"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onSubmitBankDetails}
              disabled={bankDetailsSaving}
              size="lg"
            >
              {bankDetailsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : bankDetailsRecordId ? (
                "Save Changes"
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bank Details
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {/* Image Viewer Dialog */}
      <Dialog open={imageViewerOpen} onOpenChange={setImageViewerOpen}>
        <DialogContent className="max-w-6xl overflow-hidden p-0">
          <div className="flex flex-col">
            <DialogHeader className="border-b border-border/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg font-semibold">Passbook Photo</DialogTitle>
                  <DialogDescription className="text-sm">
                    {passbookPhotoFile ? "Preview of selected file" : "Your uploaded passbook photo"}
                  </DialogDescription>
                </div>
                {/* <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={imageZoom <= 50}
                    className="size-9 p-0"
                  >
                    <ZoomOut className="size-4" />
                  </Button>
                  <span className="min-w-[3rem] text-center text-sm text-muted-foreground">{imageZoom}%</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleZoomIn}
                    disabled={imageZoom >= 200}
                    className="size-9 p-0"
                  >
                    <ZoomIn className="size-4" />
                  </Button>
                </div> */}
              </div>
            </DialogHeader>
            <div className="relative flex min-h-[500px] items-center justify-center overflow-auto bg-muted/30 p-8">
              {previewImageUrl ? (
                <div className="relative">
                  <img
                    src={previewImageUrl}
                    alt="Passbook Photo"
                    style={{ width: `${imageZoom}%` }}
                    className="mx-auto rounded-lg border border-border/40 object-contain shadow-lg transition-all"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-12">
                  <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                    <Eye className="size-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No image available</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={!previewImageUrl}
                className="gap-2"
              >
                <Download className="size-4" />
                Download
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setImageViewerOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={pendingDeleteBankId !== null}
        onOpenChange={(open) => {
          if (!open && bankDetailsDeletingId === null) onCancelDeleteBankDetails();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this bank account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected bank account will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancelDeleteBankDetails}
              disabled={bankDetailsDeletingId !== null}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDeleteBankDetails}
              disabled={bankDetailsDeletingId !== null}
              className="gap-2"
            >
              {bankDetailsDeletingId !== null ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
