"use client"

import { useCallback, useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import toast from "react-hot-toast"

import {
  ValidatedFormField,
  ValidatedPasswordField,
  ValidatedTextField,
  sanitizeDigits,
  sanitizePersonText,
} from "@/components/forms/validated-fields"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { useAuth } from "@/contexts/auth-context"
import {
  adminUsersApi,
  type AdminUsersListApiData,
  type PaginationMeta,
  type PendingUser,
} from "@/lib/api"
import {
  adminUserCreateSchema,
  type AdminUserCreateFormData,
} from "@/lib/validations"
import { COUNTRIES } from "@/lib/countries"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Users,
} from "lucide-react"

const createInitialCreateFormState = (): AdminUserCreateFormData => ({
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  country: "",
  country_code: "",
  password: "",
  confirm_password: "",
  referral_code: "",
})

const formatDateTime = (value?: string) => {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

// Helper to transform raw API user data to PendingUser format
const transformUser = (raw: Record<string, unknown>): PendingUser => {
  const firstName = raw.first_name || ""
  const lastName = raw.last_name || ""
  const name = `${firstName} ${lastName}`.trim() || "—"
  
  return {
    id: typeof raw.id === 'number' ? raw.id : typeof raw.id === 'string' ? Number(raw.id) || 0 : 0,
    name,
    email: (raw.email as string) || "",
    username: (raw.uuid as string) || (raw.username as string) || "",
    mobile: (raw.mobile as string) || "",
    country: (raw.country as string) || "",
    sponsor_id: (raw.sponsor_id as string) || "",
    status: String(raw.status ?? ""),
    email_verified: typeof raw.email_verified === 'number' ? raw.email_verified : typeof raw.email_verified === 'string' ? Number(raw.email_verified) || 0 : 0,
    payment_verified: typeof raw.payment_verified === 'number' ? raw.payment_verified : typeof raw.payment_verified === 'string' ? Number(raw.payment_verified) || 0 : 0,
    created_at: (raw.created_at as string) || "",
  }
}

const extractUsers = (payload?: AdminUsersListApiData | null): PendingUser[] => {
  if (!payload) return []

  const ensureArray = (maybeArray: unknown): Array<Record<string, unknown>> =>
    Array.isArray(maybeArray) ? (maybeArray as Array<Record<string, unknown>>) : []

  const transformArray = (arr: Array<Record<string, unknown>>): PendingUser[] => arr.map(transformUser)

  const directUsers = ensureArray(payload.users)
  if (directUsers.length) return transformArray(directUsers)

  const directItems = ensureArray(payload.items)
  if (directItems.length) return transformArray(directItems)

  if (Array.isArray(payload.data)) {
    return transformArray(payload.data as unknown as Array<Record<string, unknown>>)
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>
    const nestedUsers = ensureArray(nested.users)
    if (nestedUsers.length) return transformArray(nestedUsers)

    const nestedItems = ensureArray(nested.items)
    if (nestedItems.length) return transformArray(nestedItems)

    const nestedData = ensureArray(nested.data)
    if (nestedData.length) return transformArray(nestedData)

    const nestedTransactions = ensureArray(nested.transactions)
    if (nestedTransactions.length) return transformArray(nestedTransactions)
  }

  if (payload.meta && typeof payload.meta === "object") {
    const meta = payload.meta as Record<string, unknown>
    const metaData = ensureArray(meta.data)
    if (metaData.length) return transformArray(metaData)
  }

  return []
}

const extractPagination = (payload?: AdminUsersListApiData | null): PaginationMeta | undefined => {
  if (!payload) return undefined

  if (payload.pagination) return payload.pagination

  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    const nested = payload.data as Record<string, unknown>
    if (nested.pagination && typeof nested.pagination === "object") {
      return nested.pagination as PaginationMeta
    }
    if (nested.meta && typeof nested.meta === "object") {
      const meta = nested.meta as Record<string, unknown>
      if (meta.pagination && typeof meta.pagination === "object") {
        return meta.pagination as PaginationMeta
      }
    }
  }

  if (payload.meta && typeof payload.meta === "object") {
    const meta = payload.meta as Record<string, unknown>
    if (meta.pagination && typeof meta.pagination === "object") {
      return meta.pagination as PaginationMeta
    }
  }

  return undefined
}

const getStatusBadge = (status: string) => {
  const normalized = status?.toLowerCase?.() ?? ""
  switch (normalized) {
    case "payment_verified":
    case "verified":
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
          Payment Verified
        </Badge>
      )
    case "pending":
    case "0":
      return <Badge variant="secondary">Pending</Badge>
    case "active":
    case "1":
      return <Badge variant="default">Active</Badge>
    case "blocked":
    case "2":
      return <Badge variant="destructive">Blocked</Badge>
    default:
      if (!normalized) {
        return <Badge variant="outline">Unknown</Badge>
      }
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function NewUsersPage() {
  const { token } = useAuth()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)

  const [pendingTransactions, setPendingTransactions] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
  })
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null)

  const { page, limit } = filters

  const createUserForm = useForm<AdminUserCreateFormData>({
    resolver: zodResolver(adminUserCreateSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: createInitialCreateFormState(),
  })

  const resetCreateForm = useCallback(() => {
    createUserForm.reset(createInitialCreateFormState())
  }, [createUserForm])

  const handleCreateCountryChange = useCallback((selectedCountry: string) => {
    const countryData = COUNTRIES.find((country) => country.name === selectedCountry)
    if (!countryData) return

    createUserForm.setValue("country", selectedCountry, { shouldValidate: true })
    createUserForm.setValue("country_code", countryData.code, { shouldValidate: true })
  }, [createUserForm])

  const handleCreateUserSubmit = async (data: AdminUserCreateFormData) => {
    if (!token) {
      toast.error("You must be logged in to create users.")
      return
    }

    try {
      setCreatingUser(true)

      const { confirm_password: _confirmPassword, ...payload } = data

      const response = await adminUsersApi.create(payload, token)
      toast.success(response?.message || "User created successfully")
      setCreateDialogOpen(false)
      resetCreateForm()
      await fetchPendingTransactions()
    } catch (err) {
      console.error("Failed to create user:", err)
      const message = err instanceof Error ? err.message : "Failed to create user"
      toast.error(message)
    } finally {
      setCreatingUser(false)
    }
  }

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) {
      resetCreateForm()
      setCreatingUser(false)
    }
  }

  const fetchPendingTransactions = useCallback(async () => {
    if (!token) {
      setPendingTransactions([])
      setPaginationMeta(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await adminUsersApi.list({
        token,
        page,
        limit,
      })

      const payload = response?.data ?? null
      const users = extractUsers(payload)
      setPendingTransactions(users)
      setPaginationMeta(extractPagination(payload) ?? null)
    } catch (err) {
      console.error("Failed to load pending users:", err)
      const message =
        err instanceof Error ? err.message : "Failed to load pending users"
      toast.error(message)
      setError(message)
      setPendingTransactions([])
      setPaginationMeta(null)
    } finally {
      setLoading(false)
    }
  }, [token, page, limit])

  useEffect(() => {
    void fetchPendingTransactions()
  }, [fetchPendingTransactions])

  const goToPage = (targetPage: number) => {
    setFilters((prev) => ({ ...prev, page: targetPage }))
  }

  const handleRefresh = () => {
    void fetchPendingTransactions()
  }

  const totalPending = paginationMeta?.total ?? pendingTransactions.length
  const currentPage = paginationMeta?.current_page ?? paginationMeta?.page ?? page
  const perPage = paginationMeta?.per_page ?? paginationMeta?.limit ?? limit
  const totalPages =
    paginationMeta?.total_pages ??
    paginationMeta?.last_page ??
    (totalPending && perPage ? Math.ceil(totalPending / perPage) : undefined)
  const pageNumbers = totalPages
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [currentPage]

  const rangeStart = pendingTransactions.length ? (currentPage - 1) * perPage + 1 : 0
  const rangeEnd = pendingTransactions.length ? rangeStart + pendingTransactions.length - 1 : 0

  const canGoPrev = currentPage > 1
  const canGoNext = totalPages ? currentPage < totalPages : pendingTransactions.length === perPage

  const goToPreviousPage = () => {
    if (!canGoPrev) return
    setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
  }

  const goToNextPage = () => {
    if (!canGoNext) return
    setFilters((prev) => {
      if (totalPages && prev.page >= totalPages) {
        return prev
      }
      return { ...prev, page: prev.page + 1 }
    })
  }

  const paymentVerifiedCount = pendingTransactions.filter((user) => user.payment_verified === 1).length
  const emailVerifiedCount = pendingTransactions.filter((user) => user.email_verified === 1).length
  const newTodayCount = pendingTransactions.filter((user) => {
    const today = new Date()
    const userDate = new Date(user.created_at)
    return userDate.toDateString() === today.toDateString()
  }).length

  return (
    <ProtectedRoute>
      <>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-3 pt-8 pb-10 md:px-6 md:pt-12">
          {/* Title and Description */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">New Users</h1>
              <p className="text-muted-foreground max-w-2xl">
                Review recent registrations and move through results page by page.
              </p>
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto sm:flex-shrink-0">
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <Form {...createUserForm}>
                    <form
                      className="space-y-5"
                      onSubmit={createUserForm.handleSubmit(handleCreateUserSubmit)}
                    >
                      <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>
                          Add a new user account. Shared schema validation is applied here so this modal follows the
                          same reusable pattern we can use across admin forms.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <ValidatedTextField
                          control={createUserForm.control}
                          name="first_name"
                          label="First name"
                          transformValue={sanitizePersonText}
                          inputProps={{ autoComplete: "given-name", placeholder: "Enter first name" }}
                        />
                        <ValidatedTextField
                          control={createUserForm.control}
                          name="last_name"
                          label="Last name"
                          transformValue={sanitizePersonText}
                          inputProps={{ autoComplete: "family-name", placeholder: "Enter last name" }}
                        />
                        <ValidatedTextField
                          control={createUserForm.control}
                          name="email"
                          label="Email"
                          className="sm:col-span-2"
                          inputProps={{
                            type: "email",
                            autoComplete: "email",
                            placeholder: "name@example.com",
                          }}
                        />
                        <ValidatedFormField
                          control={createUserForm.control}
                          name="mobile"
                          label="Mobile"
                          renderControl={({ field }) => (
                            <Input
                              {...field}
                              inputMode="numeric"
                              autoComplete="tel"
                              placeholder="Enter mobile number"
                              value={field.value ?? ""}
                              onChange={(event) => field.onChange(sanitizeDigits(event.target.value, 15))}
                            />
                          )}
                        />
                        <ValidatedFormField
                          control={createUserForm.control}
                          name="country"
                          label="Country"
                          renderControl={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                handleCreateCountryChange(value)
                                field.onChange(value)
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent side="bottom" avoidCollisions={false}>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={country.name} value={country.name}>
                                    {country.name} ({country.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ValidatedFormField
                          control={createUserForm.control}
                          name="country_code"
                          label="Country code"
                          renderControl={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value)
                                const matchedCountry = COUNTRIES.find((country) => country.code === value)
                                if (matchedCountry) {
                                  createUserForm.setValue("country", matchedCountry.name, { shouldValidate: true })
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select country code" />
                              </SelectTrigger>
                              <SelectContent side="bottom" avoidCollisions={false}>
                                {COUNTRIES.map((country) => (
                                  <SelectItem key={`${country.name}-${country.code}`} value={country.code}>
                                    {country.code} ({country.name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ValidatedPasswordField
                          control={createUserForm.control}
                          name="password"
                          label="Password"
                          inputProps={{ placeholder: "Create a strong password" }}
                        />
                        <ValidatedPasswordField
                          control={createUserForm.control}
                          name="confirm_password"
                          label="Confirm password"
                          inputProps={{ placeholder: "Confirm password" }}
                        />
                        <ValidatedTextField
                          control={createUserForm.control}
                          name="referral_code"
                          label="Referral code"
                          className="sm:col-span-2"
                          inputProps={{ autoComplete: "off", placeholder: "Enter referral code if available" }}
                        />
                      </div>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={creatingUser}>
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={creatingUser}>
                          {creatingUser ? "Creating..." : "Create User"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPending}</div>
                <p className="text-sm text-muted-foreground">Across all pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Verified</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{paymentVerifiedCount}</div>
                <p className="text-sm text-muted-foreground">On this page</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Email Verified</CardTitle>
                <Mail className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailVerifiedCount}</div>
                <p className="text-sm text-muted-foreground">On this page</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Today</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newTodayCount}</div>
                <p className="text-sm text-muted-foreground">Users created today</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>View and manage all users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-3 pb-6 sm:px-6">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registration Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && pendingTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="flex justify-center py-12">
                            <Spinner className="h-6 w-6" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : pendingTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="py-10 text-center">
                            <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                            <p className="text-muted-foreground">No users found.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {pendingTransactions.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{user.name || "—"}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{user.username}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Sponsor: {user.sponsor_id || "—"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center text-sm">
                                  <Mail className="mr-1 h-3 w-3" />
                                  <span>{user.email}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                  <Phone className="mr-1 h-3 w-3" />
                                  <span>{user.mobile || "—"}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                  <Globe className="mr-1 h-3 w-3" />
                                  <span>{user.country || "—"}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                {getStatusBadge(user.status)}
                                <div className="space-y-1">
                                  {user.email_verified === 1 && (
                                    <Badge variant="outline" className="text-xs">
                                      ✓ Email Verified
                                    </Badge>
                                  )}
                                  {user.payment_verified === 1 && (
                                    <Badge variant="outline" className="text-xs">
                                      ✓ Payment Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{formatDateTime(user.created_at)}</div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {loading && pendingTransactions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={4}>
                              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                                <Spinner className="h-4 w-4" />
                                <span>Refreshing…</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t px-3 pb-6 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-sm text-muted-foreground">
                {totalPending === 0
                  ? "No users to display"
                  : `Showing ${rangeStart}-${rangeEnd} of ${totalPending} users`}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={!canGoPrev || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <div className="text-sm font-medium text-muted-foreground">
                  Page {currentPage}
                  {totalPages ? ` of ${totalPages}` : ""}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {pageNumbers.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={pageNumber === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNumber)}
                      disabled={loading || pageNumber === currentPage}
                      className="min-w-9"
                    >
                      {pageNumber}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={!canGoNext || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </>
    </ProtectedRoute>
  )
}
