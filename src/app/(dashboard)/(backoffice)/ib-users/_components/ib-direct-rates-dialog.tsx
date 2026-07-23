"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Landmark, Pencil, RefreshCw } from "lucide-react";

import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminAccountTypesApi,
  API_BASE_URL,
  type AdminIbUser,
  type AccountTypeItem,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";

interface DirectRate {
  account_type_id: number;
  account_type_name: string;
  direct_rate: number;
  parent_direct_rate: number;
  assigned_by: number;
  status: number;
  updated_at: string;
}

interface DirectRatesResponse {
  success: boolean;
  user_id: number;
  rates: DirectRate[];
}

interface IbDirectRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminIbUser | null;
  token: string;
}

export function IbDirectRatesDialog({
  open,
  onOpenChange,
  user,
  token,
}: IbDirectRatesDialogProps) {
  const [rates, setRates] = useState<DirectRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [accountTypes, setAccountTypes] = useState<AccountTypeItem[]>([]);
  const [selectedAccountTypeId, setSelectedAccountTypeId] =
    useState<string>("");
  const [directRateValue, setDirectRateValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editingRate, setEditingRate] = useState<DirectRate | null>(null);

  const loadAccountTypes = useCallback(async () => {
    if (!token) return;
    try {
      const response = await adminAccountTypesApi.list({
        token,
        status: "true",
      });
      const items = response?.data?.accountTypes ?? [];
      setAccountTypes(items);
    } catch {
      setAccountTypes([]);
    }
  }, [token]);

  const loadRates = useCallback(async () => {
    if (!token || !user) {
      setRates([]);
      setLoading(false);
      return;
    }

    const userId = user.id ?? user.uuid;
    if (!userId) {
      toast.error("User ID not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await fetch(
        `${API_BASE_URL}/admin/ib-management/ib-users/${userId}/direct-rates`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as DirectRatesResponse;

      if (!response.ok || !payload.success) {
        throw new Error("Failed to load direct rates");
      }

      setRates(payload.rates ?? []);
    } catch (error) {
      setRates([]);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "direct rates",
          action: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (open && user) {
      void loadAccountTypes();
      void loadRates();
    }
  }, [open, user, loadRates, loadAccountTypes]);

  useEffect(() => {
    if (open) {
      setRates([]);
      setLoadError(null);
      setSelectedAccountTypeId("");
      setDirectRateValue("");
      setEditingRate(null);
    }
  }, [open]);

  const handleEdit = (rate: DirectRate) => {
    setEditingRate(rate);
    setSelectedAccountTypeId(String(rate.account_type_id));
    setDirectRateValue(String(rate.direct_rate));
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
    setSelectedAccountTypeId("");
    setDirectRateValue("");
  };

  const handleSave = async () => {
    if (!token || !user) return;

    const userId = user.id ?? user.uuid;
    if (!userId) {
      toast.error("User ID not available");
      return;
    }

    if (!selectedAccountTypeId) {
      toast.error("Please select an account type");
      return;
    }

    const parsedRate = Number(directRateValue);
    if (Number.isNaN(parsedRate) || parsedRate < 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/ib-management/ib-users/${userId}/direct-rates`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            account_type_id: Number(selectedAccountTypeId),
            direct_rate: parsedRate,
          }),
        },
      );

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        const errorMessage = payload.message || "Failed to update rate";
        throw new Error(errorMessage);
      }

      toast.success(payload.message || "Rate updated successfully");
      handleCancelEdit();
      void loadRates();
    } catch (error) {
      const fallbackMessage = getAdminFriendlyErrorMessage(error, {
        resource: "direct rate",
        action: "update",
      });
      const message =
        error instanceof Error && error.message
          ? error.message
          : fallbackMessage;

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deriveUserName = (u: AdminIbUser) =>
    u.name || u.email || `User ${u.id}`;

  const getStatusBadge = (status: number) => {
    return status === 1 ? (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
        Inactive
      </Badge>
    );
  };

  const unusedAccountTypes = accountTypes.filter(
    (at) => !rates.some((r) => r.account_type_id === at.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Direct Commission Rates
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Direct rates for ${deriveUserName(user)}`
              : "Select a user to view direct rates"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add / Edit Form */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">
              {editingRate ? "Update Rate" : "Assign New Rate"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Account Type</Label>
                <Select
                  value={selectedAccountTypeId}
                  onValueChange={setSelectedAccountTypeId}
                  disabled={!!editingRate}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingRate ? (
                      <SelectItem value={String(editingRate.account_type_id)}>
                        {editingRate.account_type_name}
                      </SelectItem>
                    ) : (
                      unusedAccountTypes.map((at) => (
                        <SelectItem key={at.id} value={String(at.id)}>
                          {at.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Direct Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-9"
                  placeholder="Enter rate"
                  value={directRateValue}
                  onChange={(e) => setDirectRateValue(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => void handleSave()}
                  disabled={
                    saving || !selectedAccountTypeId || !directRateValue
                  }
                >
                  {saving ? <Spinner className="mr-1 h-3 w-3" /> : null}
                  {editingRate ? "Update" : "Assign"}
                </Button>
                {editingRate ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading direct rates...
              </span>
            </div>
          ) : null}

          {/* Error */}
          {!loading && loadError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load direct rates. Please try again.
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => void loadRates()}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : null}

          {/* Rates Table */}
          {!loading && rates.length > 0 ? (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-3 text-left font-medium">Account Type</th>
                    <th className="p-3 text-right font-medium">Direct Rate</th>
                    <th className="p-3 text-right font-medium">Parent Rate</th>
                    <th className="p-3 text-center font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Updated At</th>
                    <th className="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.account_type_id} className="border-t">
                      <td className="p-3 font-medium">
                        {rate.account_type_name || "-"}
                      </td>
                      <td className="p-3 text-right">
                        {rate.direct_rate ?? "-"}
                      </td>
                      <td className="p-3 text-right">
                        {rate.parent_direct_rate ?? "-"}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(rate.status)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {rate.updated_at
                          ? formatDateTimeInIST(rate.updated_at)
                          : "-"}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(rate)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Empty state */}
          {!loading && !loadError && rates.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-muted-foreground">
                {user
                  ? "No direct rates available for this user."
                  : "No user selected."}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
