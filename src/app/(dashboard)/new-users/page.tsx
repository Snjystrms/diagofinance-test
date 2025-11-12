"use client"

import { useCallback, useEffect, useState } from "react"
import type { ChangeEvent, FormEvent } from "react"
import toast from "react-hot-toast"

import { MainLayout } from "@/components/main-layout"
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
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import {
  adminUsersApi,
  type AdminUsersListApiData,
  type PaginationMeta,
  type PendingUser,
} from "@/lib/api"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
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
  XCircle,
} from "lucide-react"

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Inactive", value: "0" },
  { label: "Active", value: "1" },
  { label: "Blocked", value: "2" },
] as const

const approvalOptions = [
  { label: "All approvals", value: "all" },
  { label: "Pending approval", value: "0" },
  { label: "Approved", value: "1" },
  { label: "Rejected", value: "2" },
] as const

const limitOptions = ["10", "25", "50"] as const

type CreateUserFormState = {
  first_name: string
  last_name: string
  email: string
  mobile: string
  country: string
  country_code: string
  password: string
  confirm_password: string
  referral_code: string
}

const createInitialCreateFormState = (): CreateUserFormState => ({
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

const extractUsers = (payload?: AdminUsersListApiData | null): PendingUser[] => {
  if (!payload) return []

  const ensureArray = (maybeArray: unknown): PendingUser[] =>
    Array.isArray(maybeArray) ? (maybeArray as PendingUser[]) : []

  const directUsers = ensureArray(payload.users)
  if (directUsers.length) return directUsers

  const directItems = ensureArray(payload.items)
  if (directItems.length) return directItems

  if (Array.isArray(payload.data)) {
    return payload.data as PendingUser[]
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>
    const nestedUsers = ensureArray(nested.users)
    if (nestedUsers.length) return nestedUsers

    const nestedItems = ensureArray(nested.items)
    if (nestedItems.length) return nestedItems

    const nestedData = ensureArray(nested.data)
    if (nestedData.length) return nestedData

    const nestedTransactions = ensureArray(nested.transactions)
    if (nestedTransactions.length) return nestedTransactions
  }

  if (payload.meta && typeof payload.meta === "object") {
    const meta = payload.meta as Record<string, unknown>
    const metaData = ensureArray(meta.data)
    if (metaData.length) return metaData
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
  const [createForm, setCreateForm] = useState<CreateUserFormState>(() => createInitialCreateFormState())
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof CreateUserFormState, string>>>({})
  const [creatingUser, setCreatingUser] = useState(false)

  const [pendingTransactions, setPendingTransactions] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "",
    isApproved: "",
  })
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null)

  const { page, limit, search, status, isApproved } = filters

  const resetCreateForm = useCallback(() => {
    setCreateForm(createInitialCreateFormState())
    setCreateErrors({})
  }, [])

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }, 400)

  const validateCreateForm = useCallback(() => {
    const errors: Partial<Record<keyof CreateUserFormState, string>> = {}

    if (!createForm.first_name.trim()) {
      errors.first_name = "First name is required"
    }

    if (!createForm.last_name.trim()) {
      errors.last_name = "Last name is required"
    }

    const emailValue = createForm.email.trim()
    if (!emailValue) {
      errors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      errors.email = "Enter a valid email address"
    }

    if (!createForm.password.trim()) {
      errors.password = "Password is required"
    } else if (createForm.password.trim().length < 8) {
      errors.password = "Password must be at least 8 characters"
    }

    if (!createForm.confirm_password.trim()) {
      errors.confirm_password = "Confirm the password"
    } else if (createForm.confirm_password.trim() !== createForm.password.trim()) {
      errors.confirm_password = "Passwords must match"
    }

    if (createForm.mobile.trim() && createForm.mobile.trim().length < 6) {
      errors.mobile = "Enter a valid mobile number"
    }

    return errors
  }, [createForm])

  const handleCreateInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const nextValue =
      name === "country_code" ? value.toUpperCase() : value

    const field = name as keyof CreateUserFormState

    setCreateForm((prev) => ({
      ...prev,
      [field]: nextValue,
    }))

    if (createErrors[field]) {
      setCreateErrors((prev) => {
        const { [field]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  const handleCreateUserSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      toast.error("You must be logged in to create users.")
      return
    }

    const errors = validateCreateForm()
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors)
      return
    }

    try {
      setCreatingUser(true)

      const { confirm_password: _confirmPassword, ...payload } = createForm

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
        search,
        status,
        isApproved,
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
  }, [token, page, limit, search, status, isApproved])

  useEffect(() => {
    void fetchPendingTransactions()
  }, [fetchPendingTransactions])

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchInput(value)
    debouncedApplySearch(value)
  }

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value, page: 1 }))
  }

  const handleApprovalChange = (value: string) => {
    setFilters((prev) => ({ ...prev, isApproved: value === "all" ? "" : value, page: 1 }))
  }

  const handleLimitChange = (value: string) => {
    setFilters((prev) => ({ ...prev, limit: Number(value), page: 1 }))
  }

  const handleRefresh = () => {
    void fetchPendingTransactions()
  }

  const totalPending = paginationMeta?.total ?? pendingTransactions.length
  const currentPage = paginationMeta?.current_page ?? paginationMeta?.page ?? page
  const perPage = paginationMeta?.per_page ?? paginationMeta?.limit ?? limit
  const perPageOptions = Array.from(new Set([...limitOptions, String(perPage)]))
  const totalPages =
    paginationMeta?.total_pages ??
    paginationMeta?.last_page ??
    (totalPending && perPage ? Math.ceil(totalPending / perPage) : undefined)

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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 pb-10 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">New Users</h1>
              <p className="text-muted-foreground">
                Review recent registrations, filter by status, and monitor verification progress.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-4 shadow-sm lg:w-auto">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search by name, email, mobile..."
                  className="w-full min-w-[220px] sm:flex-1 sm:pr-2 lg:w-64"
                />
                <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto">
                      Create User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form className="space-y-5" onSubmit={handleCreateUserSubmit}>
                      <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>
                          Add a new user account. Required fields are marked and validations run before submission.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">First name</Label>
                          <Input
                            id="first_name"
                            name="first_name"
                            value={createForm.first_name}
                            onChange={handleCreateInputChange}
                            autoComplete="given-name"
                          />
                          {createErrors.first_name && (
                            <p className="text-sm text-destructive">{createErrors.first_name}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Last name</Label>
                          <Input
                            id="last_name"
                            name="last_name"
                            value={createForm.last_name}
                            onChange={handleCreateInputChange}
                            autoComplete="family-name"
                          />
                          {createErrors.last_name && (
                            <p className="text-sm text-destructive">{createErrors.last_name}</p>
                          )}
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={createForm.email}
                            onChange={handleCreateInputChange}
                            autoComplete="email"
                          />
                          {createErrors.email && (
                            <p className="text-sm text-destructive">{createErrors.email}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile</Label>
                          <Input
                            id="mobile"
                            name="mobile"
                            value={createForm.mobile}
                            onChange={handleCreateInputChange}
                            autoComplete="tel"
                          />
                          {createErrors.mobile && (
                            <p className="text-sm text-destructive">{createErrors.mobile}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country_code">Country code</Label>
                          <Input
                            id="country_code"
                            name="country_code"
                            value={createForm.country_code}
                            onChange={handleCreateInputChange}
                            autoComplete="off"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="country">Country</Label>
                          <Input
                            id="country"
                            name="country"
                            value={createForm.country}
                            onChange={handleCreateInputChange}
                            autoComplete="country-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={createForm.password}
                            onChange={handleCreateInputChange}
                            autoComplete="new-password"
                          />
                          {createErrors.password && (
                            <p className="text-sm text-destructive">{createErrors.password}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirm_password">Confirm password</Label>
                          <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            value={createForm.confirm_password}
                            onChange={handleCreateInputChange}
                            autoComplete="new-password"
                          />
                          {createErrors.confirm_password && (
                            <p className="text-sm text-destructive">{createErrors.confirm_password}</p>
                          )}
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="referral_code">Referral code (optional)</Label>
                          <Input
                            id="referral_code"
                            name="referral_code"
                            value={createForm.referral_code}
                            onChange={handleCreateInputChange}
                            autoComplete="off"
                          />
                        </div>
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
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                <Select value={status || "all"} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full min-w-[140px] lg:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={isApproved || "all"} onValueChange={handleApprovalChange}>
                  <SelectTrigger className="w-full min-w-[160px] lg:w-[180px]">
                    <SelectValue placeholder="Approval" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(perPage)} onValueChange={handleLimitChange}>
                  <SelectTrigger className="w-full min-w-[110px] lg:w-[110px]">
                    <SelectValue placeholder="Per page" />
                  </SelectTrigger>
                  <SelectContent>
                    {perPageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2"
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
                <p className="text-sm text-muted-foreground">
                  Across all pages{search ? ` for “${search}”` : ""}
                </p>
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
              <CardTitle>Pending Users</CardTitle>
              <CardDescription>Review and manage user registration requests.</CardDescription>
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
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && pendingTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="flex justify-center py-12">
                            <Spinner className="h-6 w-6" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : pendingTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <div className="py-10 text-center">
                            <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              No users found for the current filters.
                            </p>
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  disabled
                                  title="Approval actions coming soon"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled
                                  title="Approval actions coming soon"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {loading && pendingTransactions.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={5}>
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
              <div className="flex items-center gap-2">
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
