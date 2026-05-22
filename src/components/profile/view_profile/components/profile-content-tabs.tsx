"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
};

type BankDetailsField =
  | "accountName"
  | "accountNumber"
  | "ifscSwiftCode"
  | "ibanNumber"
  | "bankName"
  | "bankAddress"
  | "country";

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
  onBankCountrySelection: (value: string) => void;
  onUpdateBankDetails: (field: keyof BankDetailsFormState, value: string) => void;
  onSubmitBankDetails: () => void;
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
  onBankCountrySelection,
  onUpdateBankDetails,
  onSubmitBankDetails,
  sanitizePersonText,
  sanitizeIdentifierInput,
}: BankTabProps) {
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
              <Label htmlFor="iban_number">IBAN No.</Label>
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
          </div>
          <div className="flex justify-start">
            <Button type="button" onClick={onSubmitBankDetails} disabled={bankDetailsSaving}>
              {bankDetailsSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : bankDetailsRecordId ? (
                "Update Bank Details"
              ) : (
                "Submit"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
