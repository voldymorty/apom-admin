"use client";

import { useEffect, useState, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/animate-ui/components/radix/sidebar";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconSearch, IconRefresh, IconChevronLeft, IconChevronRight, IconX,
  IconFlag, IconFlagOff, IconCircleCheck, IconPlus, IconCreditCard,
  IconUserSquareRounded,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubStatus = "pending" | "active" | "expired" | "cancelled" | "flagged";
type PlanType = "basic" | "premium";
type Duration = "monthly" | "quarterly" | "annual";

interface SubscriptionListItem {
  subscription_id: number;
  farmer_id: number;
  farmer_name: string;
  mobile_number: string;
  plan_type: PlanType;
  duration: Duration;
  amount: number;
  status: SubStatus;
  start_date: string | null;
  expiry_date: string | null;
  is_current: boolean;
  admin_note: string | null;
  created_at: string;
}

interface SubscriptionPayment {
  subscription_payment_id: number;
  payment_method: string;
  amount: number;
  payment_status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  transaction_id?: string;
  transaction_date: string;
  failure_reason?: string;
}

interface SubscriptionDetail extends SubscriptionListItem {
  plan?: { plan_id: number; plan_type: PlanType; duration: Duration; price: number };
  payments?: SubscriptionPayment[];
}

interface Plan {
  plan_id: number;
  plan_type: PlanType;
  duration: Duration;
  price: number;
  duration_days: number;
  is_active: boolean;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Filters {
  search: string;
  status: string;
  plan_type: string;
}

const DEFAULT_FILTERS: Filters = { search: "", status: "", plan_type: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatCurrency(n: number | undefined | null) {
  if (n === undefined || n === null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

function errMsg(e: unknown, fallback: string) {
  const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return axiosMsg || (e instanceof Error ? e.message : fallback);
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubStatus, { label: string; className: string; dot: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border-amber-200",     dot: "bg-amber-500" },
  active:    { label: "Active",    className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  expired:   { label: "Expired",   className: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600 border-slate-200",     dot: "bg-slate-400" },
  flagged:   { label: "Flagged",   className: "bg-red-50 text-red-700 border-red-200",            dot: "bg-red-500" },
};

function StatusBadge({ status }: { status: SubStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function PlanBadge({ planType }: { planType: PlanType }) {
  return (
    <Badge
      variant="outline"
      className={
        planType === "premium"
          ? "bg-violet-50 text-violet-700 border-violet-200 font-semibold capitalize"
          : "bg-sky-50 text-sky-700 border-sky-200 font-semibold capitalize"
      }
    >
      {planType}
    </Badge>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-8 h-8" : "w-5 h-5";
  return (
    <svg className={`animate-spin ${s} text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ─── Subscription Detail Sheet ─────────────────────────────────────────────────

function SubscriptionDetailSheet({
  subscriptionId, open, onOpenChange, onUpdated,
}: {
  subscriptionId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [sub, setSub] = useState<SubscriptionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<"verify" | "flag" | "unflag" | null>(null);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagNote, setFlagNote] = useState("");

  const fetchSub = useCallback(async () => {
    if (!subscriptionId) return;
    setLoading(true);
    setSub(null);
    try {
      const data = await api.get(`/admin/subscriptions/${subscriptionId}`);
      setSub(data.data.data);
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to load subscription"));
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (open && subscriptionId) {
      setShowFlagForm(false);
      setFlagNote("");
      fetchSub();
    }
  }, [open, subscriptionId, fetchSub]);

  const handleVerify = async () => {
    if (!sub) return;
    setActionLoading("verify");
    try {
      await api.patch(`/admin/subscriptions/${sub.subscription_id}/verify`, {});
      toast.success("Subscription verified and activated");
      await fetchSub();
      onUpdated();
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to verify subscription"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async () => {
    if (!sub || !flagNote.trim()) return;
    setActionLoading("flag");
    try {
      await api.patch(`/admin/subscriptions/${sub.subscription_id}/flag`, { admin_note: flagNote.trim() });
      toast.success("Subscription flagged");
      setShowFlagForm(false);
      setFlagNote("");
      await fetchSub();
      onUpdated();
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to flag subscription"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnflag = async () => {
    if (!sub) return;
    setActionLoading("unflag");
    try {
      await api.patch(`/admin/subscriptions/${sub.subscription_id}/unflag`, {});
      toast.success("Flag cleared");
      await fetchSub();
      onUpdated();
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to unflag subscription"));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          {loading || !sub ? (
            <div className="space-y-2">
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-64 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base">{sub.farmer_name}</SheetTitle>
                <StatusBadge status={sub.status} />
                <PlanBadge planType={sub.plan_type} />
              </div>
              <SheetDescription>
                {sub.mobile_number} · Subscription #{sub.subscription_id}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {loading || !sub ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* ── Summary ── */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Duration</span>
                <span className="font-medium capitalize">{sub.duration}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Amount</span>
                <span className="font-semibold">{formatCurrency(sub.amount)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Start Date</span>
                <span>{formatDate(sub.start_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Expiry Date</span>
                <span>{formatDate(sub.expiry_date)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Currently Grants Access</span>
                <span>{sub.is_current ? "Yes" : "No"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wide mb-0.5">Created</span>
                <span>{formatDateTime(sub.created_at)}</span>
              </div>
            </div>

            {sub.admin_note && (
              <div className="bg-amber-50 text-amber-800 text-xs rounded-lg px-3 py-2 border border-amber-200">
                <span className="font-semibold">Admin note: </span>{sub.admin_note}
              </div>
            )}

            {/* ── Actions ── */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</h4>

              {sub.status !== "active" && (
                <Button
                  size="sm"
                  className="gap-1.5 w-full"
                  disabled={actionLoading !== null}
                  onClick={handleVerify}
                >
                  {actionLoading === "verify" ? <Spinner size="sm" /> : <IconCircleCheck className="size-4" />}
                  Manually Verify &amp; Activate
                </Button>
              )}

              {sub.status === "flagged" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 w-full"
                  disabled={actionLoading !== null}
                  onClick={handleUnflag}
                >
                  {actionLoading === "unflag" ? <Spinner size="sm" /> : <IconFlagOff className="size-4" />}
                  Clear Flag
                </Button>
              ) : !showFlagForm ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 w-full text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowFlagForm(true)}
                >
                  <IconFlag className="size-4" />
                  Flag Subscription
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="flag-note" className="text-xs">Reason (required)</Label>
                  <Textarea
                    id="flag-note"
                    placeholder="e.g. payment dispute raised by farmer, suspected chargeback..."
                    value={flagNote}
                    onChange={(e) => setFlagNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!flagNote.trim() || actionLoading !== null}
                      onClick={handleFlag}
                      className="gap-1.5"
                    >
                      {actionLoading === "flag" ? <Spinner size="sm" /> : <IconFlag className="size-4" />}
                      Confirm Flag
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowFlagForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Payment Trail ── */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment Trail</h4>
              {!sub.payments?.length ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                  <IconCreditCard className="size-8 opacity-30" />
                  <p className="text-xs">No payment records</p>
                </div>
              ) : (
                sub.payments.map((p) => (
                  <div key={p.subscription_payment_id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/10">
                      <span className="text-sm font-semibold capitalize">{p.payment_method}</span>
                      <Badge variant="outline" className="font-medium">{p.payment_status}</Badge>
                    </div>
                    <div className="px-4 py-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div><span className="text-muted-foreground block">Amount</span>{formatCurrency(p.amount)}</div>
                      <div><span className="text-muted-foreground block">Date</span>{formatDateTime(p.transaction_date)}</div>
                      {p.razorpay_payment_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Razorpay Payment ID</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded">{p.razorpay_payment_id}</span>
                        </div>
                      )}
                    </div>
                    {p.failure_reason && (
                      <div className="px-4 pb-2.5">
                        <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-100">
                          {p.failure_reason}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Subscriptions Tab ──────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [subs, setSubs] = useState<SubscriptionListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, total_pages: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.search)    params.set("search", filters.search);
      if (filters.status)    params.set("status", filters.status);
      if (filters.plan_type) params.set("plan_type", filters.plan_type);

      const data = await api.get(`/admin/subscriptions?${params}`);
      setSubs(data.data.data.subscriptions ?? []);
      setPagination(data.data.data.pagination ?? { total: 0, page: 1, limit: 20, total_pages: 0 });
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to fetch subscriptions"));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    const delay = filters.search ? 400 : 0;
    const timer = setTimeout(fetchSubs, delay);
    return () => clearTimeout(timer);
  }, [fetchSubs]);

  const handleFilterChange = (k: keyof Filters, v: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [k]: v }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]
  );

  const openSub = (s: SubscriptionListItem) => {
    setSelectedId(s.subscription_id);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative w-56">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search farmer name..."
                className="pl-9 bg-white dark:bg-card"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
              {filters.search && (
                <button
                  onClick={() => handleFilterChange("search", "")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <IconX className="size-3.5" />
                </button>
              )}
            </div>

            <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 bg-white dark:bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.plan_type || "all"} onValueChange={(v) => handleFilterChange("plan_type", v === "all" ? "" : v)}>
              <SelectTrigger className="w-36 bg-white dark:bg-card"><SelectValue placeholder="Plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 bg-white dark:bg-card">
                <IconRefresh className="size-3.5" />
                Reset
              </Button>
            )}
          </div>

          {pagination?.total > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              {pagination.total.toLocaleString("en-IN")} subscriptions
            </span>
          )}
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Farmer</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Plan</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Duration</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Amount</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-32" /></TableCell>
                    <TableCell className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-16" /></TableCell>
                    <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-20" /></TableCell>
                    <TableCell className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-20" /></TableCell>
                    <TableCell className="px-4 py-3.5 text-right"><div className="h-4 bg-muted rounded w-16 ml-auto" /></TableCell>
                    <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-20" /></TableCell>
                  </TableRow>
                ))
              ) : subs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <IconUserSquareRounded className="size-10 opacity-30" />
                      <div>
                        <p className="text-sm font-medium text-foreground">No subscriptions found</p>
                        <p className="text-xs mt-0.5">Try adjusting your filters</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => (
                  <TableRow
                    key={s.subscription_id}
                    onClick={() => openSub(s)}
                    className={`group cursor-pointer border-b last:border-0 transition-colors hover:bg-primary/5 ${
                      selectedId === s.subscription_id && sheetOpen ? "bg-primary/5" : ""
                    }`}
                  >
                    <TableCell className="px-4 py-3.5">
                      <div className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">{s.farmer_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.mobile_number}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5"><PlanBadge planType={s.plan_type} /></TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground capitalize whitespace-nowrap">{s.duration}</TableCell>
                    <TableCell className="px-4 py-3.5"><StatusBadge status={s.status} /></TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-semibold tabular-nums text-sm">{formatCurrency(s.amount)}</TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(s.expiry_date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        {pagination?.total > 0 && (
          <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <span className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {Math.min((page - 1) * 20 + 1, pagination.total)}–{Math.min(page * 20, pagination.total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{pagination.total.toLocaleString("en-IN")}</span> subscriptions
            </span>

            {pagination.total_pages > 1 && (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-8 h-8 p-0">
                  <IconChevronLeft className="size-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {page} of {pagination.total_pages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= pagination.total_pages || loading} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 p-0">
                  <IconChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <SubscriptionDetailSheet
        subscriptionId={selectedId}
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedId(null);
        }}
        onUpdated={fetchSubs}
      />
    </>
  );
}

// ─── Plans Tab ──────────────────────────────────────────────────────────────

const EMPTY_NEW_PLAN = { plan_type: "basic" as PlanType, duration: "monthly" as Duration, price: "", duration_days: "" };

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [edits, setEdits] = useState<Record<number, { price: string; duration_days: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPlan, setNewPlan] = useState(EMPTY_NEW_PLAN);
  const [creating, setCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/admin/subscription-plans");
      const list: Plan[] = data.data.data ?? [];
      setPlans(list);
      setEdits(
        Object.fromEntries(
          list.map((p) => [p.plan_id, { price: String(p.price), duration_days: String(p.duration_days) }])
        )
      );
    } catch (e: unknown) {
      toast.error(errMsg(e, "Failed to fetch plans"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const isDirty = (p: Plan) => {
    const e = edits[p.plan_id];
    if (!e) return false;
    return e.price !== String(p.price) || e.duration_days !== String(p.duration_days);
  };

  const handleSave = async (p: Plan) => {
    const e = edits[p.plan_id];
    if (!e) return;
    const price = parseFloat(e.price);
    const duration_days = parseInt(e.duration_days, 10);
    if (!(price > 0) || !(duration_days > 0)) {
      toast.error("Price and duration (days) must be greater than 0");
      return;
    }
    setSavingId(p.plan_id);
    try {
      await api.patch(`/admin/subscription-plans/${p.plan_id}`, { price, duration_days });
      toast.success("Plan updated");
      await fetchPlans();
    } catch (err: unknown) {
      toast.error(errMsg(err, "Failed to update plan"));
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (p: Plan, checked: boolean) => {
    setTogglingId(p.plan_id);
    try {
      await api.patch(`/admin/subscription-plans/${p.plan_id}`, { is_active: checked });
      toast.success(checked ? "Plan activated — visible to farmers" : "Plan deactivated — hidden from the farmer app");
      await fetchPlans();
    } catch (err: unknown) {
      toast.error(errMsg(err, checked ? "Failed to activate plan" : "Failed to deactivate plan"));
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async () => {
    const price = parseFloat(newPlan.price);
    const duration_days = parseInt(newPlan.duration_days, 10);
    if (!(price > 0) || !(duration_days > 0)) {
      toast.error("Price and duration (days) must be greater than 0");
      return;
    }
    setCreating(true);
    try {
      await api.post("/admin/subscription-plans", {
        plan_type: newPlan.plan_type,
        duration: newPlan.duration,
        price,
        duration_days,
      });
      toast.success("Plan created");
      setAddOpen(false);
      setNewPlan(EMPTY_NEW_PLAN);
      await fetchPlans();
    } catch (err: unknown) {
      toast.error(errMsg(err, "Failed to create plan"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Farmers only see <span className="font-medium text-foreground">active</span> plans when subscribing.
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <IconPlus className="size-4" />
            Add Plan
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Plan</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Duration</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Price (₹)</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Duration (days)</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Active</TableHead>
                {/* <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide" /> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-4 py-3.5" colSpan={6}><div className="h-4 bg-muted rounded w-full" /></TableCell>
                  </TableRow>
                ))
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    <p className="text-sm font-medium text-foreground">No plans yet</p>
                    <p className="text-xs mt-0.5">Add your first plan (e.g. Basic / Monthly) to get started.</p>
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => (
                  <TableRow key={p.plan_id} className="border-b last:border-0">
                    <TableCell className="px-4 py-3"><PlanBadge planType={p.plan_type} /></TableCell>
                    <TableCell className="px-4 py-3 text-sm capitalize">{p.duration}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-28 h-8"
                        value={edits[p.plan_id]?.price ?? ""}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [p.plan_id]: { ...prev[p.plan_id], price: e.target.value } }))}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Input
                        type="number"
                        className="w-24 h-8"
                        value={edits[p.plan_id]?.duration_days ?? ""}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [p.plan_id]: { ...prev[p.plan_id], duration_days: e.target.value } }))}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Switch
                        checked={p.is_active}
                        disabled={togglingId === p.plan_id}
                        onCheckedChange={(checked) => handleToggleActive(p, checked)}
                      />
                    </TableCell>
                    {/* <TableCell className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isDirty(p) || savingId === p.plan_id}
                        onClick={() => handleSave(p)}
                        className="gap-1.5"
                      >
                        {savingId === p.plan_id ? <Spinner size="sm" /> : null}
                        Save
                      </Button>
                    </TableCell> */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Add Plan Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subscription Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Plan Type</Label>
              <Select value={newPlan.plan_type} onValueChange={(v) => setNewPlan((p) => ({ ...p, plan_type: v as PlanType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Duration</Label>
              <Select value={newPlan.duration} onValueChange={(v) => setNewPlan((p) => ({ ...p, duration: v as Duration }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Price (₹)</Label>
              <Input
                type="number"
                value={newPlan.price}
                onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))}
                placeholder="e.g. 199"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs uppercase tracking-widest text-muted-foreground">Duration (days)</Label>
              <Input
                type="number"
                value={newPlan.duration_days}
                onChange={(e) => setNewPlan((p) => ({ ...p, duration_days: e.target.value }))}
                placeholder="e.g. 30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating ? <Spinner size="sm" /> : null}
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SubscriptionManagementPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />

          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
              <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                Farmer subscriptions, payment verification, and plan pricing.
              </p>
            </div>

            <Tabs defaultValue="subscriptions">
              <TabsList>
                <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                <TabsTrigger value="plans">Plans</TabsTrigger>
              </TabsList>
              <TabsContent value="subscriptions" className="mt-4">
                <SubscriptionsTab />
              </TabsContent>
              <TabsContent value="plans" className="mt-4">
                <PlansTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}