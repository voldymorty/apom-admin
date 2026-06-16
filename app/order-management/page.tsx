"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconSearch, IconFilter, IconArrowRight, IconRefresh,
  IconPackage, IconCreditCard, IconFileDescription, IconAlertTriangle,
  IconChevronLeft, IconChevronRight, IconX, IconBan,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "placed" | "confirmed" | "processing" | "ready"
  | "dispatched" | "delivered" | "cancelled" | "returned";

type PaymentStatus = "pending" | "paid" | "partial" | "failed" | "refunded";
type ItemStatus = "pending" | "confirmed" | "delivered" | "cancelled";

interface OrderListItem {
  order_id: number;
  order_number: string;
  order_date: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  delivery_charges: number;
  final_amount: number;
  expected_delivery_date: string;
  vendor: {
    vendor_id: number;
    shop_name: string;
    owner_name: string;
    mobile_number: string;
  };
  created_at: string;
}

interface OrderDetail extends OrderListItem {
  discount_percentage: number;
  tax_percentage: number;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  actual_delivery_date: string | null;
  special_instructions: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: { user_id: number; mobile_number: string } | null;
  vendor: OrderListItem["vendor"] & { email: string };
  items: OrderItem[];
  payments: Payment[];
  updated_at: string;
}

interface OrderItem {
  order_item_id: number;
  order_id: number;
  grade: "A" | "B" | "C";
  quantity_kg: number;
  price_per_kg: number;
  total_price: number;
  delivered_quantity_kg: number;
  status: ItemStatus;
  product: {
    product_id: number;
    product_name: string;
    product_code: string;
    unit: string;
    image_url?: string;
  };
}

interface Payment {
  payment_id: number;
  payment_method: string;
  amount: number;
  payment_status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  transaction_id: string;
  transaction_date: string;
  failure_reason?: string;
  refund_amount: number;
  refund_date?: string;
  created_at: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface Filters {
  search: string;
  order_status: string;
  payment_status: string;
  from_date: string;
  to_date: string;
  sort_by: string;
  order: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  "placed", "confirmed", "processing", "ready",
  "dispatched", "delivered", "cancelled", "returned",
];

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  placed:     ["confirmed"],
  confirmed:  ["processing"],
  processing: ["ready"],
  ready:      ["dispatched"],
  dispatched: ["delivered"],
  delivered:  [],
  cancelled:  [],
  returned:   [],
};

const NON_CANCELLABLE: OrderStatus[] = ["delivered", "cancelled", "returned"];

const ITEM_STATUS_NEXT: Record<ItemStatus, ItemStatus[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const DEFAULT_FILTERS: Filters = {
  search: "",
  order_status: "",
  payment_status: "",
  from_date: "",
  to_date: "",
  sort_by: "order_date",
  order: "desc",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatCurrency(n: number) {
  return "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─── Status Configs ───────────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; className: string; dot: string }> = {
  placed:     { label: "Placed",     className: "bg-blue-50 text-blue-700 border-blue-200",       dot: "bg-blue-500" },
  confirmed:  { label: "Confirmed",  className: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  ready:      { label: "Ready",      className: "bg-cyan-50 text-cyan-700 border-cyan-200",       dot: "bg-cyan-500" },
  dispatched: { label: "Dispatched", className: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  delivered:  { label: "Delivered",  className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled:  { label: "Cancelled",  className: "bg-red-50 text-red-700 border-red-200",          dot: "bg-red-500" },
  returned:   { label: "Returned",   className: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400" },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-amber-50 text-amber-700 border-amber-200" },
  paid:     { label: "Paid",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial:  { label: "Partial",  className: "bg-orange-50 text-orange-700 border-orange-200" },
  failed:   { label: "Failed",   className: "bg-red-50 text-red-700 border-red-200" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const ITEM_STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 border-amber-200" },
  confirmed: { label: "Confirmed", className: "bg-violet-50 text-violet-700 border-violet-200" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
};

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 border-emerald-200",
  B: "bg-sky-100 text-sky-800 border-sky-200",
  C: "bg-amber-100 text-amber-800 border-amber-200",
};

// ─── Shared Badge Components ──────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const cfg = PAYMENT_STATUS_CONFIG[status as PaymentStatus] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <Badge variant="outline" className={`font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const cfg = ITEM_STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <Badge variant="outline" className={`font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const g = (grade || "").toUpperCase();
  return (
    <Badge variant="outline" className={`font-bold text-xs px-2 ${GRADE_STYLES[g] ?? "bg-muted"}`}>
      Grade {g}
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

function FormField({
  label, id, children, className = "",
}: {
  label: string; id: string; children: React.ReactNode; className?: string;
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

// ─── Order Detail Sheet ───────────────────────────────────────────────────────

function OrderDetailSheet({
  orderId,
  open,
  onOpenChange,
  onOrderUpdated,
}: {
  orderId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOrderUpdated: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [itemStatusLoading, setItemStatusLoading] = useState<number | null>(null);
  const cancelInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setOrder(null);
    try {
      const data = await api.get(`/admin/orders/${orderId}`);
      setOrder(data.data.data);
      console.log("Fetched order details:", data.data.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (open && orderId) {
      setShowCancelForm(false);
      setCancelReason("");
      fetchOrder();
    }
  }, [open, orderId, fetchOrder]);

  useEffect(() => {
    if (showCancelForm) {
      setTimeout(() => cancelInputRef.current?.focus(), 50);
    }
  }, [showCancelForm]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    setStatusLoading(true);
    try {
      await api.patch(`/admin/orders/${order.order_id}/status`, { order_status: newStatus });
      toast.success(`Order moved to ${ORDER_STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      await fetchOrder();
      onOrderUpdated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!order || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await api.patch(`/admin/orders/${order.order_id}/cancel`, {
        cancellation_reason: cancelReason.trim(),
      });
      toast.success("Order cancelled successfully");
      setShowCancelForm(false);
      setCancelReason("");
      await fetchOrder();
      onOrderUpdated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel order");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleItemStatusChange = async (itemId: number, newStatus: ItemStatus) => {
    if (!order) return;
    setItemStatusLoading(itemId);
    try {
      await api.patch(`/admin/orders/${order.order_id}/items/${itemId}/status`, { status: newStatus });
      toast.success(`Item ${newStatus}`);
      await fetchOrder();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update item");
    } finally {
      setItemStatusLoading(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
          {loading || !order ? (
            <div className="space-y-2">
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-64 bg-muted rounded animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="font-mono text-base">{order.order_number}</SheetTitle>
                <OrderStatusBadge status={order.order_status} />
                <PaymentStatusBadge status={order.payment_status} />
              </div>
              <SheetDescription>
                {order.vendor?.shop_name ?? "Unknown Vendor"} · {formatDateTime(order.order_date)}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <IconAlertTriangle className="w-10 h-10 opacity-30" />
            <p className="text-sm">Failed to load order details</p>
            <Button variant="ghost" size="sm" onClick={fetchOrder}>Try again</Button>
          </div>
        ) : (
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            {/* Tab list */}
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 px-6 h-auto py-0 gap-0 shrink-0">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-0 mr-7 font-medium"
              >
                <IconFileDescription className="size-4 mr-1.5" />
                Details
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-0 mr-7 font-medium"
              >
                <IconPackage className="size-4 mr-1.5" />
                Items
                {order.items?.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground">
                    {order.items.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-0 font-medium"
              >
                <IconCreditCard className="size-4 mr-1.5" />
                Payments
                {order.payments?.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground">
                    {order.payments.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">

              {/* Order Status Card */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Status</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {STATUS_FLOW[order.order_status]?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Advance to</p>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FLOW[order.order_status].map(nextStatus => (
                          <Button
                            key={nextStatus}
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(nextStatus)}
                            disabled={statusLoading}
                            className="h-8 text-xs gap-1.5"
                          >
                            {statusLoading ? (
                              <Spinner size="sm" />
                            ) : (
                              <>
                                <IconArrowRight className="size-3" />
                                {ORDER_STATUS_CONFIG[nextStatus]?.label ?? nextStatus}
                              </>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {
                  STATUS_FLOW[order.order_status]?.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No further status changes available: Order is {ORDER_STATUS_CONFIG[order.order_status]?.label ?? order.order_status}.
                    </p>
                  )}

                  {!NON_CANCELLABLE.includes(order.order_status) && (
                    <div className="pt-1 border-t border-border/60">
                      {!showCancelForm ? (
                        <button
                          onClick={() => setShowCancelForm(true)}
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                          <IconBan className="size-3.5" />
                          Cancel this order
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <FormField label="Cancellation reason" id="cancel_reason">
                            <Textarea
                              ref={cancelInputRef}
                              id="cancel_reason"
                              rows={2}
                              placeholder="Provide a reason for cancellation..."
                              value={cancelReason}
                              onChange={e => setCancelReason(e.target.value)}
                              className="resize-none"
                            />
                          </FormField>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleCancel}
                              disabled={cancelLoading || !cancelReason.trim()}
                              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                            >
                              {cancelLoading ? <><Spinner size="sm" /> Cancelling…</> : "Confirm Cancel"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                              className="h-8 text-xs"
                            >
                              Nevermind
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {order.order_status === "cancelled" && (
                    <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                      <IconAlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-red-700">Order Cancelled</p>
                        {order.cancellation_reason && (
                          <p className="text-xs text-red-600 mt-0.5">{order.cancellation_reason}</p>
                        )}
                        {order.cancelled_at && (
                          <p className="text-xs text-red-500 mt-0.5">{formatDateTime(order.cancelled_at)}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Financials */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Financials</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { label: "Subtotal", value: formatCurrency(order.subtotal_amount), cls: "" },
                    { label: `Discount (${order.discount_percentage}%)`, value: `− ${formatCurrency(order.discount_amount)}`, cls: "text-emerald-600" },
                    { label: `Tax (${order.tax_percentage}%)`, value: formatCurrency(order.tax_amount), cls: "" },
                    { label: "Delivery Charges", value: formatCurrency(order.delivery_charges), cls: "" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`tabular-nums ${cls}`}>{value}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums text-base">{formatCurrency(order.final_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Vendor + Delivery */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</span>
                  </div>
                  <div className="px-3 py-3 space-y-1">
                    <p className="text-sm font-semibold">{order.vendor?.shop_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{order.vendor?.owner_name ?? "—"}</p>
                    <a href={`tel:${order.vendor?.mobile_number}`} className="text-xs text-primary hover:underline block">
                      {order.vendor?.mobile_number}
                    </a>
                    {order.vendor?.email && (
                      <a href={`mailto:${order.vendor?.email}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline block truncate">
                        {order.vendor?.email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery</span>
                  </div>
                  <div className="px-3 py-3 space-y-1">
                    <p className="text-xs text-muted-foreground leading-relaxed">{order.delivery_address}</p>
                    <p className="text-xs text-muted-foreground">
                      Expected:{" "}
                      <span className="font-medium text-foreground">{formatDate(order.expected_delivery_date)}</span>
                    </p>
                    {order.actual_delivery_date && (
                      <p className="text-xs text-emerald-600 font-medium">
                        ✓ Delivered {formatDate(order.actual_delivery_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Special instructions */}
              {order.special_instructions && order.special_instructions !== "string" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-start gap-2.5">
                    <IconAlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800 mb-0.5">Special Instructions</p>
                      <p className="text-xs text-amber-700">{order.special_instructions}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Order ID</span>
                    <span className="font-mono font-medium">#{order.order_number}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Created</span>
                    <span>{formatDate(order.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Last Updated</span>
                    <span>{formatDateTime(order.updated_at)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Items Tab ── */}
            <TabsContent value="items" className="flex-1 overflow-y-auto p-6 space-y-3 mt-0">
              {!order.items?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <IconPackage className="size-10 opacity-30" />
                  <p className="text-sm">No items in this order</p>
                </div>
              ) : (
                order.items.map(item => {
                  const nextStatuses = ITEM_STATUS_NEXT[item.status] ?? [];
                  return (
                    <div key={item.order_item_id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GradeBadge grade={item.grade} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight">{item.product==null? "Product Name" : item.product.product_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.product==null? "Product Code" : item.product.product_code}</p>
                          </div>
                        </div>
                        <ItemStatusBadge status={item.status} />
                      </div>
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                          <div>
                            <span className="text-muted-foreground block mb-0.5">Ordered</span>
                            <p className="font-semibold">{item.quantity_kg} {item.product==null? "Unit" : item.product.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5">Rate</span>
                            <p className="font-semibold">{formatCurrency(item.price_per_kg)}/{item.product==null? "Unit" : item.product.unit}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground block mb-0.5">Total</span>
                            <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>

                        {item.delivered_quantity_kg > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Delivered</span>
                              <span className="font-medium text-emerald-600">
                                {item.delivered_quantity_kg} / {item.quantity_kg} {item.product==null? "Unit" : item.product.unit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (item.delivered_quantity_kg / item.quantity_kg) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {nextStatuses.length > 0 && (
                          <div className="flex gap-2 pt-1 border-t border-border/60 mt-2">
                            {nextStatuses.map(s => (
                              <Button
                                key={s}
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemStatusChange(item.order_item_id, s)}
                                disabled={itemStatusLoading === item.order_item_id}
                                className={`h-7 text-xs gap-1 ${s === "cancelled" ? "text-red-600 border-red-200 hover:bg-red-50" : ""}`}
                              >
                                {itemStatusLoading === item.order_item_id ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <>
                                    <IconArrowRight className="size-3" />
                                    {ITEM_STATUS_CONFIG[s]?.label ?? s}
                                  </>
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* ── Payments Tab ── */}
            <TabsContent value="payments" className="flex-1 overflow-y-auto p-6 space-y-3 mt-0">
              {!order.payments?.length ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <IconCreditCard className="size-10 opacity-30" />
                  <p className="text-sm">No payment records</p>
                </div>
              ) : (
                order.payments.map(payment => (
                  <div key={payment.payment_id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold capitalize">
                          {payment.payment_method.replace(/_/g, " ")}
                        </span>
                        <PaymentStatusBadge status={payment.payment_status} />
                      </div>
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(payment.amount)}</span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      {payment.transaction_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Transaction ID</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                            {payment.transaction_id}
                          </span>
                        </div>
                      )}
                      {payment.razorpay_payment_id && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mb-0.5">Razorpay Payment ID</span>
                          <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                            {payment.razorpay_payment_id}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground block">Date</span>
                        <span>{formatDateTime(payment.transaction_date)}</span>
                      </div>
                      {payment.refund_amount > 0 && (
                        <div>
                          <span className="text-muted-foreground block">Refund</span>
                          <span className="text-emerald-600 font-semibold">{formatCurrency(payment.refund_amount)}</span>
                        </div>
                      )}
                    </div>
                    {payment.failure_reason && payment.failure_reason !== "string" && (
                      <div className="px-4 pb-3">
                        <div className="bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 border border-red-100">
                          {payment.failure_reason}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderManagementPage() {
  const [mounted, setMounted] = useState(false);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, total_pages: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (filters.search)         params.set("search", filters.search);
      if (filters.order_status)   params.set("order_status", filters.order_status);
      if (filters.payment_status) params.set("payment_status", filters.payment_status);
      if (filters.from_date)      params.set("from_date", filters.from_date);
      if (filters.to_date)        params.set("to_date", filters.to_date);
      params.set("sort_by", filters.sort_by);
      params.set("order", filters.order);

      const data = await api.get(`/admin/orders?${params}`);
      setOrders(data.data.data.orders ?? []);
      setPagination(data.data.data.pagination??{ total: 0, page: 1, limit: 20, total_pages: 0 });
    } catch (e) {
      toast.error("Failed to fetch orders");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    const delay = filters.search ? 400 : 0;
    const timer = setTimeout(fetchOrders, delay);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleFilterChange = (k: keyof Filters, v: string) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]
  );

  const openOrder = (order: OrderListItem) => {
    setSelectedOrderId(order.order_id);
    setSheetOpen(true);
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

 const exportOrdersToExcel = () => {
  if (!orders?.length) return;

  const excelData = orders.map((order: any, index: number) => ({
    "S.No": index + 1,

    "Order ID": order.order_number ?? order.order_id,

    Vendor: order.vendor?.shop_name ?? "-",

    "Vendor Phone": order.vendor?.mobile_number ?? "-",

    "Order Date": order.order_date
      ? new Date(order.order_date).toLocaleDateString()
      : "-",

    "Order Status":
      order.order_status
        ? order.order_status.charAt(0).toUpperCase() +
          order.order_status.slice(1)
        : "-",

    Payment:
      order.payment_status
        ? order.payment_status.charAt(0).toUpperCase() +
          order.payment_status.slice(1)
        : "-",

    Amount: order.final_amount
      ? `₹${Number(order.final_amount).toLocaleString()}`
      : "₹0",

    "Expected Delivery": order.expected_delivery_date
      ? new Date(
          order.expected_delivery_date
        ).toLocaleDateString()
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },   // S.No
    { wch: 28 },  // Order ID
    { wch: 28 },  // Vendor
    { wch: 18 },  // Vendor Phone
    { wch: 18 },  // Order Date
    { wch: 18 },  // Order Status
    { wch: 15 },  // Payment
    { wch: 15 },  // Amount
    { wch: 22 },  // Expected Delivery
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Orders Report"
  );

  XLSX.writeFile(
    workbook,
    `orders_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`
  );
    toast.success(`Exported ${orders.length} order records`);
};
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

            {/* ── Page Header ── */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
              <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                {pagination?.total > 0
                  ? `${pagination.total.toLocaleString("en-IN")} total orders · track, manage and update vendor orders`
                  : "Track, manage and update all vendor orders."}
              </p>
            </div>

            {/* ── Main Card ── */}
            <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">

              {/* ── Toolbar ── */}
              <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 items-center">

                  {/* Search */}
                  <div className="relative w-56">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search order number..."
                      className="pl-9 bg-white dark:bg-card"
                      value={filters.search}
                      onChange={e => handleFilterChange("search", e.target.value)}
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

                  {/* Order Status */}
                  <Select
                    value={filters.order_status || "all_status"}
                    onValueChange={v => handleFilterChange("order_status", v === "all_status" ? "" : v)}
                  >
                    <SelectTrigger className="w-40 bg-white dark:bg-card">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_status">All Statuses</SelectItem>
                      {ORDER_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{ORDER_STATUS_CONFIG[s]?.label ?? s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Payment Status */}
                  <Select
                    value={filters.payment_status || "all_payment"}
                    onValueChange={v => handleFilterChange("payment_status", v === "all_payment" ? "" : v)}
                  >
                    <SelectTrigger className="w-36 bg-white dark:bg-card">
                      <SelectValue placeholder="All Payments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_payment">All Payments</SelectItem>
                      {(Object.keys(PAYMENT_STATUS_CONFIG) as PaymentStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{PAYMENT_STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date range */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={filters.from_date}
                      onChange={e => handleFilterChange("from_date", e.target.value)}
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="date"
                      value={filters.to_date}
                      onChange={e => handleFilterChange("to_date", e.target.value)}
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                  </div>

                  {/* Sort */}
                  <Select
                    value={`${filters.sort_by}:${filters.order}`}
                    onValueChange={v => {
                      const [sb, o] = v.split(":");
                      handleFilterChange("sort_by", sb);
                      setFilters(prev => ({ ...prev, sort_by: sb, order: o }));
                    }}
                  >
                    <SelectTrigger className="w-36 bg-white dark:bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order_date:desc">Newest First</SelectItem>
                      <SelectItem value="order_date:asc">Oldest First</SelectItem>
                      <SelectItem value="final_amount:desc">Amount ↓</SelectItem>
                      <SelectItem value="final_amount:asc">Amount ↑</SelectItem>
                    </SelectContent>
                  </Select>
                    <Button
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-card hover:border-primary/50"
                    onClick={exportOrdersToExcel}
                  >
                  Export
                </Button>
                  {/* Reset */}
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 bg-white dark:bg-card">
                      <IconRefresh className="size-3.5" />
                      Reset
                    </Button>
                  )}
                </div>

                {/* Total count */}
                {pagination?.total > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {pagination.total.toLocaleString("en-IN")} orders
                  </span>
                )}
              </div>

              {/* ── Table ── */}
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Order ID</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Vendor</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Order Status</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Payment</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Amount</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Expected Delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-28" /></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-32" /></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-20" /></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-20" /></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="h-5 bg-muted rounded-full w-16" /></TableCell>
                          <TableCell className="px-4 py-3.5 text-right"><div className="h-4 bg-muted rounded w-20 ml-auto" /></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-20 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <IconPackage className="size-10 opacity-30" />
                            <div>
                              <p className="text-sm font-medium text-foreground">No orders found</p>
                              <p className="text-xs mt-0.5">Try adjusting your filters</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map(order => (
                        <TableRow
                          key={order.order_id}
                          onClick={() => openOrder(order)}
                          className={`group cursor-pointer border-b last:border-0 transition-colors hover:bg-primary/5 ${
                            selectedOrderId === order.order_id && sheetOpen ? "bg-primary/5" : ""
                          }`}
                        >
                          <TableCell className="px-4 py-3.5">
                            <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {order.order_number}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="font-medium text-foreground text-sm">{order.vendor?.shop_name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{order.vendor?.owner_name ?? "—"}</div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(order.order_date)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <OrderStatusBadge status={order.order_status} />
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <PaymentStatusBadge status={order.payment_status} />
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right font-semibold tabular-nums text-sm">
                            {formatCurrency(order.final_amount)}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(order.expected_delivery_date)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Pagination ── */}
             {/* ── Pagination ── */}
{pagination?.total > 0 && (
  <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
    <span className="text-xs text-muted-foreground">
      Showing{" "}
      <span className="font-medium text-foreground">
        {Math.min((page - 1) * 20 + 1, pagination.total)}–{Math.min(page * 20, pagination.total)}
      </span>{" "}
      of{" "}
      <span className="font-medium text-foreground">
        {pagination.total.toLocaleString("en-IN")}
      </span>{" "}
      orders
    </span>

    {pagination.total_pages > 1 && (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1 || loading}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="w-8 h-8 p-0"
        >
          <IconChevronLeft className="size-4" />
        </Button>

        {(() => {
          const total = pagination.total_pages;
          const delta = 2;
          const pages: (number | "...")[] = [];
          const left = Math.max(2, page - delta);
          const right = Math.min(total - 1, page + delta);

          pages.push(1);
          if (left > 2) pages.push("...");
          for (let i = left; i <= right; i++) pages.push(i);
          if (right < total - 1) pages.push("...");
          if (total > 1) pages.push(total);

          return pages.map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="text-xs text-muted-foreground px-1">…</span>
            ) : (
              <Button
                key={p}
                size="sm"
                variant={p === page ? "default" : "outline"}
                onClick={() => setPage(p as number)}
                className="w-8 h-8 p-0 text-sm"
              >
                {p}
              </Button>
            )
          );
        })()}

        <Button
          size="sm"
          variant="outline"
          disabled={page >= pagination.total_pages || loading}
          onClick={() => setPage(p => p + 1)}
          className="w-8 h-8 p-0"
        >
          <IconChevronRight className="size-4" />
        </Button>
      </div>
    )}
  </div>
)}
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* ── Order Detail Sheet ── */}
      <OrderDetailSheet
        orderId={selectedOrderId}
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedOrderId(null);
        }}
        onOrderUpdated={fetchOrders}
      />
    </ProtectedRoute>
  );
}

