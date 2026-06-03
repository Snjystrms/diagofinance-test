"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  CalendarClock,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Gem,
  Link2,
  Network,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import {
  IbMetricCard,
  IbPageHeader,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminIbPlansApi,
  adminIbUsersApi,
  type AdminIbPlanItem,
  type AdminIbUser,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "wallet" | "commissions" | "network" | "profile";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  wallet: "Wallet",
  commissions: "Commissions",
  network: "Network",
  profile: "Profile",
};

type PreviewUser = Pick<
  AdminIbUser,
  | "id"
  | "uuid"
  | "name"
  | "first_name"
  | "last_name"
  | "email"
  | "mobile"
  | "phone"
  | "sponsor_id"
  | "ib_name"
  | "ib_plan_name"
  | "partner_id"
  | "referral_code"
  | "referral_link"
  | "status"
  | "is_ib_user"
  | "created_at"
>;

type IbPlanOption = {
  id: string;
  name: string;
  status: string;
};

const normalizeIbPlanOption = (plan: AdminIbPlanItem): IbPlanOption => ({
  id: String(plan.id),
  name: plan.name ?? `IB Plan ${plan.id}`,
  status: String(plan.status ?? ""),
});

const deriveFullName = (user: PreviewUser): string => {
  const candidates = [
    user.name,
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
  ];
  const match = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return match ?? "IB User";
};

const deriveStatusLabel = (user: PreviewUser) => {
  const raw = user.status ?? user.is_ib_user;
  const value =
    typeof raw === "boolean" ? (raw ? 1 : 0) : Number(raw ?? 0);
  return value === 1 || raw === "1" || raw === true ? "Active" : "Inactive";
};

const isActive = (user: PreviewUser) =>
  deriveStatusLabel(user) === "Active";

const buildPublicReferralLink = (raw?: string | null) => {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.protocol = "https:";
    parsed.host = "crminhouse-mocha.vercel.app";
    return parsed.toString();
  } catch {
    return raw.replace("https://api.graybulls.com", "https://crminhouse-mocha.vercel.app");
  }
};

const deriveReferralLinkFallback = (user: PreviewUser): string => {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  if (user.partner_id) return `${base}/register?ref=${user.partner_id}`;
  if (user.referral_code) return `${base}/register?ref=${user.referral_code}`;
  if (user.sponsor_id) return `${base}/register?ref=${user.sponsor_id}`;
  return "";
};

const resolveNumericUserId = (user: AdminIbUser) => {
  if (typeof user.id === "number" && Number.isFinite(user.id)) {
    return user.id;
  }
  if (typeof user.id === "string") {
    const trimmedId = user.id.trim();
    if (trimmedId.length > 0 && !Number.isNaN(Number(trimmedId))) {
      return Number(trimmedId);
    }
  }
  return null;
};

function TabSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

type ResolvedPreview = {
  user: PreviewUser;
  referralLink: string;
  planName: string;
  partnerId: string;
  fullName: string;
  statusLabel: string;
  isActive: boolean;
};

type TabShellProps = {
  user: ResolvedPreview;
  loading: boolean;
};

function OverviewTab({ user, loading }: TabShellProps) {
  const { fullName, partnerId, planName, referralLink } = user;

  return (
    <>
      <IbPageHeader
        eyebrow="IB Workspace"
        title={`IB dashboard for ${fullName}`}
        description="Read-only preview of the IB portal — same view the IB user sees on /ib-dashboard."
        actions={
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-full">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="IB Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Funds available for partner-level withdrawals and transfers."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Client-side funds ready for trading activity."
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Cycle information unavailable in preview"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
        <IbMetricCard
          title="Total Earned"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Today: 0.00"
          icon={<DollarSign className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <IbSectionCard
          title="Rebate trend"
          description="Recent rebate activity for the IB account."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              Today earning 0.00
            </span>
          }
        >
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-[24px]" />
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
              Rebate chart will render once the dashboard endpoint is wired up.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="IB profile"
          description="Core IB program details and referral assets."
        >
          <div className="space-y-4">
            <div className="ib-portal-note rounded-3xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IB User
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {planName}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/70 bg-background/80">
                  <Gem className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  IB ID
                </p>
                <p className="mt-2 break-all text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {partnerId}
                </p>
              </div>
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Internal Transfers
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(0)}
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Referral Link
                  </p>
                  <p className="mt-2 break-all text-sm leading-6">
                    {referralLink ? (
                      <a
                        href={referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline hover:text-primary"
                      >
                        {referralLink}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No referral link available
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={!referralLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Link2 className="mr-2 h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button size="sm" className="rounded-full">
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Client summary
                </Button>
              </div>
            </div>
          </div>
        </IbSectionCard>
      </div>
    </>
  );
}

function WalletTab({ loading }: TabShellProps) {
  return (
    <>
      <IbPageHeader
        eyebrow="Wallet"
        title="Wallet balances and transaction history"
        description="Partner (IB) wallet, main (client) wallet, and recent transfers."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="Partner Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="IB-side commission wallet"
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Client Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Main trading wallet"
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <IbSectionCard
        title="Recent wallet transactions"
        description="Latest movements across both wallets."
      >
        {loading ? (
          <TabSkeleton rows={5} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions yet. Once the wallet endpoint is wired up,
                    recent transfers will appear here.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </IbSectionCard>
    </>
  );
}

function CommissionsTab({ user, loading }: TabShellProps) {
  return (
    <>
      <IbPageHeader
        eyebrow="Commissions"
        title="Commission rates & recent rebates"
        description={`Live payout matrix for ${user.fullName}'s IB plan.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="IB Plan"
          value={user.planName}
          description="Plan assigned to this user"
          icon={<Gem className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Total Earned"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Lifetime commission"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Awaiting next cycle"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <IbSectionCard
        title="Commission rates"
        description="Account-type payout ladder for the assigned plan."
      >
        {loading ? (
          <TabSkeleton rows={4} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>IB Rate</TableHead>
                  <TableHead>Sub-IB L1</TableHead>
                  <TableHead>Sub-IB L2</TableHead>
                  <TableHead>Sub-IB L3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Commission rates will load from
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      /admin/ib-management/ib-users/:id/plan
                    </code>
                    once the endpoint is available.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </IbSectionCard>
    </>
  );
}

function NetworkTab({ loading }: TabShellProps) {
  return (
    <>
      <IbPageHeader
        eyebrow="Network"
        title="Clients, sub-IBs & downline"
        description="Referred clients, sub-brokers, and the full downline tree."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Direct Clients"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="Clients directly referred"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Sub-IBs"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="Active sub-brokers in downline"
          icon={<Network className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Total Downline"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="All levels combined"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <IbSectionCard
          title="Direct clients"
          description="Clients registered via the IB's referral link."
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Direct client list will load from
                      <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        /admin/ib-management/ib-users/:id/clients
                      </code>
                      .
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="Sub-IBs"
          description="Sub-brokers attached to this IB at any level."
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub-IB</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Sub-IB list will load from
                      <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        /admin/ib-management/ib-users/:id/sub-ibs
                      </code>
                      .
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </IbSectionCard>
      </div>
    </>
  );
}

function ProfileTab({ user, loading }: TabShellProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Full name", value: user.fullName },
    { label: "Email", value: user.user.email ?? "\u2014" },
    { label: "Mobile", value: user.user.mobile ?? user.user.phone ?? "\u2014" },
    { label: "IB Name", value: user.user.ib_name ?? "\u2014" },
    { label: "IB Plan", value: user.planName },
    { label: "IB ID / Partner ID", value: user.partnerId },
    { label: "Sponsor ID", value: user.user.sponsor_id ?? "\u2014" },
    { label: "Referral Code", value: user.user.referral_code ?? "\u2014" },
    {
      label: "Registered",
      value: user.user.created_at
        ? formatDateTimeInIST(user.user.created_at, "\u2014")
        : "\u2014",
    },
  ];

  return (
    <>
      <IbPageHeader
        eyebrow="Profile"
        title="IB account profile"
        description="Identity, plan assignment, and registration metadata."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
          >
            <Link href={`/new-users/${user.user.id ?? user.user.uuid ?? ""}`}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open full user record
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-3xl border border-border/60 bg-muted/20 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground break-words">
              {loading ? <Skeleton className="h-5 w-40" /> : row.value}
            </p>
          </div>
        ))}
      </div>

      <IbSectionCard
        title="Activity timeline"
        description="A short log of the IB's recent portal actions."
      >
        {loading ? (
          <TabSkeleton rows={3} />
        ) : (
          <div className="space-y-2">
            {[
              { icon: ArrowUpRight, label: "Login activity", tone: "text-rose-600" },
              { icon: ArrowDownRight, label: "Plan assignment", tone: "text-emerald-600" },
              { icon: ArrowUpRight, label: "KYC update", tone: "text-amber-600" },
            ].map((entry, index) => {
              const Icon = entry.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/40",
                      entry.tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Timeline entries will load once activity log endpoint is wired up.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </IbSectionCard>
    </>
  );
}

export default function IbUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof idParam === "string" ? decodeURIComponent(idParam) : "";

  const [user, setUser] = useState<AdminIbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [ibPlans, setIbPlans] = useState<IbPlanOption[]>([]);
  const [loadingIbPlans, setLoadingIbPlans] = useState(false);
  const [selectedIbPlanId, setSelectedIbPlanId] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [showPlanSelect, setShowPlanSelect] = useState(false);

  const loadUser = useCallback(async () => {
    if (!token || !id) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = Number(id);
      if (!Number.isFinite(userId)) {
        throw new Error(`Invalid user ID: ${id}`);
      }

      const response = await adminIbUsersApi.detail(userId, token);
      const payload = response?.data;

      let resolvedUser: AdminIbUser | null = null;

      if (payload) {
        const dataObj = payload as Record<string, unknown>;
        if (dataObj.user && typeof dataObj.user === "object") {
          resolvedUser = dataObj.user as AdminIbUser;
        } else if (dataObj.data && typeof dataObj.data === "object") {
          const inner = dataObj.data as Record<string, unknown>;
          if (inner.user && typeof inner.user === "object") {
            resolvedUser = inner.user as AdminIbUser;
          } else {
            resolvedUser = inner as unknown as AdminIbUser;
          }
        } else {
          resolvedUser = payload as unknown as AdminIbUser;
        }
      }

      if (!resolvedUser) {
        throw new Error("Could not resolve user from detail response.");
      }

      setUser(resolvedUser);
    } catch (err: unknown) {
      console.error("Failed to load IB user detail:", err);
      setError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "IB user",
          action: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const loadIbPlans = useCallback(async () => {
    if (!token) {
      setIbPlans([]);
      return;
    }

    try {
      setLoadingIbPlans(true);
      const response = await adminIbPlansApi.list({ token });
      const plans = Array.isArray(response?.data) ? response.data : [];
      setIbPlans(plans.map(normalizeIbPlanOption));
    } catch (err: unknown) {
      console.error("Failed to load IB plans:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "IB plans",
          action: "load",
        }),
      );
      setIbPlans([]);
    } finally {
      setLoadingIbPlans(false);
    }
  }, [token]);

  useEffect(() => {
    void loadIbPlans();
  }, [loadIbPlans]);

  const handleUpdatePlan = useCallback(async () => {
    if (!token || !user || !selectedIbPlanId) return;

    const userId = resolveNumericUserId(user);
    if (!userId) {
      toast.error("User ID not available");
      return;
    }

    try {
      setUpdatingPlan(true);
      const response = await adminIbUsersApi.updatePlan(
        userId,
        { ib_plan_id: Number(selectedIbPlanId) },
        token,
      );

      toast.success(
        response?.message?.trim() || "IB plan updated successfully",
      );
      setShowPlanSelect(false);
      setSelectedIbPlanId("");
      await loadUser();
    } catch (err: unknown) {
      console.error("Failed to update IB plan:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "IB plan",
          action: "update",
        }),
      );
    } finally {
      setUpdatingPlan(false);
    }
  }, [token, user, selectedIbPlanId, loadUser]);

  const previewData = useMemo(() => {
    if (!user) return null;

    const referralLink = buildPublicReferralLink(
      user.referral_link ?? deriveReferralLinkFallback(user),
    );

    return {
      user,
      referralLink,
      planName: user.ib_plan_name ?? "Standard IB",
      partnerId: user.partner_id ?? user.referral_code ?? "\u2014",
      fullName: deriveFullName(user),
      statusLabel: deriveStatusLabel(user),
      isActive: isActive(user),
    };
  }, [user]);

  if (error && !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <Button
            variant="ghost"
            className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => router.push("/ib-users")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to IB Users
          </Button>
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="IB user"
            action="load"
            onRetry={() => {
              void loadUser();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex flex-col gap-0 p-0">
        {/* Top bar — admin context strip */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-foreground">
              <Eye className="h-3.5 w-3.5 text-primary" />
              Admin Preview
            </span>
            <span>\u00b7</span>
            <span>Read-only view of the IB portal</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {previewData ? (
              <>
                <Badge
                  className={cn(
                    "border-0",
                    previewData.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300",
                  )}
                >
                  {previewData.statusLabel}
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full border-blue-200 bg-blue-50 px-3.5 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200"
                  onClick={() => setShowPlanSelect(!showPlanSelect)}
                >
                  Update Plan
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                >
                  <Link href={`/new-users/${previewData.user.id ?? previewData.user.uuid ?? ""}`}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Full Profile
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Plan update inline section */}
        {showPlanSelect && (
          <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                <label htmlFor="ib-plan-id" className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Select new IB plan
                </label>
                <Select
                  value={selectedIbPlanId}
                  onValueChange={setSelectedIbPlanId}
                  disabled={loadingIbPlans || ibPlans.length === 0}
                >
                  <SelectTrigger id="ib-plan-id" className="max-w-xs">
                    <SelectValue
                      placeholder={loadingIbPlans ? "Loading plans..." : "Select IB plan"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {ibPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loadingIbPlans && ibPlans.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No IB plans available.</p>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedIbPlanId || updatingPlan}
                  onClick={() => void handleUpdatePlan()}
                >
                  {updatingPlan ? "Updating..." : "Apply"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPlanSelect(false);
                    setSelectedIbPlanId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Back button + page shell */}
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <Button
              asChild
              variant="ghost"
              className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <Link href="/ib-users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to IB Users
              </Link>
            </Button>
          </div>

          {loading && !previewData ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-[28px]" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-36 rounded-[28px]" />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                <Skeleton className="h-[320px] rounded-[28px]" />
                <Skeleton className="h-[320px] rounded-[28px]" />
              </div>
            </div>
          ) : previewData ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabKey)}
              className="space-y-6"
            >
              <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-1.5">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="rounded-xl px-4 py-2 text-sm"
                  >
                    {TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <OverviewTab user={previewData} loading={loading} />
              </TabsContent>

              <TabsContent value="wallet" className="space-y-6">
                <WalletTab user={previewData} loading={loading} />
              </TabsContent>

              <TabsContent value="commissions" className="space-y-6">
                <CommissionsTab user={previewData} loading={loading} />
              </TabsContent>

              <TabsContent value="network" className="space-y-6">
                <NetworkTab user={previewData} loading={loading} />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <ProfileTab user={previewData} loading={loading} />
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </div>
  );
}