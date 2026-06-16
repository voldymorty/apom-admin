"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconBuildingStore,
  IconBox,
  IconTrendingUp,
  IconEye,
  IconPower,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
// ── ADDED: Dialog imports for activate / deactivate confirmation ──
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import { saveAs } from "file-saver";
export default function VendorManagement() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [sortBy] = useState("created_at");
  const [order] = useState<"asc" | "desc">("desc");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);



  // ── ADDED: status toggle confirmation dialog state ──
  const [statusTarget, setStatusTarget] = useState<{
    id: string;
    shopName: string;
    isActive: boolean;
  } | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number | boolean> = {
        page,
        limit,
        sort_by: sortBy,
        order,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.is_active = statusFilter === "active";

      const res = await api.get("/admin/vendors", { params });
      const payload = res.data;

      const extractedVendors = extractVendors(payload);
      setVendors(extractedVendors);

      const meta = extractPagination(payload);
      setTotalItems(meta.totalItems);
      setTotalPages(meta.totalPages);

      if (extractedVendors.length === 0) {
        console.warn("Vendor list is empty. Check API response structure.");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to fetch vendors";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [debouncedSearch, statusFilter, page, limit, sortBy, order]);

  const tableVendors = useMemo(
    () => vendors.map((vendor, index) => normalizeVendor(vendor, index)),
    [vendors]
  );

  const filteredVendors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tableVendors.filter((vendor) => {
      if (statusFilter !== "all" && vendor.isActive !== (statusFilter === "active"))
        return false;
      if (!term) return true;
      return (
        vendor.shopName.toLowerCase().includes(term) ||
        vendor.ownerName.toLowerCase().includes(term) ||
        vendor.location.toLowerCase().includes(term) ||
        vendor.stateName.toLowerCase().includes(term) ||
        vendor.districtName.toLowerCase().includes(term) ||
        vendor.cityName.toLowerCase().includes(term) ||
        vendor.type.toLowerCase().includes(term)
      );
    });
  }, [tableVendors, search, statusFilter]);

  const canGoPrev = page > 1;
  const canGoNext = totalPages ? page < totalPages : vendors.length === limit;
  const activeOnPage = useMemo(
    () => filteredVendors.filter((vendor) => vendor.isActive).length,
    [filteredVendors]
  );
  const inactiveOnPage = Math.max(0, filteredVendors.length - activeOnPage);
  const totalOrdersOnPage = useMemo(
    () =>
      filteredVendors.reduce((sum, vendor) => sum + (vendor.totalOrders ?? 0), 0),
    [filteredVendors]
  );
  const totalVendorsLabel =
    totalItems !== null
      ? totalItems.toLocaleString("en-IN")
      : String(tableVendors.length);
  const ordersLabel = totalOrdersOnPage.toLocaleString("en-IN");

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Vendor partner added successfully!", {
      description: "Fresh Mart has been onboarded to the platform.",
    });
    setIsAddOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: "all" | "active" | "inactive") => {
    setStatusFilter(value);
    setPage(1);
  };

  // ── CHANGED: opens the confirmation dialog instead of window.confirm ──
  const handleToggleStatus = (vendor: {
    id: string;
    shopName: string;
    isActive: boolean;
  }) => {
    setStatusTarget(vendor);
  };

  // ── ADDED: executes the API call after user confirms in the dialog ──
  const confirmToggleStatus = async () => {
    if (!statusTarget || isTogglingStatus) return;
    const nextActive = !statusTarget.isActive;
    setIsTogglingStatus(true);
    setStatusUpdatingId(statusTarget.id);
    try {
      const endpoint = nextActive
        ? `/admin/vendors/${encodeURIComponent(statusTarget.id)}/activate`
        : `/admin/vendors/${encodeURIComponent(statusTarget.id)}/deactivate`;
      await api.patch(endpoint);
      toast.success(nextActive ? "Vendor Activated" : "Vendor Deactivated", {
        description: `${statusTarget.shopName} has been ${
          nextActive ? "activated" : "deactivated"
        }.`,
      });
      setStatusTarget(null);
      await fetchVendors();
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to update vendor status";
      toast.error("Error", { description: message });
    } finally {
      setIsTogglingStatus(false);
      setStatusUpdatingId(null);
    }
  };

  const exportToExcel = () => {
  if (!vendors?.length) return;

  const excelData = vendors.map((vendor: any, index: number) => ({
    "S.No": index + 1,

    "Vendor Shop Name": vendor.shop_name ?? "-",

    Manager: vendor.owner_name ?? "-",

    State: vendor.state_info?.state_name ?? "-",

    District: vendor.district_info?.district_name ?? "-",

    City: vendor.city_info?.city_name ?? "-",

    Type: vendor.business_type ?? "-",

    Status: vendor.user?.is_active ? "Active" : "Inactive",

    Orders: vendor.total_orders ?? 0,

    "Phone Number": vendor.user?.mobile_number ?? "-",

    "GST Number": vendor.gst_number ?? "-",

    "Primary Address": vendor.primary_address ?? "-",

    Pincode: vendor.pincode ?? "-",

    "Created At": vendor.created_at
      ? new Date(vendor.created_at).toLocaleString()
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },   // S.No
    { wch: 30 },  // Shop
    { wch: 22 },  // Manager
    { wch: 18 },  // State
    { wch: 20 },  // District
    { wch: 18 },  // City
    { wch: 15 },  // Type
    { wch: 15 },  // Status
    { wch: 12 },  // Orders
    { wch: 18 },  // Phone
    { wch: 20 },  // GST
    { wch: 45 },  // Address
    { wch: 14 },  // Pincode
    { wch: 22 },  // Created
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Vendor Report"
  );

  XLSX.writeFile(
    workbook,
    `vendor_report_${new Date()
      .toISOString()
      .split("T")[0]}.xlsx`
  );
    toast.success(`Exported ${vendors.length} vendor records`);
};

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-black">
                  Vendor Management
                </h1>
              <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                Manage retail partners, wholesalers, and their market activities.
              </p>
            </div>            
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Card className="bg-white dark:bg-card border-none ring-1 ring-border shadow-sm transition-all hover:shadow-md hover:ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Vendors
                </CardTitle>
                <IconBuildingStore className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVendorsLabel}</div>
                <p className="text-xs text-muted-foreground">All registered vendors</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card border-none ring-1 ring-border shadow-sm transition-all hover:shadow-md hover:ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active (Page)
                </CardTitle>
                <IconBox className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeOnPage}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card border-none ring-1 ring-border shadow-sm transition-all hover:shadow-md hover:ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inactive (Page)
                </CardTitle>
                <IconTrendingUp className="size-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inactiveOnPage}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card border-none ring-1 ring-border shadow-sm transition-all hover:shadow-md hover:ring-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Orders (Page)
                </CardTitle>
                <div className="text-xs font-bold text-yellow-600">All statuses</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 underline underline-offset-4 decoration-yellow-200">
                  {ordersLabel}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border">
            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
              <div className="relative w-full md:w-96">
                <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vendor name, manager..."
                  className="pl-9 bg-white dark:bg-card focus-visible:ring-primary"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-white dark:bg-card hover:border-primary/50"
                      >
                        <IconFilter className="mr-2 size-4" />{" "}
                        {statusFilter === "all"
                          ? "Filter"
                          : statusFilter === "active"
                          ? "Active"
                          : "Inactive"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleStatusFilterChange("all")}
                      >
                        All Status
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusFilterChange("active")}
                      >
                        Active Only
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleStatusFilterChange("inactive")}
                      >
                        Inactive Only
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-card hover:border-primary/50"
                    onClick={
                     exportToExcel
                    }
                  >
                  Export
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 font-medium border-b border-border">
                      <TableHead className="w-[70px] px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        S.No
                      </TableHead>
                      <TableHead className="w-[200px] px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Vendor Shop Name
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Manager
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        State
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        District
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        City
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Type
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Orders
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                        Actions
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                        <TableCell
                          colSpan={10}
                          className="py-10 text-center text-muted-foreground"
                        >
                        Loading vendors...
                      </TableCell>
                    </TableRow>
                  ) : filteredVendors.length === 0 ? (
                    <TableRow>
                        <TableCell
                          colSpan={10}
                          className="py-10 text-center text-muted-foreground"
                        >
                        {error || "No vendors found matching your criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVendors.map((vendor, index) => {
                      const serialNumber = (page - 1) * limit + index + 1;
                      return (
                          <TableRow
                            key={vendor.id}
                            className="group hover:bg-primary/5 transition-colors border-b border-border last:border-0"
                          >
                          <TableCell className="px-4 py-3 align-middle font-medium text-muted-foreground">
                            {serialNumber}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {vendor.shopName}
                              </span>
                              {/* <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                {vendor.id}
                              </span> */}
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-sm font-medium text-muted-foreground">
                            {vendor.ownerName}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                            {vendor.stateName}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                            {vendor.districtName}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                            {vendor.cityName}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 border-blue-200 text-[10px] font-bold uppercase py-0.5"
                              >
                              {vendor.type}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle">
                            <Badge
                              variant="default"
                              className={
                                vendor.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 "
                                  : "bg-amber-500/10 text-amber-600 border-amber-200"
                              }
                            >
                              {vendor.status}
                            </Badge>
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-right font-bold text-foreground">
                            {vendor.totalOrders}
                          </TableCell>

                          <TableCell className="px-4 py-3 align-middle text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                              >
                                  <Link
                                    href={`/vendor-management/vendor_detail_page?id=${encodeURIComponent(
                                      vendor.id
                                    )}`}
                                  >
                                  <IconEye className="size-4" />
                                  <span className="sr-only">View vendor</span>
                                </Link>
                              </Button>
                                {/* ── UNCHANGED: button now opens dialog instead of window.confirm ── */}
                              <Button
                                size="sm"
                                variant="outline"
                                className={
                                  vendor.isActive
                                      ? "border-amber-200 text-amber-700 hover:bg-red-500"
                                      : "border-emerald-200 text-emerald-700 hover:bg-green-500"
                                }
                                onClick={() => handleToggleStatus(vendor)}
                                disabled={statusUpdatingId === vendor.id}
                                  title={
                                    vendor.isActive
                                      ? "Deactivate vendor"
                                      : "Activate vendor"
                                  }
                              >
                                <IconPower className="mr-1.5 size-3.5" />
                                  {statusUpdatingId === vendor.id
                                    ? "Updating..."
                                    : vendor.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-semibold text-foreground">{page}</span>
                {totalPages ? ` of ${totalPages}` : ""}
                {totalItems !== null ? ` | ${totalItems} total` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-card hover:border-primary/50"
                  disabled={!canGoPrev}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-card hover:border-primary/50"
                  disabled={!canGoNext}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white dark:bg-card hover:border-primary/50"
                  onClick={() => {
                    setPage(1);
                      setLimit((prev) =>
                        prev === 10 ? 20 : prev === 20 ? 50 : 10
                      );
                  }}
                >
                  Limit: {limit}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>

      {/* ── ADDED: Deactivate Confirmation Dialog ── */}
      <Dialog
        open={!!statusTarget && statusTarget.isActive}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-amber-600">
              Deactivate Vendor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-foreground">
                {statusTarget?.shopName}
              </span>
              ? They will no longer be able to place orders on the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusTarget(null)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmToggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? "Deactivating..." : "Yes, Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADDED: Activate Confirmation Dialog ── */}
      <Dialog
        open={!!statusTarget && !statusTarget.isActive}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-emerald-600">
              Activate Vendor
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to activate{" "}
              <span className="font-semibold text-foreground">
                {statusTarget?.shopName}
              </span>
              ? They will regain full access and can place orders on the
              platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusTarget(null)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={confirmToggleStatus}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus ? "Activating..." : "Yes, Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

// ─── Helpers (unchanged) ──────────────────────────────────────────────────────

function extractVendors(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const directCandidates = [
    payload.vendors,
    payload.data?.vendors,
    payload.data,
    payload.items,
    payload.results,
  ];

  for (const candidate of directCandidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  const firstArrayKey = Object.keys(payload).find((key) =>
    Array.isArray(payload[key])
  );
  if (firstArrayKey) return payload[firstArrayKey];

  if (payload.data && typeof payload.data === "object") {
    const nestedArrayKey = Object.keys(payload.data).find((key) =>
      Array.isArray(payload.data[key])
    );
    if (nestedArrayKey) return payload.data[nestedArrayKey];
  }

  return [];
}

function extractPagination(payload: any): {
  totalItems: number | null;
  totalPages: number | null;
} {
  const meta =
    payload?.pagination ||
    payload?.meta ||
    payload?.data?.pagination ||
    payload?.data?.meta ||
    payload?.data;

  const total =
    toNumber(meta?.total) ??
    toNumber(meta?.total_items) ??
    toNumber(meta?.count) ??
    toNumber(payload?.total) ??
    toNumber(payload?.count) ??
    null;

  const limit =
    toNumber(meta?.limit) ??
    toNumber(meta?.per_page) ??
    toNumber(meta?.pageSize) ??
    null;

  const totalPages =
    toNumber(meta?.total_pages) ??
    toNumber(meta?.totalPages) ??
    (total !== null && limit ? Math.ceil(total / limit) : null);

  return { totalItems: total, totalPages };
}

function normalizeVendor(raw: any, index = 0) {
  const id =
    raw?.vendor_id ??
    raw?.id ??
    raw?.vendorId ??
    raw?.code ??
    raw?.user_id ??
    `row-${index + 1}`;

  const shopName =
    raw?.shop_name ??
    raw?.vendor_name ??
    raw?.name ??
    raw?.shopName ??
    "Unnamed Vendor";

  const ownerName =
    raw?.owner_name ??
    raw?.manager_name ??
    raw?.ownerName ??
    raw?.contact_name ??
    raw?.user?.name ??
    "--";

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
  const structuredLocation = [city, district, state].filter(Boolean).join(", ");
  const location = structuredLocation || raw?.primary_address || "--";
  const cityName = city || "--";
  const districtName = district || "--";
  const stateName = state || "--";

  const type = raw?.business_type ?? raw?.type ?? raw?.category ?? "Unspecified";

  let isActive = true;
  if (typeof raw?.user?.is_active === "boolean") {
    isActive = raw.user.is_active;
  } else if (typeof raw?.is_active === "boolean") {
    isActive = raw.is_active;
  } else if (typeof raw?.status === "string") {
    isActive = raw.status.toLowerCase() === "active";
  } else if (typeof raw?.user?.is_verified === "boolean") {
    isActive = raw.user.is_verified;
  }
  const status = isActive ? "Active" : "Inactive";

  const totalOrders =
    toNumber(raw?.total_orders) ??
    toNumber(raw?.orders) ??
    toNumber(raw?.order_count) ??
    0;

  return {
    id: String(id),
    shopName,
    ownerName,
    location,
    stateName,
    districtName,
    cityName,
    type,
    status,
    isActive,
    totalOrders,
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
