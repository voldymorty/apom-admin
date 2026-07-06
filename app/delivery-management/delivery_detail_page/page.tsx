"use client";

import { useEffect, useMemo, useState,Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconUserCheck,
  IconTruck,
  IconId,
  IconStar,
  IconMapPin,
  IconClock,
} from "@tabler/icons-react";
import ProtectedRoute from "../../routes/ProtectedRoute";
import api from "@/app/services/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditFormState {
  full_name: string;
  mobile_number: string;
  email: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  license_expiry_date: string;
  is_available: boolean;
  is_verified: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEditForm(form: EditFormState): string | null {
  if (!form.full_name.trim()) return "Full name is required.";
  if (!form.mobile_number.trim()) return "Mobile number is required.";
  if (!/^[6-9]\d{9}$/.test(form.mobile_number.trim()))
    return "Enter a valid 10-digit Indian mobile number.";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    return "Enter a valid email address.";
  if (!form.vehicle_number.trim()) return "Vehicle number is required.";
  if (!form.license_number.trim()) return "License number is required.";
  if (!form.license_expiry_date) return "License expiry date is required.";
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────

 function DeliveryDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id") || "";
  const apiId = normalizeDeliveryId(rawId);

  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>(buildEditForm(null));

  // Delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch profile ──
  useEffect(() => {
    if (!apiId) {
      setFetchError("Invalid delivery personnel ID.");
      return;
    }
    const fetch = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const res = await api.get(`/admin/delivery-personnel/${encodeURIComponent(apiId)}`);
        const data = res.data?.data ?? res.data;
        if (!data) throw new Error("Not found");
        setProfile(data);
      } catch (err: any) {
        setFetchError(err.response?.data?.message || "Failed to fetch delivery personnel profile.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [apiId]);

  // ── Sync edit form when profile loads ──
  useEffect(() => {
    if (profile) setEditForm(buildEditForm(profile));
  }, [profile]);

  const normalized = useMemo(() => normalizeProfile(profile), [profile]);

  // ── Handlers ──
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOpenEdit = () => {
    if (profile) setEditForm(buildEditForm(profile));
    setEditError("");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !apiId) return;
    const validationError = validateEditForm(editForm);
    if (validationError) { setEditError(validationError); return; }
    setEditError("");
    setIsSaving(true);
    try {
      const payload = buildUpdatePayload(editForm);
      await api.patch(`/admin/delivery-personnel/${encodeURIComponent(apiId)}`, payload);
      // Re-fetch to get fresh data
      const res = await api.get(`/admin/delivery-personnel/${encodeURIComponent(apiId)}`);
      const data = res.data?.data ?? res.data;
      if (data) setProfile(data);
      setIsEditOpen(false);
      toast.success("Profile updated", {
        description: "Delivery personnel details have been saved.",
      });
    } catch (err: any) {
      setEditError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting || !apiId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/delivery-personnel/${encodeURIComponent(apiId)}`);
      toast.success("Deleted", { description: "Delivery personnel has been removed." });
      router.push("/delivery-management");
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || "Failed to delete personnel.",
      });
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  // ── Render ──
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
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Personnel Profile</h1>
                <p className="text-muted-foreground text-sm">
                  {profile ? (
                    <>
                      Viewing profile for{" "}
                      <span className="font-semibold text-foreground">{normalized.fullName}</span>
                      {" · "}
                      <span className="text-xs uppercase tracking-widest">DP-{apiId}</span>
                    </>
                  ) : (
                    "Loading..."
                  )}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/delivery-management" className="gap-2">
                  <IconArrowLeft className="size-4" />
                  Back to Directory
                </Link>
              </Button>
            </div>

            {/* ── Loading / Error ── */}
            {loading && (
              <Card className="border-none ring-1 ring-border shadow-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading profile...
                </CardContent>
              </Card>
            )}

            {!loading && fetchError && (
              <Card className="border-none ring-1 ring-border shadow-sm">
                <CardContent className="py-12 text-center text-destructive">
                  {fetchError}
                </CardContent>
              </Card>
            )}

            {/* ── Profile Content ── */}
            {!loading && !fetchError && profile && (
              <>
                {/* Status strip */}
                <div className="flex flex-wrap items-center gap-2">
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
                  <Badge
                    variant="outline"
                    className={
                      normalized.isAvailable
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {normalized.isAvailable ? "Available" : "On Delivery"}
                  </Badge>
                  {normalized.isVerified && (
                    <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                      Verified
                    </Badge>
                  )}
                  {!normalized.profileComplete && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Profile Incomplete
                    </Badge>
                  )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                  {/* ── Left: Identity ── */}
                  <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Personal Info Card */}
                    <SectionCard
                      icon={<IconUserCheck className="size-4 text-primary" />}
                      title="Personal Information"
                      action={
                        <Button size="sm" variant="outline" className="gap-2" onClick={handleOpenEdit}>
                          <IconEdit className="size-4" />
                          Edit
                        </Button>
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Full Name" value={normalized.fullName} />
                        <Field label="Mobile Number" value={normalized.mobile} />
                        <Field label="Last Login" value={normalized.lastLogin} />
                        <Field label="Member Since" value={normalized.createdAt} />
                        <Field label="Last Updated" value={normalized.updatedAt} />
                      </div>
                    </SectionCard>

                    {/* Vehicle & License Card */}
                    <SectionCard
                      icon={<IconTruck className="size-4 text-primary" />}
                      title="Vehicle & License"
                    >
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Vehicle Type" value={normalized.vehicleType} capitalize />
                        <Field label="Vehicle Number" value={normalized.vehicleNumber} mono />
                        <Field label="License Number" value={normalized.licenseNumber} mono />
                        <Field
                          label="License Expiry"
                          value={normalized.licenseExpiry}
                          highlight={isLicenseExpiringSoon(profile?.license_expiry_date)}
                        />
                      </div>
                    </SectionCard>

                    {/* Location Card (only if available) */}
                    {normalized.hasLocation && (
                      <SectionCard
                        icon={<IconMapPin className="size-4 text-primary" />}
                        title="Last Known Location"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Latitude" value={normalized.latitude} mono />
                          <Field label="Longitude" value={normalized.longitude} mono />
                          <Field label="Last Updated" value={normalized.lastLocationUpdate} />
                        </div>
                      </SectionCard>
                    )}
                  </div>

                  {/* ── Right: Stats + Actions ── */}
                  <div className="flex flex-col gap-4">                    

                    {/* Performance Stats */}
                    <SectionCard
                      icon={<IconStar className="size-4 text-amber-500" />}
                      title="Performance"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <MiniStat label="Total" value={normalized.totalDeliveries} />
                        <MiniStat label="Completed" value={normalized.completedDeliveries} />
                        <MiniStat label="Rate" value={normalized.completionRate} highlight />
                        
                      </div>
                    </SectionCard>

                    {/* Actions */}
                    <Card className="border-none ring-1 ring-border shadow-sm">
                      <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full gap-2 justify-start"
                          onClick={handleOpenEdit}
                        >
                          <IconEdit className="size-4" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-2 justify-start text-destructive hover:text-destructive hover:border-destructive/40 hover:bg-red-600 hover:text-white"
                          onClick={() => setIsDeleteOpen(true)}
                        >
                          <IconTrash className="size-4" />
                          Delete Personnel
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Edit Dialog ── */}
          <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setEditError(""); }}>
            <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Delivery Personnel</DialogTitle>
                <DialogDescription>
                  Update profile for{" "}
                  <span className="font-semibold">{normalized.fullName || "this personnel"}</span>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveEdit} className="grid gap-5 py-2">
                {editError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {editError}
                  </div>
                )}

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    Personal Details
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="e_full_name">
                        Full Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="e_full_name"
                        name="full_name"
                        value={editForm.full_name}
                        onChange={handleEditChange}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="e_mobile">
                        Mobile Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="e_mobile"
                        name="mobile_number"
                        value={editForm.mobile_number}
                        onChange={handleEditChange}
                        placeholder="10-digit number"
                        maxLength={10}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="e_email">Email</Label>
                      <Input
                        id="e_email"
                        name="email"
                        type="email"
                        value={editForm.email}
                        onChange={handleEditChange}
                        placeholder="driver@example.com"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    Vehicle & License
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>
                        Vehicle Type <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={editForm.vehicle_type}
                        onValueChange={(v) => setEditForm((prev) => ({ ...prev, vehicle_type: v }))}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select vehicle" />
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
                      <Label htmlFor="e_vehicle_number">
                        Vehicle Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="e_vehicle_number"
                        name="vehicle_number"
                        value={editForm.vehicle_number}
                        onChange={handleEditChange}
                        placeholder="TN33 AB 1234"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="e_license_number">
                        License Number <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="e_license_number"
                        name="license_number"
                        value={editForm.license_number}
                        onChange={handleEditChange}
                        placeholder="TN2020123456"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="e_license_expiry">License Expiry</Label>
                      <Input
                        id="e_license_expiry"
                        name="license_expiry_date"
                        type="date"
                        value={editForm.license_expiry_date}
                        onChange={handleEditChange}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                    Status Flags
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Availability</Label>
                      <Select
                        value={editForm.is_available ? "true" : "false"}
                        onValueChange={(v) =>
                          setEditForm((prev) => ({ ...prev, is_available: v === "true" }))
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Available</SelectItem>
                          <SelectItem value="false">Not Available</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Verification</Label>
                      <Select
                        value={editForm.is_verified ? "true" : "false"}
                        onValueChange={(v) =>
                          setEditForm((prev) => ({ ...prev, is_verified: v === "true" }))
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Verified</SelectItem>
                          <SelectItem value="false">Not Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* ── Delete Confirmation ── */}
          <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) setIsDeleteOpen(false); }}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Personnel</DialogTitle>
                <DialogDescription>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">{normalized.fullName}</span>?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete"}
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

function SectionCard({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none ring-1 ring-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  mono = false,
  capitalize = false,
  highlight = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={[
          "text-sm font-medium text-foreground",
          mono ? "font-mono tracking-wide" : "",
          capitalize ? "capitalize" : "",
          highlight ? "text-amber-600 font-semibold" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-3 flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span
        className={`text-base font-bold ${highlight ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeProfile(raw: any) {
  if (!raw) {
    return {
      fullName: "", mobile: "", email: "", profilePhotoUrl: null,
      vehicleType: "--", vehicleNumber: "--", licenseNumber: "--", licenseExpiry: "--",
      isActive: false, isAvailable: false, isVerified: false, profileComplete: false,
      latitude: "--", longitude: "--", hasLocation: false, lastLocationUpdate: "--",
      totalDeliveries: "--", completedDeliveries: "--", completionRate: "--", rating: "--",
      createdAt: "--", updatedAt: "--", lastLogin: "--",
    };
  }

  const isActive =
    typeof raw.is_active === "boolean"
      ? raw.is_active
      : String(raw.status ?? "").toLowerCase() === "active";
  const isAvailable = Boolean(raw.is_available);
  const isVerified = Boolean(raw.is_verified);
  const profileComplete = Boolean(raw.profile_complete);

  const total = toNum(raw.total_deliveries) ?? 0;
  const completed = toNum(raw.completed_deliveries) ?? 0;
  const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : "--";

  const lat = raw.current_latitude ?? raw.latitude ?? null;
  const lng = raw.current_longitude ?? raw.longitude ?? null;

  return {
    fullName: raw.full_name ?? raw.name ?? "Unknown",
    mobile: String(raw.mobile_number ?? raw.phone ?? "--"),
    email: String(raw.email ?? "--"),
    profilePhotoUrl: raw.profile_photo_url ?? null,
    vehicleType: String(raw.vehicle_type ?? "--"),
    vehicleNumber: String(raw.vehicle_number ?? "--"),
    licenseNumber: String(raw.license_number ?? "--"),
    licenseExpiry: formatDate(raw.license_expiry_date),
    isActive,
    isAvailable,
    isVerified,
    profileComplete,
    latitude: lat !== null ? String(lat) : "--",
    longitude: lng !== null ? String(lng) : "--",
    hasLocation: lat !== null && lng !== null,
    lastLocationUpdate: formatDateTime(raw.last_location_update),
    totalDeliveries: String(total),
    completedDeliveries: String(completed),
    completionRate,
    rating: formatRating(raw.rating),
    createdAt: formatDateTime(raw.created_at),
    updatedAt: formatDateTime(raw.updated_at),
    lastLogin: formatDateTime(raw.last_login),
  };
}

function buildEditForm(raw: any): EditFormState {
  return {
    full_name: raw?.full_name ?? "",
    mobile_number: raw?.mobile_number ?? "",
    email: raw?.email ?? "",
    vehicle_type: raw?.vehicle_type ?? "bike",
    vehicle_number: raw?.vehicle_number ?? "",
    license_number: raw?.license_number ?? "",
    license_expiry_date: formatDateInput(raw?.license_expiry_date),
    is_available: Boolean(raw?.is_available),
    is_verified: Boolean(raw?.is_verified),
  };
}

function buildUpdatePayload(form: EditFormState): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {
    is_available: form.is_available,
    is_verified: form.is_verified,
  };
  const strings: Array<keyof EditFormState> = [
    "full_name", "mobile_number", "email",
    "vehicle_type", "vehicle_number", "license_number", "license_expiry_date",
  ];
  for (const k of strings) {
    const v = String(form[k]).trim();
    if (v) out[k] = v;
  }
  return out;
}

function normalizeDeliveryId(rawId: string): string {
  if (!rawId) return "";
  const t = rawId.trim();
  if (/^(DP-|E-)/i.test(t)) return t.replace(/^(DP-|E-)/i, "").trim();
  return t;
}

function isLicenseExpiringSoon(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000; // within 90 days
}

function formatDate(value: any): string {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN");
}

function formatDateTime(value: any): string {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN");
}

function formatDateInput(value: any): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function formatRating(value: any): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "--";
  return n.toFixed(2);
}

function toNum(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const p = Number(value);
    return Number.isFinite(p) ? p : null;
  }
  return null;
}

export default function DeliveryDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeliveryDetailPageContent />
    </Suspense>
  );
}