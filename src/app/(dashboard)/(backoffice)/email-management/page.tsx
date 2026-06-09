"use client";

import { useState, useRef, useDeferredValue, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  adminBroadcastEmailApi,
  adminEmailExclusionsApi,
  adminUsersApi,
  type ApiResponse,
  type BroadcastEmailResponse,
  type BroadcastEmailHistoryItem,
  type BroadcastEmailHistoryResponse,
  type EmailExclusion,
  type PendingUser,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { formatDateTime } from "@/lib/formatters";
import toast from "react-hot-toast";

import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  Mail,
  Send,
  Users,
  X,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  UserPlus,
  Ban,
  Trash2,
  Loader2,
  ShieldOff,
  Clock,
  FileImage,
  ExternalLink,
  RefreshCw,
  Eye,
} from "lucide-react";

export default function EmailManagementPage() {
  const { token } = useAuth();
  const { isManager, hasFeature } = useManagerPermissions();
  const queryClient = useQueryClient();

  const canSendBroadcast =
    !isManager ||
    hasFeature("emailManagement", "broadcastEmail") ||
    hasFeature("emailManagement", "sendEmail");

  const canSearchClientEmails =
    !isManager || hasFeature("emailManagement", "getClientEmails");

  const [activeTab, setActiveTab] = useState<"broadcast" | "history" | "exclusions">("broadcast");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<(File | null)[]>([null, null, null]);
  const [visibleSlots, setVisibleSlots] = useState(1);

  // manual entry
  const [emailInput, setEmailInput] = useState("");
  const emailInputRef = useRef<HTMLInputElement>(null);

  // user search
  const [userSearch, setUserSearch] = useState("");
  const deferredSearch = useDeferredValue(userSearch.trim().toLowerCase());

  const [emails, setEmails] = useState<string[]>([]);
  const [isBroadcastAll, setIsBroadcastAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BroadcastEmailResponse["data"] | null>(null);

  // ── History ──
  const [historyPage, setHistoryPage] = useState(1);
  const [viewItem, setViewItem] = useState<BroadcastEmailHistoryItem | null>(null);
  const historyQuery = useQuery({
    queryKey: ["broadcast-email-history", token, historyPage],
    queryFn: async () => {
      const res = await adminBroadcastEmailApi.history({ token: token!, page: historyPage, limit: 10 });
      return res as unknown as BroadcastEmailHistoryResponse;
    },
    enabled: Boolean(token) && activeTab === "history",
    staleTime: 30 * 1000,
  });

  // Fetch all users once (large limit) so search is client-side
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["email-mgmt-users", token],
    queryFn: async () => {
      const res = await adminUsersApi.list({ token: token!, page: 1, limit: 1000 });
      const raw = res?.data ?? res;
      const list: PendingUser[] =
        (raw as { users?: PendingUser[] })?.users ??
        (raw as { items?: PendingUser[] })?.items ??
        (Array.isArray(raw) ? (raw as PendingUser[]) : []);
      return list;
    },
    enabled:
      Boolean(token) &&
      (!isManager || canSearchClientEmails) &&
      (!isBroadcastAll || activeTab === "exclusions"),
    staleTime: 2 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    if (deferredSearch.length < 3) return [];
    return allUsers
      .filter((u) =>
        `${u.name} ${u.email} ${u.username ?? ""}`.toLowerCase().includes(deferredSearch)
      )
      .slice(0, 50);
  }, [deferredSearch, allUsers]);

  // ---- Email exclusion list ----
  const [exclusionInput, setExclusionInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EmailExclusion | null>(null);

  // Client search (for adding clients to exclusion list)
  const [exclusionUserSearch, setExclusionUserSearch] = useState("");
  const deferredExclusionSearch = useDeferredValue(
    exclusionUserSearch.trim().toLowerCase()
  );

  // Filter (for searching within existing excluded emails)
  const [exclusionListFilter, setExclusionListFilter] = useState("");
  const deferredListFilter = useDeferredValue(
    exclusionListFilter.trim().toLowerCase()
  );

  const exclusionsQuery = useQuery({
    queryKey: ["email-exclusions", token],
    queryFn: async () => {
      const res = await adminEmailExclusionsApi.list(token!);
      const list =
        (res as unknown as { data?: EmailExclusion[] })?.data ?? [];
      return list;
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const exclusions = useMemo(
    () => exclusionsQuery.data ?? [],
    [exclusionsQuery.data]
  );

  const excludedEmailSet = useMemo(
    () => new Set(exclusions.map((e) => e.email.toLowerCase())),
    [exclusions]
  );

  const filteredExclusionUsers = useMemo(() => {
    if (deferredExclusionSearch.length < 3) return [];
    return allUsers
      .filter((u) =>
        `${u.name} ${u.email} ${u.username ?? ""}`
          .toLowerCase()
          .includes(deferredExclusionSearch)
      )
      .slice(0, 50);
  }, [deferredExclusionSearch, allUsers]);

  const filteredExclusions = useMemo(() => {
    if (!deferredListFilter) return exclusions;
    return exclusions.filter((e) =>
      e.email.toLowerCase().includes(deferredListFilter)
    );
  }, [exclusions, deferredListFilter]);

  const invalidateExclusions = () =>
    queryClient.invalidateQueries({ queryKey: ["email-exclusions", token] });

  const addExclusionMutation = useMutation({
    mutationFn: (email: string) => adminEmailExclusionsApi.add(email, token!),
    onSuccess: (res) => {
      toast.success(res?.message || "Email added to exclusion list");
      setExclusionInput("");
      setExclusionUserSearch("");
      void invalidateExclusions();
    },
    onError: (err) =>
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "email exclusion",
          action: "add",
        })
      ),
  });

  const removeExclusionMutation = useMutation({
    mutationFn: (email: string) => adminEmailExclusionsApi.remove(email, token!),
    onSuccess: (res) => {
      toast.success(res?.message || "Email removed from exclusion list");
      setDeleteTarget(null);
      void invalidateExclusions();
    },
    onError: (err) =>
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "email exclusion",
          action: "remove",
        })
      ),
  });

  const handleAddExclusion = () => {
    const email = exclusionInput.trim().toLowerCase();
    if (!email) {
      toast.error("Enter an email address");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (excludedEmailSet.has(email)) {
      toast.error("Email is already excluded");
      return;
    }
    addExclusionMutation.mutate(email);
  };

  const handleAddExclusionFromUser = (user: PendingUser) => {
    const email = user.email.trim().toLowerCase();
    if (!email) return;
    if (excludedEmailSet.has(email)) {
      toast.error("Email is already excluded");
      return;
    }
    addExclusionMutation.mutate(email);
  };


  // ---- helpers ----
  const addEmailValue = (val: string) => {
    const email = val.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (emails.includes(email)) {
      toast.error("Email already added");
      return;
    }
    setEmails((prev) => [...prev, email]);
  };

  const handleManualAdd = () => {
    addEmailValue(emailInput);
    setEmailInput("");
    emailInputRef.current?.focus();
  };

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleManualAdd();
    }
  };

  const addFromUser = (user: PendingUser) => {
    addEmailValue(user.email);
    setUserSearch("");
  };

  const removeEmail = (email: string) =>
    setEmails((prev) => prev.filter((e) => e !== email));

  // ---- send ----
  const handleSend = async () => {
    if (!token) { toast.error("Authentication required"); return; }
    if (isManager && !canSendBroadcast) {
      toast.error("You do not have permission to send broadcasts");
      return;
    }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!body.trim()) { toast.error("Email body is required"); return; }
    if (!isBroadcastAll && emails.length === 0) {
      toast.error("Add at least one recipient email");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const hasFiles = attachments.some((f) => f !== null);
      let res: ApiResponse<BroadcastEmailResponse["data"]>;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("subject", subject.trim());
        fd.append("body", body.trim());
        if (!isBroadcastAll) {
          emails.forEach((email) => fd.append("emails[]", email));
        }
        attachments.forEach((file, i) => {
          if (file) fd.append(`attachment_${i + 1}`, file);
        });
        res = await adminBroadcastEmailApi.send(fd, token);
      } else {
        const payload = isBroadcastAll
          ? { subject: subject.trim(), body: body.trim() }
          : { subject: subject.trim(), body: body.trim(), emails };
        res = await adminBroadcastEmailApi.send(payload, token);
      }
      setResult(res.data ?? null);
      toast.success(res.message || "Broadcast sent successfully");
    } catch (error) {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "broadcast email", action: "send" })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubject("");
    setBody("");
    setEmails([]);
    setEmailInput("");
    setUserSearch("");
    setResult(null);
    setIsBroadcastAll(true);
    setAttachments([null, null, null]);
    setVisibleSlots(1);
  };

  const canSearchUsers = userSearch.trim().length >= 3;
  const showDropdown = !isBroadcastAll && canSearchUsers && filteredUsers.length > 0;

  return (
    <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Mail className="h-6 w-6 text-primary" />
            Email Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Broadcast emails to clients and manage the exclusion list of addresses that should never receive emails.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["broadcast-email-history", token] });
              void queryClient.invalidateQueries({ queryKey: ["email-exclusions", token] });
              void queryClient.invalidateQueries({ queryKey: ["email-mgmt-users", token] });
            }}
            disabled={historyQuery.isLoading || exclusionsQuery.isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${historyQuery.isLoading || exclusionsQuery.isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "broadcast" | "history" | "exclusions")}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="broadcast" className="gap-2">
            <Send className="h-3.5 w-3.5" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-3.5 w-3.5" />
            History
          </TabsTrigger>
          <TabsTrigger value="exclusions" className="gap-2">
            <Ban className="h-3.5 w-3.5" />
            Exclusions
            {exclusions.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {exclusions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="m-0">
          <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Compose form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Recipients card */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Mode toggle */}
              <div className="flex gap-2">
                {[
                  { label: "All Clients", value: true },
                  { label: "Specific Emails", value: false },
                ].map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => setIsBroadcastAll(value)}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isBroadcastAll === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background/80 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!isBroadcastAll && (
                <div className="space-y-4">

                  {/* User search */}
                  <div className="space-y-1.5">
                    <Label>Search clients</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Type at least 3 letters to search by name or email"
                        className="pl-9"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        disabled={loadingUsers}
                      />
                      {loadingUsers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      )}
                    </div>

                    {/* Dropdown */}
                    {showDropdown && (
                      <div className="rounded-xl border border-border/60 bg-background shadow-md overflow-hidden">
                        <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                          {filteredUsers.map((user) => {
                            const already = emails.includes(user.email.toLowerCase());
                            return (
                              <button
                                key={user.id}
                                onClick={() => !already && addFromUser(user)}
                                disabled={already}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                                  already
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-muted/50 cursor-pointer"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                {already ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                                ) : (
                                  <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!showDropdown && canSearchUsers && !loadingUsers && (
                      <p className="text-xs text-muted-foreground">No users found.</p>
                    )}
                    {!canSearchUsers && (
                      <p className="text-xs text-muted-foreground">
                        Type at least 3 letters to search users.
                      </p>
                    )}
                  </div>

                  {/* Manual entry */}
                  <div className="space-y-1.5">
                    <Label>Or enter email manually</Label>
                    <div className="flex gap-2">
                      <Input
                        ref={emailInputRef}
                        placeholder="email@example.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={handleManualKeyDown}
                      />
                      <Button variant="outline" size="icon" onClick={handleManualAdd}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5">Enter</kbd> or <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5">,</kbd> to add
                    </p>
                  </div>

                  {/* Email chips */}
                  {emails.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">
                          {emails.length} recipient{emails.length !== 1 ? "s" : ""} selected
                        </p>
                        <button
                          onClick={() => setEmails([])}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                        {emails.map((email) => (
                          <Badge
                            key={email}
                            variant="secondary"
                            className="flex items-center gap-1.5 pr-1"
                          >
                            {email}
                            <button
                              onClick={() => removeEmail(email)}
                              className="ml-0.5 rounded-full hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compose card */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Compose
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  placeholder="Write your email message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="resize-y"
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  Attachments (images, optional, max 3)
                </Label>
                {Array.from({ length: visibleSlots }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {attachments[i] ? (
                      <>
                        <div className="flex-1 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                          <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-foreground">{attachments[i]!.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAttachments((prev) => {
                              const next = [...prev];
                              next[i] = null;
                              return next;
                            });
                          }}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        className="flex-1"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setAttachments((prev) => {
                            const next = [...prev];
                            next[i] = file;
                            return next;
                          });
                        }}
                      />
                    )}
                  </div>
                ))}
                {visibleSlots < 3 && attachments.some((f) => f !== null) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleSlots((p) => Math.min(3, p + 1))}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add more
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSend} disabled={loading || (isManager && !canSendBroadcast)} className="gap-2">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? "Sending…" : "Send Broadcast"}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={loading}>
              Reset
            </Button>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {result && (
            <Card className="border rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Broadcast Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-2xl font-semibold text-foreground">{result.total}</p>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Sent</p>
                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{result.sent}</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Failed</p>
                    <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{result.failed}</p>
                  </div>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {result.failed} email{result.failed !== 1 ? "s" : ""} failed to deliver.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Use <strong className="text-foreground">All Clients</strong> to reach every registered user.</p>
              <p>• Use <strong className="text-foreground">Specific Emails</strong> to target individual clients.</p>
              <p>• Search clients by name or email and click to add them.</p>
              <p>• You can also enter emails manually and press <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 text-xs">Enter</kbd>.</p>
              <p>• Addresses on the <strong className="text-foreground">Exclusions</strong> tab will be skipped for every broadcast.</p>
            </CardContent>
          </Card>
        </div>
          </div>
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history" className="m-0">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Broadcast History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {historyQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !historyQuery.data?.data?.length ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                  <Mail className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No broadcast history yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Recipients</th>
                        <th className="px-4 py-3 text-center">Sent</th>
                        <th className="px-4 py-3 text-center">Failed</th>
                        <th className="px-4 py-3">Attachments</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {historyQuery.data.data.map((item: BroadcastEmailHistoryItem) => (
                        <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                            {item.subject}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {item.total_recipients}
                          </td>
                          <td className="px-4 py-3 text-center text-green-600 dark:text-green-400">
                            {item.sent_count}
                          </td>
                          <td className="px-4 py-3 text-center text-red-600 dark:text-red-400">
                            {item.failed_count}
                          </td>
                          <td className="px-4 py-3">
                            {item.attachment_urls?.length > 0 ? (
                              <div className="flex gap-1">
                                {item.attachment_urls.map((url, i) => (
                                  <a
                                    key={i}
                                    href={`${process.env.NEXT_PUBLIC_API_URL || ""}/${url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <FileImage className="h-3 w-3" />
                                    {i + 1}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(item.created_at)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setViewItem(item)}
                              className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                              aria-label="View email details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {historyQuery.data && historyQuery.data.total > 10 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {historyPage} of {Math.ceil(historyQuery.data.total / 10)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= Math.ceil(historyQuery.data.total / 10)}
                  onClick={() => setHistoryPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="exclusions" className="m-0">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Add + list (main) ── */}
            <div className="lg:col-span-2 space-y-5">
              {/* Add email card */}
              <Card className="border rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ShieldOff className="h-4 w-4 text-primary" />
                    Add to Exclusion List
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Client search */}
                  <div className="space-y-1.5">
                    <Label>Search clients</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Type at least 3 letters to search by name or email"
                        className="pl-9"
                        value={exclusionUserSearch}
                        onChange={(e) => setExclusionUserSearch(e.target.value)}
                        disabled={loadingUsers || addExclusionMutation.isPending}
                      />
                      {loadingUsers && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      )}
                    </div>

                    {/* Dropdown */}
                    {deferredExclusionSearch.length >= 3 && filteredExclusionUsers.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-background shadow-md overflow-hidden">
                        <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                          {filteredExclusionUsers.map((user) => {
                            const already = excludedEmailSet.has(user.email.toLowerCase());
                            const isAddingThis =
                              addExclusionMutation.isPending &&
                              addExclusionMutation.variables === user.email.trim().toLowerCase();
                            return (
                              <button
                                key={user.id}
                                onClick={() => !already && handleAddExclusionFromUser(user)}
                                disabled={already || addExclusionMutation.isPending}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                                  already
                                    ? "opacity-40 cursor-not-allowed"
                                    : "hover:bg-muted/50 cursor-pointer disabled:cursor-not-allowed"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                </div>
                                {isAddingThis ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0 ml-2" />
                                ) : already ? (
                                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                                ) : (
                                  <UserPlus className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {deferredExclusionSearch.length >= 3 &&
                      filteredExclusionUsers.length === 0 &&
                      !loadingUsers && (
                        <p className="text-xs text-muted-foreground">No users found.</p>
                      )}
                    {deferredExclusionSearch.length < 3 && (
                      <p className="text-xs text-muted-foreground">
                        Type at least 3 letters to search users.
                      </p>
                    )}
                  </div>

                  {/* Manual email entry */}
                  <div className="space-y-1.5">
                    <Label htmlFor="exclusion-email">Or enter email manually</Label>
                    <div className="flex gap-2">
                      <Input
                        id="exclusion-email"
                        type="email"
                        placeholder="user@example.com"
                        value={exclusionInput}
                        onChange={(e) => setExclusionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddExclusion();
                          }
                        }}
                        disabled={addExclusionMutation.isPending}
                      />
                      <Button
                        onClick={handleAddExclusion}
                        disabled={addExclusionMutation.isPending || !exclusionInput.trim()}
                        className="gap-2"
                      >
                        {addExclusionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Emails added here will be excluded from all future broadcasts.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Exclusion list card */}
              <Card className="border rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Ban className="h-4 w-4 text-primary" />
                    Excluded Emails
                    {exclusions.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {deferredListFilter
                          ? `${filteredExclusions.length} / ${exclusions.length}`
                          : exclusions.length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-0">
                  {exclusions.length > 0 && (
                    <div className="px-4 pt-4">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search excluded emails"
                          className="pl-9"
                          value={exclusionListFilter}
                          onChange={(e) => setExclusionListFilter(e.target.value)}
                        />
                        {exclusionListFilter && (
                          <button
                            type="button"
                            onClick={() => setExclusionListFilter("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Clear filter"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {exclusionsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : exclusions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <ShieldOff className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No emails are currently excluded.</p>
                    </div>
                  ) : filteredExclusions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-30" />
                      <p className="text-sm">
                        No exclusions match &ldquo;{exclusionListFilter}&rdquo;.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {filteredExclusions.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Added {formatDateTime(item.created_at)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(item)}
                            className="text-muted-foreground hover:text-destructive"
                            disabled={
                              removeExclusionMutation.isPending &&
                              removeExclusionMutation.variables === item.email
                            }
                          >
                            {removeExclusionMutation.isPending &&
                            removeExclusionMutation.variables === item.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Sidebar ── */}
            <div className="space-y-5">
              <Card className="border rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">About Exclusions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Search registered clients by name or email and click to exclude them instantly.</p>
                  <p>• Enter any email manually for addresses that are not registered clients.</p>
                  <p>• Use the search box above the list to find specific excluded emails.</p>
                  <p>• Excluded addresses are skipped on every broadcast, in all recipient modes.</p>
                  <p>• Removing an email from the list re-enables delivery immediately.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !removeExclusionMutation.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Remove from Exclusion List
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.email}</span>{" "}
            from the exclusion list? This address will start receiving broadcasts again.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={removeExclusionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() =>
                deleteTarget && removeExclusionMutation.mutate(deleteTarget.email)
              }
              disabled={removeExclusionMutation.isPending}
            >
              {removeExclusionMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View email details dialog */}
      <Dialog
        open={Boolean(viewItem)}
        onOpenChange={(open) => {
          if (!open) setViewItem(null);
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-5">
              {/* Subject */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <p className="text-sm font-semibold text-foreground">{viewItem.subject}</p>
              </div>

              {/* Recipients info */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Recipients</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Type: {viewItem.recipient_type}</Badge>
                  <Badge variant="secondary">Total: {viewItem.total_recipients}</Badge>
                  <Badge variant="secondary" className="text-green-600 dark:text-green-400">Sent: {viewItem.sent_count}</Badge>
                  <Badge variant="secondary" className="text-red-600 dark:text-red-400">Failed: {viewItem.failed_count}</Badge>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Body</Label>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap">
                  {viewItem.body}
                </div>
              </div>

              {/* Attachments */}
              {viewItem.attachment_urls && viewItem.attachment_urls.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Attachments</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewItem.attachment_urls.map((url, i) => {
                      const fullUrl = `${process.env.NEXT_PUBLIC_API_URL || ""}/${url}`;
                      return (
                        <div key={i} className="space-y-1">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-xl border border-border/60 overflow-hidden hover:border-primary transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fullUrl}
                              alt={`Attachment ${i + 1}`}
                              className="h-32 w-full object-cover"
                              loading="lazy"
                            />
                          </a>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Image {i + 1}</span>
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sent on</Label>
                <p className="text-sm text-foreground">{formatDateTime(viewItem.created_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setViewItem(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
