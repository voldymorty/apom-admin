"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconArrowLeft, IconBuildingStore, IconMapPin } from "@tabler/icons-react";
import ProtectedRoute from "../../routes/ProtectedRoute";
import api from "@/app/services/api";

export default function VendorDetailPage() {
  const searchParams = useSearchParams();
  const vendorId = searchParams.get("id") || "";
  const [vendor, setVendor] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState<number | null>(null);
  const [ordersTotalItems, setOrdersTotalItems] = useState<number | null>(null);
  const [ordersLimit] = useState(10);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState<number | null>(null);
  const [paymentsTotalItems, setPaymentsTotalItems] = useState<number | null>(null);
  const [paymentsSummary, setPaymentsSummary] = useState({
    totalSuccessAmount: "--",
    totalFailedCount: "--",
    totalRefundedAmount: "--",
  });
  const [paymentsLimit] = useState(10);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState("");

  useEffect(() => {
    if (!vendorId) return;
    const fetchVendor = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/admin/vendors/${encodeURIComponent(vendorId)}`);
        const payload = res.data;
        const data = payload?.data ?? payload;
        setVendor(data);
      } catch (err: any) {
        const message = err.response?.data?.message || "Failed to fetch vendor profile";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [vendorId]);

  const normalized = useMemo(() => normalizeVendorDetail(vendor, vendorId), [vendor, vendorId]);
  const ordersRows = useMemo(() => orders.map((order, index) => normalizeOrder(order, index)), [orders]);
  const canGoPrevOrders = ordersPage > 1;
  const canGoNextOrders =
    ordersTotalPages ? ordersPage < ordersTotalPages : ordersRows.length === ordersLimit;
  const paymentsRows = useMemo(() => payments.map((payment, index) => normalizePayment(payment, index)), [payments]);
  const canGoPrevPayments = paymentsPage > 1;
  const canGoNextPayments =
    paymentsTotalPages ? paymentsPage < paymentsTotalPages : paymentsRows.length === paymentsLimit;
  const addressesRows = useMemo(() => addresses.map((addr, index) => normalizeAddress(addr, index)), [addresses]);

  useEffect(() => {
    if (!vendorId) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      setOrdersError("");
      try {
        const res = await api.get(`/admin/vendors/${encodeURIComponent(vendorId)}/orders`, {
          params: { page: ordersPage, limit: ordersLimit },
        });
        const payload = res.data;
        const data = payload?.data ?? payload;
        const list = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
        setOrders(list);
        setOrdersTotalPages(toNumber(data?.pagination?.total_pages) ?? null);
        setOrdersTotalItems(toNumber(data?.pagination?.total) ?? null);
      } catch (err: any) {
        const message = err.response?.data?.message || "Failed to fetch vendor orders";
        setOrdersError(message);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [vendorId, ordersPage, ordersLimit]);

  useEffect(() => {
    if (!vendorId) return;
    const fetchPayments = async () => {
      setPaymentsLoading(true);
      setPaymentsError("");
      try {
        const res = await api.get(`/admin/vendors/${encodeURIComponent(vendorId)}/payments`, {
          params: { page: paymentsPage, limit: paymentsLimit },
        });
        const payload = res.data;
        const data = payload?.data ?? payload;
        const list = Array.isArray(data?.payments) ? data.payments : Array.isArray(data) ? data : [];
        setPayments(list);
        setPaymentsTotalPages(toNumber(data?.pagination?.total_pages) ?? null);
        setPaymentsTotalItems(toNumber(data?.pagination?.total) ?? null);
        setPaymentsSummary({
          totalSuccessAmount: formatCurrency(data?.summary?.total_success_amount ?? 0),
          totalFailedCount: formatCount(data?.summary?.total_failed_count ?? 0),
          totalRefundedAmount: formatCurrency(data?.summary?.total_refunded_amount ?? 0),
        });
      } catch (err: any) {
        const message = err.response?.data?.message || "Failed to fetch vendor payments";
        setPaymentsError(message);
      } finally {
        setPaymentsLoading(false);
      }
    };
    fetchPayments();
  }, [vendorId, paymentsPage, paymentsLimit]);

  useEffect(() => {
    if (!vendorId) return;
    const fetchAddresses = async () => {
      setAddressesLoading(true);
      setAddressesError("");
      try {
        const res = await api.get(`/admin/vendors/${encodeURIComponent(vendorId)}/addresses`);
        const payload = res.data;
        const data = payload?.data ?? payload;
        const list = Array.isArray(data?.addresses) ? data.addresses : Array.isArray(data) ? data : [];
        setAddresses(list);
      } catch (err: any) {
        const message = err.response?.data?.message || "Failed to fetch vendor addresses";
        setAddressesError(message);
      } finally {
        setAddressesLoading(false);
      }
    };
    fetchAddresses();
  }, [vendorId]);

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
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">Vendor Details</h1>
                  <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-transparent">
                    ID {normalized.id}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Viewing vendor profile for <span className="font-semibold">{vendorId || "Unknown"}</span>
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/vendor-management" className="gap-2">
                  <IconArrowLeft className="size-4" />
                  Back to Vendors
                </Link>
              </Button>
            </div>

            <Card className="border-none ring-1 ring-border shadow-md bg-white/70 backdrop-blur-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <IconBuildingStore className="size-5 text-primary" />
                  Vendor Profile
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    normalized.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-muted text-muted-foreground border-transparent"
                  }
                >
                  {normalized.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="py-6 text-center text-muted-foreground">Loading vendor...</div>
                ) : error ? (
                  <div className="py-6 text-center text-muted-foreground">{error}</div>
                ) : (
                  <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="grid gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <PhotoBlock label="Vendor Photo" src={normalized.vendorPhoto} alt={`${normalized.shopName} vendor`} />
                        <PhotoBlock label="Shop Photo" src={normalized.shopPhoto} alt={`${normalized.shopName} shop`} />
                      </div>
                      <InfoRow label="Shop Name" value={normalized.shopName} />
                      <InfoRow label="Owner Name" value={normalized.ownerName} />
                      <InfoRow label="Mobile" value={normalized.mobile} />
                     
                      <InfoRow label="Business Type" value={normalized.businessType} />
                      <InfoRow label="GST Number" value={normalized.gstNumber} />
                      <InfoRow label="Address" value={normalized.address} />
                      <InfoRow label="Pincode" value={normalized.pincode} />
                      <InfoRow label="Latitude" value={normalized.latitude} />
                      <InfoRow label="Longitude" value={normalized.longitude} />
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Location</span>
                        <div className="text-sm text-muted-foreground text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <IconMapPin className="size-4 text-primary/60" />
                            <span className="font-semibold text-foreground">S:</span> {normalized.stateName}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">D:</span> {normalized.districtName}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">C:</span> {normalized.cityName}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <StatCard label="Total Orders" value={normalized.totalOrders} />
                      <StatCard label="Total Revenue" value={normalized.totalRevenue} />
                      <StatCard label="Pending Orders" value={normalized.pendingOrders} />
                      <StatCard label="Created At" value={normalized.createdAt} />
                      <StatCard label="Updated At" value={normalized.updatedAt} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-sm font-semibold">Addresses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {addressesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading addresses...</div>
                ) : addressesRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{addressesError || "No addresses found."}</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {addressesRows.map((address) => (
                      <div key={address.id} className="rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{address.label}</p>
                          <div className="flex items-center gap-2">
                            {address.isDefault ? (
                              <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                                Default
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className={
                                address.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-muted text-muted-foreground border-transparent"
                              }
                            >
                              {address.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div>{address.contactPerson} • {address.contactNumber}</div>
                          <div>{address.line1}</div>
                          {address.line2 !== "--" ? <div>{address.line2}</div> : null}
                          {address.landmark !== "--" ? <div>{address.landmark}</div> : null}
                          <div>{address.city}, {address.state} {address.pincode}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-sm font-semibold">Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ordersLoading ? (
                  <div className="text-sm text-muted-foreground">Loading orders...</div>
                ) : ordersRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{ordersError || "No orders found."}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 font-medium border-b border-border">
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        {/* <TableHead>Items</TableHead> */}
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersRows.map((order) => (
                        <TableRow key={order.id} className="border-b border-border last:border-0">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{order.orderNumber}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {order.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.orderStatus}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{order.paymentStatus}</TableCell>
                          {/* <TableCell className="text-sm text-muted-foreground">{order.itemsCount}</TableCell> */}
                          <TableCell className="text-right font-semibold text-foreground">{order.finalAmount}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{order.orderDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    Page <span className="font-semibold text-foreground">{ordersPage}</span>
                    {ordersTotalPages ? ` of ${ordersTotalPages}` : ""}
                    {ordersTotalItems !== null ? ` | ${ordersTotalItems} total` : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canGoPrevOrders}
                      onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canGoNextOrders}
                      onClick={() => setOrdersPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="text-sm font-semibold">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Total Success Amount" value={paymentsSummary.totalSuccessAmount} />
                  <StatCard label="Total Failed Count" value={paymentsSummary.totalFailedCount} />
                  <StatCard label="Total Refunded Amount" value={paymentsSummary.totalRefundedAmount} />
                </div>
                {paymentsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading payments...</div>
                ) : paymentsRows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{paymentsError || "No payments found."}</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50 font-medium border-b border-border">
                        <TableHead>Payment</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsRows.map((payment) => (
                        <TableRow key={payment.id} className="border-b border-border last:border-0">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">{payment.id}</span>
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {payment.transactionLabel}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{payment.method}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{payment.status}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{payment.orderLabel}</TableCell>
                          <TableCell className="text-right font-semibold text-foreground">{payment.amount}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{payment.transactionDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    Page <span className="font-semibold text-foreground">{paymentsPage}</span>
                    {paymentsTotalPages ? ` of ${paymentsTotalPages}` : ""}
                    {paymentsTotalItems !== null ? ` | ${paymentsTotalItems} total` : ""}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canGoPrevPayments}
                      onClick={() => setPaymentsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canGoNextPayments}
                      onClick={() => setPaymentsPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right break-words">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-muted/30 via-background to-emerald-50/40 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function PhotoBlock({ label, src, alt }: { label: string; src: string; alt: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="h-24 w-24 overflow-hidden rounded-xl border bg-muted/30">
        {src !== "--" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground">
            No Photo
          </div>
        )}
      </div>
    </div>
  );
}

function normalizeVendorDetail(raw: any, fallbackId: string) {
  const id = raw?.vendor_id ?? raw?.id ?? raw?.vendorId ?? (fallbackId || "--");
  const shopName = raw?.shop_name ?? raw?.vendor_name ?? raw?.name ?? "Unnamed Vendor";
  const ownerName = raw?.owner_name ?? raw?.manager_name ?? raw?.ownerName ?? "--";
  const mobile = raw?.user?.mobile_number ?? raw?.mobile_number ?? raw?.mobile ?? "--";
  const email = raw?.user?.email ?? raw?.email ?? "--";
  const businessType = raw?.business_type ?? raw?.type ?? "--";
  const gstNumber = raw?.gst_number ?? "--";
  const vendorPhoto = raw?.vendor_photo_url ?? "--";
  const shopPhoto = raw?.shop_photo_url ?? "--";
  const pincode = raw?.pincode ?? "--";
  const latitude = raw?.latitude ?? "--";
  const longitude = raw?.longitude ?? "--";

  const city =
    raw?.city_info?.city_name ??
    raw?.city?.city_name ??
    raw?.city_name ??
    raw?.city ??
    "";
  const district =
    raw?.district_info?.district_name ??
    raw?.district?.district_name ??
    raw?.district_name ??
    raw?.district ??
    "";
  const state =
    raw?.state_info?.state_name ??
    raw?.state?.state_name ??
    raw?.state_name ??
    raw?.state ??
    "";

  const address = raw?.primary_address ?? raw?.address ?? "--";
  const totalOrders = formatNumber(raw?.stats?.total_orders ?? raw?.total_orders ?? raw?.orders ?? 0);
  const totalRevenue = formatNumber(raw?.stats?.total_revenue ?? raw?.total_revenue ?? 0);
  const pendingOrders = formatNumber(raw?.stats?.pending_orders ?? raw?.pending_orders ?? 0);
  const createdAt = formatDateTime(raw?.created_at);
  const updatedAt = formatDateTime(raw?.updated_at);

  let isActive = true;
  if (typeof raw?.user?.is_active === "boolean") {
    isActive = raw.user.is_active;
  } else if (typeof raw?.is_active === "boolean") {
    isActive = raw.is_active;
  } else if (typeof raw?.status === "string") {
    isActive = raw.status.toLowerCase() === "active";
  }

  return {
    id: String(id),
    shopName: formatValue(shopName),
    ownerName: formatValue(ownerName),
    mobile: formatValue(mobile),
    email: formatValue(email),
    businessType: formatValue(businessType),
    gstNumber: formatValue(gstNumber),
    vendorPhoto: formatValue(vendorPhoto),
    shopPhoto: formatValue(shopPhoto),
    address: formatValue(address),
    stateName: formatValue(state || "--"),
    districtName: formatValue(district || "--"),
    cityName: formatValue(city || "--"),
    pincode: formatValue(pincode),
    latitude: formatValue(latitude),
    longitude: formatValue(longitude),
    totalOrders,
    totalRevenue,
    pendingOrders,
    createdAt,
    updatedAt,
    isActive,
  };
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === "") return "--";
  return String(value);
}

function formatDateTime(value: any) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN");
}

function formatNumber(value: any) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString("en-IN");
}

function normalizeOrder(raw: any, index: number) {
  const id = raw?.order_id ?? raw?.id ?? `order-${index + 1}`;
  const orderNumber = raw?.order_number ?? raw?.orderNumber ?? "--";
  const orderStatus = formatValue(raw?.order_status ?? raw?.status ?? "--");
  const paymentStatus = formatValue(raw?.payment_status ?? raw?.paymentStatus ?? "--");
  const finalAmount = formatCurrency(raw?.final_amount ?? raw?.finalAmount ?? 0);
  const orderDate = formatDateTime(raw?.order_date ?? raw?.created_at ?? raw?.createdAt);
  const itemsCount = Array.isArray(raw?.order_items) ? raw.order_items.length : raw?.items_count ?? "--";

  return {
    id: String(id),
    orderNumber: formatValue(orderNumber),
    orderStatus,
    paymentStatus,
    finalAmount,
    orderDate,
    itemsCount: String(itemsCount),
  };
}

function formatCurrency(value: any) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "--";
  return `Rs ${numeric.toLocaleString("en-IN")}`;
}

function formatCount(value: any) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString("en-IN");
}

function normalizePayment(raw: any, index: number) {
  const id = raw?.payment_id ?? raw?.id ?? `payment-${index + 1}`;
  const method = formatValue(raw?.payment_method ?? raw?.method ?? "--");
  const status = formatValue(raw?.payment_status ?? raw?.status ?? "--");
  const amount = formatCurrency(raw?.amount ?? raw?.total_amount ?? 0);
  const transactionDate = formatDateTime(raw?.transaction_date ?? raw?.created_at ?? raw?.createdAt);
  const orderLabel =
    raw?.order?.order_number ??
    raw?.order?.orderNumber ??
    raw?.order_id ??
    raw?.orderId ??
    "--";

  return {
    id: String(id),
    method,
    status,
    amount,
    transactionDate,
    orderLabel: formatValue(orderLabel),
    transactionLabel: formatValue(raw?.transaction_reference ?? raw?.reference ?? "--"),
  };
}

function normalizeAddress(raw: any, index: number) {
  return {
    id: String(raw?.address_id ?? raw?.id ?? `addr-${index + 1}`),
    label: formatValue(raw?.address_label ?? `Address ${index + 1}`),
    contactPerson: formatValue(raw?.contact_person ?? raw?.contactPerson ?? "--"),
    contactNumber: formatValue(raw?.contact_number ?? raw?.contactNumber ?? "--"),
    line1: formatValue(raw?.address_line1 ?? raw?.line1 ?? "--"),
    line2: formatValue(raw?.address_line2 ?? raw?.line2 ?? "--"),
    landmark: formatValue(raw?.landmark ?? "--"),
    city: formatValue(raw?.city ?? "--"),
    state: formatValue(raw?.state ?? "--"),
    pincode: formatValue(raw?.pincode ?? "--"),
    isDefault: Boolean(raw?.is_default ?? raw?.isDefault ?? false),
    isActive: raw?.is_active !== undefined ? Boolean(raw?.is_active) : true,
  };
}

function toNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
