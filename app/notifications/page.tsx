"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlus,
  IconBell,
  IconBellRinging,
  IconCheck,
  IconChecks,
  IconCreditCard,
  IconTruck,
  IconPackage,
  IconUser,
  IconAlertCircle,
  IconCoin,
  IconInfoCircle,
  IconExternalLink,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | "order"
  | "delivery"
  | "payment"
  | "approval"
  | "general"
  | "earning"
  | "alert";

type Priority = "low" | "medium" | "high" | "urgent";

type UserRole = "farmer" | "vendor" | "delivery" | "admin";

interface NotificationItem {
  notification_id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: number | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  priority: Priority;
  send_push: boolean;
  push_sent_at: string | null;
  created_at: string;
  user: {
    user_id: number;
    mobile_number: string;
    role: UserRole;
  } | null;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Filters {
  search: string;
  user_id: string;
  notification_type: string;
  is_read: string;
  priority: string;
  from: string;
  to: string;
}

interface SendForm {
  user_id: string;
  role: string;
  target: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  reference_type: string;
  reference_id: string;
  action_url: string;
  priority: Priority;
  send_push: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIFICATION_TYPES: NotificationType[] = [
  "order",
  "delivery",
  "payment",
  "approval",
  "general",
  "earning",
  "alert",
];

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

const USER_ROLES: UserRole[] = ["farmer", "vendor", "delivery", "admin"];

const DEFAULT_FILTERS: Filters = {
  search: "",
  user_id: "",
  notification_type: "",
  is_read: "",
  priority: "",
  from: "",
  to: "",
};

const DEFAULT_SEND_FORM: SendForm = {
  user_id: "",
  role: "",
  target: "all",
  notification_type: "general",
  title: "",
  message: "",
  reference_type: "",
  reference_id: "",
  action_url: "",
  priority: "medium",
  send_push: true,
};

// ─── Config maps ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; className: string; icon: React.ReactNode }
> = {
  order: {
    label: "Order",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <IconPackage className="size-3" />,
  },
  delivery: {
    label: "Delivery",
    className: "bg-teal-50 text-teal-700 border-teal-200",
    icon: <IconTruck className="size-3" />,
  },
  payment: {
    label: "Payment",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <IconCreditCard className="size-3" />,
  },
  approval: {
    label: "Approval",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    icon: <IconCheck className="size-3" />,
  },
  general: {
    label: "General",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <IconInfoCircle className="size-3" />,
  },
  earning: {
    label: "Earning",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <IconCoin className="size-3" />,
  },
  alert: {
    label: "Alert",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <IconAlertCircle className="size-3" />,
  },
};

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
  },
  high: {
    label: "High",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  urgent: {
    label: "Urgent",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

const ROLE_CONFIG: Record<UserRole, { label: string; className: string }> = {
  farmer: { label: "Farmer", className: "bg-green-50 text-green-700 border-green-200" },
  vendor: { label: "Vendor", className: "bg-blue-50 text-blue-700 border-blue-200" },
  delivery: { label: "Delivery", className: "bg-orange-50 text-orange-700 border-orange-200" },
  admin: { label: "Admin", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Shared Components ────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: NotificationType }) {
  const cfg = TYPE_CONFIG[type] ?? {
    label: type,
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: null,
  };
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority] ?? {
    label: priority,
    className: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  };
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 font-medium ${cfg.className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const cfg = ROLE_CONFIG[role] ?? {
    label: role,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <Badge variant="outline" className={`font-medium text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-8 h-8" : "w-5 h-5";
  return (
    <svg className={`animate-spin ${s} text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function FormField({
  label,
  id,
  children,
  className = "",
}: {
  label: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

// ─── Send Notification Dialog ─────────────────────────────────────────────────

function SendNotificationDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}) {
  const [form, setForm] = useState<SendForm>(DEFAULT_SEND_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm(DEFAULT_SEND_FORM);
  }, [open]);

  const set = (k: keyof SendForm, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Title and message are required");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        target: form.target,
        notification_type: form.notification_type,
        title: form.title.trim(),
        message: form.message.trim(),
        priority: form.priority,
        send_push: form.send_push,
      };
      if (form.target === "specific" && form.user_id)
        body.user_id = Number(form.user_id);
      if (form.target === "role" && form.role) body.role = form.role;
      if (form.reference_type) body.reference_type = form.reference_type;
      if (form.reference_id) body.reference_id = Number(form.reference_id);
      if (form.action_url) body.action_url = form.action_url;

      const res = await api.post("/admin/notifications/send", body);
      const d = res.data.data;
      toast.success(
        `Sent to ${d.total_recipients} user(s) · FCM ${d.fcm_success} ok, ${d.fcm_failed} failed`
      );
      onOpenChange(false);
      onSent();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>
            Broadcast a push notification to users or target a specific user / role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Target */}
          <FormField label="Target Audience" id="target">
            <div className="flex rounded-lg border overflow-hidden">
              {[
                { value: "all", label: "All Users" },
                { value: "role", label: "By Role" },
                { value: "specific", label: "Specific User" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("target", t.value)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    form.target === t.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FormField>

          {form.target === "specific" && (
            <FormField label="User ID" id="user_id">
              <Input
                id="user_id"
                placeholder="e.g. 5"
                value={form.user_id}
                onChange={(e) => set("user_id", e.target.value)}
              />
            </FormField>
          )}

          {form.target === "role" && (
            <FormField label="Role" id="role">
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_CONFIG[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type" id="notification_type">
              <Select
                value={form.notification_type}
                onValueChange={(v) => set("notification_type", v as NotificationType)}
              >
                <SelectTrigger id="notification_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Priority" id="priority">
              <Select
                value={form.priority}
                onValueChange={(v) => set("priority", v as Priority)}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_CONFIG[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Title *" id="title">
            <Input
              id="title"
              placeholder="e.g. Scheduled Maintenance"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FormField>

          <FormField label="Message *" id="message">
            <Textarea
              id="message"
              rows={3}
              placeholder="Write your notification message..."
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              className="resize-none"
            />
          </FormField>

          {/* Optional reference */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reference (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Reference Type" id="reference_type">
                <Select
                  value={form.reference_type || "none"}
                  onValueChange={(v) => set("reference_type", v === "none" ? "" : v)}
                >
                  <SelectTrigger id="reference_type">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {["order", "delivery", "payment", "crop", "earning", "user"].map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Reference ID" id="reference_id">
                <Input
                  id="reference_id"
                  placeholder="e.g. 42"
                  value={form.reference_id}
                  onChange={(e) => set("reference_id", e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Action URL" id="action_url">
              <Input
                id="action_url"
                placeholder="/orders/42"
                value={form.action_url}
                onChange={(e) => set("action_url", e.target.value)}
              />
            </FormField>
          </div>

          {/* Push toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Send Push Notification</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deliver via Firebase Cloud Messaging
              </p>
            </div>
            <Switch
              checked={form.send_push}
              onCheckedChange={(v) => set("send_push", v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Spinner size="sm" /> Sending…
              </>
            ) : (
              <>
                <IconBellRinging className="size-4" /> Send Notification
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notification Detail Sheet ────────────────────────────────────────────────

function NotificationDetailSheet({
  notificationId,
  open,
  onOpenChange,
  onMarkedRead,
}: {
  notificationId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMarkedRead: () => void;
}) {
  const [notification, setNotification] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [markLoading, setMarkLoading] = useState(false);

  const fetchNotification = useCallback(async () => {
    if (!notificationId) return;
    setLoading(true);
    setNotification(null);
    try {
      const res = await api.get(`/admin/notifications/${notificationId}`);
      setNotification(res.data.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load notification");
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  useEffect(() => {
    if (open && notificationId) fetchNotification();
  }, [open, notificationId, fetchNotification]);

  const handleMarkRead = async () => {
    if (!notification) return;
    setMarkLoading(true);
    try {
      await api.put(`/admin/notifications/${notification.notification_id}/mark-read`);
      toast.success("Marked as read");
      await fetchNotification();
      onMarkedRead();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark as read");
    } finally {
      setMarkLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          {loading || !notification ? (
            <div className="space-y-2">
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-64 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-base leading-tight">
                  {notification.title}
                </SheetTitle>
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Unread" />
                )}
              </div>
              <SheetDescription>
                <TypeBadge type={notification.notification_type} />
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !notification ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <IconAlertTriangle className="w-10 h-10 opacity-30" />
            <p className="text-sm">Failed to load notification</p>
            <Button variant="ghost" size="sm" onClick={fetchNotification}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Message */}
            <div className="rounded-xl border border-border bg-card px-4 py-4">
              <p className="text-sm leading-relaxed text-foreground">
                {notification.message}
              </p>
            </div>

            {/* Priority + Read status */}
            <div className="flex items-center justify-between">
              <PriorityBadge priority={notification.priority} />
              {notification.is_read ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <IconChecks className="size-3.5" />
                  Read {formatDateTime(notification.read_at)}
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleMarkRead}
                  disabled={markLoading}
                  className="h-7 text-xs gap-1.5"
                >
                  {markLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <IconCheck className="size-3" />
                      Mark as Read
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* User info */}
            {notification.user && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Recipient
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <IconUser className="size-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {notification.user.mobile_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        User ID #{notification.user.user_id}
                      </p>
                    </div>
                  </div>
                  <RoleBadge role={notification.user.role} />
                </div>
              </div>
            )}

            {/* Reference + action */}
            {(notification.reference_type || notification.action_url) && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Reference
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {notification.reference_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium capitalize">
                        {notification.reference_type}
                      </span>
                    </div>
                  )}
                  {notification.reference_id && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ID</span>
                      <span className="font-mono font-medium">
                        #{notification.reference_id}
                      </span>
                    </div>
                  )}
                  {notification.action_url && (
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Action URL</span>
                      <a
                        href={notification.action_url}
                        className="flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {notification.action_url}
                        <IconExternalLink className="size-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Push info */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Push Notification
                </span>
              </div>
              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enabled</span>
                  <span className={notification.send_push ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    {notification.send_push ? "Yes" : "No"}
                  </span>
                </div>
                {notification.push_sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sent at</span>
                    <span>{formatDateTime(notification.push_sent_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground block">Notification ID</span>
                  <span className="font-mono font-medium">
                    #{notification.notification_id}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Created</span>
                  <span>{formatDateTime(notification.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.user_id) params.set("user_id", filters.user_id);
      if (filters.notification_type)
        params.set("notification_type", filters.notification_type);
      if (filters.is_read) params.set("is_read", filters.is_read);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await api.get(`/admin/notifications?${params}`);
      setNotifications(res.data.data.notifications ?? []);
      setPagination(res.data.data.pagination);
    } catch (e) {
      toast.error("Failed to fetch notifications");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchNotifications, filters.user_id ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchNotifications]);

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

  const handleMarkAllRead = async () => {
    const userId = filters.user_id;
    if (!userId) {
      toast.error("Enter a User ID in the filter to mark all as read for that user");
      return;
    }
    setMarkAllLoading(true);
    try {
      const res = await api.put("/admin/notifications/mark-all-read", {
        user_id: Number(userId),
      });
      toast.success(res.data.message);
      fetchNotifications();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to mark all as read");
    } finally {
      setMarkAllLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />

          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            {/* ── Page Header ── */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Notifications
                </h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                  {pagination?.total > 0
                    ? `${pagination.total.toLocaleString("en-IN")} total · send and manage push notifications to users`
                    : "Send and manage push notifications to users."}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {filters.user_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={markAllLoading}
                    className="gap-2 hidden sm:flex"
                  >
                    {markAllLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <IconChecks className="size-4" />
                    )}
                    Mark All Read
                  </Button>
                )}
                <Button onClick={() => setSendOpen(true)} className="gap-2">
                  <IconPlus className="size-4" />
                  Send Notification
                </Button>
              </div>
            </div>

            {/* ── Main Card ── */}
            <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
              {/* ── Toolbar ── */}
              <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* User ID search */}
                  <div className="relative w-44">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="User ID..."
                      className="pl-9 bg-white dark:bg-card"
                      value={filters.user_id}
                      onChange={(e) => handleFilterChange("user_id", e.target.value)}
                    />
                    {filters.user_id && (
                      <button
                        onClick={() => handleFilterChange("user_id", "")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <IconX className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Type */}
                  <Select
                    value={filters.notification_type || "all_type"}
                    onValueChange={(v) =>
                      handleFilterChange("notification_type", v === "all_type" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-36 bg-white dark:bg-card">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_type">All Types</SelectItem>
                      {NOTIFICATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_CONFIG[t].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Priority */}
                  <Select
                    value={filters.priority || "all_priority"}
                    onValueChange={(v) =>
                      handleFilterChange("priority", v === "all_priority" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-32 bg-white dark:bg-card">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_priority">All Priorities</SelectItem>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PRIORITY_CONFIG[p].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Read status */}
                  <Select
                    value={filters.is_read || "all_read"}
                    onValueChange={(v) =>
                      handleFilterChange("is_read", v === "all_read" ? "" : v)
                    }
                  >
                    <SelectTrigger className="w-32 bg-white dark:bg-card">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_read">Read & Unread</SelectItem>
                      <SelectItem value="false">Unread only</SelectItem>
                      <SelectItem value="true">Read only</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date range */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={filters.from}
                      onChange={(e) => handleFilterChange("from", e.target.value)}
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="date"
                      value={filters.to}
                      onChange={(e) => handleFilterChange("to", e.target.value)}
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="gap-1.5 bg-white dark:bg-card"
                    >
                      <IconRefresh className="size-3.5" />
                      Reset
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                      {unreadCount} unread on this page
                    </span>
                  )}
                  {pagination?.total > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {pagination.total.toLocaleString("en-IN")} notifications
                    </span>
                  )}
                </div>
              </div>

              {/* ── Table ── */}
              <div className="overflow-x-auto">
                <Table className="min-w-[780px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide w-8" />
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Title
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        User
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Type
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Priority
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Push
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Created
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell className="px-4 py-3.5">
                            <div className="w-2 h-2 bg-muted rounded-full" />
                          </TableCell>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j} className="px-4 py-3.5">
                              <div className="h-4 bg-muted rounded w-full max-w-[120px]" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : notifications.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-20 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <IconBell className="size-10 opacity-30" />
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                No notifications found
                              </p>
                              <p className="text-xs mt-0.5">
                                Try adjusting your filters or send a new notification
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSendOpen(true)}
                              className="gap-1.5 mt-1"
                            >
                              <IconPlus className="size-3.5" />
                              Send Notification
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      notifications.map((n) => (
                        <TableRow
                          key={n.notification_id}
                          onClick={() => {
                            setSelectedId(n.notification_id);
                            setSheetOpen(true);
                          }}
                          className={`group cursor-pointer border-b last:border-0 transition-colors hover:bg-primary/5 ${
                            selectedId === n.notification_id && sheetOpen
                              ? "bg-primary/5"
                              : !n.is_read
                                ? "bg-primary/[0.02]"
                                : ""
                          }`}
                        >
                          {/* Unread dot */}
                          <TableCell className="px-4 py-3.5 w-8">
                            {!n.is_read && (
                              <span className="block w-2 h-2 rounded-full bg-primary" />
                            )}
                          </TableCell>

                          {/* Title + message preview */}
                          <TableCell className="px-4 py-3.5 max-w-[240px]">
                            <p
                              className={`text-sm leading-tight truncate group-hover:text-primary transition-colors ${
                                !n.is_read ? "font-semibold" : "font-medium"
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {n.message}
                            </p>
                          </TableCell>

                          {/* User */}
                          <TableCell className="px-4 py-3.5">
                            {n.user ? (
                              <div>
                                <p className="text-xs font-medium">
                                  {n.user.mobile_number}
                                </p>
                                <div className="mt-0.5">
                                  <RoleBadge role={n.user.role} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <TypeBadge type={n.notification_type} />
                          </TableCell>

                          <TableCell className="px-4 py-3.5">
                            <PriorityBadge priority={n.priority} />
                          </TableCell>

                          {/* Push status */}
                          <TableCell className="px-4 py-3.5">
                            {n.send_push ? (
                              n.push_sent_at ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                  <IconCheck className="size-3" /> Sent
                                </span>
                              ) : (
                                <span className="text-xs text-amber-600 font-medium">Pending</span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">Off</span>
                            )}
                          </TableCell>

                          {/* Created */}
                          <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            <span title={formatDateTime(n.created_at)}>
                              {timeAgo(n.created_at)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination ── */}
              {pagination?.total_pages > 1 && (
                <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <span className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {(page - 1) * 20 + 1}–
                      {Math.min(page * 20, pagination.total)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-foreground">
                      {pagination.total.toLocaleString("en-IN")}
                    </span>{" "}
                    notifications
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 p-0"
                    >
                      <IconChevronLeft className="size-4" />
                    </Button>
                    {Array.from(
                      { length: Math.min(5, pagination.total_pages) },
                      (_, i) => {
                        const p = i + 1;
                        return (
                          <Button
                            key={p}
                            size="sm"
                            variant={p === page ? "default" : "outline"}
                            onClick={() => setPage(p)}
                            className="w-8 h-8 p-0 text-sm"
                          >
                            {p}
                          </Button>
                        );
                      }
                    )}
                    {pagination.total_pages > 5 && (
                      <span className="text-xs text-muted-foreground px-1">…</span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= pagination.total_pages || loading}
                      onClick={() => setPage((p) => p + 1)}
                      className="w-8 h-8 p-0"
                    >
                      <IconChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* ── Detail Sheet ── */}
      <NotificationDetailSheet
        notificationId={selectedId}
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedId(null);
        }}
        onMarkedRead={fetchNotifications}
      />

      {/* ── Send Dialog ── */}
      <SendNotificationDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        onSent={fetchNotifications}
      />
    </ProtectedRoute>
  );
}