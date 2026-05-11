"use client";

import { useState, useRef, useDeferredValue, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import {
  adminBroadcastEmailApi,
  adminUsersApi,
  type BroadcastEmailResponse,
  type PendingUser,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
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
} from "lucide-react";

export default function EmailManagementPage() {
  const { token } = useAuth();
  const { isManager, hasFeature } = useManagerPermissions();

  const canSendBroadcast =
    !isManager ||
    hasFeature("emailManagement", "broadcastEmail") ||
    hasFeature("emailManagement", "sendEmail");

  const canSearchClientEmails =
    !isManager || hasFeature("emailManagement", "getClientEmails");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

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
    enabled: Boolean(token) && (!isManager || canSearchClientEmails) && !isBroadcastAll,
    staleTime: 2 * 60 * 1000,
  });

  const filteredUsers = useMemo(() => {
    if (!deferredSearch) return allUsers.slice(0, 50);
    return allUsers
      .filter((u) =>
        `${u.name} ${u.email} ${u.username ?? ""}`.toLowerCase().includes(deferredSearch)
      )
      .slice(0, 50);
  }, [deferredSearch, allUsers]);

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
      const payload = isBroadcastAll
        ? { subject: subject.trim(), body: body.trim() }
        : { subject: subject.trim(), body: body.trim(), emails };
      const res = await adminBroadcastEmailApi.send(payload, token);
      const resData = res as unknown as BroadcastEmailResponse;
      setResult(resData.data ?? null);
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
  };

  const showDropdown = !isBroadcastAll && userSearch.trim().length > 0 && filteredUsers.length > 0;

  return (
    <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Mail className="h-6 w-6 text-primary" />
          Email Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Broadcast emails to all clients or a specific list of recipients.
        </p>
      </div>

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
                        placeholder="Search by name or email"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
