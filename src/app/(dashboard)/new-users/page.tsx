"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { PendingUser } from "@/lib/api"
// import { userOperations, utilityFunctions } from "@/utils/operations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle, XCircle, AlertCircle, Users, Calendar, Globe, Phone, Mail } from "lucide-react"
import toast from "react-hot-toast"

export default function NewUsersPage() {
  const { token } = useAuth()
  const [pendingTransactions, setPendingTransactions] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  // useEffect(() => {
  //   if (token) {
  //     fetchPendingTransactions()
  //   }
  // }, [token])

  // console.log(pendingTransactions,"pendingTransactions")
  // const fetchPendingTransactions = async () => {
  //   try {
  //     setLoading(true)
  //     const response = await userOperations.fetchPendingUsers(token!)
  //     console.log(response,"response");
  //     if (response.success && response.data) {
  //       setPendingTransactions(response.data.transactions)
  //     }
  //   } catch (error) {
  //     toast.error("Failed to fetch pending transactions")
  //     console.error("Error fetching pending transactions:", error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const handleApprove = async (userId: number) => {
  //   try {
  //     setActionLoading(userId)
  //     const response = await userOperations.approveUser(userId, token!)
  //     if (response.success) {
  //       toast.success("User approved successfully")
  //       // Remove the approved user from the list
  //       setPendingTransactions((prev: PendingUser[]) => prev.filter(user => user.id !== userId))
  //     } else {
  //       toast.error(response.message || "Failed to approve user")
  //     }
  //   } catch (error) {
  //     toast.error("Failed to approve user")
  //     console.error("Error approving user:", error)
  //   } finally {
  //     setActionLoading(null)
  //   }
  // }

  // const handleReject = async (userId: number) => {
  //   try {
  //     setActionLoading(userId)
  //     const response = await userOperations.rejectUser(userId, token!)
  //     if (response.success) {
  //       toast.success("User rejected successfully")
  //       // Remove the rejected user from the list
  //       setPendingTransactions((prev: PendingUser[]) => prev.filter(user => user.id !== userId))
  //     } else {
  //       toast.error(response.message || "Failed to reject user")
  //     }
  //   } catch (error) {
  //     toast.error("Failed to reject user")
  //     console.error("Error rejecting user:", error)
  //   } finally {
  //     setActionLoading(null)
  //   }
  // }

  // const formatDate = (dateString: string) => {
  //   return utilityFunctions.formatDate(dateString)
  // }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'payment_verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Payment Verified</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Users</h1>
          <p className="text-muted-foreground">
            Manage pending user registrations and approve or reject them
          </p>
        </div>
        {/* <Button onClick={fetchPendingTransactions} variant="outline">
          <Users className="h-4 w-4 mr-2" />
          Refresh
        </Button> */}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTransactions.filter(user => user.payment_verified === 1).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Verified</CardTitle>
            <Mail className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTransactions.filter(user => user.email_verified === 1).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Today</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingTransactions.filter(user => {
                const today = new Date()
                const userDate = new Date(user.created_at)
                return userDate.toDateString() === today.toDateString()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Users</CardTitle>
          <CardDescription>
            Review and manage user registration requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending transactions found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTransactions.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Sponsor: {user.sponsor_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </div>
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.mobile}
                          </div>
                          <div className="flex items-center text-sm">
                            <Globe className="h-3 w-3 mr-1" />
                            {user.country}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          {getStatusBadge(user.status)}
                          <div className="space-y-1">
                            {user.email_verified === 1 && (
                              <Badge variant="outline" className="text-xs">✓ Email Verified</Badge>
                            )}
                            {user.payment_verified === 1 && (
                              <Badge variant="outline" className="text-xs">✓ Payment Verified</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {/* {formatDate(user.created_at)} */}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            // onClick={() => handleApprove(user.id)}
                            disabled={actionLoading === user.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading === user.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            // onClick={() => handleReject(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Spinner className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 