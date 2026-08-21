"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { RefreshCw, Search, Users, Eye, EyeOff } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/auth-context";
import { apiCall, type PaginationMeta } from "@/lib/api-core";
import { FALLBACK_COUNTRY_OPTIONS } from "@/lib/country-options";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  useCrudCapabilities,
} from "@/hooks/use-permission-capabilities";

import { getColumnsWithActions, type TempUser } from "./columns";

const completeRegistrationSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters"),
    last_name: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    mobile: z
      .string()
      .trim()
      .refine(
        (value) => /^\d+$/.test(value),
        "Mobile number must contain only digits",
      )
      .refine(
        (value) => value.length === 10,
        "Mobile number must be exactly 10 digits",
      ),
    country: z.string().trim().min(1, "Country is required"),
    country_code: z.string().trim(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string(),
    referral_code: z.string().trim().optional().or(z.literal("")),
  })
  .refine(
    (data) => data.password === data.confirm_password,
    {
      message: "Passwords don't match",
      path: ["confirm_password"],
    },
  );

type CompleteRegistrationFormData = z.infer<typeof completeRegistrationSchema>;

interface TempUsersResponse {
  success: boolean;
  data: TempUser[];
  pagination: PaginationMeta;
}

export default function TempUsersPage() {
  const { token } = useAuth();
  const {
    canViewList: canViewTempUsers,
    canEdit: canCompleteTempUsers,
  } = useCrudCapabilities("userManagement", {
    list: "list",
    add: "add",
    edit: "edit",
    delete: "delete",
  });

  const [users, setUsers] = useState<TempUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(
    null,
  );

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [searchInput, setSearchInput] = useState(search ?? "");

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TempUser | null>(null);
  const [submittingRegistration, setSubmittingRegistration] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const completeRegistrationForm = useForm<CompleteRegistrationFormData>({
    resolver: zodResolver(completeRegistrationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      mobile: "",
      country: "",
      country_code: "",
      password: "",
      confirm_password: "",
      referral_code: "",
    },
  });

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const setCountryValues = useCallback(
    (countryName: string) => {
      const countryData = FALLBACK_COUNTRY_OPTIONS.find(
        (country) => country.name === countryName,
      );
      if (!countryData) return;
      completeRegistrationForm.setValue("country", countryName, {
        shouldValidate: true,
      });
      completeRegistrationForm.setValue("country_code", countryData.phone_code, {
        shouldValidate: true,
      });
    },
    [completeRegistrationForm],
  );

  const loadUsers = useCallback(async () => {
    if (!canViewTempUsers) {
      setUsers([]);
      setPaginationMeta(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!token) {
      setUsers([]);
      setPaginationMeta(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("limit", String(perPage));
      if (search?.trim()) {
        qs.set("search", search.trim());
      }

      const endpoint = `/admin/user-management/temp-users?${qs.toString()}`;
      const apiResponse = await apiCall<TempUsersResponse>(endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Handle the response - apiCall returns ApiResponse<T> which wraps data
      const responseData = apiResponse as unknown as TempUsersResponse;
      
      if (responseData?.data && Array.isArray(responseData.data)) {
        setUsers(responseData.data);
        setPaginationMeta(responseData.pagination ?? null);
      } else {
        setUsers([]);
        setPaginationMeta(null);
      }
    } catch (err) {
      console.error("Failed to load temp users:", err);
      setLoadError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "temporary users",
          action: "load",
        }),
      );
      setUsers([]);
      setPaginationMeta(null);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search, canViewTempUsers]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleViewDetails = useCallback(
    (user: TempUser) => {
      setSelectedUser(user);
      completeRegistrationForm.reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        mobile: user.mobile,
        country: user.country,
        country_code: "",
        password: "",
        confirm_password: "",
        referral_code: user.referral_code || "",
      });
      setCountryValues(user.country);
      setDetailsDialogOpen(true);
    },
    [completeRegistrationForm, setCountryValues],
  );

  const handleCompleteRegistration = async (
    values: CompleteRegistrationFormData,
  ) => {
    if (!token || !selectedUser) return;
    try {
      setSubmittingRegistration(true);
      const { confirm_password: _confirmPassword, ...rest } = values;

      const endpoint = `/admin/user-management/temp-users/${selectedUser.id}/complete-registration`;
      const response = await apiCall<{
        success: boolean;
        message: string;
      }>(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rest),
      });

      toast.success(
        response?.message || "Registration completed successfully",
      );
      setDetailsDialogOpen(false);
      setSelectedUser(null);
      completeRegistrationForm.reset();
      await loadUsers();
    } catch (err) {
      console.error("Failed to complete registration:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "registration",
          action: "complete",
        }),
      );
    } finally {
      setSubmittingRegistration(false);
    }
  };

  const totalUsers = paginationMeta?.total ?? users.length;
  const totalPages =
    paginationMeta?.total_pages ??
    paginationMeta?.last_page ??
    (totalUsers && perPage ? Math.ceil(totalUsers / perPage) : 1);

  const columns = useMemo(
    () => getColumnsWithActions(handleViewDetails),
    [handleViewDetails],
  );

  if (!canViewTempUsers) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            title="Access Denied"
            message="You do not have permission to view temporary users"
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col space-y-6 px-4 py-8 md:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-6 w-6 text-primary" />
              Temporary Users
            </h1>
            <p className="text-muted-foreground">
              Manage incomplete user registrations
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
            <ApiSearchBar
              value={searchInput}
              onChange={setSearchInput}
              onSearch={(value) => {
                void setSearch(value || null);
                void setPage(1);
              }}
              placeholder="Search by name, email..."
              // className="min-w-[220px] flex-1 max-w-full"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Temporary Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table Section */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          {loading ? (
            <TableSectionSkeleton columnCount={6} />
          ) : loadError ? (
            <ApiErrorState
              error={loadError}
              onRetry={loadUsers}
              resource="temporary users"
            />
          ) : (
            <AppDataTable
              columns={columns}
              data={users}
              pageCount={totalPages}
            />
          )}
        </div>

        {/* Complete Registration Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complete Registration</DialogTitle>
              <DialogDescription>
                Complete the registration for {selectedUser?.first_name}{" "}
                {selectedUser?.last_name}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={completeRegistrationForm.handleSubmit(
                handleCompleteRegistration,
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="mb-2 block">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    {...completeRegistrationForm.register("first_name")}
                  />
                  {completeRegistrationForm.formState.errors.first_name && (
                    <p className="mt-1 text-sm text-destructive">
                      {
                        completeRegistrationForm.formState.errors.first_name
                          .message
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="mb-2 block">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    {...completeRegistrationForm.register("last_name")}
                  />
                  {completeRegistrationForm.formState.errors.last_name && (
                    <p className="mt-1 text-sm text-destructive">
                      {
                        completeRegistrationForm.formState.errors.last_name
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="mb-2 block">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...completeRegistrationForm.register("email")}
                />
                {completeRegistrationForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {completeRegistrationForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="mb-2 block">
                    Mobile <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobile"
                    {...completeRegistrationForm.register("mobile")}
                  />
                  {completeRegistrationForm.formState.errors.mobile && (
                    <p className="mt-1 text-sm text-destructive">
                      {completeRegistrationForm.formState.errors.mobile.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country" className="mb-2 block">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={completeRegistrationForm.watch("country")}
                    onValueChange={setCountryValues}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {FALLBACK_COUNTRY_OPTIONS.map((country) => (
                        <SelectItem key={country.name} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {completeRegistrationForm.formState.errors.country && (
                    <p className="mt-1 text-sm text-destructive">
                      {completeRegistrationForm.formState.errors.country.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="mb-2 block">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...completeRegistrationForm.register("password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {completeRegistrationForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-destructive">
                      {
                        completeRegistrationForm.formState.errors.password
                          .message
                      }
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password" className="mb-2 block">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      {...completeRegistrationForm.register("confirm_password")}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {completeRegistrationForm.formState.errors
                    .confirm_password && (
                    <p className="mt-1 text-sm text-destructive">
                      {
                        completeRegistrationForm.formState.errors
                          .confirm_password.message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_code" className="mb-2 block">Referral Code (Optional)</Label>
                <Input
                  id="referral_code"
                  {...completeRegistrationForm.register("referral_code")}
                />
                {completeRegistrationForm.formState.errors.referral_code && (
                  <p className="mt-1 text-sm text-destructive">
                    {
                      completeRegistrationForm.formState.errors.referral_code
                        .message
                    }
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailsDialogOpen(false);
                    setSelectedUser(null);
                  }}
                  disabled={submittingRegistration}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submittingRegistration || !canCompleteTempUsers
                  }
                >
                  {submittingRegistration
                    ? "Completing..."
                    : "Complete Registration"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
