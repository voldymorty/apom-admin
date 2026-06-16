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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconSearch,
  IconPlus,
  IconDotsVertical,
  IconTruckDelivery,
  IconUserCheck,
  IconRoute,
  IconClock,
  IconFilter,
  IconTrash,
} from "@tabler/icons-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import ProtectedRoute from "../routes/ProtectedRoute";
import api from "@/app/services/api";
import Link from "next/link";
import * as XLSX from "xlsx";
// ─── Types ───────────────────────────────────────────────────────────────────

interface AddFormState {
  full_name: string;
  email: string;
  mobile_number: string;
  password: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  license_expiry_date: string;
}

interface FilterState {
  vehicle_type: string;
  is_available: string;
  is_active: string;
  sort_by: string;
  order: string;
}

interface NormalizedPerson {
  id: string;
  apiId: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  vehicleNumber: string;
  status: string;
  isActive: boolean;
  isVerified: boolean;
  totalDeliveries: number;
  completedDeliveries: number;
  rating: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_ADD_FORM: AddFormState = {
  full_name: "",
  email: "",
  mobile_number: "",
  password: "",
  vehicle_type: "bike",
  vehicle_number: "",
  license_number: "",
  license_expiry_date: "",
};

const INITIAL_FILTERS: FilterState = {
  vehicle_type: "all",
  is_available: "all",
  is_active: "all",
  sort_by: "created_at",
  order: "desc",
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAddForm(form: AddFormState): string | null {
  if (!form.full_name.trim()) return "Full name is required.";
  if (!form.mobile_number.trim()) return "Mobile number is required.";
  if (!/^[6-9]\d{9}$/.test(form.mobile_number.trim()))
    return "Enter a valid 10-digit Indian mobile number.";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    return "Enter a valid email address.";
  if (!form.password) return "Password is required.";
  if (form.password.length < 8) return "Password must be at least 8 characters.";
  if (!form.vehicle_number.trim()) return "Vehicle number is required.";
  if (!form.license_number.trim()) return "License number is required.";
  if (!form.license_expiry_date) return "License expiry date is required.";
  const expiry = new Date(form.license_expiry_date);
  if (expiry <= new Date()) return "License expiry date must be in the future.";
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmployeeLogisticsManagement() {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Add employee
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(INITIAL_ADD_FORM);
  const [addError, setAddError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; apiId: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle — NEW: dialog-based instead of window.confirm
  const [statusTarget, setStatusTarget] = useState<{ person: NormalizedPerson } | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // ── Search debounce ──
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch ──
  const fetchPersonnel = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.vehicle_type !== "all") params.vehicle_type = filters.vehicle_type;
      if (filters.is_available !== "all") params.is_available = filters.is_available;
      if (filters.is_active !== "all") params.is_active = filters.is_active;
      params.sort_by = filters.sort_by;
      params.order = filters.order;

      const response = await api.get("/admin/delivery-personnel", { params });
      const payload = response.data;
      const list = extractPersonnel(payload);
      const meta = extractPagination(payload);
      setPersonnel(list);
      setTotalItems(meta.totalItems);
      setTotalPages(meta.totalPages);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to fetch delivery personnel";
      setError(message);
      toast.error("Error", { description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, filters]);

  // ── Normalized table data ──
  const tablePersonnel = useMemo<NormalizedPerson[]>(
    () => personnel.map((p, i) => normalizeDeliveryPerson(p, i)),
    [personnel]
  );

  const canGoPrev = page > 1;
  const canGoNext = totalPages ? page < totalPages : personnel.length === limit;

  // ── Handlers ──
  const resetAddForm = () => {
    setAddForm(INITIAL_ADD_FORM);
    setAddError("");
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const validationError = validateAddForm(addForm);
    if (validationError) {
      setAddError(validationError);
      return;
    }
    setAddError("");
    setIsSubmitting(true);
    try {
      const payload: Record<string, string> = {
        full_name: addForm.full_name.trim(),
        mobile_number: addForm.mobile_number.trim(),
        password: addForm.password,
        vehicle_type: addForm.vehicle_type,
        vehicle_number: addForm.vehicle_number.trim(),
        license_number: addForm.license_number.trim(),
        license_expiry_date: addForm.license_expiry_date,
      };
      if (addForm.email.trim()) payload.email = addForm.email.trim();

      await api.post("/admin/delivery-personnel", payload);
      toast.success("Employee onboarded!", {
        description: `${addForm.full_name} has been added successfully.`,
      });
      setIsAddOpen(false);
      resetAddForm();
      await fetchPersonnel();
    } catch (err: any) {
      const status = err.response?.status;
      const message =
        err.response?.data?.message ||
        (status === 409 ? "Delivery personnel already exists." : "Failed to create account.");
      setAddError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Opens the status confirmation dialog
  const handleToggleStatus = (person: NormalizedPerson) => {
    setStatusTarget({ person });
  };

  // Executes the status toggle after confirmation
  const confirmToggleStatus = async () => {
    if (!statusTarget || isTogglingStatus) return;
    const person = statusTarget.person;
    const next = !person.isActive;
    setIsTogglingStatus(true);
    setStatusUpdatingId(person.id);
    try {
      const endpoint = next
        ? `/admin/delivery-personnel/${encodeURIComponent(person.apiId)}/activate`
        : `/admin/delivery-personnel/${encodeURIComponent(person.apiId)}/deactivate`;
      await api.patch(endpoint);
      toast.success(next ? "Activated" : "Deactivated", {
        description: `${person.name} has been ${next ? "activated" : "deactivated"}.`,
      });
      setStatusTarget(null);
      await fetchPersonnel();
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || "Failed to update status.",
      });
    } finally {
      setIsTogglingStatus(false);
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/delivery-personnel/${encodeURIComponent(deleteTarget.apiId)}`);
      toast.success("Deleted", {
        description: `${deleteTarget.name} has been removed.`,
      });
      setDeleteTarget(null);
      await fetchPersonnel();
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || "Failed to delete personnel.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "sort_by" || k === "order") return false;
    return v !== "all";
  }).length;

  // ── Derived stats from real data ──
  const totalActive = totalItems ?? personnel.filter((p) => p.is_active).length;
  const totalAvailable = personnel.filter((p) => p.is_available).length;
const exportDeliveryPersonnelToExcel = () => {
  if (!personnel?.length) return;

  const excelData = personnel.map(
    (employee: any, index: number) => ({
      "S.No": index + 1,

      Employee: employee.full_name ?? "-",

      Contact: employee.mobile_number ?? "-",

      Vehicle: employee.vehicle_type ?? "-",

      Status: employee.is_active
        ? "Active"
        : "Inactive",

      "Vehicle Type":
        employee.vehicle_type ?? "-",

      "Vehicle Number":
        employee.vehicle_number ?? "-",

      "License Number":
        employee.license_number ?? "-",

      "License Expiry":
        employee.license_expiry_date
          ? new Date(
              employee.license_expiry_date
            ).toLocaleDateString()
          : "-",

      "Total Deliveries":
        employee.total_deliveries ?? 0,

      "Completed Deliveries":
        employee.completed_deliveries ?? 0,

      "Created At":
        employee.created_at
          ? new Date(
              employee.created_at
            ).toLocaleString()
          : "-",

      "Login At":
        employee.last_login
          ? new Date(
              employee.last_login
            ).toLocaleString()
          : "-",
    })
  );

  const worksheet =
    XLSX.utils.json_to_sheet(excelData);

  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
  ];

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Delivery Personnel"
  );

  XLSX.writeFile(
    workbook,
    `delivery_personnel_${
      new Date()
        .toISOString()
        .split("T")[0]
    }.xlsx`
  );
    toast.success(`Exported ${personnel.length} delivery personnel records`);
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

            {/* ── Header ── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-black">
                  Employee Logistics
                </h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                  Manage delivery employees, track routes, and monitor performance.
                </p>
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                onClick={() => setIsAddOpen(true)}
              >
                <IconPlus className="mr-2 size-4" /> Add Employee
              </Button>
            </div>

            {/* ── Stats Cards ── */}
            <div className="grid gap-6 md:grid-cols-4">
              <StatCard
                title="Total Personnel"
                value={totalItems !== null ? String(totalItems) : "—"}
                sub="across all pages"
                icon={<IconUserCheck className="size-4 text-primary" />}
              />
              <StatCard
                title="Available Now"
                value={String(totalAvailable)}
                sub="on this page"
                icon={<IconClock className="size-4 text-amber-600" />}
              />
              <StatCard
                title="Active Accounts"
                value={String(personnel.filter((p) => p.is_active).length)}
                sub="on this page"
                icon={<IconRoute className="size-4 text-blue-600" />}
              />
              <StatCard
                title="Verified"
                value={String(personnel.filter((p) => p.is_verified).length)}
                sub="on this page"
                icon={<IconTruckDelivery className="size-4 text-emerald-600" />}
              />
            </div>

            {/* ── Table Card ── */}
            <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-foreground">Employee Directory</h3>
              </div>

              {/* Search + Filters Bar */}
              <div className="flex flex-col gap-3 p-4 border-b bg-white dark:bg-card">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:w-96">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone..."
                      className="pl-9 bg-white dark:bg-card focus-visible:ring-primary"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-white dark:bg-card hover:border-primary/50"
                      onClick={() => setShowFilters((v) => !v)}
                    >
                      <IconFilter className="size-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>

                     <Button
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-card hover:border-primary/50"
                    onClick={
                     exportDeliveryPersonnelToExcel
                    }
                  >
                  Export
                </Button>

                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => { setFilters(INITIAL_FILTERS); setPage(1); }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Filter Dropdowns */}
                {showFilters && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Vehicle Type
                      </span>
                      <Select
                        value={filters.vehicle_type}
                        onValueChange={(v) => handleFilterChange("vehicle_type", v)}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="tempo">Tempo</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Availability
                      </span>
                      <Select
                        value={filters.is_available}
                        onValueChange={(v) => handleFilterChange("is_available", v)}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="true">Available</SelectItem>
                          <SelectItem value="false">Not Available</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Account Status
                      </span>
                      <Select
                        value={filters.is_active}
                        onValueChange={(v) => handleFilterChange("is_active", v)}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Sort By
                      </span>
                      <Select
                        value={filters.sort_by}
                        onValueChange={(v) => handleFilterChange("sort_by", v)}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Date Joined</SelectItem>
                          <SelectItem value="full_name">Name</SelectItem>
                          <SelectItem value="rating">Rating</SelectItem>
                          <SelectItem value="total_deliveries">Total Deliveries</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Order
                      </span>
                      <Select
                        value={filters.order}
                        onValueChange={(v) => handleFilterChange("order", v)}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Newest</SelectItem>
                          <SelectItem value="asc">Oldest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border ">
                    <TableHead className="w-[50px] pl-6">S.No</TableHead>
                    <TableHead className="w-[180px]">Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        Loading delivery personnel...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-destructive py-12">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : tablePersonnel.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                        No delivery personnel found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tablePersonnel.map((person) => (
                      <TableRow
                        key={person.id}
                        className="group hover:bg-primary/5 transition-colors border-b border-border last:border-0"
                      >

                        <TableCell className="text-muted-foreground text-sm pl-6">
                          {(page - 1) * limit + tablePersonnel.indexOf(person) + 1}
                        </TableCell>

                        {/* Employee */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {person.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                              DP-{person.apiId}
                            </span>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">{person.phone}</span>
                          </div>
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-primary/5 text-primary border-primary/20 text-[10px] font-bold uppercase"
                          >
                            {person.vehicle}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {person.vehicleNumber}
                          </div>
                        </TableCell>

                        {/* Performance */}
                        {/* <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">
                              {person.completedDeliveries}/{person.totalDeliveries} deliveries
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              ★ {person.rating}
                            </span>
                          </div>
                        </TableCell> */}

                        {/* Status */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="default"
                              className={
                                person.isActive
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-200 w-fit"
                                  : "bg-muted text-muted-foreground border-transparent w-fit"
                              }
                            >
                              {person.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {person.isVerified && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] w-fit"
                              >
                                Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="group-hover:bg-primary/10 group-hover:text-primary transition-colors"
                              >
                                <IconDotsVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/delivery-management/delivery_detail_page?id=${encodeURIComponent(person.apiId)}`}
                                  className="flex cursor-pointer items-center"
                                >
                                  <IconUserCheck className="mr-2 size-4 opacity-70" />
                                  View / Edit Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={
                                  person.isActive
                                    ? "text-amber-700 focus:text-amber-700 cursor-pointer hover:!bg-red-700 hover:!text-white"
                                    : "text-emerald-700 focus:text-emerald-700 cursor-pointer hover:!text-white"
                                }
                                onClick={() => handleToggleStatus(person)}
                                disabled={statusUpdatingId === person.id}
                              >
                                {statusUpdatingId === person.id
                                  ? "Updating..."
                                  : person.isActive
                                  ? "Deactivate Account"
                                  : "Activate Account"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive cursor-pointer hover:!bg-red-700 hover:!text-white"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: person.id,
                                    apiId: person.apiId,
                                    name: person.name,
                                  })
                                }
                              >
                                <IconTrash className="mr-2 size-4 hover:text-white" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page <span className="font-semibold text-foreground">{page}</span>
                  {totalPages ? ` of ${totalPages}` : ""}
                  {totalItems !== null ? ` · ${totalItems} total` : ""}
                </div>
                <div className="flex items-center gap-2">
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
                </div>
              </div>
            </Card>
          </div>

          {/* ── Add Employee Dialog ── */}
          <Dialog
            open={isAddOpen}
            onOpenChange={(open) => {
              setIsAddOpen(open);
              if (!open) resetAddForm();
            }}
          >
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Onboard New Employee</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a delivery personnel account.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="grid gap-6 py-2">
                {addError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {addError}
                  </div>
                )}

                {/* Personal Details */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    Personal Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="full_name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        placeholder="E.g. Murugan S"
                        value={addForm.full_name}
                        onChange={handleAddChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mobile_number">
                        Mobile Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="mobile_number"
                        name="mobile_number"
                        placeholder="10-digit number"
                        value={addForm.mobile_number}
                        onChange={handleAddChange}
                        maxLength={10}
                        required
                      />
                    </div>
                    {/* <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="driver@example.com"
                        value={addForm.email}
                        onChange={handleAddChange}
                      />
                    </div> */}
                    <div className="grid gap-2">
                      <Label htmlFor="password">
                        Password <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Min. 8 characters"
                        value={addForm.password}
                        onChange={handleAddChange}
                        required
                      />
                    </div>
                  </div>
                </section>

                {/* Vehicle Details */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    Vehicle Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>
                        Vehicle Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={addForm.vehicle_type}
                        onValueChange={(v) => setAddForm((prev) => ({ ...prev, vehicle_type: v }))}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bike">Bike</SelectItem>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="tempo">Tempo</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vehicle_number">
                        Vehicle Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="vehicle_number"
                        name="vehicle_number"
                        placeholder="TN33 AB 1234"
                        value={addForm.vehicle_number}
                        onChange={handleAddChange}
                        required
                      />
                    </div>
                  </div>
                </section>

                {/* License */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    License Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="license_number">
                        License Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="license_number"
                        name="license_number"
                        placeholder="TN2020123456"
                        value={addForm.license_number}
                        onChange={handleAddChange}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="license_expiry_date">
                        License Expiry <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="license_expiry_date"
                        name="license_expiry_date"
                        type="date"
                        value={addForm.license_expiry_date}
                        onChange={handleAddChange}
                        min={new Date().toISOString().split("T")[0]}
                        required
                      />
                    </div>
                  </div>
                </section>

                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── Delete Confirmation Dialog ── */}
          <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Personnel</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Status Toggle Confirmation Dialog ── */}
          <Dialog
            open={!!statusTarget}
            onOpenChange={(open) => { if (!open) setStatusTarget(null); }}
          >
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle
                  className={
                    statusTarget?.person.isActive ? "text-amber-600" : "text-emerald-600"
                  }
                >
                  {statusTarget?.person.isActive
                    ? "Deactivate Personnel"
                    : "Activate Personnel"}
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to{" "}
                  {statusTarget?.person.isActive ? "deactivate" : "activate"}{" "}
                  <span className="font-semibold text-foreground">
                    {statusTarget?.person.name}
                  </span>
                  ?{" "}
                  {statusTarget?.person.isActive
                    ? "They will lose access to the app and cannot accept new deliveries."
                    : "They will regain full access to the app and can accept deliveries."}
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
                  variant={statusTarget?.person.isActive ? "destructive" : "default"}
                  className={
                    !statusTarget?.person.isActive
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : ""
                  }
                  onClick={confirmToggleStatus}
                  disabled={isTogglingStatus}
                >
                  {isTogglingStatus
                    ? statusTarget?.person.isActive
                      ? "Deactivating..."
                      : "Activating..."
                    : statusTarget?.person.isActive
                    ? "Yes, Deactivate"
                    : "Yes, Activate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-white dark:bg-card border-none ring-1 ring-border shadow-sm transition-all hover:shadow-md hover:ring-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPersonnel(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const candidates = [payload.data?.personnel, payload.personnel, payload.data, payload.items, payload.results];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  const key = Object.keys(payload).find((k) => Array.isArray(payload[k]));
  if (key) return payload[key];
  if (payload.data && typeof payload.data === "object") {
    const nested = Object.keys(payload.data).find((k) => Array.isArray(payload.data[k]));
    if (nested) return payload.data[nested];
  }
  return [];
}

function extractPagination(payload: any): { totalItems: number | null; totalPages: number | null } {
  const meta =
    payload?.data?.pagination ?? payload?.pagination ?? payload?.meta ?? payload?.data?.meta ?? null;
  const total =
    toNum(meta?.total) ?? toNum(meta?.total_items) ?? toNum(meta?.count) ?? toNum(payload?.total) ?? null;
  const limit = toNum(meta?.limit) ?? toNum(meta?.per_page) ?? null;
  const totalPages =
    toNum(meta?.total_pages) ?? toNum(meta?.totalPages) ?? (total !== null && limit ? Math.ceil(total / limit) : null);
  return { totalItems: total, totalPages };
}

function normalizeDeliveryPerson(raw: any, index = 0): NormalizedPerson {
  const rawId =
    raw?.delivery_person_id ?? raw?.id ?? raw?.delivery_personnel_id ?? `new-${index + 1}`;
  const apiId = normalizeDeliveryId(String(rawId));
  const isActive =
    typeof raw?.is_active === "boolean"
      ? raw.is_active
      : typeof raw?.status === "string"
      ? raw.status.toLowerCase() === "active"
      : true;
  const isAvailable = typeof raw?.is_available === "boolean" ? raw.is_available : true;
  const status = !isActive ? "Inactive" : isAvailable ? "Available" : "On Delivery";

  return {
    id: `DP-${apiId}`,
    apiId,
    name: raw?.full_name ?? raw?.name ?? "Unknown",
    phone: String(raw?.mobile_number ?? raw?.phone ?? "--"),
    email: String(raw?.email ?? "--"),
    vehicle: String(raw?.vehicle_type ?? raw?.vehicle ?? "--"),
    vehicleNumber: String(raw?.vehicle_number ?? raw?.vehicleNumber ?? "--"),
    status,
    isActive,
    isVerified: Boolean(raw?.is_verified ?? false),
    totalDeliveries: toNum(raw?.total_deliveries) ?? 0,
    completedDeliveries: toNum(raw?.completed_deliveries) ?? 0,
    rating: formatRating(raw?.rating),
  };
}

function normalizeDeliveryId(rawId: string): string {
  if (!rawId) return "";
  const trimmed = rawId.trim();
  if (/^(DP-|E-)/i.test(trimmed)) return trimmed.replace(/^(DP-|E-)/i, "").trim();
  return trimmed;
}

function formatRating(value: any): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function toNum(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const p = Number(value);
    return Number.isFinite(p) ? p : null;
  }
  return null;
}