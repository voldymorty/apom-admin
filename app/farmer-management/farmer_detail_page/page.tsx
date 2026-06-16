"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconArrowLeft,
  IconUserCircle,
  IconMapPin,
  IconPhone,
  IconMail,
  IconEdit,
  IconTrash,
  IconPower,
  IconSearch,
  IconX,
  IconChevronDown,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";
import ProtectedRoute from "../../routes/ProtectedRoute";
import api from "@/app/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EditForm {
  full_name: string;
  farm_name: string;
  location_address: string;
  state_id: string;
  state_name: string;
  district_id: string;
  district_name: string;
  city_id: string;
  city_name: string;
  pincode: string;
  latitude: string;
  longitude: string;
  total_land: string;
  land_unit: string;
  email: string;
  is_verified: boolean;
}

interface LocationOption {
  id: string;
  name: string;
}

interface ConfirmationState {
  type: "activate" | "deactivate" | "delete" | null;
}

// ─── LocationSearchField component ───────────────────────────────────────────

function LocationSearchField({
  label,
  id,
  value,
  onSelect,
  fetchOptions,
  disabled = false,
  placeholder = "Search...",
}: {
  label: string;
  id: string;
  value: string;
  onSelect: (option: LocationOption) => void;
  fetchOptions: (query: string) => Promise<LocationOption[]>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
    setSelected(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchOptions(val);
        setOptions(results);
        setOpen(true);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (option: LocationOption) => {
    setQuery(option.name);
    setSelected(option.name);
    setOpen(false);
    setOptions([]);
    onSelect(option);
  };

  const handleClear = () => {
    setQuery("");
    setSelected("");
    setOptions([]);
    setOpen(false);
    onSelect({ id: "", name: "" });
  };

  return (
    <div className="grid gap-1.5" ref={wrapperRef}>
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          ) : (
            <IconSearch className="size-4 text-muted-foreground" />
          )}
        </div>
        <Input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          disabled={disabled}
          placeholder={disabled ? "Select a parent first" : placeholder}
          className="bg-white dark:bg-card pl-9 pr-8"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            <IconX className="size-3.5" />
          </button>
        )}

        {open && options.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white dark:bg-card shadow-lg max-h-52 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(opt);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
              >
                {/* <span className="text-muted-foreground text-xs font-mono w-8 shrink-0">
                  #{opt.id}
                </span> */}
                <span className="font-medium truncate">{opt.name}</span>
              </button>
            ))}
          </div>
        )}

        {open && !loading && options.length === 0 && query.trim() && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white dark:bg-card shadow-lg px-3 py-3 text-sm text-muted-foreground">
            No results found for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {selected && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <IconChevronDown className="size-3 rotate-[-90deg]" />
          Selected: <span className="font-semibold">{selected}</span>
        </p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FarmerDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const farmerId = searchParams.get("id") || "";

  // Profile
  const [farmer, setFarmer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    farm_name: "",
    location_address: "",
    state_id: "",
    state_name: "",
    district_id: "",
    district_name: "",
    city_id: "",
    city_name: "",
    pincode: "",
    latitude: "",
    longitude: "",
    total_land: "",
    land_unit: "acres",
    email: "",
    is_verified: false,
  });
  const [editLoading, setEditLoading] = useState(false);

  // Confirmation dialog
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    type: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Crops
  const [crops, setCrops] = useState<any[]>([]);
  const [cropsLoading, setCropsLoading] = useState(false);
  const [cropsError, setCropsError] = useState("");

  // Earnings
  const [earnings, setEarnings] = useState<any[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState("");
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsTotalPages, setEarningsTotalPages] = useState<number | null>(null);
  const earningsLimit = 20;

  // Bank
  const [bankDetails, setBankDetails] = useState<any | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState("");

  // Land Segments
  const [Segments, setSegments] = useState<any[]>([]);
  const [SegmentsLoading, setSegmentsLoading] = useState(false);
  const [SegmentsError, setSegmentsError] = useState("");

  // ── Fetch profile ──────────────────────────────────────────────────────────

  const fetchFarmer = async () => {
    if (!farmerId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/admin/farmers/${encodeURIComponent(farmerId)}`);
      const data = res.data?.data ?? res.data;
      setFarmer(data);
      // Pre-fill edit form
      setEditForm({
        full_name: data?.full_name ?? "",
        farm_name: data?.farm_name ?? "",
        location_address: data?.location_address ?? "",
        state_id: String(data?.state?.state_id ?? data?.state_id ?? ""),
        state_name: data?.state?.state_name ?? data?.state_name ?? "",
        district_id: String(data?.district?.district_id ?? data?.district_id ?? ""),
        district_name: data?.district?.district_name ?? data?.district_name ?? "",
        city_id: String(data?.city?.city_id ?? data?.city_id ?? ""),
        city_name: data?.city?.city_name ?? data?.city_name ?? "",
        pincode: data?.pincode ?? "",
        latitude: String(data?.latitude ?? ""),
        longitude: String(data?.longitude ?? ""),
        total_land: String(data?.total_land ?? ""),
        land_unit: data?.land_unit ?? "acres",
        email: data?.email ?? "",
        is_verified: Boolean(data?.is_verified),
      });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch farmer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  // ── Fetch crops ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!farmerId) return;
    const fetch = async () => {
      setCropsLoading(true);
      setCropsError("");
      try {
        const res = await api.get(`/admin/farmers/${encodeURIComponent(farmerId)}/crops`);
        const data = res.data?.data ?? res.data;
        setCrops(Array.isArray(data?.crops) ? data.crops : []);
      } catch (err: any) {
        setCropsError(err.response?.data?.message || "Failed to fetch crops");
      } finally {
        setCropsLoading(false);
      }
    };
    fetch();
  }, [farmerId]);

  // ── Fetch earnings ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!farmerId) return;
    const fetch = async () => {
      setEarningsLoading(true);
      setEarningsError("");
      try {
        const { fromDate, toDate } = getEarningsDateRange();
        const res = await api.get(
          `/admin/farmers/${encodeURIComponent(farmerId)}/earnings`,
          {
            params: {
              page: earningsPage,
              limit: earningsLimit,
              payment_status: "paid",
              from_date: fromDate,
              to_date: toDate,
            },
          }
        );
        const data = res.data?.data ?? res.data;
        setEarnings(Array.isArray(data?.earnings) ? data.earnings : []);
        setEarningsTotalPages(toNumber(data?.pagination?.total_pages) ?? null);
      } catch (err: any) {
        setEarningsError(
          err.response?.data?.message || "Failed to fetch earnings"
        );
      } finally {
        setEarningsLoading(false);
      }
    };
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, earningsPage]);

  // ── Fetch bank details ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!farmerId) return;
    const fetch = async () => {
      setBankLoading(true);
      setBankError("");
      try {
        const res = await api.get(
          `/admin/farmers/${encodeURIComponent(farmerId)}/bank`
        );
        const data = res.data?.data ?? res.data;
        setBankDetails(data?.bank_details ?? data?.bankDetails ?? data ?? null);
      } catch (err: any) {
        setBankError(
          err.response?.data?.message || "Failed to fetch bank details"
        );
      } finally {
        setBankLoading(false);
      }
    };
    fetch();
  }, [farmerId]);

  // ── Fetch Land Segments ──────────────────────────────────────────────────

  useEffect(() => {
    if (!farmerId) return;
    const fetch = async () => {
      setSegmentsLoading(true);
      setSegmentsError("");
      try {
        const res = await api.get(
          `/admin/farmers/${encodeURIComponent(farmerId)}/land`
        );
        const data = res.data?.data ?? res.data;
      const list = Array.isArray(data?.segments)
             ? data.segments
           : Array.isArray(data?.land_segments)
           ? data.land_segments
          : Array.isArray(data)
           ? data
           : [];
        setSegments(list);
      } catch (err: any) {
        setSegmentsError(
          err.response?.data?.message || "Failed to fetch Land Segments"
        );
      } finally {
        setSegmentsLoading(false);
      }
    };
    fetch();
  }, [farmerId]);

  // ── Location API fetchers ──────────────────────────────────────────────────

  const fetchStates = useCallback(async (query: string): Promise<LocationOption[]> => {
    const res = await api.get("/location/states", { params: { search: query } });
    const data = res.data?.data ?? res.data;
    const list: any[] = Array.isArray(data) ? data : data?.states ?? [];
    return list
      .filter((s: any) =>
        (s.state_name ?? "").toLowerCase().includes(query.toLowerCase())
      )
      .map((s: any) => ({ id: String(s.state_id), name: s.state_name }));
  }, []);

  const fetchDistricts = useCallback(
    async (query: string): Promise<LocationOption[]> => {
      if (!editForm.state_id) return [];
      const res = await api.get("/location/districts", {
        params: { search: query, state_id: editForm.state_id },
      });
      const data = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(data) ? data : data?.districts ?? [];
      return list
        .filter((d: any) =>
          (d.district_name ?? "").toLowerCase().includes(query.toLowerCase())
        )
        .map((d: any) => ({ id: String(d.district_id), name: d.district_name }));
    },
    [editForm.state_id]
  );

  const fetchCities = useCallback(
    async (query: string): Promise<LocationOption[]> => {
      if (!editForm.district_id) return [];
      const res = await api.get("/location/cities", {
        params: { search: query, district_id: editForm.district_id },
      });
      const data = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(data) ? data : data?.cities ?? [];
      return list
        .filter((c: any) =>
          (c.city_name ?? "").toLowerCase().includes(query.toLowerCase())
        )
        .map((c: any) => ({ id: String(c.city_id), name: c.city_name }));
    },
    [editForm.district_id]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const body: Record<string, any> = {
        full_name: editForm.full_name,
        farm_name: editForm.farm_name,
        location_address: editForm.location_address,
        pincode: editForm.pincode,
        latitude: toNumber(editForm.latitude),
        longitude: toNumber(editForm.longitude),
        total_land: toNumber(editForm.total_land),
        land_unit: editForm.land_unit,
        email: editForm.email,
        is_verified: editForm.is_verified,
      };
      if (editForm.state_id) body.state_id = Number(editForm.state_id);
      if (editForm.district_id) body.district_id = Number(editForm.district_id);
      if (editForm.city_id) body.city_id = Number(editForm.city_id);

      await api.patch(`/admin/farmers/${encodeURIComponent(farmerId)}`, body);
      toast.success("Farmer updated successfully");
      setIsEditOpen(false);
      await fetchFarmer();
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || "Failed to update farmer",
      });
    } finally {
      setEditLoading(false);
    }
  };

  // Handle confirmed action
  const handleConfirm = async () => {
    if (!confirmation.type) return;

    setIsProcessing(true);
    const type = confirmation.type;

    try {
      if (type === "activate" || type === "deactivate") {
        const endpoint =
          type === "activate"
        ? `/admin/farmers/${encodeURIComponent(farmerId)}/activate`
        : `/admin/farmers/${encodeURIComponent(farmerId)}/deactivate`;
        
      await api.patch(endpoint);
        toast.success(
          type === "activate" ? "Farmer Activated" : "Farmer Deactivated",
          {
            description: `${normalized.name} has been ${type === "activate" ? "activated" : "deactivated"}.`,
          }
        );
      } else if (type === "delete") {
        await api.delete(`/admin/farmers/${encodeURIComponent(farmerId)}`);
        toast.success("Farmer Deleted", {
          description: `${normalized.name} has been permanently deleted.`,
        });
        router.push("/farmer-management");
      }

      setConfirmation({ type: null });
      await fetchFarmer();
    } catch (err: any) {
      const message = err.response?.data?.message || `Failed to ${type} farmer`;
      toast.error("Error", { description: message });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const normalized = useMemo(
    () => normalizeFarmerDetail(farmer, farmerId),
    [farmer, farmerId]
  );
  const mapUrl = useMemo(() => buildMapUrl(normalized), [normalized]);
  const cropRows = useMemo(
    () => crops.map((c, i) => normalizeCrop(c, i)),
    [crops]
  );
  const earningsRows = useMemo(
    () => earnings.map((e, i) => normalizeEarning(e, i)),
    [earnings]
  );
  const normalizedBank = useMemo(
    () => normalizeBankDetails(bankDetails),
    [bankDetails]
  );
  const SegmentRows = useMemo(
    () => Segments.map((p, i) => normalizeSegment(p, i)),
    [Segments]
  );
  const SegmentTotals = useMemo(
    () => sumSegmentArea(SegmentRows),
    [SegmentRows]
  );

  const canGoPrevEarnings = earningsPage > 1;
  const canGoNextEarnings = earningsTotalPages
    ? earningsPage < earningsTotalPages
    : earningsRows.length === earningsLimit;

  // ── Render ─────────────────────────────────────────────────────────────────

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
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold tracking-tight">
                    Farmer Details
                  </h1>
                  <Badge
                    variant="outline"
                    className="bg-muted/40 text-muted-foreground border-transparent"
                  >
                    ID {normalized.id}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  Viewing profile for{" "}
                  <span className="font-semibold">{normalized.name}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-muted/40 text-muted-foreground border-transparent"
                >
                  Last Login {normalized.lastLogin}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  disabled={loading || !farmer}
                >
                  <IconEdit className="mr-1.5 size-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={
                    normalized.isActive
                      ? "border-amber-200 text-amber-700 hover:bg-red-800"
                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-800"
                  }
                  onClick={() =>
                    setConfirmation({
                      type: normalized.isActive ? "deactivate" : "activate",
                    })
                  }
                  disabled={isProcessing || loading || !farmer}
                >
                  <IconPower className="mr-1.5 size-4" />
                  {isProcessing
                    ? "Updating..."
                    : normalized.isActive
                    ? "Deactivate"
                    : "Activate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-600"
                  onClick={() => setConfirmation({ type: "delete" })}
                  disabled={isProcessing || loading || !farmer}
                >
                  <IconTrash className="mr-1.5 size-4" />
                  {isProcessing ? "Deleting..." : "Delete"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/farmer-management" className="gap-2">
                    <IconArrowLeft className="size-4" />
                    Back
                  </Link>
                </Button>
              </div>
            </div>

            {/* Profile Card */}
            <Card className="border-none ring-1 ring-border shadow-md bg-white/70 backdrop-blur-sm">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <IconUserCircle className="size-5 text-primary" />
                  Farmer Profile
                </CardTitle>
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
                      normalized.isVerified
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-muted text-muted-foreground border-transparent"
                    }
                  >
                    {normalized.isVerified ? "Verified" : "Unverified"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      normalized.profileComplete
                        ? "bg-violet-50 text-violet-700 border-violet-200"
                        : "bg-muted text-muted-foreground border-transparent"
                    }
                  >
                    {normalized.profileComplete
                      ? "Profile Complete"
                      : "Profile Incomplete"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {loading ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-40 rounded-2xl border bg-muted/40 animate-pulse" />
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-20 rounded-xl border bg-muted/40 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ) : error ? (
                  <div className="py-6 text-center text-muted-foreground">
                    {error}
                  </div>
                ) : (
                  <>
                    {/* Hero row */}
                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                      <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-emerald-50/50 p-6 shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="h-28 w-28 overflow-hidden rounded-2xl border bg-muted/30 shrink-0">
                            {normalized.profilePhoto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={normalized.profilePhoto}
                                alt={`${normalized.name} profile`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
                                No Photo
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col gap-2">
                            <div>
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                Farmer Name
                              </p>
                              <p className="text-2xl font-semibold">
                                {normalized.name}
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Farm:{" "}
                              <span className="font-semibold text-foreground">
                                {normalized.farmName}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <IconPhone className="size-4 text-primary/60" />
                                {normalized.mobile}
                              </span>
                              {/* <span className="inline-flex items-center gap-1.5">
                                <IconMail className="size-4 text-primary/60" />
                                {normalized.email}
                              </span> */}
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <IconMapPin className="size-4 text-primary/60" />
                                <span className="text-xs uppercase tracking-widest">
                                  State
                                </span>
                                <span className="font-semibold text-foreground">
                                  {normalized.stateName}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-xs uppercase tracking-widest">
                                  District
                                </span>
                                <span className="font-semibold text-foreground">
                                  {normalized.districtName}
                                </span>
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-xs uppercase tracking-widest">
                                  City
                                </span>
                                <span className="font-semibold text-foreground">
                                  {normalized.cityName}
                                </span>
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {normalized.mobile !== "--" ? (
                                <Button asChild size="sm">
                                  <a href={`tel:${normalized.mobile}`}>Call</a>
                                </Button>
                              ) : (
                                <Button size="sm" disabled>
                                  Call
                                </Button>
                              )}
                              {/* {normalized.email !== "--" ? (
                                <Button asChild size="sm" variant="outline">
                                  <a href={`mailto:${normalized.email}`}>
                                    Email
                                  </a>
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  Email
                                </Button>
                              )} */}
                              {mapUrl ? (
                                <Button asChild size="sm" variant="outline">
                                  <a href={mapUrl} target="_blank" rel="noreferrer">
                                    Directions
                                  </a>
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  Directions
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="grid gap-4">
                        <StatCard label="Total Land" value={normalized.totalLand} />
                        <StatCard
                          label="Available Land"
                          value={normalized.availableLand}
                        />
                        <StatCard
                          label="Total Earnings"
                          value={normalized.earnings}
                          accent
                        />
                        <StatCard
                          label="Total Supplies"
                          value={normalized.totalSupplies}
                        />
                      </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid gap-4 lg:grid-cols-3">
                      <InfoCard title="Location Details">
                        <InfoRow label="Farm Name" value={normalized.farmName} />
                        <InfoRow label="Address" value={normalized.location} />
                        <InfoRow label="Pincode" value={normalized.pincode} />
                        <InfoRow label="State" value={normalized.stateName} />
                        <InfoRow label="District" value={normalized.districtName} />
                        <InfoRow label="City" value={normalized.cityName} />
                        <InfoRow label="Latitude" value={normalized.latitude} />
                        <InfoRow label="Longitude" value={normalized.longitude} />
                      </InfoCard>
                      <InfoCard title="Land Allocation">
                        <InfoRow label="Total Land" value={normalized.totalLand} />
                        <InfoRow
                          label="Allocated Land"
                          value={normalized.allocatedLand}
                        />
                        <InfoRow
                          label="Available Land"
                          value={normalized.availableLand}
                        />
                        {normalized.allocationPercent !== null && (
                          <div className="pt-2">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                              <span>Allocation</span>
                              <span>{normalized.allocationPercent}%</span>
                            </div>
                            <div className="mt-2 h-2 w-full rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-emerald-500"
                                style={{
                                  width: `${normalized.allocationPercent}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}
                        <InfoRow
                          label="Land Photo"
                          value={normalized.landPhoto ? "Available" : "Not Uploaded"}
                        />
                        <InfoRow
                          label="Total Supplies"
                          value={normalized.totalSupplies}
                        />
                        <InfoRow
                          label="Total Earnings"
                          value={normalized.earnings}
                        />
                      </InfoCard>
                      <InfoCard title="Account Status">
                        {/* <InfoRow
                          label="Aadhar Number"
                          value={normalized.aadharNumber}
                        /> */}
                        <InfoRow
                          label="Active"
                          value={normalized.isActive ? "Yes" : "No"}
                        />
                        <InfoRow
                          label="Verified"
                          value={normalized.isVerified ? "Yes" : "No"}
                        />
                        <InfoRow
                          label="Profile Complete"
                          value={normalized.profileComplete ? "Yes" : "No"}
                        />
                        <div className="pt-2">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                            <span>Profile Completeness</span>
                            <span>{normalized.profileCompleteness}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{
                                width: `${normalized.profileCompleteness}%`,
                              }}
                            />
                          </div>
                        </div>
                        <InfoRow label="Created At" value={normalized.createdAt} />
                        <InfoRow label="Updated At" value={normalized.updatedAt} />
                        <InfoRow label="Last Login" value={normalized.lastLogin} />
                      </InfoCard>
                    </div>

                    {/* Photos */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <PhotoCard
                        title="Land Photo"
                        src={normalized.landPhoto}
                        alt="Land"
                      />
                      <PhotoCard
                        title="Profile Photo"
                        src={normalized.profilePhoto}
                        alt={normalized.name}
                      />
                    </div>

                    {/* Land Segments */}
                    <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            Land Segments
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {SegmentTotals.totalAreaLabel}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          {SegmentRows.length} total
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-4">
                        {SegmentsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading Segments...
                          </p>
                        ) : SegmentsError ? (
                          <p className="text-sm text-muted-foreground">
                            {SegmentsError}
                          </p>
                        ) : SegmentRows.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No Land Segments found.
                          </p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {SegmentRows.map((Segment) => (
                              <div
                                key={Segment.id}
                                className="rounded-xl border bg-card p-4 shadow-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                      Segment
                                    </p>
                                    <p className="text-lg font-semibold">
                                      {Segment.name}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      Segment.status === "cultivated"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-muted text-muted-foreground border-transparent"
                                    }
                                  >
                                    {Segment.status}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>Segment ID</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.id}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Area</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.areaLabel}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Crop</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.cropName}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Planting Date</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.plantingDate}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Expected Harvest</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.expectedHarvestDate}
                                    </span>
                                  </div>
                                  {/* <div className="flex justify-between">
                                    <span>Expected Yield</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.expectedYield}
                                    </span>
                                  </div> */}
                                  {/* <div className="flex justify-between">
                                    <span>Actual Yield</span>
                                    <span className="font-semibold text-foreground">
                                      {Segment.actualYield}
                                    </span>
                                  </div>
                                  {Segment.notes !== "--" && (
                                    <div className="mt-1 rounded-lg bg-muted/40 p-2 text-xs">
                                      {Segment.notes}
                                    </div>
                                  )} */}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Crops */}
                    <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                        <CardTitle className="text-sm font-semibold">
                          Crops
                        </CardTitle>
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          {cropRows.length} total
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-4">
                        {cropsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading crops...
                          </p>
                        ) : cropsError ? (
                          <p className="text-sm text-muted-foreground">
                            {cropsError}
                          </p>
                        ) : cropRows.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No crops found for this farmer.
                          </p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {cropRows.map((crop) => (
                              <div
                                key={crop.id}
                                className="rounded-xl border bg-card p-4 shadow-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                      Crop ID
                                    </p>
                                    <p className="text-lg font-semibold">
                                      {crop.id}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      crop.status === "available"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : crop.status === "pending"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-muted text-muted-foreground border-transparent"
                                    }
                                  >
                                    {crop.statusLabel}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                  <div className="flex justify-between">
                                    <span>Product ID</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.productId}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Quantity</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.quantity}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Grade</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.grade}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Expected Price</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.expectedPrice}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Ready</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.isReady ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Harvest Date</span>
                                    <span className="font-semibold text-foreground">
                                      {crop.harvestDate}
                                    </span>
                                  </div>
                                  {crop.SegmentName !== "--" && (
                                    <div className="flex justify-between">
                                      <span>Segment</span>
                                      <span className="font-semibold text-foreground">
                                        {crop.SegmentName}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Earnings */}
                    <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            Earnings History
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {getEarningsDateLabel()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            Paid
                          </Badge>
                          <span className="text-xs uppercase tracking-widest text-muted-foreground">
                            {earningsRows.length} items
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {earningsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading earnings...
                          </p>
                        ) : earningsError ? (
                          <p className="text-sm text-muted-foreground">
                            {earningsError}
                          </p>
                        ) : earningsRows.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No earnings found for this period.
                          </p>
                        ) : (
                          <div className="grid gap-3">
                            {earningsRows.map((earning) => (
                              <div
                                key={earning.id}
                                className="rounded-xl border bg-card p-4 shadow-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                                      Earning ID
                                    </p>
                                    <p className="text-lg font-semibold">
                                      {earning.id}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={
                                      earning.paymentStatus === "paid"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                    }
                                  >
                                    {earning.paymentStatusLabel}
                                  </Badge>
                                </div>
                                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                                  <div className="flex justify-between">
                                    <span>Crop ID</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.cropId}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Pickup ID</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.pickupId}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Quantity Supplied</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.quantitySupplied}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Price / Kg</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.pricePerKg}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Amount</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.totalAmount}
                                    </span>
                                  </div>
                                  {/* <div className="flex justify-between">
                                    <span>Commission</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.commissionAmount}
                                    </span>
                                  </div> */}
                                  <div className="flex justify-between">
                                    <span>Net Amount</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.netAmount}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Payment Date</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.paymentDate}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Payment Method</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.paymentMethod}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Transaction Ref</span>
                                    <span className="font-semibold text-foreground">
                                      {earning.transactionRef}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canGoPrevEarnings}
                            onClick={() =>
                              setEarningsPage((prev) => Math.max(1, prev - 1))
                            }
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!canGoNextEarnings}
                            onClick={() =>
                              setEarningsPage((prev) => prev + 1)
                            }
                          >
                            Next
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {earningsPage}
                            {earningsTotalPages
                              ? ` of ${earningsTotalPages}`
                              : ""}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bank Details */}
                    {/* <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
                      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b bg-muted/30">
                        <CardTitle className="text-sm font-semibold">
                          Bank Details
                        </CardTitle>
                        <div className="flex gap-2">
                          {normalizedBank.isPrimary && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              Primary
                            </Badge>
                          )}
                          {normalizedBank.isVerified && (
                            <Badge
                              variant="outline"
                              className="bg-sky-50 text-sky-700 border-sky-200"
                            >
                              Verified
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {bankLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading bank details...
                          </p>
                        ) : bankError ? (
                          <p className="text-sm text-muted-foreground">
                            {bankError}
                          </p>
                        ) : !normalizedBank.id ? (
                          <p className="text-sm text-muted-foreground">
                            No bank details found.
                          </p>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            <InfoCard title="Account">
                              <InfoRow
                                label="Account Holder"
                                value={normalizedBank.accountHolder}
                              />
                              <InfoRow
                                label="Bank Name"
                                value={normalizedBank.bankName}
                              />
                              <InfoRow
                                label="Account Number"
                                value={normalizedBank.accountNumberMasked}
                              />
                              <InfoRow
                                label="Account Type"
                                value={normalizedBank.accountType}
                              />
                              <InfoRow
                                label="IFSC Code"
                                value={normalizedBank.ifscCode}
                              />
                              <InfoRow
                                label="Branch"
                                value={normalizedBank.branchName}
                              />
                              <InfoRow
                                label="UPI ID"
                                value={normalizedBank.upiId}
                              />
                            </InfoCard>
                            <InfoCard title="Verification">
                              <InfoRow
                                label="Verified"
                                value={normalizedBank.isVerified ? "Yes" : "No"}
                              />
                              <InfoRow
                                label="Verified At"
                                value={normalizedBank.verifiedAt}
                              />
                              <InfoRow
                                label="Created At"
                                value={normalizedBank.createdAt}
                              />
                              <InfoRow
                                label="Bank Detail ID"
                                value={normalizedBank.id}
                              />
                            </InfoCard>
                          </div>
                        )}
                      </CardContent>
                    </Card> */}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Farmer</SheetTitle>
            <SheetDescription>
              Update farmer details. Click save when done.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="mt-6 space-y-4 px-4">
            <div className="grid gap-3">
              <FormField
                label="Full Name"
                id="full_name"
                value={editForm.full_name}
                onChange={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
                required
              />
              <FormField
                label="Farm Name"
                id="farm_name"
                value={editForm.farm_name}
                onChange={(v) => setEditForm((f) => ({ ...f, farm_name: v }))}
              />
              {/* <FormField
                label="Email"
                id="email"
                type="email"
                value={editForm.email}
                onChange={(v) => setEditForm((f) => ({ ...f, email: v }))}
              /> */}
              <FormField
                label="Location Address"
                id="location_address"
                value={editForm.location_address}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, location_address: v }))
                }
              />
              <FormField
                label="Pincode"
                id="pincode"
                value={editForm.pincode}
                onChange={(v) => setEditForm((f) => ({ ...f, pincode: v }))}
              />

              {/* ── Searchable State ── */}
              <LocationSearchField
                label="State"
                id="state"
                value={editForm.state_name}
                placeholder="Search state..."
                fetchOptions={fetchStates}
                onSelect={(opt) =>
                  setEditForm((f) => ({
                    ...f,
                    state_id: opt.id,
                    state_name: opt.name,
                    // Reset dependent fields when state changes
                    district_id: "",
                    district_name: "",
                    city_id: "",
                    city_name: "",
                  }))
                }
              />

              {/* ── Searchable District (requires state) ── */}
              <LocationSearchField
                label="District"
                id="district"
                value={editForm.district_name}
                placeholder="Search district..."
                disabled={!editForm.state_id}
                fetchOptions={fetchDistricts}
                onSelect={(opt) =>
                  setEditForm((f) => ({
                    ...f,
                    district_id: opt.id,
                    district_name: opt.name,
                    // Reset city when district changes
                    city_id: "",
                    city_name: "",
                  }))
                }
              />

              {/* ── Searchable City (requires district) ── */}
              <LocationSearchField
                label="City"
                id="city"
                value={editForm.city_name}
                placeholder="Search city..."
                disabled={!editForm.district_id}
                fetchOptions={fetchCities}
                onSelect={(opt) =>
                  setEditForm((f) => ({
                    ...f,
                    city_id: opt.id,
                    city_name: opt.name,
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Latitude"
                  id="latitude"
                  type="number"
                  value={editForm.latitude}
                  onChange={(v) => setEditForm((f) => ({ ...f, latitude: v }))}
                />
                <FormField
                  label="Longitude"
                  id="longitude"
                  type="number"
                  value={editForm.longitude}
                  onChange={(v) =>
                    setEditForm((f) => ({ ...f, longitude: v }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Total Land"
                  id="total_land"
                  type="number"
                  value={editForm.total_land}
                  onChange={(v) =>
                    setEditForm((f) => ({ ...f, total_land: v }))
                  }
                />
                <FormField
                  label="Land Unit"
                  id="land_unit"
                  value={editForm.land_unit}
                  onChange={(v) =>
                    setEditForm((f) => ({ ...f, land_unit: v }))
                  }
                />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  id="is_verified"
                  type="checkbox"
                  checked={editForm.is_verified}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      is_verified: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border"
                />
                <Label htmlFor="is_verified" className="text-sm">
                  Mark as Verified
                </Label>
              </div>
            </div>
            <SheetFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ─── Confirmation Dialog ─── */}
      <Dialog
        open={confirmation.type !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation({ type: null });
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {confirmation.type === "deactivate" || confirmation.type === "delete" ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <IconAlertCircle className="size-5 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <IconPower className="size-5 text-green-600 dark:text-green-400" />
                </div>
              )}
              <DialogTitle className={confirmation.type === "deactivate" || confirmation.type === "delete" ? "text-red-600" : "text-green-600"}>
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
                    {normalized.name}
                  </span>
                  <br />
                  They will be able to access their account and perform transactions.
                </>
              ) : confirmation.type === "deactivate" ? (
                <>
                  Are you sure you want to <span className="font-semibold">deactivate</span> this farmer?
                  <br />
                  <span className="font-semibold text-foreground">
                    {normalized.name}
                  </span>
                  <br />
                  They will not be able to access their account.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete this farmer?
                  <br />
                  <span className="font-semibold text-foreground">
                    {normalized.name}
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
              onClick={() => setConfirmation({ type: null })}
              disabled={isProcessing}
            >
              <IconX className="mr-2 size-4" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isProcessing}
              className={
                confirmation.type === "deactivate" || confirmation.type === "delete"
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

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-gradient-to-br from-muted/30 via-background to-emerald-50/40 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={
          accent
            ? "text-2xl font-semibold text-emerald-600"
            : "text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground text-right break-all">
        {value}
      </span>
    </div>
  );
}

function PhotoCard({
  title,
  src,
  alt,
}: {
  title: string;
  src: string;
  alt: string;
}) {
  return (
    <Card className="border-none ring-1 ring-border shadow-sm bg-white/70 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="h-56 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed text-xs uppercase tracking-widest text-muted-foreground">
            No Photo
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FormField({
  label,
  id,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="bg-white dark:bg-card"
      />
    </div>
  );
}

// ─── Data normalizers ─────────────────────────────────────────────────────────

function normalizeFarmerDetail(raw: any, fallbackId: string) {
  const id = raw?.farmer_id ?? raw?.id ?? fallbackId ?? "--";
  const name = raw?.full_name ?? raw?.name ?? "Unnamed Farmer";
  const mobile = raw?.mobile_number ?? raw?.mobile ?? "--";
  const email = raw?.email ?? "--";
  const farmName = raw?.farm_name ?? "--";
  const location = raw?.location_address ?? "--";

  const stateName =
    raw?.state?.state_name ?? raw?.state_name ?? raw?.state ?? "--";
  const districtName =
    raw?.district?.district_name ?? raw?.district_name ?? raw?.district ?? "--";
  const cityName =
    raw?.city?.city_name ?? raw?.city_name ?? raw?.city ?? "--";
  const pincode = raw?.pincode ?? "--";
  const latitude = raw?.latitude != null ? String(raw.latitude) : "--";
  const longitude = raw?.longitude != null ? String(raw.longitude) : "--";

  const landUnit = raw?.land_unit ?? "Acres";
  const totalLandValue = toNumber(raw?.total_land);
  const allocatedLandValue = toNumber(raw?.allocated_land);
  const availableLandValue = toNumber(raw?.available_land);
  const totalLand = formatLand(totalLandValue, landUnit);
  const allocatedLand = formatLand(allocatedLandValue, landUnit);
  const availableLand = formatLand(availableLandValue, landUnit);
  const allocationPercent = computeAllocationPercent(
    totalLandValue,
    allocatedLandValue
  );

  const totalSupplies =
    raw?.total_supplies != null ? String(raw.total_supplies) : "--";
  const earnings = formatRupees(raw?.total_earnings ?? raw?.earnings);
  const aadharNumber = raw?.aadhar_number ?? "--";

  const createdAt = formatDateTime(raw?.created_at);
  const updatedAt = formatDateTime(raw?.updated_at);
  const lastLogin = formatDateTime(raw?.last_login);

  const isActive = Boolean(raw?.is_active);
  const isVerified = Boolean(raw?.is_verified);
  const profileComplete = Boolean(raw?.profile_complete);

  const profilePhoto = raw?.profile_photo_url ?? raw?.profilePhotoUrl ?? "";
  const landPhoto = raw?.land_photo_url ?? raw?.landPhotoUrl ?? "";

  const profileCompleteness = computeProfileCompleteness([
    name,
    mobile,
    email,
    location,
    stateName,
    districtName,
    cityName,
    pincode,
    totalLand,
    profilePhoto,
    landPhoto,
    aadharNumber,
  ]);

  return {
    id: String(id),
    name,
    mobile: mobile !== "--" ? String(mobile) : "--",
    email,
    farmName,
    location,
    stateName,
    districtName,
    cityName,
    pincode,
    latitude,
    longitude,
    totalLand,
    allocatedLand,
    availableLand,
    allocationPercent,
    totalSupplies,
    earnings,
    aadharNumber,
    createdAt,
    updatedAt,
    lastLogin,
    isActive,
    isVerified,
    profileComplete,
    profileCompleteness,
    profilePhoto,
    landPhoto,
  };
}

function normalizeCrop(raw: any, index: number) {
  const id = raw?.crop_id ?? raw?.id ?? `crop-${index + 1}`;
  const productId = raw?.product_id ?? raw?.productId ?? "--";
  const quantity = raw?.quantity_kg ? `${raw.quantity_kg} kg` : "--";
  const grade = raw?.grade ?? "--";
  const expectedPrice = raw?.expected_price_per_kg
    ? `Rs ${Number(raw.expected_price_per_kg).toLocaleString("en-IN")}/kg`
    : "--";
  const harvestDate = raw?.harvest_date
    ? formatDateOnly(new Date(raw.harvest_date))
    : "--";
  const status = raw?.status ?? "--";
  const statusLabel = String(status).replaceAll("_", " ");
  const isReady = Boolean(raw?.is_ready);
  const SegmentName =
    raw?.Segment?.crop_name ?? raw?.Segment?.Segment_name ?? "--";

  return {
    id: String(id),
    productId: String(productId),
    quantity,
    grade,
    expectedPrice,
    harvestDate,
    status: String(status),
    statusLabel,
    isReady,
    SegmentName,
  };
}

function normalizeEarning(raw: any, index: number) {
  const id = raw?.earning_id ?? raw?.id ?? `earning-${index + 1}`;
  const cropId = raw?.crop_id ?? raw?.crop?.crop_id ?? "--";
  const pickupId = raw?.pickup_delivery_id ?? raw?.pickup_id ?? "--";
  const quantitySupplied =
    raw?.quantity_supplied_kg != null
      ? `${raw.quantity_supplied_kg} kg`
      : "--";
  const pricePerKg =
    raw?.price_per_kg != null
      ? `Rs ${Number(raw.price_per_kg).toLocaleString("en-IN")}/kg`
      : "--";
  const totalAmount = formatRupees(raw?.total_amount);
  const commissionAmount =
    raw?.commission_amount != null
      ? `Rs ${Number(raw.commission_amount).toLocaleString("en-IN")} (${raw?.commission_percentage ?? "--"}%)`
      : "--";
  const netAmount = formatRupees(raw?.net_amount);
  const paymentStatus = raw?.payment_status ?? "--";
  const paymentStatusLabel = String(paymentStatus).replaceAll("_", " ");
  const paymentDate = formatDateTime(raw?.payment_date);
  const paymentMethod = raw?.payment_method ?? "--";
  const transactionRef = raw?.transaction_reference ?? "--";

  return {
    id: String(id),
    cropId: String(cropId),
    pickupId: String(pickupId),
    quantitySupplied,
    pricePerKg,
    totalAmount,
    commissionAmount,
    netAmount,
    paymentStatus: String(paymentStatus),
    paymentStatusLabel,
    paymentDate,
    paymentMethod,
    transactionRef,
  };
}

function normalizeBankDetails(raw: any) {
  const empty = {
    id: "",
    accountHolder: "--",
    bankName: "--",
    accountNumberMasked: "--",
    accountType: "--",
    ifscCode: "--",
    branchName: "--",
    upiId: "--",
    isVerified: false,
    verifiedAt: "--",
    isPrimary: false,
    createdAt: "--",
  };
  if (!raw || typeof raw !== "object") return empty;

  const accountNumber = raw?.account_number ?? raw?.accountNumber ?? "";
  return {
    id: String(raw?.bank_detail_id ?? raw?.id ?? ""),
    accountHolder: raw?.account_holder_name ?? raw?.accountHolderName ?? "--",
    bankName: raw?.bank_name ?? raw?.bankName ?? "--",
    accountNumberMasked: maskAccountNumber(accountNumber),
    accountType: raw?.account_type ?? raw?.accountType ?? "--",
    ifscCode: raw?.ifsc_code ?? raw?.ifscCode ?? "--",
    branchName: raw?.branch_name ?? raw?.branchName ?? "--",
    upiId: raw?.upi_id ?? raw?.upiId ?? "--",
    isVerified: Boolean(raw?.is_verified),
    verifiedAt: formatDateTime(raw?.verified_at),
    isPrimary: Boolean(raw?.is_primary),
    createdAt: formatDateTime(raw?.created_at),
  };
}

function normalizeSegment(raw: any, index: number) {
   const id = raw?.segment_id ?? `segment-${index + 1}`;

  const name =
    raw?.crop_name ?? `Segment ${index + 1}`;

  const areaValue = toNumber(raw?.area_value);

  const areaLabel =
    areaValue !== null
      ? `${areaValue} ${raw?.area_unit ?? "acres"}`
      : "--";

  const status = raw?.status ?? "--";

  const cropName = raw?.crop_name ?? "--";

  const plantingDate = raw?.plantation_date
    ? formatDateOnly(new Date(raw.plantation_date))
    : "--";

  const expectedHarvestDate = raw?.harvesting_date
    ? formatDateOnly(new Date(raw.harvesting_date))
    : "--";

  return {
    id: String(id),
    name,
    areaValue,
    areaLabel,
    status,
    cropName,
    plantingDate,
    expectedHarvestDate,
  };
}


function sumSegmentArea(
  Segments: Array<{ areaValue: number | null }>
): { totalArea: number | null; totalAreaLabel: string } {
  if (!Segments.length)
    return { totalArea: null, totalAreaLabel: "Total Area --" };
  const values = Segments
    .map((p) => p.areaValue)
    .filter((v): v is number => v !== null);
  if (!values.length)
    return { totalArea: null, totalAreaLabel: "Total Area --" };
  const total = values.reduce((a, b) => a + b, 0);
  return { totalArea: total, totalAreaLabel: `Total Area ${total} Acres` };
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function toNumber(value: any): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatRupees(value: any) {
  if (value === null || value === undefined || value === "") return "--";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `Rs ${n.toLocaleString("en-IN")}`;
}

function formatLand(value: number | null, unit: string) {
  if (value === null || value === undefined) return "--";
  return `${value} ${unit}`;
}

function formatDateTime(value: any) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN");
}

function formatDateOnly(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function maskAccountNumber(value: any) {
  if (!value || typeof value !== "string") return "--";
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  return `${"*".repeat(clean.length - 4)}${clean.slice(-4)}`;
}

function getEarningsDateRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), 0, 1);
  return {
    fromDate: formatDateOnly(start),
    toDate: formatDateOnly(today),
  };
}

function getEarningsDateLabel() {
  const { fromDate, toDate } = getEarningsDateRange();
  return `From ${fromDate} to ${toDate}`;
}

function buildMapUrl(normalized: { latitude: string; longitude: string; location: string }) {
  const lat = normalized.latitude !== "--" ? normalized.latitude : "";
  const lng = normalized.longitude !== "--" ? normalized.longitude : "";
  if (lat && lng)
    return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
  if (normalized.location && normalized.location !== "--")
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(normalized.location)}`;
  return "";
}

function computeAllocationPercent(
  total: number | null,
  allocated: number | null
) {
  if (!total || !allocated || total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((allocated / total) * 100)));
}

function computeProfileCompleteness(values: any[]) {
  if (!values.length) return 0;
  const filled = values.filter(
    (v) => v !== null && v !== undefined && v !== "" && v !== "--"
  ).length;
  return Math.round((filled / values.length) * 100);
}