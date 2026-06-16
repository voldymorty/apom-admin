"use client";

import { useEffect, useMemo, useState } from "react";
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
  IconFilter,
  IconEye,
  IconPower,
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmationState {
  type: "activate" | "deactivate" | "delete" | null;
  farmer: { id: string; name: string; isActive: boolean } | null;
}

export default function FarmerManagement() {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [sortBy] = useState("created_at");
  const [order] = useState<"asc" | "desc">("desc");


  console.log(farmers);

  // Confirmation dialog state
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    type: null,
    farmer: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const fetchFarmers = async () => {
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

      const res = await api.get("/admin/farmers", { params });
      const payload = res.data;

      const extractedFarmers = extractFarmers(payload);
      setFarmers(extractedFarmers);

      const meta = extractPagination(payload);
      setTotalItems(meta.totalItems);
      setTotalPages(meta.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to fetch farmers";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, page, limit, sortBy, order]);

  const tableFarmers = useMemo(
    () => farmers.map((farmer, index) => normalizeFarmer(farmer, index)),
    [farmers]
  );

  const canGoPrev = page > 1;
  const canGoNext = totalPages ? page < totalPages : tableFarmers.length === limit;

  const activeOnPage = useMemo(
    () => tableFarmers.filter((f) => f.isActive).length,
    [tableFarmers]
  );
  const inactiveOnPage = Math.max(0, tableFarmers.length - activeOnPage);

  const filterLabel =
    statusFilter === "all"
      ? "All Farmers"
      : statusFilter === "active"
      ? "Active Only"
      : "Inactive Only";

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleStatusFilterChange = (value: "all" | "active" | "inactive") => {
    setStatusFilter(value);
    setPage(1);
  };

  // Open confirmation dialog
  const handleToggleStatusClick = (farmer: {
    id: string;
    name: string;
    isActive: boolean;
  }) => {
    setConfirmation({
      type: farmer.isActive ? "deactivate" : "activate",
      farmer,
    });
  };

  // Handle confirmed action
  const handleConfirm = async () => {
    if (!confirmation.farmer || !confirmation.type) return;

    setIsProcessing(true);
    const farmer = confirmation.farmer;
    const type = confirmation.type;

    try {
      if (type === "activate" || type === "deactivate") {
        const endpoint =
          type === "activate"
        ? `/admin/farmers/${encodeURIComponent(farmer.id)}/activate`
        : `/admin/farmers/${encodeURIComponent(farmer.id)}/deactivate`;
        
      await api.patch(endpoint);
        toast.success(
          type === "activate" ? "Farmer Activated" : "Farmer Deactivated",
          {
            description: `${farmer.name} has been ${type === "activate" ? "activated" : "deactivated"}.`,
          }
        );
      } else if (type === "delete") {
        await api.delete(`/admin/farmers/${encodeURIComponent(farmer.id)}`);
        toast.success("Farmer Deleted", {
          description: `${farmer.name} has been permanently deleted.`,
        });
      }

      setConfirmation({ type: null, farmer: null });
      await fetchFarmers();
    } catch (err: any) {
      const message = err.response?.data?.message || `Failed to ${type} farmer`;
      toast.error("Error", { description: message });
    } finally {
      setIsProcessing(false);
    }
  };
const exportFarmersToExcel = () => {
  if (!farmers?.length) return;

  const excelData = farmers.map((farmer: any, index: number) => ({
    "S.No": index + 1,

    "Farmer Name": farmer.full_name ?? "-",

    Mobile: farmer.mobile_number ?? "-",

    Address: farmer.location_address ?? "-",

    State: farmer.state?.state_name ?? "-",

    District: farmer.district?.district_name ?? "-",

    City: farmer.city?.city_name ?? "-",

    Pincode:
      farmer.location_address?.match(/\b\d{6}\b/)?.[0] ?? "-",

    "Total Land":
      `${farmer.total_land ?? 0} ${farmer.land_unit ?? ""}`,

    "Total Earnings": farmer.total_earnings ?? "0.00",

    "Total Supplies": farmer.total_supplies ?? 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },   // S.No
    { wch: 25 },  // Farmer
    { wch: 18 },  // Mobile
    { wch: 45 },  // Address
    { wch: 18 },  // State
    { wch: 20 },  // District
    { wch: 18 },  // City
    { wch: 12 },  // Pincode
    { wch: 15 },  // Total Land
    { wch: 18 },  // Earnings
    { wch: 15 },  // Supplies
  ];

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Farmers Report"
  );

  XLSX.writeFile(
    workbook,
    `farmers_report_${
      new Date().toISOString().split("T")[0]
    }.xlsx`
  );
    toast.success(`Exported ${farmers.length} farmer records`);
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
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Farmer Management
                </h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                  Manage your network of farmers and their performance.
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard
                label="Total Registered"
                value={totalItems !== null ? String(totalItems) : "--"}
                helper="All farmers"
              />
              <SummaryCard
                label="Active (Page)"
                value={String(activeOnPage)}
                helper="Visible now"
                tone="success"
              />
              <SummaryCard
                label="Inactive (Page)"
                value={String(inactiveOnPage)}
                helper="Visible now"
                tone="warning"
              />
              <SummaryCard
                label="Filter"
                value={filterLabel}
                helper={`Showing ${tableFarmers.length}`}
                tone="primary"
              />
            </div>

            {/* Table Card */}
            <Card className="overflow-hidden border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
              {/* Toolbar */}
              <div className="flex flex-col gap-4 p-2 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                <div className="relative w-full md:w-96">
                  <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, state, district, city..."
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
                        <IconFilter className="mr-2 size-4" />
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
                     exportFarmersToExcel
                    }
                  >
                  Export
                </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 font-medium border-b border-border">
                      <TableHead className="w-[70px] px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        S.No
                      </TableHead>
                      <TableHead className="w-[200px] px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Farmer
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
                        Land Size
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Total Earnings
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Status
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
                          colSpan={9}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Loading farmers...
                        </TableCell>
                      </TableRow>
                    ) : tableFarmers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="py-10 text-center text-muted-foreground"
                        >
                          {error || "No farmers found matching your criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableFarmers.map((farmer, index) => {
                        const serialNumber = (page - 1) * limit + index + 1;
                        return (
                          <TableRow
                            key={farmer.id}
                            className="group hover:bg-primary/5 transition-colors border-b border-border last:border-0"
                          >
                            <TableCell className="px-4 py-3 align-middle font-medium text-muted-foreground">
                              {serialNumber}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                  {farmer.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {farmer.mobile}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                              {farmer.state}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                              {farmer.district}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground">
                              {farmer.city}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-medium text-muted-foreground">
                              {farmer.landSize}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle font-semibold text-emerald-600 dark:text-emerald-400">
                              {farmer.earnings}
                            </TableCell>
                            <TableCell className="px-4 py-3 align-middle">
                              <Badge
                                variant="default"
                                className={
                                  farmer.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200"
                                    : "bg-muted text-muted-foreground border-transparent"
                                }
                              >
                                {farmer.status}
                              </Badge>
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
                                    href={`/farmer-management/farmer_detail_page?id=${encodeURIComponent(farmer.id)}`}
                                  >
                                    <IconEye className="size-4" />
                                    <span className="sr-only">View farmer</span>
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={
                                    farmer.isActive
                                      ? "border-amber-200 text-amber-700 hover:bg-red-800"
                                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-800"
                                  }
                                  onClick={() => handleToggleStatusClick(farmer)}
                                  disabled={isProcessing}
                                  title={
                                    farmer.isActive
                                      ? "Deactivate farmer"
                                      : "Activate farmer"
                                  }
                                >
                                  <IconPower className="mr-1.5 size-3.5" />
                                  {isProcessing && confirmation.farmer?.id === farmer.id
                                    ? "Updating..."
                                    : farmer.isActive
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

              {/* Pagination */}
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
                    disabled={!canGoPrev || loading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white dark:bg-card hover:border-primary/50"
                    disabled={!canGoNext || loading}
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
                      setLimit((prev) => (prev === 20 ? 50 : 20));
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

      {/* ─── Confirmation Dialog ─── */}
      <Dialog
        open={confirmation.type !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation({ type: null, farmer: null });
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {/* {confirmation.type === "deactivate" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <IconAlertCircle className="size-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <IconPower className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
              )} */}
              <DialogTitle className={confirmation.type === "deactivate" ? "text-red-600" : "text-green-600"}>
                {confirmation.type === "activate"
                  ? "Activate Farmer"
                  : confirmation.type === "deactivate"
                  ? "Deactivate Farmer"
                  : "Delete Farmer"}
              </DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              {confirmation.type === "activate" ? (
                <>
                  Are you sure you want to <span className="font-semibold">activate</span> this farmer?
                  <br />
                  <span className="font-semibold text-foreground">
                    {confirmation.farmer?.name}
                  </span>
                  <br />
                  <span>They will be able to access their account and perform transactions.</span>
                </>
              ) : confirmation.type === "deactivate" ? (
                <>
                  Are you sure you want to <span className="font-semibold">deactivate</span> this farmer?
                  <br />
                  <span className="font-semibold text-foreground">
                    {confirmation.farmer?.name }
                  </span>
                  <br/>
                  <span>They will not be able to access their account.</span>
                  
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete this farmer?
                  <br />
                  <span className="font-semibold text-foreground">
                    {confirmation.farmer?.name}
                  </span>
                  <br />
                  <span className="text-red-600 dark:text-red-400">
                    This action cannot be undone.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmation({ type: null, farmer: null })}
              disabled={isProcessing}
            >
              <IconX className="mr-2 size-4" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={
                confirmation.type === "deactivate"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              <IconCheck className="mr-2 size-4" />
              {isProcessing
                ? "Processing..."
                : confirmation.type === "activate"
                ? "Activate"
                : confirmation.type === "deactivate"
                ? "Deactivate"
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "success" | "warning" | "primary";
}) {
  const toneStyles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50/70 text-amber-700"
      : tone === "primary"
      ? "border-primary/20 bg-primary/5 text-primary"
      : "border-border bg-card text-foreground";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneStyles}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function extractFarmers(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload.farmers,
    payload.data?.farmers,
    payload.data,
    payload.items,
    payload.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  const key = Object.keys(payload).find((k) => Array.isArray(payload[k]));
  if (key) return payload[key];
  if (payload.data && typeof payload.data === "object") {
    const nested = Object.keys(payload.data).find((k) =>
      Array.isArray(payload.data[k])
    );
    if (nested) return payload.data[nested];
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
    null;

  const limit =
    toNumber(meta?.limit) ?? toNumber(meta?.per_page) ?? null;

  const totalPages =
    toNumber(meta?.total_pages) ??
    toNumber(meta?.totalPages) ??
    (total !== null && limit ? Math.ceil(total / limit) : null);

  return { totalItems: total, totalPages };
}

function normalizeFarmer(raw: any, index = 0) {
  const id =
    raw?.farmer_id ??
    raw?.id ??
    raw?.farmerId ??
    raw?.uuid ??
    `row-${index + 1}`;

  const name = raw?.full_name ?? raw?.name ?? raw?.farmer_name ?? "Unnamed Farmer";
  const mobile = raw?.mobile_number ?? raw?.mobile ?? raw?.phone ?? "--";

  const state =
    raw?.state?.state_name ?? raw?.state_name ?? raw?.state ?? "--";
  const district =
    raw?.district?.district_name ?? raw?.district_name ?? raw?.district ?? "--";
  const city =
    raw?.city?.city_name ?? raw?.city_name ?? raw?.city ?? "--";

  const landValue = raw?.total_land ?? raw?.land_size ?? raw?.land_area ?? null;
  const landUnit = raw?.land_unit ?? raw?.landUnit ?? "Acres";
  const landSize =
    landValue === null || landValue === undefined
      ? "--"
      : `${landValue} ${landUnit}`;

  const earningsValue = raw?.total_earnings ?? raw?.earnings ?? null;
  const earnings = formatRupees(earningsValue);

  let isActive = true;
  if (typeof raw?.is_active === "boolean") {
    isActive = raw.is_active;
  } else if (typeof raw?.status === "string") {
    isActive = raw.status.toLowerCase() === "active";
  }

  return {
    id: String(id),
    name,
    mobile: mobile !== null && mobile !== undefined ? String(mobile) : "--",
    state,
    district,
    city,
    landSize,
    earnings,
    isActive,
    status: isActive ? "Active" : "Inactive",
  };
}

function formatRupees(value: any) {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = toNumber(value);
  if (numeric === null) return String(value);
  return `Rs ${numeric.toLocaleString("en-IN")}`;
}

function toNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}