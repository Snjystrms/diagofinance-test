"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Percent,
  ArrowLeftRight,
  LineChart,
  ShieldCheck,
  Receipt,
  Users,
  History,
} from "lucide-react";

const reports = [
  {
    title: "Deposit Report",
    href: "/report-management/deposit-report",
    icon: ArrowDownToLine,
    description: "View and manage deposit transactions",
  },
  {
    title: "Partner Users Report",
    href: "/report-management/all-partners-report",
    icon: Users,
    description: "View partner users, balances, and referral metrics",
  },
  {
    title: "Withdrawal Report",
    href: "/report-management/withdrawal-report",
    icon: ArrowUpFromLine,
    description: "View and manage withdrawal transactions",
  },
  {
    title: "IB Withdrawal Report",
    href: "/report-management/ib-withdrawal-report",
    icon: Wallet,
    description: "View IB withdrawal requests",
  },
  {
    title: "IB Commission Report",
    href: "/report-management/ib-commission-report",
    icon: Percent,
    description: "View IB commission details",
  },
  {
    title: "Internal Transfer Report",
    href: "/report-management/internal-transfer-report",
    icon: ArrowLeftRight,
    description: "View internal transfer history",
  },
  {
    title: "Trading History Report",
    href: "/report-management/trading-history-report",
    icon: LineChart,
    description: "View trading history records",
  },
  {
    title: "Login Activity Report",
    href: "/report-management/login-activity-report",
    icon: ShieldCheck,
    description: "View user login activities",
  },
  {
    title: "Wallet History Report",
    href: "/report-management/wallet-history-report",
    icon: History,
    description: "View wallet history transactions",
  },
  {
    title: "All Transaction Report",
    href: "/report-management/all-transaction-report",
    icon: Receipt,
    description: "View all transactions in one place",
  },
];

export default function ReportManagementPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select a report to view details
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href} className="group">
              <Card className="transition-colors hover:border-primary/50 hover:bg-primary/5">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary/20">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {report.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
