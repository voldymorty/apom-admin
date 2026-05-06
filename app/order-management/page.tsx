"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/animate-ui/components/radix/sidebar";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import { toast } from "sonner";

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

// Valid forward-only status transitions
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

// Statuses that cannot be cancelled
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

/**
 * FIX: Use UTC methods to avoid timezone off-by-one on date-only strings like "2026-05-04"
 */
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  // If it's a date-only string (no time component), parse as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }
  return d.toLocaleDateString("en-IN", {
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
  placed:     { label: "Placed",     className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",    dot: "bg-blue-500" },
  confirmed:  { label: "Confirmed",  className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200", dot: "bg-violet-500" },
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",  dot: "bg-amber-500" },
  ready:      { label: "Ready",      className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",     dot: "bg-cyan-500" },
  dispatched: { label: "Dispatched", className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200", dot: "bg-orange-500" },
  delivered:  { label: "Delivered",  className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  cancelled:  { label: "Cancelled",  className: "bg-red-50 text-red-700 ring-1 ring-red-200",        dot: "bg-red-500" },
  returned:   { label: "Returned",   className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400" },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  paid:     { label: "Paid",     className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  partial:  { label: "Partial",  className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
  failed:   { label: "Failed",   className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
};

const ITEM_STATUS_CONFIG: Record<ItemStatus, { label: string; className: string }> = {
  pending:   { label: "Pending",   className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  confirmed: { label: "Confirmed", className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};

const GRADE_CONFIG: Record<string, { className: string; label: string }> = {
  A: { className: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200", label: "A" },
  B: { className: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",             label: "B" },
  C: { className: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",       label: "C" },
};

// ─── Shared Components ────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const cfg = ORDER_STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: PaymentStatus | string }) {
  const cfg = PAYMENT_STATUS_CONFIG[status as PaymentStatus] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const cfg = ITEM_STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  // FIX: Normalise grade to uppercase to handle API inconsistency
  const g = (grade || "").toUpperCase();
  const cfg = GRADE_CONFIG[g] ?? { className: "bg-slate-100 text-slate-600", label: g };
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cfg.className}`}>
      {cfg.label}
    </span>
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

// ─── Stats Summary Bar ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function OrderFilters({
  filters,
  onChange,
  onReset,
  total,
}: {
  filters: Filters;
  onChange: (k: keyof Filters, v: string) => void;
  onReset: () => void;
  total: number;
}) {
  const hasActive = Object.entries(filters).some(([k, v]) => {
    const def = DEFAULT_FILTERS[k as keyof Filters];
    return v !== def;
  });

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" strokeWidth="2" />
          <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search order number..."
          value={filters.search}
          onChange={e => onChange("search", e.target.value)}
          className="pl-8 pr-3 h-9 text-sm rounded-lg border border-border bg-background w-52 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
        {filters.search && (
          <button
            onClick={() => onChange("search", "")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Order status */}
      <select
        value={filters.order_status}
        onChange={e => onChange("order_status", e.target.value)}
        className="h-9 py-0 pl-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
      >
        <option value="">All Statuses</option>
        {ORDER_STATUSES.map(s => (
          <option key={s} value={s}>{ORDER_STATUS_CONFIG[s]?.label ?? s}</option>
        ))}
      </select>

      {/* Payment status */}
      <select
        value={filters.payment_status}
        onChange={e => onChange("payment_status", e.target.value)}
        className="h-9 py-0 pl-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
      >
        <option value="">All Payments</option>
        {(Object.keys(PAYMENT_STATUS_CONFIG) as PaymentStatus[]).map(s => (
          <option key={s} value={s}>{PAYMENT_STATUS_CONFIG[s].label}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.from_date}
          onChange={e => onChange("from_date", e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <input
          type="date"
          value={filters.to_date}
          onChange={e => onChange("to_date", e.target.value)}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>

      {/* Sort */}
      <select
        value={`${filters.sort_by}:${filters.order}`}
        onChange={e => {
          const [sb, o] = e.target.value.split(":");
          onChange("sort_by", sb);
          onChange("order", o);
        }}
        className="h-9 py-0 pl-3 pr-8 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all"
      >
        <option value="order_date:desc">Newest First</option>
        <option value="order_date:asc">Oldest First</option>
        <option value="final_amount:desc">Amount ↓</option>
        <option value="final_amount:asc">Amount ↑</option>
      </select>

      {/* Reset — only show when filters are active */}
      {hasActive && (
        <button
          onClick={onReset}
          className="h-9 px-3 text-sm rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>
      )}

      {/* Result count */}
      {total > 0 && (
        <span className="text-xs text-muted-foreground ml-auto">
          {total.toLocaleString("en-IN")} orders
        </span>
      )}
    </div>
  );
}

// ─── Orders Table ─────────────────────────────────────────────────────────────

function OrdersTable({
  orders,
  loading,
  onRowClick,
  selectedId,
}: {
  orders: OrderListItem[];
  loading: boolean;
  onRowClick: (o: OrderListItem) => void;
  selectedId: number | null;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        {/* Skeleton header */}
        <div className="bg-muted/40 border-b border-border px-4 py-3 grid grid-cols-7 gap-4">
          {["Order", "Vendor", "Date", "Order Status", "Payment", "Amount", "Delivery"].map(h => (
            <span key={h} className="text-xs font-medium text-muted-foreground">{h}</span>
          ))}
        </div>
        {/* Skeleton rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 border-b border-border last:border-0 flex items-center gap-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-36" />
            <div className="h-4 bg-muted rounded w-28 ml-auto" />
            <div className="h-4 bg-muted rounded w-20" />
            <div className="h-5 bg-muted rounded-full w-20" />
            <div className="h-5 bg-muted rounded-full w-16" />
            <div className="h-4 bg-muted rounded w-20 ml-auto" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="rounded-xl border border-border flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
          <svg className="w-7 h-7 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No orders found</p>
          <p className="text-xs mt-0.5">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map(order => (
            <tr
              key={order.order_id}
              onClick={() => onRowClick(order)}
              className={`cursor-pointer transition-colors hover:bg-accent/60 group ${
                selectedId === order.order_id ? "bg-accent/80" : ""
              }`}
            >
              <td className="px-4 py-3.5">
                <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                  {order.order_number}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="font-medium text-foreground text-sm">{order.vendor?.shop_name ?? <span className="text-muted-foreground italic">Unknown</span>}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{order.vendor?.owner_name ?? "—"}</div>
              </td>
              <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                {formatDate(order.order_date)}
              </td>
              <td className="px-4 py-3.5">
                <OrderStatusBadge status={order.order_status} />
              </td>
              <td className="px-4 py-3.5">
                <PaymentStatusBadge status={order.payment_status} />
              </td>
              <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-sm">
                {formatCurrency(order.final_amount)}
              </td>
              <td className="px-4 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                {formatDate(order.expected_delivery_date)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (p: number) => void;
}) {
  const { page, total_pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const getPages = () => {
    const pages: (number | "...")[] = [];
    if (total_pages <= 7) {
      return Array.from({ length: total_pages }, (_, i) => i + 1);
    }
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let p = Math.max(2, page - 1); p <= Math.min(total_pages - 1, page + 1); p++) {
      pages.push(p);
    }
    if (page < total_pages - 2) pages.push("...");
    pages.push(total_pages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total.toLocaleString("en-IN")}</span> orders
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? "bg-primary text-primary-foreground border border-primary"
                  : "border border-border bg-background hover:bg-accent text-foreground"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page >= total_pages}
          onClick={() => onPageChange(page + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-muted-foreground"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Order Drawer ─────────────────────────────────────────────────────────────

type DrawerTab = "details" | "items" | "payments";

function OrderDrawer({
  orderId,
  onClose,
  onOrderUpdated,
}: {
  orderId: number | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<DrawerTab>("details");
  const [statusLoading, setStatusLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [itemStatusLoading, setItemStatusLoading] = useState<number | null>(null);
  const cancelInputRef = useRef<HTMLTextAreaElement>(null);
  const isOpen = !!orderId;

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    // FIX: Clear stale order immediately to prevent flash of old content
    setOrder(null);
    try {
      const data = await api.get(`/admin/orders/${orderId}`);
      setOrder(data.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setTab("details");
    setShowCancelForm(false);
    setCancelReason("");
    fetchOrder();
  }, [fetchOrder]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Auto-focus cancel textarea
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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Order Details"
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-background shadow-2xl border-l border-border flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0 bg-muted/20">
          <div className="min-w-0">
            {order ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-foreground font-mono">
                    {order.order_number}
                  </h2>
                  <OrderStatusBadge status={order.order_status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.vendor?.shop_name ?? <span className="text-muted-foreground italic">Unknown</span>} · {formatDateTime(order.order_date)}
                </p>
              </>
            ) : (
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 shrink-0 p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !order ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
              <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm">Failed to load order details</p>
            <button
              onClick={fetchOrder}
              className="text-xs text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0 px-6 bg-muted/10">
              {(["details", "items", "payments"] as DrawerTab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 px-0 mr-7 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-1.5 ${
                    tab === t
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                  {t === "items" && order.items?.length > 0 && (
                    <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold">
                      {order.items.length}
                    </span>
                  )}
                  {t === "payments" && order.payments?.length > 0 && (
                    <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold">
                      {order.payments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Details Tab ── */}
              {tab === "details" && (
                <div className="p-6 space-y-4">

                  {/* Status actions card */}
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Order Status</span>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={order.order_status} />
                        <PaymentStatusBadge status={order.payment_status} />
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {/* Forward status transitions */}
                      {STATUS_FLOW[order.order_status]?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium">Advance to</p>
                          <div className="flex flex-wrap gap-2">
                            {STATUS_FLOW[order.order_status].map(nextStatus => (
                              <button
                                key={nextStatus}
                                onClick={() => handleStatusChange(nextStatus)}
                                disabled={statusLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-50 transition-colors font-medium min-w-[80px] justify-center"
                              >
                                {statusLoading ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    {ORDER_STATUS_CONFIG[nextStatus]?.label ?? nextStatus}
                                  </>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cancel section */}
                      {!NON_CANCELLABLE.includes(order.order_status) && (
                        <div className="pt-1 border-t border-border/60">
                          {!showCancelForm ? (
                            <button
                              onClick={() => setShowCancelForm(true)}
                              className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel this order
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-foreground">Cancellation reason</label>
                              <textarea
                                ref={cancelInputRef}
                                rows={2}
                                placeholder="Provide a reason for cancellation..."
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCancel}
                                  disabled={cancelLoading || !cancelReason.trim()}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                >
                                  {cancelLoading ? <><Spinner size="sm" /> Cancelling…</> : "Confirm Cancel"}
                                </button>
                                <button
                                  onClick={() => { setShowCancelForm(false); setCancelReason(""); }}
                                  className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-accent transition-colors"
                                >
                                  Nevermind
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cancellation info */}
                      {order.order_status === "cancelled" && (
                        <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
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
                        { label: "Subtotal", value: formatCurrency(order.subtotal_amount) },
                        { label: `Discount (${order.discount_percentage}%)`, value: `− ${formatCurrency(order.discount_amount)}`, cls: "text-emerald-600" },
                        { label: `Tax (${order.tax_percentage}%)`, value: formatCurrency(order.tax_amount) },
                        { label: "Delivery Charges", value: formatCurrency(order.delivery_charges) },
                      ].map(({ label, value, cls }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{label}</span>
                          <span className={`tabular-nums ${cls ?? ""}`}>{value}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums text-base">{formatCurrency(order.final_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vendor + Delivery side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-border bg-muted/20">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vendor</span>
                      </div>
                      <div className="px-3 py-3 space-y-1">
                        <p className="text-sm font-semibold">{order.vendor?.shop_name ?? <span className="text-muted-foreground italic">Unknown</span>}</p>
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
                    <div className="rounded-xl border border-border bg-amber-50/50 p-4">
                      <div className="flex items-start gap-2.5">
                        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
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
                        <span className="font-mono font-medium">#{order.order_id}</span>
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
                </div>
              )}

              {/* ── Items Tab ── */}
              {tab === "items" && (
                <div className="p-6 space-y-3">
                  {!order.items?.length ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-sm">No items in this order</p>
                    </div>
                  ) : (
                    order.items.map(item => {
                      const nextStatuses = ITEM_STATUS_NEXT[item.status] ?? [];
                      return (
                        <div key={item.order_item_id} className="rounded-xl border border-border bg-card overflow-hidden">
                          {/* Item header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <GradeBadge grade={item.grade} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-tight">{item.product.product_name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{item.product.product_code}</p>
                              </div>
                            </div>
                            <ItemStatusBadge status={item.status} />
                          </div>

                          {/* Item details */}
                          <div className="px-4 py-3">
                            <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                              <div className="space-y-0.5">
                                <span className="text-muted-foreground">Ordered</span>
                                <p className="font-semibold">{item.quantity_kg} {item.product.unit}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-muted-foreground">Rate</span>
                                <p className="font-semibold">{formatCurrency(item.price_per_kg)}/{item.product.unit}</p>
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-muted-foreground">Total</span>
                                <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                              </div>
                            </div>

                            {item.delivered_quantity_kg > 0 && (
                              <div className="mb-3">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Delivered</span>
                                  <span className="font-medium text-emerald-600">
                                    {item.delivered_quantity_kg} / {item.quantity_kg} {item.product.unit}
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

                            {/* Item status actions */}
                            {nextStatuses.length > 0 && (
                              <div className="flex gap-2 pt-1">
                                {nextStatuses.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleItemStatusChange(item.order_item_id, s)}
                                    disabled={itemStatusLoading === item.order_item_id}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium ${
                                      s === "cancelled"
                                        ? "border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                        : "border-border hover:bg-accent disabled:opacity-50"
                                    }`}
                                  >
                                    {itemStatusLoading === item.order_item_id ? (
                                      <Spinner size="sm" />
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        {ITEM_STATUS_CONFIG[s]?.label ?? s}
                                      </>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Payments Tab ── */}
              {tab === "payments" && (
                <div className="p-6 space-y-3">
                  {!order.payments?.length ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                      <svg className="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
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
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
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

  useEffect(() => { setMounted(true); }, []);

  /**
   * FIX: Single fetchOrders with proper debounce only for search field.
   * Removed the double-useEffect pattern that caused double requests.
   */
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
      console.log("API response:", JSON.stringify(data, null, 2));
      setOrders(data.data.data.orders ?? []);
      setPagination(data.data.pagination);
    } catch (e) {
      toast.error("Failed to fetch orders");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // FIX: Single effect. Debounce only search; fire immediately for everything else.
  useEffect(() => {
    const delay = filters.search ? 400 : 0;
    const timer = setTimeout(fetchOrders, delay);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const handleFilterChange = (k: keyof Filters, v: string) => {
    setPage(1); // Reset to page 1 on filter change
    setFilters(prev => ({ ...prev, [k]: v }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

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
          <div className="flex flex-1 flex-col min-h-0">
            <div className="flex flex-1 flex-col gap-0">
              <div className="flex flex-col gap-5 py-5 md:py-6 px-4 lg:px-6">

                {/* Page header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {pagination?.total > 0
                        ? `${pagination.total.toLocaleString("en-IN")} total orders`
                        : "Manage and track all vendor orders"}
                    </p>
                  </div>
                </div>

                {/* Filters */}
                <OrderFilters
                  filters={filters}
                  onChange={handleFilterChange}
                  onReset={handleReset}
                  total={pagination?.total}
                />

                {/* Table */}
                <OrdersTable
                  orders={orders}
                  loading={loading}
                  onRowClick={o => setSelectedOrderId(o.order_id)}
                  selectedId={selectedOrderId}
                />

                {/* Pagination */}
                {pagination?.total_pages > 1 && (
                  <PaginationBar pagination={pagination} onPageChange={setPage} />
                )}

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Order Drawer */}
      <OrderDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOrderUpdated={fetchOrders}
      />
    </ProtectedRoute>
  );
}