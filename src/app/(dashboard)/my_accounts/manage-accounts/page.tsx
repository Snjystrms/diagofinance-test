'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mt5AccountsApi, type MT5Account } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'live') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Live
      </Badge>
    );
  }
  if (statusLower === 'pending' || statusLower === 'inactive') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        <Clock className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
      <XCircle className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </Badge>
  );
};

// Helper function to get platform badge
const getPlatformBadge = (platform: string) => {
  const platformLower = platform.toLowerCase();
  if (platformLower === 'mt5') {
    return (
      <Badge variant="outline" className="font-mono">
        MT5
      </Badge>
    );
  }
  if (platformLower === 'mt4') {
    return (
      <Badge variant="outline" className="font-mono">
        MT4
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      {platform}
    </Badge>
  );
};

export default function ManageAccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await mt5AccountsApi.getAll(token);
        if (response.success && response.data) {
          setAccounts(response.data);
        } else {
          setError('Failed to load accounts');
        }
      } catch (error) {
        console.error('Error fetching MT5 accounts:', error);
        setError(error instanceof Error ? error.message : 'Failed to load accounts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [token]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/my_accounts">My Accounts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Manage Accounts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Manage Accounts</h1>
                <p className="text-muted-foreground mt-1">
                  View and manage all your trading accounts
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/my_accounts/open-trading-account">
                Open New Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Accounts Table */}
        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              {accounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account ID</TableHead>
                        <TableHead>Account Type</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Leverage</TableHead>
                        <TableHead>Available Balance</TableHead>
                        <TableHead>Equity</TableHead>
                        <TableHead>Free Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{account.account_id}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(account.account_id, 'Account ID')}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{account.account_type}</span>
                          </TableCell>
                          <TableCell>
                            {getPlatformBadge(account.platform)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(account.status)}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{account.currency}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{account.leverage}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{account.available_balance}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{account.equity}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">{account.free_margin}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Accounts Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any trading accounts yet. Create your first account to get started.
                  </p>
                  <Button asChild>
                    <Link href="/my_accounts/open-trading-account">
                      Open Trading Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

