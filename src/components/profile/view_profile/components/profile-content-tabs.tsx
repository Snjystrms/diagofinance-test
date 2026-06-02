"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, Loader2, Pencil, X, ZoomIn, ZoomOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
                        <TableCell className="font-medium">{log.date}</TableCell>
                        <TableCell>{log.time}</TableCell>
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
  bankValidationErrors: Partial<Record<BankDetailsField, string>>;
  bankCountryMode: LocationMode;
  selectedBankCountryId: number | null;
  countryOptions: CountryOption[];
  bankDetailsSaving: boolean;
  bankDetailsRecordId: number | null;
  isBankEditing: boolean;
  onBankCountrySelection: (value: string) => void;
  onUpdateBankDetails: (field: keyof BankDetailsFormState, value: string) => void;
  onPassbookPhotoFileChange: (file: File | null) => void;
  passbookPhotoFileName: string | null;
  passbookPhotoFile: File | null;
  onSubmitBankDetails: () => void;
  onStartBankEditing: () => void;
  onCancelBankEditing: () => void;
  sanitizePersonText: (value: string) => string;
  sanitizeIdentifierInput: (value: string, maxLength?: number) => string;
};

export function ProfileBankDetailsTab({
  bankDetails,
  bankValidationErrors,
  bankCountryMode,
  selectedBankCountryId,
  countryOptions,
  bankDetailsSaving,
  bankDetailsRecordId,
  isBankEditing,
  onBankCountrySelection,
  onUpdateBankDetails,
  onPassbookPhotoFileChange,
  passbookPhotoFileName,
  passbookPhotoFile,
  onSubmitBankDetails,
  onStartBankEditing,
  onCancelBankEditing,
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

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 25, 50));
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
      <Card className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-border/70 shadow-sm ib-portal-surface">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Add Bank Details</CardTitle>
          <CardDescription>
            Add or update your bank details. Existing values are loaded automatically when available.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <fieldset
            disabled={!isBankEditing || bankDetailsSaving}
            className={`space-y-6 ${!isBankEditing ? "opacity-80" : ""}`}
          >
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
            {isBankEditing ? (
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
            ) : null}
            <Button
              type="button"
              onClick={() => {
                if (!isBankEditing) {
                  onStartBankEditing();
                  return;
                }
                onSubmitBankDetails();
              }}
              disabled={bankDetailsSaving}
              size="lg"
            >
              {bankDetailsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isBankEditing ? (
                "Save Changes"
              ) : (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </TabsContent>
  );
}
