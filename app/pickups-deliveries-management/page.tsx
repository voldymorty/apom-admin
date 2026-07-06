"use client";
import * as XLSX from "xlsx";
import { useEffect, useState, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import ProtectedRoute from "../routes/ProtectedRoute";
import api, { imageBaseURL } from "@/app/services/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  IconSearch,
  IconRefresh,
  IconAlertTriangle,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconBan,
  IconTruck,
  IconArrowRight,
  IconHistory,
  IconPlus,
  IconMapPin,
  IconUser,
  IconPhone,
  IconPackage,
  IconCalendar,
  IconCheck,
  IconClockHour4,
  IconCurrencyRupee,
  IconMaximize,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryType = "pickup" | "delivery";

type DeliveryStatus =
  | "assigned"
  | "accepted"
  | "in_transit"
  | "reached"
  | "completed"
  | "failed"
  | "cancelled";

interface TaskListItem {
  delivery_id: number;
  delivery_number: string;
  delivery_type: DeliveryType;
  status: DeliveryStatus;
  scheduled_date: string;
  scheduled_time_slot: string;
  expected_quantity_kg: number;
  actual_quantity_kg: number;
  procurement_amount?: number | string | null;
  procurement_status?: "pending_review" | "finalized" | null;
  final_procurement_amount?: number | string | null;
  pickup_address: string;
  delivery_address: string;
  delivery_person: {
    delivery_person_id: number;
    full_name: string;
    vehicle_type: string;
    vehicle_number: string;
  } | null;
  farmer: { farmer_id: number; full_name: string } | null;
  vendor: { vendor_id: number; shop_name: string } | null;
  order: { order_id: number; order_number: string; final_amount: string } | null;
  created_at: string;
  final_grade?: string | null;
  payment_status?: "pending" | "processing" | "paid" | "failed" | null;
  payment_method?: "bank_transfer" | "upi" | "cash" | "cheque" | null;
}

interface TaskDetail {
  delivery_id: number;
  delivery_number: string;
  delivery_type: DeliveryType;
  farmer_id: number | null;
  crop_id: number | null;
  order_id: number | null;
  vendor_id: number | null;
  delivery_person_id: number | null;
  assigned_by: number | null;
  pickup_address: string;
  pickup_latitude: string | null;
  pickup_longitude: string | null;
  pickup_contact_name: string;
  pickup_contact_number: string;
  delivery_address: string;
  delivery_latitude: string | null;
  delivery_longitude: string | null;
  delivery_contact_name: string;
  delivery_contact_number: string;
  scheduled_date: string;
  scheduled_time_slot: string;
  status: DeliveryStatus;
  otp_code: string | null;
  otp_verified_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  reached_at: string | null;
  completed_at: string | null;
  expected_quantity_kg: string;
  actual_quantity_kg: string;
  procurement_amount?: string | number | null;
  procurement_price_per_kg?: string | number | null;
  procurement_status?: "pending_review" | "finalized" | null;
  procurement_submitted_at?: string | null;
  wastage_quantity_kg?: string | number | null;
  accepted_quantity_kg?: string | number | null;
  final_procurement_amount?: string | number | null;
  procurement_remarks?: string | null;
  finalized_at?: string | null;
  delivery_notes: string | null;
  final_grade?: string | null;
  payment_status?: "pending" | "processing" | "paid" | "failed" | null;
  payment_method?: "bank_transfer" | "upi" | "cash" | "cheque" | null;
  payment_date?: string | null;
  transaction_id?: string | null;
  transaction_reference?: string | null;
  failure_reason: string | null;
  proof_photo_url: string | null;
  estimated_distance_km: string | null;
  actual_distance_km: string | null;
  estimated_time_minutes: number | null;
  actual_time_minutes: number | null;
  created_at: string;
  updated_at: string;
  delivery_person: {
    delivery_person_id: number;
    full_name: string;
    vehicle_type: string;
    vehicle_number: string;
    rating: string;
    user: { mobile_number: string } | null;
  } | null;
  farmer: { farmer_id: number; full_name: string; user: { mobile_number: string } | null } | null;
  crop: {
    crop_id: number;
    product_id?: number;
    grade: string;
    quantity_kg: string;
    expected_price_per_kg: string;
    status: string;
    product?: { product_id: number; product_name: string; unit: string };
  } | null;
  vendor: {
    vendor_id: number;
    shop_name: string;
    owner_name: string;
    user: { mobile_number: string } | null;
  } | null;
  order: {
    order_id: number;
    order_number: string;
    final_amount: string;
    order_status: string;
  } | null;
  status_history: StatusHistoryItem[];
}

interface StatusHistoryItem {
  history_id: number;
  delivery_id: number;
  old_status: string;
  new_status: string;
  changed_by: number;
  latitude: string | null;
  longitude: string | null;
  remarks: string | null;
  photo_url: string | null;
  created_at: string;
  changed_user: { user_id: number; mobile_number: string } | null;
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
  from_date: string;
  to_date: string;
}

interface CreateTaskForm {
  delivery_type: DeliveryType;
  farmer_id: string;
  crop_id: string;
  pickup_address: string;
  pickup_contact_name: string;
  pickup_contact_number: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_number: string;
  scheduled_date: string;
  scheduled_time_slot: string;
  expected_quantity_kg: string;
  delivery_notes: string;
}

interface SearchSelectOption {
  id: number;
  label: string;
  sublabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "assigned","accepted","in_transit","reached","completed","failed","cancelled",
];

const STATUS_FLOW: Record<DeliveryStatus, DeliveryStatus[]> = {
  assigned: ["accepted", "cancelled"],
  accepted: ["in_transit", "cancelled"],
  in_transit: ["reached", "failed"],
  reached: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

const NON_CANCELLABLE: DeliveryStatus[] = ["completed", "failed", "cancelled"];

const TIME_SLOTS = [
  "06:00-09:00","09:00-12:00","12:00-15:00","15:00-18:00","18:00-21:00",
];

const DEFAULT_FILTERS: Filters = { search: "", status: "", from_date: "", to_date: "" };

const DEFAULT_FORM: CreateTaskForm = {
  delivery_type: "pickup",
  farmer_id: "",
  crop_id: "",
  pickup_address: "",
  pickup_contact_name: "",
  pickup_contact_number: "",
  delivery_address: "",
  delivery_contact_name: "",
  delivery_contact_number: "",
  scheduled_date: "",
  scheduled_time_slot: "",
  expected_quantity_kg: "",
  delivery_notes: "",
};

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; className: string; dot: string; icon: React.ReactNode }> = {
  assigned: { label: "Assigned", className: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", icon: <IconUser className="size-3" /> },
  accepted: { label: "Accepted", className: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500", icon: <IconCheck className="size-3" /> },
  in_transit: { label: "In Transit", className: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", icon: <IconTruck className="size-3" /> },
  reached: { label: "Reached", className: "bg-cyan-50 text-cyan-700 border-cyan-200", dot: "bg-cyan-500", icon: <IconMapPin className="size-3" /> },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", icon: <IconCheck className="size-3" /> },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", icon: <IconAlertTriangle className="size-3" /> },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", icon: <IconX className="size-3" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-medium ${cfg.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </Badge>
  );
}

function TypeBadge({ type }: { type: DeliveryType }) {
  return (
    <Badge variant="outline" className={type === "pickup" ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium" : "bg-teal-50 text-teal-700 border-teal-200 font-medium"}>
      {type === "pickup" ? <IconPackage className="size-3 mr-1" /> : <IconTruck className="size-3 mr-1" />}
      {type === "pickup" ? "Pickup" : "Delivery"}
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

function FormField({ label, id, children, className = "" }: { label: string; id: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── SearchSelect Component ───────────────────────────────────────────────────

function SearchSelect({ id, placeholder, value, onChange, fetchOptions, disabled }: {
  id: string; placeholder: string; value: SearchSelectOption | null;
  onChange: (opt: SearchSelectOption | null) => void;
  fetchOptions: (query: string) => Promise<SearchSelectOption[]>;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSelectOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(async (q: string) => {
    setLoading(true); setOpen(true);
    try { const opts = await fetchOptions(q); setResults(opts); }
    catch { setResults([]); }
    finally { setLoading(false); }
  }, [fetchOptions]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value; setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 250);
  };

  const select = (opt: SearchSelectOption) => { onChange(opt); setQuery(""); setOpen(false); setResults([]); };
  const clear = () => { onChange(null); setQuery(""); setResults([]); setOpen(false); };

  return (
    <div ref={wrapRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 text-sm">
          <span className="flex-1 font-medium truncate">{value.label}</span>
          {value.sublabel && <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">{value.sublabel}</span>}
          {!disabled && <button type="button" onClick={clear} className="ml-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors" aria-label="Clear selection"><IconX className="size-3.5" /></button>}
        </div>
      ) : (
        <div className="relative">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input id={id} className="pl-8" placeholder={placeholder} value={query} onChange={handleInput} onFocus={() => { if (!value) search(query); }} disabled={disabled} autoComplete="off" />
        </div>
      )}
      {open && !value && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border border-border bg-popover shadow-md overflow-hidden max-h-52 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground"><Spinner size="sm" /> Searching…</div>
          ) : results.length === 0 ? (
            <div className="py-3 text-center text-xs text-muted-foreground">No results found</div>
          ) : results.map((opt) => (
            <button key={opt.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => select(opt)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex flex-col gap-0.5 border-b border-border/40 last:border-0">
              <span className="font-medium text-foreground">{opt.label}</span>
              {opt.sublabel && <span className="text-xs text-muted-foreground">{opt.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Task Dialog ───────────────────────────────────────────────────────

function CreateTaskDialog({ open, onOpenChange, defaultType, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; defaultType: DeliveryType; onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateTaskForm>({ ...DEFAULT_FORM, delivery_type: defaultType });
  const [loading, setLoading] = useState(false);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<SearchSelectOption | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<SearchSelectOption | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SearchSelectOption | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<SearchSelectOption | null>(null);
const [selectedCrop, setSelectedCrop] = useState<SearchSelectOption | null>(null);

  useEffect(() => {
    if (open) { setForm({ ...DEFAULT_FORM, delivery_type: defaultType }); setSelectedDeliveryPerson(null); setSelectedVendor(null); setSelectedOrder(null);setSelectedFarmer(null);
    setSelectedCrop(null); }
  }, [open, defaultType]);
useEffect(() => { setSelectedCrop(null); }, [selectedFarmer]);
  const set = (k: keyof CreateTaskForm, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const fetchDeliveryPersons = useCallback(async (query: string) => {
    const res = await api.get(`/admin/delivery-personnel?search=${encodeURIComponent(query)}&limit=20`);
    const raw = res.data?.data;
    const list: Record<string, unknown>[] = raw?.personnel ?? raw?.delivery_personnel ?? (Array.isArray(raw) ? raw : []);
    return list.map((p) => ({ id: p.delivery_person_id as number, label: p.full_name as string, sublabel: `${String(p.vehicle_type ?? "").toUpperCase()} · ${p.vehicle_number ?? ""}` }));
  }, []);

  const fetchVendors = useCallback(async (query: string) => {
    const res = await api.get(`/admin/vendors?search=${encodeURIComponent(query)}&limit=20`);
    const raw = res.data?.data;
    const list: Record<string, unknown>[] = raw?.vendors ?? (Array.isArray(raw) ? raw : []);
    return list.map((v) => ({ id: v.vendor_id as number, label: v.shop_name as string, sublabel: v.owner_name as string }));
  }, []);

  const fetchOrders = useCallback(async (query: string) => {
    const res = await api.get(`/admin/orders?search=${encodeURIComponent(query)}&limit=20`);
    const raw = res.data?.data;
    const list: Record<string, unknown>[] = raw?.orders ?? (Array.isArray(raw) ? raw : []);
    return list.map((o) => ({ id: o.order_id as number, label: o.order_number as string, sublabel: `₹${o.final_amount ?? "—"} · ${o.order_status ?? ""}` }));
  }, []);

  const fetchFarmers = useCallback(async (query: string) => {
  const res = await api.get(`/admin/farmers?search=${encodeURIComponent(query)}&limit=20`);
  const raw = res.data?.data;
  const list: Record<string, unknown>[] = raw?.farmers ?? (Array.isArray(raw) ? raw : []);
  return list.map((f) => ({
    id: f.farmer_id as number,
    label: f.full_name as string,
    sublabel: (f.mobile_number as string) ?? (f.village as string) ?? undefined,
  }));
}, []);

const fetchCrops = useCallback(async (query: string) => {
  if (!selectedFarmer?.id) return [];
  const res = await api.get(`/admin/crops?farmer_id=${selectedFarmer.id}&search=${encodeURIComponent(query)}&limit=20`);
  const raw = res.data?.data;
  const list: Record<string, unknown>[] = raw?.crops ?? (Array.isArray(raw) ? raw : []);
  return list.map((c) => {
    const product = c.product as { product_name?: string } | undefined;
    return {
      id: c.crop_id as number,
      label: product?.product_name ?? `Crop #${c.crop_id}`,
      sublabel: `Grade ${c.grade ?? "—"} · ${c.quantity_kg ?? "—"} kg`,
    };
  });
}, [selectedFarmer]);

  const handleSubmit = async () => {
    if (!form.pickup_address || !form.pickup_contact_name || !form.pickup_contact_number || !selectedDeliveryPerson?.id || !form.scheduled_date || !form.scheduled_time_slot) {
      toast.error("Please fill all required fields"); return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        delivery_type: form.delivery_type,
        pickup_address: form.pickup_address, pickup_contact_name: form.pickup_contact_name, pickup_contact_number: form.pickup_contact_number,
        delivery_address: form.delivery_address, delivery_contact_name: form.delivery_contact_name, delivery_contact_number: form.delivery_contact_number,
        delivery_person_id: selectedDeliveryPerson.id, scheduled_date: form.scheduled_date, scheduled_time_slot: form.scheduled_time_slot,
        expected_quantity_kg: form.expected_quantity_kg ? Number(form.expected_quantity_kg) : undefined,
        delivery_notes: form.delivery_notes || undefined,
      };
      if (form.delivery_type === "pickup") { if (form.farmer_id) body.farmer_id = Number(form.farmer_id); if (form.crop_id) body.crop_id = Number(form.crop_id); }
      else { if (selectedOrder?.id) body.order_id = selectedOrder.id; if (selectedVendor?.id) body.vendor_id = selectedVendor.id; }
      await api.post("/admin/pickups-deliveries", body);
      toast.success(`${form.delivery_type === "pickup" ? "Pickup" : "Delivery"} task created successfully`);
      onOpenChange(false); onCreated();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to create task"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Schedule a pickup from a farmer or a delivery to a vendor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <FormField label="Task Type" id="task_type">
            <div className="flex rounded-lg border overflow-hidden">
              {(["pickup", "delivery"] as DeliveryType[]).map((t) => (
                <button key={t} onClick={() => set("delivery_type", t)} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${form.delivery_type === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  {t === "pickup" ? <IconPackage className="size-4" /> : <IconTruck className="size-4" />}
                  {t === "pickup" ? "Pickup" : "Delivery"}
                </button>
              ))}
            </div>
          </FormField>
         {form.delivery_type === "pickup" && (
  <div className="grid grid-cols-2 gap-3">
    <FormField label="Farmer" id="farmer_id">
      <SearchSelect
        id="farmer_id"
        placeholder="Search farmer name…"
        value={selectedFarmer}
        onChange={setSelectedFarmer}
        fetchOptions={fetchFarmers}
/>
    </FormField>
    <FormField label="Crop" id="crop_id">
      <SearchSelect
        id="crop_id"
        placeholder={selectedFarmer ? "Search crop…" : "Select a farmer first"}
        value={selectedCrop}
        onChange={setSelectedCrop}
        fetchOptions={fetchCrops}
        disabled={!selectedFarmer}
      />
    </FormField>
  </div>
)}
          {form.delivery_type === "delivery" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Order" id="order_id"><SearchSelect id="order_id" placeholder="Search order number…" value={selectedOrder} onChange={setSelectedOrder} fetchOptions={fetchOrders} /></FormField>
              <FormField label="Vendor" id="vendor_id"><SearchSelect id="vendor_id" placeholder="Search shop name…" value={selectedVendor} onChange={setSelectedVendor} fetchOptions={fetchVendors} /></FormField>
            </div>
          )}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pickup Details</p>
            <FormField label="Pickup Address *" id="pickup_address"><Textarea id="pickup_address" rows={2} placeholder="123 Farm Road, Pollachi" value={form.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} className="resize-none" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact Name *" id="pickup_contact_name"><Input id="pickup_contact_name" placeholder="Rajan Kumar" value={form.pickup_contact_name} onChange={(e) => set("pickup_contact_name", e.target.value)} /></FormField>
              <FormField label="Contact Number *" id="pickup_contact_number"><Input id="pickup_contact_number" placeholder="9876543210" value={form.pickup_contact_number} onChange={(e) => set("pickup_contact_number", e.target.value)} /></FormField>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Details</p>
            <FormField label="Delivery Address" id="delivery_address"><Textarea id="delivery_address" rows={2} placeholder="12 Market Street, Chennai" value={form.delivery_address} onChange={(e) => set("delivery_address", e.target.value)} className="resize-none" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact Name" id="delivery_contact_name"><Input id="delivery_contact_name" placeholder="Karthik R" value={form.delivery_contact_name} onChange={(e) => set("delivery_contact_name", e.target.value)} /></FormField>
              <FormField label="Contact Number" id="delivery_contact_number"><Input id="delivery_contact_number" placeholder="9123456789" value={form.delivery_contact_number} onChange={(e) => set("delivery_contact_number", e.target.value)} /></FormField>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Delivery Person *" id="delivery_person_id"><SearchSelect id="delivery_person_id" placeholder="Search by name…" value={selectedDeliveryPerson} onChange={setSelectedDeliveryPerson} fetchOptions={fetchDeliveryPersons} /></FormField>
            <FormField label="Expected Qty (kg)" id="expected_quantity_kg"><Input id="expected_quantity_kg" type="number" placeholder="e.g. 100" value={form.expected_quantity_kg} onChange={(e) => set("expected_quantity_kg", e.target.value)} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Scheduled Date *" id="scheduled_date"><Input id="scheduled_date" type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} /></FormField>
            <FormField label="Time Slot *" id="scheduled_time_slot">
              <Select value={form.scheduled_time_slot} onValueChange={(v) => set("scheduled_time_slot", v)}>
                <SelectTrigger id="scheduled_time_slot"><SelectValue placeholder="Select slot" /></SelectTrigger>
                <SelectContent>{TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Notes" id="delivery_notes"><Textarea id="delivery_notes" rows={2} placeholder="Any special instructions..." value={form.delivery_notes} onChange={(e) => set("delivery_notes", e.target.value)} className="resize-none" /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? <><Spinner size="sm" /> Creating…</> : <><IconPlus className="size-4" /> Create Task</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({ task, open, onOpenChange, onAssigned }: {
  task: TaskDetail | null; open: boolean; onOpenChange: (v: boolean) => void; onAssigned: () => void;
}) {
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<SearchSelectOption | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDeliveryPersons = useCallback(async (query: string) => {
    const res = await api.get(`/admin/delivery-personnel?search=${encodeURIComponent(query)}&limit=20`);
    const raw = res.data?.data;
    const list: Record<string, unknown>[] = raw?.personnel ?? raw?.delivery_personnel ?? (Array.isArray(raw) ? raw : []);
    return list.map((p) => ({ id: p.delivery_person_id as number, label: p.full_name as string, sublabel: `${String(p.vehicle_type ?? "").toUpperCase()} · ${p.vehicle_number ?? ""}` }));
  }, []);

  useEffect(() => {
    if (open && task) {
      setSelectedDeliveryPerson(task.delivery_person ? { id: task.delivery_person.delivery_person_id, label: task.delivery_person.full_name, sublabel: `${task.delivery_person.vehicle_type.toUpperCase()} · ${task.delivery_person.vehicle_number}` } : null);
      setScheduledDate(task.scheduled_date ?? "");
      setTimeSlot(task.scheduled_time_slot ?? "");
    }
  }, [open, task]);

  const handleAssign = async () => {
    if (!task || !selectedDeliveryPerson?.id || !scheduledDate || !timeSlot) { toast.error("Please fill all required fields"); return; }
    setLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/assign`, { delivery_person_id: selectedDeliveryPerson.id, scheduled_date: scheduledDate, scheduled_time_slot: timeSlot });
      toast.success("Delivery personnel assigned successfully");
      onOpenChange(false); onAssigned();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to assign"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign / Reassign</DialogTitle>
          <DialogDescription>Update the delivery person and schedule for <span className="font-mono font-semibold">{task?.delivery_number}</span></DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <FormField label="Delivery Person *" id="assign_dp_id"><SearchSelect id="assign_dp_id" placeholder="Search by name…" value={selectedDeliveryPerson} onChange={setSelectedDeliveryPerson} fetchOptions={fetchDeliveryPersons} /></FormField>
          <FormField label="Scheduled Date *" id="assign_date"><Input id="assign_date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></FormField>
          <FormField label="Time Slot *" id="assign_slot">
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger id="assign_slot"><SelectValue placeholder="Select slot" /></SelectTrigger>
              <SelectContent>{TIME_SLOTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading} className="gap-2">
            {loading ? <><Spinner size="sm" /> Assigning…</> : "Confirm Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Procurement Review ───────────────────────────────────────────────────────

function ProcurementStatusBadge({ status }: { status?: "pending_review" | "finalized" | null }) {
  if (!status) return null;
  if (status === "pending_review") return <Badge className="bg-amber-50 text-amber-800 border-amber-200">Pending review</Badge>;
  return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200">Finalized</Badge>;
}

function ProcurementReviewSection({ task, onFinalized }: { task: TaskDetail; onFinalized: () => void }) {
  const procuredQty = parseFloat(String(task.actual_quantity_kg ?? 0));
  const reportedAmount = parseFloat(String(task.procurement_amount ?? 0));
  const [wastage, setWastage] = useState("0");
  const [acceptedQty, setAcceptedQty] = useState(procuredQty > 0 ? String(procuredQty) : "");
  const [finalAmount, setFinalAmount] = useState(reportedAmount > 0 ? String(reportedAmount) : "");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const w = parseFloat(wastage || "0");
    if (procuredQty > 0 && !isNaN(w)) {
      const next = Math.max(0, procuredQty - w);
      setAcceptedQty(next > 0 ? next.toFixed(2) : "");
    }
  }, [wastage, procuredQty]);

  const handleFinalize = async () => {
    const w = parseFloat(wastage || "0"), accepted = parseFloat(acceptedQty), amount = parseFloat(finalAmount);
    if (isNaN(accepted) || accepted <= 0) { toast.error("Enter a valid accepted quantity after wastage"); return; }
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid final procurement amount"); return; }
    setLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/finalize-procurement`, {
        wastage_quantity_kg: w, accepted_quantity_kg: accepted,
        final_procurement_amount: amount, procurement_remarks: remarks.trim() || undefined,
      });
      toast.success("Procurement finalized — stock added to inventory");
      onFinalized();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to finalize procurement"); }
    finally { setLoading(false); }
  };

  const productName = task.crop?.product?.product_name ?? `Product #${task.crop?.product_id ?? "—"}`;

  const ratePreview = (() => {
    const accepted = parseFloat(acceptedQty || "0");
    const amount = parseFloat(finalAmount || "0");
    return accepted > 0 && amount > 0 ? (amount / accepted).toFixed(2) : null;
  })();

  if (!task.procurement_status) {
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
          <IconPackage className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Procurement Review</span>
        </div>
        <div className="px-4 py-5 text-center text-xs text-muted-foreground italic">
          Waiting for the delivery person to submit procurement details after pickup.
        </div>
      </div>
    );
  }

  if (task.procurement_status === "finalized") {
    return (
      <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-200 dark:border-emerald-800 bg-emerald-700 dark:bg-emerald-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconCheck className="size-4 text-emerald-200" />
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Procurement Review</span>
          </div>
          <Badge className="bg-emerald-400 text-emerald-900 border-0 text-[11px] font-semibold">✓ Finalized</Badge>
        </div>
        <div className="bg-card px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
       <InfoRow label="Final grade" value={task.crop?.grade ?? "—"} />
<InfoRow label="Wastage removed" value={`${task.wastage_quantity_kg ?? 0} kg`} />
<InfoRow label="Accepted to inventory" value={`${task.accepted_quantity_kg ?? 0} kg`} />
<InfoRow label="Final amount" value={`₹ ${Number(task.final_procurement_amount ?? 0).toLocaleString("en-IN")}`} />
<InfoRow label="Payment status" value={task.status ?? "—"} />
<InfoRow label="Payment method" value={task.payment_method ?? "—"} />
          {task.procurement_remarks && <div className="col-span-2"><InfoRow label="Remarks" value={task.procurement_remarks} /></div>}
        </div>
        <p className="px-4 py-2.5 text-[11px] text-muted-foreground italic border-t border-border bg-muted/10">
          Farmer payment is handled outside the application.
        </p>
      </div>
    );
  }

  // ── Pending review state ─────────────────────────────────────────────────
  return (
    <div className="rounded-xl border-2 border-violet-400 dark:border-violet-600 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-violet-700 dark:bg-violet-900 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconClockHour4 className="size-4 text-violet-200" />
          <span className="text-xs font-semibold text-violet-100 uppercase tracking-wide">Procurement Review</span>
        </div>
        <Badge className="bg-amber-400 text-amber-900 border-0 text-[11px] font-semibold gap-1.5 flex items-center">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-700 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-700"></span>
          </span>
          Pending Review
        </Badge>
      </div>
      <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 flex items-start gap-2.5">
        <IconAlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          Inspect the procured product, record any wastage, confirm the final amount, then finalize to add stock to inventory.
        </p>
      </div>
      <div className="grid grid-cols-2 border-b border-border bg-card">
        {[
          { label: "Product", value: productName },
          { label: "Grade", value: task.crop?.grade ?? "—" },
          { label: "Procured qty", value: `${procuredQty || "—"} kg` },
          { label: "Reported amount", value: reportedAmount > 0 ? `₹ ${reportedAmount.toLocaleString("en-IN")}` : "—" },
          ...(task.procurement_price_per_kg ? [{ label: "Reported rate", value: `₹ ${task.procurement_price_per_kg} / kg` }] : []),
        ].map((item, i) => (
          <div key={item.label} className={`px-4 py-2.5 `}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{item.label}</p>
            <p className="text-sm font-medium">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-4 bg-violet-50/40 dark:bg-violet-950/10 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Wastage (kg)" id="wastage_kg">
            <Input id="wastage_kg" type="number" min={0} step="0.01" value={wastage} onChange={(e) => setWastage(e.target.value)} />
          </FormField>
          <FormField label="Accepted qty (kg)" id="accepted_kg">
            <Input id="accepted_kg" type="number" min={0} step="0.01" value={acceptedQty} onChange={(e) => setAcceptedQty(e.target.value)} className="bg-muted/50 text-muted-foreground" readOnly />
          </FormField>
        </div>
        <FormField label="Final amount (₹) *" id="final_amount">
          <Input id="final_amount" type="number" min={0} step="0.01" value={finalAmount} onChange={(e) => setFinalAmount(e.target.value)} className="border-violet-300 dark:border-violet-700 focus-visible:ring-violet-400" />
        </FormField>
        {(parseFloat(acceptedQty) > 0 || parseFloat(finalAmount) > 0) && (
          <div className="grid grid-cols-3 gap-2 bg-violet-100/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg px-3 py-2.5 text-center">
            {[
              { label: "Accepted", value: `${parseFloat(acceptedQty || "0").toFixed(1)} kg` },
              { label: "Rate", value: ratePreview ? `₹${ratePreview}/kg` : "—" },
              { label: "Total", value: parseFloat(finalAmount || "0") > 0 ? `₹ ${Number(finalAmount).toLocaleString("en-IN")}` : "—" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-0.5">{s.label}</p>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">{s.value}</p>
              </div>
            ))}
          </div>
        )}
        <FormField label="Inspection remarks" id="proc_remarks">
          <Textarea id="proc_remarks" rows={2} placeholder="Optional notes from warehouse inspection…" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </FormField>
        <Button onClick={handleFinalize} disabled={loading} className="w-full gap-2 bg-violet-700 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-700 h-10 text-sm font-medium">
          {loading ? <><Spinner size="sm" /> Finalizing…</> : <><IconCheck className="size-4" /> Finalize &amp; add to inventory</>}
        </Button>
      </div>
    </div>
  );
}
// ─── Procurement Review Inline Content (for Dialog — no header wrapper) ───────

// ─── Procurement Review Inline Content ───────────────────────────────────────

function ProcurementReviewInlineContent({ task, onFinalized, onCancel }: {
  task: TaskDetail;
  onFinalized: () => void;
  onCancel?: () => void;
}) {
  const procuredQty = parseFloat(String(task.actual_quantity_kg ?? 0));
  const reportedAmount = parseFloat(String(task.procurement_amount ?? 0));

  const [activeTab, setActiveTab] = useState<1 | 2>(1);
  const [wastage, setWastage] = useState("0");
  const [acceptedQty, setAcceptedQty] = useState(procuredQty > 0 ? String(procuredQty) : "");
  const [finalAmount, setFinalAmount] = useState(reportedAmount > 0 ? String(reportedAmount) : "");
  const [finalGrade, setFinalGrade] = useState(task.crop?.grade ?? "A");
  const [remarks, setRemarks] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "paid" | "failed">("pending");
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "upi" | "cash" | "cheque" | "">("");
  const [paymentDate, setPaymentDate] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const w = parseFloat(wastage || "0");
    if (procuredQty > 0 && !isNaN(w)) {
      const next = Math.max(0, procuredQty - w);
      setAcceptedQty(next > 0 ? next.toFixed(2) : "");
    }
  }, [wastage, procuredQty]);

  const ratePreview = (() => {
    const accepted = parseFloat(acceptedQty || "0");
    const amount = parseFloat(finalAmount || "0");
    return accepted > 0 && amount > 0 ? (amount / accepted).toFixed(2) : null;
  })();

  const handleNext = () => {
    const accepted = parseFloat(acceptedQty);
    const amount = parseFloat(finalAmount);
    if (isNaN(accepted) || accepted <= 0) { toast.error("Enter a valid accepted quantity after wastage"); return; }
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid final procurement amount"); return; }
    setActiveTab(2);
  };

  const handleFinalize = async () => {
    const w = parseFloat(wastage || "0");
    const accepted = parseFloat(acceptedQty);
    const amount = parseFloat(finalAmount);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        wastage_quantity_kg: w,
        accepted_quantity_kg: accepted,
        final_procurement_amount: amount,
        final_grade: finalGrade || undefined,
        payment_status: paymentStatus,
        procurement_remarks: remarks.trim() || undefined,
      };
      if (paymentMethod) payload.payment_method = paymentMethod;
      if (paymentDate) payload.payment_date = new Date(paymentDate).toISOString();
      if (transactionId.trim()) payload.transaction_id = transactionId.trim();
      if (transactionReference.trim()) payload.transaction_reference = transactionReference.trim();

      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/finalize-procurement`, payload);
      toast.success("Procurement finalized — stock added to inventory");
      onFinalized();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to finalize procurement");
    } finally {
      setLoading(false);
    }
  };

  const productName = task.crop?.product?.product_name ?? `Product #${task.crop?.product_id ?? "—"}`;

  return (
    <div className="flex flex-col">
      {/* ── Step tab bar ── */}
      <div className="flex border-b border-border bg-muted/10 -mx-1">
        {([
          { step: 1 as const, label: "Product details", icon: <IconPackage className="size-3.5" /> },
          { step: 2 as const, label: "Payment", icon: <IconCheck className="size-3.5" /> },
        ] as const).map(({ step, label, icon }) => {
          const isDone = activeTab > step;
          const isActive = activeTab === step;
          return (
            <button
              key={step}
              onClick={() => step < activeTab && setActiveTab(step)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors
                ${isActive ? "border-violet-600 text-violet-700 dark:text-violet-400 bg-background" : "border-transparent"}
                ${isDone ? "text-emerald-700 dark:text-emerald-400 cursor-pointer" : "text-muted-foreground cursor-default"}
              `}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0
                ${isActive ? "bg-violet-600 text-white" : isDone ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}
              `}>
                {isDone ? <IconCheck className="size-3" /> : step}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Product details ── */}
      {activeTab === 1 && (
        <div className="space-y-3 pt-3">
          {/* Info grid */}
          <div className="grid grid-cols-2 rounded-lg border border-border bg-card overflow-hidden">
            {[
              { label: "Product", value: productName },
              { label: "Original grade", value: task.crop?.grade ?? "—" },
              { label: "Procured qty", value: `${procuredQty || "—"} kg` },
              { label: "Reported amount", value: reportedAmount > 0 ? `₹ ${reportedAmount.toLocaleString("en-IN")}` : "—" },
              ...(task.procurement_price_per_kg ? [{ label: "Reported rate", value: `₹ ${task.procurement_price_per_kg} / kg` }] : []),
            ].map((item) => (
              <div key={item.label} className="px-3 py-2 [&:nth-child(even)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Quantity & quality section */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
              <IconPackage className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity &amp; quality</span>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Wastage (kg)" id="dlg_wastage_kg">
                  <Input id="dlg_wastage_kg" type="number" min={0} step="0.01" value={wastage} onChange={(e) => setWastage(e.target.value)} />
                </FormField>
                <FormField label="Accepted qty (kg)" id="dlg_accepted_kg">
                  <Input id="dlg_accepted_kg" type="number" min={0} step="0.01" value={acceptedQty} readOnly className="bg-muted/50 text-muted-foreground" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Final grade" id="dlg_final_grade">
                  <Select value={finalGrade} onValueChange={setFinalGrade}>
                    <SelectTrigger id="dlg_final_grade"><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Final amount (₹) *" id="dlg_final_amount">
                  <Input id="dlg_final_amount" type="number" min={0} step="0.01" value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    className="border-violet-300 dark:border-violet-700 focus-visible:ring-violet-400" />
                </FormField>
              </div>

              {/* Live preview strip */}
              {(parseFloat(acceptedQty) > 0 || parseFloat(finalAmount) > 0) && (
                <div className="grid grid-cols-3 border border-violet-200 dark:border-violet-800 rounded-lg overflow-hidden">
                  {[
                    { label: "Accepted", value: `${parseFloat(acceptedQty || "0").toFixed(1)} kg` },
                    { label: "Rate", value: ratePreview ? `₹${ratePreview}/kg` : "—" },
                    { label: "Total", value: parseFloat(finalAmount || "0") > 0 ? `₹ ${Number(finalAmount).toLocaleString("en-IN")}` : "—" },
                  ].map((s, i) => (
                    <div key={s.label} className={`py-2 text-center bg-violet-50/70 dark:bg-violet-950/30 ${i < 2 ? "border-r border-violet-200 dark:border-violet-800" : ""}`}>
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-0.5">{s.label}</p>
                      <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <FormField label="Inspection remarks" id="dlg_proc_remarks">
                <Textarea id="dlg_proc_remarks" rows={2} placeholder="Optional notes from warehouse inspection…"
                  value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Tab 1 footer */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={onCancel} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20">
              <IconX className="size-3.5" />Cancel
            </Button>
            <Button onClick={handleNext} className="gap-2 bg-violet-700 hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-700">
              Next <IconArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab 2: Payment ── */}
      {activeTab === 2 && (
        <div className="space-y-3 pt-3">
          {/* Payment section */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
              <IconCheck className="size-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment details</span>
            </div>
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Payment status" id="dlg_payment_status">
                  <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
                    <SelectTrigger id="dlg_payment_status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Payment method" id="dlg_payment_method">
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                    <SelectTrigger id="dlg_payment_method"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">Google Pay or other UPI</SelectItem>
                       <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Payment date" id="dlg_payment_date">
                  <Input id="dlg_payment_date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </FormField>
                <FormField label="Transaction ID" id="dlg_transaction_id">
                  <Input id="dlg_transaction_id" placeholder="TXN123456" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Transaction reference" id="dlg_txn_ref">
                <Input id="dlg_txn_ref" placeholder="UPIREF987654" value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Summary recap */}
          <div className="grid grid-cols-2 rounded-lg border border-border bg-muted/20 overflow-hidden">
            {[
              { label: "Accepted qty", value: `${parseFloat(acceptedQty || "0").toFixed(1)} kg` },
              { label: "Final amount", value: parseFloat(finalAmount || "0") > 0 ? `₹ ${Number(finalAmount).toLocaleString("en-IN")}` : "—" },
              { label: "Final grade", value: finalGrade || "—" },
              { label: "Effective rate", value: ratePreview ? `₹${ratePreview}/kg` : "—" },
            ].map((item, i) => (
              <div key={item.label} className="px-3 py-2 border-b border-r border-border [&:nth-child(even)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Tab 2 footer */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="outline" size="sm" onClick={() => setActiveTab(1)} className="gap-1.5">
              <IconArrowRight className="size-3.5 rotate-180" />Previous
            </Button>
            <Button onClick={handleFinalize} disabled={loading}
              className="gap-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              {loading ? <><Spinner size="sm" /> Finalizing…</> : <><IconCheck className="size-4" /> Finalize &amp; add to inventory</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Procurement Review Dialog ────────────────────────────────────────────────

// ─── Procurement Review Dialog ────────────────────────────────────────────────

function ProcurementReviewDialog({ task, onOpenChange, onFinalized }: {
  task: TaskListItem | null;
  onOpenChange: (open: boolean) => void;
  onFinalized: () => void;
}) {
  const syntheticTask = task ? {
    delivery_id: task.delivery_id,
    delivery_number: task.delivery_number,
    delivery_type: task.delivery_type,
    farmer_id: task.farmer?.farmer_id ?? null,
    crop_id: null,
    order_id: null,
    vendor_id: null,
    delivery_person_id: task.delivery_person?.delivery_person_id ?? null,
    assigned_by: null,
    pickup_address: task.pickup_address,
    pickup_latitude: null,
    pickup_longitude: null,
    pickup_contact_name: "",
    pickup_contact_number: "",
    delivery_address: task.delivery_address,
    delivery_latitude: null,
    delivery_longitude: null,
    delivery_contact_name: "",
    delivery_contact_number: "",
    scheduled_date: task.scheduled_date,
    scheduled_time_slot: task.scheduled_time_slot,
    status: task.status,
    otp_code: null,
    otp_verified_at: null,
    accepted_at: null,
    started_at: null,
    reached_at: null,
    completed_at: null,
    expected_quantity_kg: String(task.expected_quantity_kg ?? ""),
    actual_quantity_kg: String(task.actual_quantity_kg ?? ""),
    procurement_amount: task.procurement_amount,
    procurement_price_per_kg: null,
    procurement_status: task.procurement_status,
    procurement_submitted_at: null,
    wastage_quantity_kg: null,
    accepted_quantity_kg: null,
    final_procurement_amount: task.final_procurement_amount,
    procurement_remarks: null,
    finalized_at: null,
    delivery_notes: null,
    failure_reason: null,
    proof_photo_url: null,
    estimated_distance_km: null,
    actual_distance_km: null,
    estimated_time_minutes: null,
    actual_time_minutes: null,
    created_at: task.created_at,
    updated_at: task.created_at,
    delivery_person: task.delivery_person ? {
      delivery_person_id: task.delivery_person.delivery_person_id,
      full_name: task.delivery_person.full_name,
      vehicle_type: task.delivery_person.vehicle_type,
      vehicle_number: task.delivery_person.vehicle_number,
      rating: "",
      user: null,
    } : null,
    farmer: task.farmer ? { farmer_id: task.farmer.farmer_id, full_name: task.farmer.full_name, user: null } : null,
    crop: (task as any).crop ?? null,
    vendor: null,
    order: null,
    status_history: [],
    
  } as TaskDetail : null;

  return (
    <Dialog open={!!task} onOpenChange={(open) => { if (!open) onOpenChange(false); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-400 text-base">
            <IconClockHour4 className="size-4" />
            Procurement Review
            {/* <Badge className="ml-auto bg-amber-400 text-amber-900 border-0 text-[11px] font-semibold gap-1.5 flex items-center mt-4">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-700 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-700"></span>
              </span>
              Pending Review
            </Badge> */}
          </DialogTitle>
          <DialogDescription>
            <div className="flex justify-between items-center">
              <div>
                   <span className="font-mono font-semibold text-foreground">{task?.delivery_number}</span>
            {task?.farmer?.full_name && <> · <span>{task.farmer.full_name}</span></>}
              </div>
              <div className="relative inline-flex group">
  <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center cursor-default">
    <IconAlertTriangle className="size-3.5 text-amber-600" aria-hidden="true" />
  </div>

  {/* Tooltip */}
  <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50
    bg-amber-50 border border-amber-200 rounded-lg px-3 py-2
    w-92 text-xs text-amber-800 leading-relaxed
    opacity-0 pointer-events-none transition-opacity duration-150
    group-hover:opacity-100">
    <span className="flex items-start gap-1.5">
      <IconAlertTriangle className="size-3 text-amber-600 shrink-0 mt-1" aria-hidden="true" />
      <span>
        Inspect the procured product, record any wastage, confirm the final amount, then finalize to add stock to inventory.
      </span>
    </span>
    {/* Arrow */}
    <div className="absolute -left-[5px] top-1/2 -translate-y-1/2 rotate-45
      w-2 h-2 bg-amber-50 border-l border-b border-amber-200" />
  </div>
</div>
</div>
          </DialogDescription>
        </DialogHeader>

        {syntheticTask && (
          <ProcurementReviewInlineContent
            task={syntheticTask}
            onCancel={() => onOpenChange(false)}
            onFinalized={() => {
              onOpenChange(false);
              onFinalized();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Sheet ────────────────────────────────────────────────────────

function TaskDetailSheet({ taskId, open, onOpenChange, onTaskUpdated }: {
  taskId: number | null; open: boolean; onOpenChange: (v: boolean) => void; onTaskUpdated: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [proofPreviewOpen, setProofPreviewOpen] = useState(false);
  const cancelInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true); setTask(null);
    try { const data = await api.get(`/admin/pickups-deliveries/${taskId}`); setTask(data.data.data); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to load task"); }
    finally { setLoading(false); }
  }, [taskId]);

  const fetchHistory = useCallback(async () => {
    if (!taskId) return;
    setHistoryLoading(true);
    try { const data = await api.get(`/admin/pickups-deliveries/${taskId}/history`); setHistory(data.data.data.history ?? []); }
    catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) { setShowCancelForm(false); setCancelReason(""); fetchTask(); fetchHistory(); }
  }, [open, taskId, fetchTask, fetchHistory]);

  useEffect(() => { if (showCancelForm) setTimeout(() => cancelInputRef.current?.focus(), 50); }, [showCancelForm]);

  const handleStatusChange = async (newStatus: DeliveryStatus) => {
    if (!task) return;
    setStatusLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/status`, { status: newStatus, remarks: `Status updated to ${newStatus}` });
      toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
      await fetchTask(); await fetchHistory(); onTaskUpdated();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to update status"); }
    finally { setStatusLoading(false); }
  };

  const handleCancel = async () => {
    if (!task || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/cancel`, { failure_reason: cancelReason.trim() });
      toast.success("Task cancelled");
      setShowCancelForm(false); setCancelReason("");
      await fetchTask(); await fetchHistory(); onTaskUpdated();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Failed to cancel"); }
    finally { setCancelLoading(false); }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
            {loading || !task ? (
              <div className="space-y-2">
                <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-64 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="font-mono text-base">{task.delivery_number}</SheetTitle>
                  <TypeBadge type={task.delivery_type} />
                  <StatusBadge status={task.status} />
                </div>
                <SheetDescription>Scheduled {formatDate(task.scheduled_date)} · {task.scheduled_time_slot}</SheetDescription>
              </>
            )}
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Spinner size="lg" /></div>
          ) : !task ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <IconAlertTriangle className="w-10 h-10 opacity-30" />
              <p className="text-sm">Failed to load task details</p>
              <Button variant="ghost" size="sm" onClick={fetchTask}>Try again</Button>
            </div>
          ) : (
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 px-6 h-auto py-0 gap-0 shrink-0">
                {[
                  { value: "details", label: "Details", icon: <IconPackage className="size-4" /> },
                  { value: "history", label: "History", icon: <IconHistory className="size-4" />, count: history.length },
                ].map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-0 mr-7 font-medium">
                    {tab.icon}<span className="ml-1.5">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground">{tab.count}</span>}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto p-6 space-y-4 mt-0">
                {/* Actions */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setShowAssign(true)}>
                      <IconUser className="size-3" />Reassign
                    </Button>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {STATUS_FLOW[task.status]?.filter((s) => s !== "cancelled").length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Advance status to</p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_FLOW[task.status].filter((s) => s !== "cancelled").map((nextStatus) => (
                            <Button key={nextStatus} variant="outline" size="sm" onClick={() => handleStatusChange(nextStatus)} disabled={statusLoading} className="h-8 text-xs gap-1.5">
                              {statusLoading ? <Spinner size="sm" /> : <><IconArrowRight className="size-3" />{STATUS_CONFIG[nextStatus]?.label ?? nextStatus}</>}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {STATUS_FLOW[task.status]?.filter((s) => s !== "cancelled").length === 0 && (
                      <p className="text-xs text-muted-foreground font-medium">No further actions available: DELIVERY COMPLETED</p>
                    )}
                    {!NON_CANCELLABLE.includes(task.status) && (
                      <div className="pt-1 border-t border-border/60">
                        {!showCancelForm ? (
                          <button onClick={() => setShowCancelForm(true)} className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors">
                            <IconBan className="size-3.5" />Cancel this task
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <FormField label="Cancellation reason" id="cancel_reason">
                              <Textarea ref={cancelInputRef} id="cancel_reason" rows={2} placeholder="Farmer not available at pickup location..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="resize-none" />
                            </FormField>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleCancel} disabled={cancelLoading || !cancelReason.trim()} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5">
                                {cancelLoading ? <><Spinner size="sm" /> Cancelling…</> : "Confirm Cancel"}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => { setShowCancelForm(false); setCancelReason(""); }} className="h-8 text-xs">Nevermind</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {task.status === "cancelled" && (
                      <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                        <IconAlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">Task Cancelled</p>
                          {task.failure_reason && <p className="text-xs text-red-600 mt-0.5">{task.failure_reason}</p>}
                        </div>
                      </div>
                    )}
                    {task.status === "failed" && task.failure_reason && (
                      <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                        <IconAlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">Task Failed</p>
                          <p className="text-xs text-red-600 mt-0.5">{task.failure_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Person */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Delivery Personnel</span>
                  </div>
                  {task.delivery_person ? (
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      <InfoRow icon={<IconUser className="size-3.5" />} label="Name" value={task.delivery_person.full_name} />
                      <InfoRow icon={<IconTruck className="size-3.5" />} label="Vehicle" value={`${task.delivery_person.vehicle_type.toUpperCase()} · ${task.delivery_person.vehicle_number}`} />
                      <InfoRow icon={<IconPhone className="size-3.5" />} label="Mobile" value={task.delivery_person.user?.mobile_number ? <a href={`tel:${task.delivery_person.user.mobile_number}`} className="text-primary hover:underline">{task.delivery_person.user.mobile_number}</a> : "—"} />
                      {/* <InfoRow label="Rating" value={`★ ${task.delivery_person.rating}`} /> */}
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground italic">No delivery person assigned</div>
                  )}
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 gap-3">
                  {task.pickup_address && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border bg-indigo-50/50">
                        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5"><IconMapPin className="size-3.5" /> Pickup Location</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">{task.pickup_address || "—"}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground"><IconUser className="size-3" />{task.pickup_contact_name || "—"}</span>
                          {task.pickup_contact_number && <a href={`tel:${task.pickup_contact_number}`} className="flex items-center gap-1 text-primary hover:underline"><IconPhone className="size-3" />{task.pickup_contact_number}</a>}
                        </div>
                      </div>
                    </div>
                  )}
                  {task.delivery_address && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-border bg-teal-50/50">
                        <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1.5"><IconMapPin className="size-3.5" /> Delivery Location</span>
                      </div>
                      <div className="px-4 py-3 space-y-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">{task.delivery_address}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground"><IconUser className="size-3" />{task.delivery_contact_name || "—"}</span>
                          {task.delivery_contact_number && <a href={`tel:${task.delivery_contact_number}`} className="flex items-center gap-1 text-primary hover:underline"><IconPhone className="size-3" />{task.delivery_contact_number}</a>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quantity + Schedule */}
                {/* Quantity + Schedule */}
<div className="rounded-xl border border-border bg-card px-4 py-3 ">
  {/* Quantity */}
  <div className="py-2 first:pt-0 last:pb-0 space-y-1.5">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      <IconPackage className="size-3.5" /> Quantity
    </div>
    <div className="flex items-center justify-between gap-4 text-sm">
      <span><span className="text-muted-foreground">Expected: </span><span className="font-medium">{task.expected_quantity_kg ?? "—"} kg</span></span>
      <span><span className="text-muted-foreground">Actual: </span><span className="font-semibold">{task.actual_quantity_kg ?? "—"} kg</span></span>
    </div>
  </div>

  {/* Price */}
  <div className="py-2 first:pt-0 last:pb-0 space-y-1.5">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      <IconCurrencyRupee className="size-3.5" /> Price
    </div>
    <div className="flex items-center justify-between gap-4 text-sm">
      <span><span className="text-muted-foreground">Expected: </span><span className="font-medium">₹{task.crop?.expected_price_per_kg ?? task.order?.final_amount ?? "—"}/kg</span></span>
      <span><span className="text-muted-foreground">Actual: </span><span className="font-semibold">₹{task.procurement_price_per_kg ?? "—"}/kg</span></span>
    </div>
  </div>

  {/* Scheduled */}
  <div className="py-2 first:pt-0 last:pb-0 space-y-1.5">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
      <IconCalendar className="size-3.5" /> Scheduled
    </div>
    <p className="text-sm font-medium">{formatDate(task.scheduled_date)} • {task.scheduled_time_slot}</p>
  </div>

  {/* Distance (optional) */}
  {task.estimated_distance_km && (
    <div className="py-2 first:pt-0 last:pb-0 space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Distance</div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span><span className="text-muted-foreground">Expected: </span><span className="font-medium">{task.estimated_distance_km} km</span></span>
        <span><span className="text-muted-foreground">Actual: </span><span className="font-semibold">{task.actual_distance_km ?? "—"} km</span></span>
      </div>
    </div>
  )}

  {/* Time (optional) */}
  {task.estimated_time_minutes && (
    <div className="py-2 first:pt-0 last:pb-0 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <IconClockHour4 className="size-3.5" /> Time
      </div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span><span className="text-muted-foreground">Expected: </span><span className="font-medium">{task.estimated_time_minutes} min</span></span>
        <span><span className="text-muted-foreground">Actual: </span><span className="font-semibold">{task.actual_time_minutes ?? "—"} min</span></span>
      </div>
    </div>
  )}
</div>

                {/* Timeline */}
                {(task.accepted_at || task.started_at || task.reached_at || task.completed_at) && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</span>
                    </div>
                    <div className="px-4 py-3 space-y-2.5">
                      {[{ label: "Accepted", time: task.accepted_at }, { label: "Started", time: task.started_at }, { label: "Reached", time: task.reached_at }, { label: "Completed", time: task.completed_at }]
                        .filter((t) => t.time).map((t) => (
                        <div key={t.label} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-medium w-20 text-muted-foreground">{t.label}</span>
                          <span className="text-xs">{formatDateTime(t.time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked entities */}
                {(task.farmer || task.vendor || task.order) && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linked Records</span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      {task.farmer && <><InfoRow label="Farmer" value={task.farmer.full_name} /><InfoRow label="Mobile Number" value={task.farmer.user?.mobile_number} /></>}
                      {task.vendor && (
                        <>
                          <InfoRow label="Vendor" value={task.vendor.shop_name} />
                          <InfoRow label="Owner" value={task.vendor.owner_name} />
                          {task.vendor.user?.mobile_number && <InfoRow label="Mobile" value={<a href={`tel:${task.vendor.user.mobile_number}`} className="text-primary hover:underline">{task.vendor.user.mobile_number}</a>} />}
                        </>
                      )}
                      {task.order && (
                        <>
                          <InfoRow label="Order" value={<span className="font-mono">{task.order.order_number}</span>} />
                          <InfoRow label="Order Amount" value={`₹ ${Number(task.order.final_amount).toLocaleString("en-IN")}`} />
                          <InfoRow label="Order Status" value={task.order.order_status} />
                        </>
                      )}
                      {task.otp_code && (
                        <InfoRow label="OTP" value={<span className={`font-mono font-bold ${task.otp_verified_at ? "text-emerald-600" : "text-amber-600"}`}>{task.otp_code} {task.otp_verified_at ? "✓" : "(pending)"}</span>} />
                      )}
                    </div>
                  </div>
                )}

                {task.delivery_type === "pickup" && <ProcurementReviewSection task={task} onFinalized={async () => { await fetchTask(); await fetchHistory(); onTaskUpdated(); }} />}

                {task.delivery_notes && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">Notes</p>
                    <p className="text-xs text-amber-700">{task.delivery_notes}</p>
                  </div>
                )}

              {task.proof_photo_url && (
  <div className="rounded-xl border border-border bg-card overflow-hidden">
    <div className="px-4 py-2.5 border-b border-border bg-muted/20">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proof Photo</span>
    </div>
    <div className="p-3 relative group">
      <img
        src={imageBaseURL + task.proof_photo_url}
        alt="Delivery proof"
        className="rounded-lg w-full object-cover max-h-40"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <button
        type="button"
        onClick={() => setProofPreviewOpen(true)}
        className="absolute top-5 right-5 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white backdrop-blur-sm  hover:bg-black/70"
        aria-label="View full image"
      >
        <IconMaximize className="size-4" />
      </button>
    </div>
  </div>
)}
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-y-auto p-6 mt-0">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2"><IconHistory className="size-10 opacity-30" /><p className="text-sm">No history yet</p></div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4 pl-10">
                      {history.map((h, i) => (
                        <div key={h.history_id} className="relative">
                          <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-background ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {h.old_status && <><StatusBadge status={h.old_status as DeliveryStatus} /><IconArrowRight className="size-3 text-muted-foreground" /></>}
                                <StatusBadge status={h.new_status as DeliveryStatus} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{formatDateTime(h.created_at)}</span>
                            </div>
                            {h.remarks && <p className="text-xs text-muted-foreground">{h.remarks}</p>}
                            {h.changed_user && <p className="text-[10px] text-muted-foreground">By {h.changed_user.mobile_number}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
      <AssignDialog task={task} open={showAssign} onOpenChange={setShowAssign} onAssigned={async () => { await fetchTask(); onTaskUpdated(); }} />
        <Dialog open={proofPreviewOpen} onOpenChange={setProofPreviewOpen}>
  <DialogContent className="sm:max-w-3xl border-none bg-transparent shadow-none p-0 [&>button]:hidden">
    <DialogHeader className="sr-only">
      <DialogTitle>Proof Photo</DialogTitle>
      <DialogDescription>Full size view</DialogDescription>
    </DialogHeader>
    {task?.proof_photo_url && (
      <div className="relative">
        <img
          src={imageBaseURL + task.proof_photo_url}
          alt="Delivery proof"
          className="w-full max-h-[85vh] object-contain rounded-lg"
        />
        <button
          type="button"
          onClick={() => setProofPreviewOpen(false)}
          className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <IconX className="size-4" />
        </button>
      </div>
    )}
  </DialogContent>
</Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PickupsDeliveriesPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DeliveryType>("pickup");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 20, total_pages: 0 });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Pickup unassigned ──
  const [unassignedTasks, setUnassignedTasks] = useState<TaskListItem[]>([]);
  const [assignTask, setAssignTask] = useState<any | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  // ── Delivery unassigned ──
  const [unassignedDeliveries, setUnassignedDeliveries] = useState<TaskListItem[]>([]);
  const [assignDeliveryTask, setAssignDeliveryTask] = useState<any | null>(null);
  const [assignDeliveryOpen, setAssignDeliveryOpen] = useState(false);

  // ── Pending procurements ──
  const [pendingProcurements, setPendingProcurements] = useState<TaskListItem[]>([]);

  // ── Procurement review dialog ──
  const [procurementReviewTask, setProcurementReviewTask] = useState<TaskListItem | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", delivery_type: activeTab });
      if (filters.search)    params.set("search", filters.search);
      if (filters.status) params.set("status", filters.status);
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);
      const data = await api.get(`/admin/pickups-deliveries?${params}`);
      setTasks(data.data.data.tasks ?? []);
      setPagination(data.data.data.pagination);
    } catch (e) { toast.error("Failed to fetch tasks"); console.error(e); }
    finally { setLoading(false); }
  }, [page, activeTab, filters]);

  const fetchUnassignedTasks = useCallback(async () => {
    if (activeTab !== "pickup") { setUnassignedTasks([]); return; }
    try {
      const data = await api.get(`/admin/pickups-deliveries?delivery_type=pickup&unassigned=true&limit=50`);
      setUnassignedTasks(data.data.data.tasks ?? []);
    } catch (e) { console.error("Failed to fetch unassigned pickups:", e); }
  }, [activeTab]);

  const fetchUnassignedDeliveries = useCallback(async () => {
    if (activeTab !== "delivery") { setUnassignedDeliveries([]); return; }
    try {
      const data = await api.get(`/admin/pickups-deliveries?delivery_type=delivery&unassigned=true&limit=50`);
      setUnassignedDeliveries(data.data.data.tasks ?? []);
    } catch (e) { console.error("Failed to fetch unassigned deliveries:", e); }
  }, [activeTab]);

  const fetchPendingProcurements = useCallback(async () => {
    if (activeTab !== "pickup") { setPendingProcurements([]); return; }
    try {
      const data = await api.get(`/admin/pickups-deliveries?delivery_type=pickup&procurement_status=pending_review&limit=50`);
      setPendingProcurements(data.data.data.tasks ?? []);
    } catch (e) { console.error("Failed to fetch pending procurements:", e); }
  }, [activeTab]);

  useEffect(() => {
     const delay = filters.search ? 400 : 0;
    const timer = setTimeout(() => {
      fetchTasks();
      fetchUnassignedTasks();
      fetchUnassignedDeliveries();
      fetchPendingProcurements();
    }, delay);
    return () => clearTimeout(timer);
  }, [fetchTasks, fetchUnassignedTasks, fetchUnassignedDeliveries, fetchPendingProcurements]);

  const handleOpenAssign = (task: any) => {
    setAssignTask({ delivery_id: task.delivery_id, delivery_number: task.delivery_number, delivery_person: null, scheduled_date: task.scheduled_date, scheduled_time_slot: task.scheduled_time_slot });
    setAssignOpen(true);
  };

  const handleOpenAssignDelivery = (task: any) => {
    setAssignDeliveryTask({ delivery_id: task.delivery_id, delivery_number: task.delivery_number, delivery_person: null, scheduled_date: task.scheduled_date, scheduled_time_slot: task.scheduled_time_slot });
    setAssignDeliveryOpen(true);
  };

  useEffect(() => { setPage(1); }, [activeTab, filters]);

  const handleFilterChange = (k: keyof Filters, v: string) => { setPage(1); setFilters((prev) => ({ ...prev, [k]: v })); };
  const handleReset = () => { setFilters(DEFAULT_FILTERS); setPage(1); };
  const hasActiveFilters = Object.entries(filters).some(([k, v]) => v !== DEFAULT_FILTERS[k as keyof Filters]);
  const openTask = (task: TaskListItem) => { setSelectedTaskId(task.delivery_id); setSheetOpen(true); };

  const refetchAll = async () => {
    await fetchTasks();
    await fetchUnassignedTasks();
    await fetchUnassignedDeliveries();
    await fetchPendingProcurements();
  };
const exportPickupsToExcel = () => {
  if (!tasks?.length) { toast.error("No pickup data to export"); return; }

  const excelData = tasks.map((task, index) => ({
    "S.No": index + 1,
    "Task Number": task.delivery_number,
    "Status": task.status
      ? task.status.charAt(0).toUpperCase() + task.status.slice(1).replace(/_/g, " ")
      : "-",
    "Farmer Name": task.farmer?.full_name ?? "-",
    "Delivery Person": task.delivery_person?.full_name ?? "Unassigned",
    "Vehicle Type": task.delivery_person?.vehicle_type
      ? task.delivery_person.vehicle_type.toUpperCase()
      : "-",
    "Vehicle Number": task.delivery_person?.vehicle_number ?? "-",
    "Scheduled Date": task.scheduled_date
      ? new Date(task.scheduled_date).toLocaleDateString("en-IN")
      : "-",
    "Time Slot": task.scheduled_time_slot ?? "-",
    "Pickup Address": task.pickup_address ?? "-",
    "Expected Qty (kg)": task.expected_quantity_kg ?? "-",
    "Actual Qty (kg)": task.actual_quantity_kg > 0 ? task.actual_quantity_kg : "-",
    "Procurement Status": task.procurement_status
      ? task.procurement_status === "pending_review"
        ? "Pending Review"
        : "Finalized"
      : "-",
    "Procurement Amount (₹)": task.procurement_amount
      ? `₹${Number(task.procurement_amount).toLocaleString("en-IN")}`
      : "-",
    "Final Procurement Amount (₹)": task.final_procurement_amount
      ? `₹${Number(task.final_procurement_amount).toLocaleString("en-IN")}`
      : "-",
    "Created At": task.created_at
      ? new Date(task.created_at).toLocaleDateString("en-IN")
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet["!cols"] = [
    { wch: 6 },   // S.No
    { wch: 28 },  // Task Number
    { wch: 14 },  // Status
    { wch: 24 },  // Farmer Name
    { wch: 22 },  // Delivery Person
    { wch: 14 },  // Vehicle Type
    { wch: 16 },  // Vehicle Number
    { wch: 18 },  // Scheduled Date
    { wch: 14 },  // Time Slot
    { wch: 36 },  // Pickup Address
    { wch: 18 },  // Expected Qty
    { wch: 16 },  // Actual Qty
    { wch: 20 },  // Procurement Status
    { wch: 24 },  // Procurement Amount
    { wch: 28 },  // Final Procurement Amount
    { wch: 16 },  // Created At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pickups Report");
  XLSX.writeFile(workbook, `pickups_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  toast.success(`Exported ${tasks.length} pickup records`);
};

const exportDeliveriesToExcel = () => {
  if (!tasks?.length) { toast.error("No delivery data to export"); return; }

  const excelData = tasks.map((task, index) => ({
    "S.No": index + 1,
    "Task Number": task.delivery_number,
    "Status": task.status
      ? task.status.charAt(0).toUpperCase() + task.status.slice(1).replace(/_/g, " ")
      : "-",
    "Vendor Shop Name": task.vendor?.shop_name ?? "-",
    "Delivery Person": task.delivery_person?.full_name ?? "Unassigned",
    "Vehicle Type": task.delivery_person?.vehicle_type
      ? task.delivery_person.vehicle_type.toUpperCase()
      : "-",
    "Vehicle Number": task.delivery_person?.vehicle_number ?? "-",
    "Scheduled Date": task.scheduled_date
      ? new Date(task.scheduled_date).toLocaleDateString("en-IN")
      : "-",
    "Time Slot": task.scheduled_time_slot ?? "-",
    "Delivery Address": task.delivery_address ?? "-",
    "Expected Qty (kg)": task.expected_quantity_kg ?? "-",
    "Actual Qty (kg)": task.actual_quantity_kg > 0 ? task.actual_quantity_kg : "-",
    "Order Number": task.order?.order_number ?? "-",
    "Order Amount (₹)": task.order?.final_amount
      ? `₹${Number(task.order.final_amount).toLocaleString("en-IN")}`
      : "-",
    "Created At": task.created_at
      ? new Date(task.created_at).toLocaleDateString("en-IN")
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet["!cols"] = [
    { wch: 6 },   // S.No
    { wch: 28 },  // Task Number
    { wch: 14 },  // Status
    { wch: 24 },  // Vendor Shop Name
    { wch: 22 },  // Delivery Person
    { wch: 14 },  // Vehicle Type
    { wch: 16 },  // Vehicle Number
    { wch: 18 },  // Scheduled Date
    { wch: 14 },  // Time Slot
    { wch: 36 },  // Delivery Address
    { wch: 18 },  // Expected Qty
    { wch: 16 },  // Actual Qty
    { wch: 26 },  // Order Number
    { wch: 22 },  // Order Amount
    { wch: 16 },  // Created At
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Deliveries Report");
  XLSX.writeFile(workbook, `deliveries_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  toast.success(`Exported ${tasks.length} delivery records`);
};
  if (!mounted) return <div className="flex min-h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <ProtectedRoute>
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            {/* Page Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Pickups & Deliveries</h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                  {pagination?.total > 0 ? `${pagination.total.toLocaleString("en-IN")} total ${activeTab} tasks · manage farm pickups and vendor deliveries` : "Manage farm pickups and vendor deliveries."}
                </p>
              </div>
              {/* <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0"><IconPlus className="size-4" />New Task</Button> */}
            </div>

            {/* Main Card */}
            <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
              {/* Tab switcher */}
              <div className="border-b bg-muted/10">
                <div className="flex px-4 pt-3">
                  {(["pickup", "delivery"] as DeliveryType[]).map((t) => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors mr-2 ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                      {t === "pickup" ? <IconPackage className="size-4" /> : <IconTruck className="size-4" />}
                      {t === "pickup" ? "Pickups" : "Deliveries"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── High-Priority: Unassigned Pickups ── */}
              {activeTab === "pickup" && unassignedTasks.length > 0 && (
                <div className="p-5 border-b bg-gradient-to-br from-red-50/50 via-pink-50/20 to-indigo-50/30 dark:from-red-950/20 dark:via-background dark:to-indigo-950/10 border-red-100 dark:border-red-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        🚨 High-Priority: Unassigned Farmer Requests
                      </h2>
                    </div>
                    <Badge variant="outline" className="bg-red-100/85 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50 font-semibold text-[11px] shadow-sm">
                      {unassignedTasks.length} pending dispatch
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedTasks.map((task: any) => {
                      let photos: string[] = [];
                      if (task.crop?.crop_photo_url) {
                        try { photos = JSON.parse(task.crop.crop_photo_url); }
                        catch { if (typeof task.crop.crop_photo_url === "string") photos = [task.crop.crop_photo_url]; }
                      }
                      const firstPhoto = photos.length > 0 ? photos[0] : null;
                      return (
                        <Card key={task.delivery_id} className="relative overflow-hidden border border-red-100 dark:border-red-950/50 shadow-sm bg-white/95 dark:bg-card/90 hover:shadow-md hover:border-red-200 transition-all duration-200 flex flex-col justify-between group">
                          <div className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">{task.delivery_number}</span>
                                <h3 className="font-bold text-foreground truncate mt-0.5">{task.farmer?.full_name ?? "Unknown Farmer"}</h3>
                              </div>
                              {firstPhoto ? (
                                <img src={firstPhoto} alt="Crop preview" className="w-10 h-10 rounded-md object-cover border border-border shrink-0 shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0 border border-border"><IconPackage className="size-5 text-muted-foreground/50" /></div>
                              )}
                            </div>
                            <div className="space-y-2 border-t border-dashed border-border/60 pt-2.5">
                              {task.crop?.product && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-semibold text-muted-foreground">Crop:</span>
                                  <span className="font-medium text-foreground bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded text-[11px]">{task.crop.product.product_name} ({task.crop.grade ? `Grade ${task.crop.grade}` : "Grade A"})</span>
                                </div>
                              )}
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground"><IconMapPin className="size-3.5 mt-0.5 shrink-0 text-red-400" /><span className="line-clamp-2 leading-relaxed">{task.pickup_address || "No address provided"}</span></div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 dark:bg-muted/10 p-2 rounded-lg">
                                <div><span className="text-muted-foreground block">QTY EXPECTED</span><span className="text-sm font-bold text-foreground">{task.expected_quantity_kg ?? task.crop?.quantity_kg ?? "—"} kg</span></div>
                                <div><span className="text-muted-foreground block">AVAILABLE DATE</span><span className="text-sm font-semibold text-foreground">{formatDate(task.scheduled_date)}</span></div>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 py-3 bg-red-50/30 dark:bg-red-950/10 border-t border-red-100/50 dark:border-red-950/30 flex items-center justify-between gap-2 shrink-0">
                            <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wider animate-pulse">Urgent Dispatch</span>
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenAssign(task); }} className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-all duration-150 active:scale-95">Assign Driver</Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── High-Priority: Pending Procurement Review ── */}
              {activeTab === "pickup" && pendingProcurements.length > 0 && (
                <div className="p-5 border-b bg-gradient-to-br from-violet-50/50 via-purple-50/20 to-indigo-50/30 dark:from-violet-950/20 dark:via-background dark:to-indigo-950/10 border-violet-100 dark:border-violet-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                      </span>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                        🔍 Procurement Review Finalize
                      </h2>
                    </div>
                    <Badge variant="outline" className="bg-violet-100/85 text-violet-800 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50 font-semibold text-[11px] shadow-sm">
                      {pendingProcurements.length} awaiting review
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingProcurements.map((task: any) => (
                      <Card
                        key={task.delivery_id}
                        className="relative overflow-hidden border border-violet-100 dark:border-violet-950/50 shadow-sm bg-white/95 dark:bg-card/90 hover:shadow-md hover:border-violet-300 transition-all duration-200 flex flex-col justify-between group"
                      >
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                                {task.delivery_number}
                              </span>
                              <h3 className="text-sm font-bold text-foreground truncate mt-0.5">
                                {task.farmer?.full_name ?? "Unknown Farmer"}
                              </h3>
                            </div>
                            <div className="w-10 h-10 rounded-md bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center shrink-0 border border-violet-100 dark:border-violet-900/30">
                              <IconPackage className="size-5 text-violet-400" />
                            </div>
                          </div>
                          <div className="space-y-2 border-t border-dashed border-border/60 pt-2.5">
                            {task.crop?.product && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Crop:</span>
                                <span className="font-medium text-foreground bg-violet-50/50 dark:bg-violet-950/30 px-1.5 py-0.5 rounded text-[11px]">
                                  {task.crop.product.product_name} ({task.crop.grade ? `Grade ${task.crop.grade}` : "Grade A"})
                                </span>
                              </div>
                            )}
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <IconMapPin className="size-3.5 mt-0.5 shrink-0 text-violet-400" />
                              <span className="line-clamp-2 leading-relaxed">{task.pickup_address || "No address provided"}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 dark:bg-muted/10 p-2 rounded-lg">
                              <div>
                                <span className="text-muted-foreground block">PROCURED QTY</span>
                                <span className="font-bold text-foreground">{task.actual_quantity_kg ?? "—"} kg</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground block">REPORTED AMT</span>
                                <span className="font-bold text-foreground">
                                  {task.procurement_amount ? `₹ ${Number(task.procurement_amount).toLocaleString("en-IN")}` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── Card footer: two distinct actions ── */}
                        <div className="px-4 py-3 bg-violet-50/30 dark:bg-violet-950/10 border-t border-violet-100/50 dark:border-violet-950/30 flex items-center justify-between gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider animate-pulse">
                            Review Pending
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); openTask(task); }}
                              className="h-7 text-xs border-violet-300 text-violet-700 hover:bg-violet-600 font-medium shadow-sm transition-all duration-150 active:scale-95"
                            >
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setProcurementReviewTask(task); }}
                              className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-sm transition-all duration-150 active:scale-95"
                            >
                              Review Now
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* ── High-Priority: Unassigned Deliveries ── */}
              {activeTab === "delivery" && unassignedDeliveries.length > 0 && (
                <div className="p-5 border-b bg-gradient-to-br from-blue-50/50 via-sky-50/20 to-indigo-50/30 dark:from-blue-950/20 dark:via-background dark:to-indigo-950/10 border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        🚚 High-Priority: Unassigned Vendor Deliveries
                      </h2>
                    </div>
                    <Badge variant="outline" className="bg-blue-100/85 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 font-semibold text-[11px] shadow-sm">
                      {unassignedDeliveries.length} pending dispatch
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedDeliveries.map((task: any) => (
                      <Card key={task.delivery_id} className="relative overflow-hidden border border-blue-100 dark:border-blue-950/50 shadow-sm bg-white/95 dark:bg-card/90 hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col justify-between group">
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">{task.delivery_number}</span>
                              <h3 className="text-sm font-bold text-foreground truncate mt-0.5">{task.vendor?.shop_name ?? "Unknown Vendor"}</h3>
                            </div>
                            <div className="w-10 h-10 rounded-md bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
                              <IconTruck className="size-5 text-blue-400" />
                            </div>
                          </div>
                          <div className="space-y-2 border-t border-dashed border-border/60 pt-2.5">
                            {task.order && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-muted-foreground">Order:</span>
                                <span className="font-medium text-foreground bg-blue-50/50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded text-[11px]">
                                  {task.order.order_number}
                                  {task.order.final_amount ? ` · ₹${Number(task.order.final_amount).toLocaleString("en-IN")}` : ""}
                                </span>
                              </div>
                            )}
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <IconMapPin className="size-3.5 mt-0.5 shrink-0 text-blue-400" />
                              <span className="line-clamp-2 leading-relaxed">{task.delivery_address || task.pickup_address || "No address provided"}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/30 dark:bg-muted/10 p-2 rounded-lg">
                              <div><span className="text-muted-foreground block">QTY EXPECTED</span><span className="font-bold text-foreground">{task.expected_quantity_kg ?? "—"} kg</span></div>
                              <div><span className="text-muted-foreground block">EXPECTED PRICE</span><span className="font-bold text-foreground">{task.order?.final_amount ?? "—"}</span></div>
                              <div><span className="text-muted-foreground block">ORDER DATE</span><span className="font-semibold text-foreground">{formatDate(task.created_at)}</span></div>
                              <div><span className="text-muted-foreground block">EXPECTED DELIVERY</span><span className="font-semibold text-foreground">{formatDate(task.scheduled_date)}</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 bg-blue-50/30 dark:bg-blue-950/10 border-t border-blue-100/50 dark:border-blue-950/30 flex items-center justify-between gap-2 shrink-0">
                          <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider animate-pulse">Urgent Dispatch</span>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); handleOpenAssignDelivery(task); }} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all duration-150 active:scale-95">Assign Driver</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Toolbar */}
              {/* Toolbar */}
<div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
  <div className="flex flex-wrap gap-2 items-center">

    {/* Search — placeholder adapts to active tab */}
    <div className="relative w-64">
      <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={
          activeTab === "pickup"
            ? "Search task, farmer, product, driver…"
            : "Search task, order, vendor, driver…"
        }
        className="pl-9 pr-8 bg-white dark:bg-card"
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

    {/* Status filter */}
    <Select
      value={filters.status || "all_status"}
      onValueChange={(v) => handleFilterChange("status", v === "all_status" ? "" : v)}
    >
      <SelectTrigger className="w-40 bg-white dark:bg-card">
        <SelectValue placeholder="All Statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all_status">All Statuses</SelectItem>
        {DELIVERY_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Date range */}
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={filters.from_date}
        onChange={(e) => handleFilterChange("from_date", e.target.value)}
        className="h-9 w-36 text-sm bg-white dark:bg-card"
      />
      <span className="text-muted-foreground text-xs">–</span>
      <Input
        type="date"
        value={filters.to_date}
        onChange={(e) => handleFilterChange("to_date", e.target.value)}
        className="h-9 w-36 text-sm bg-white dark:bg-card"
      />
    </div>

    {/* Reset */}
    {hasActiveFilters && (
      <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 bg-white dark:bg-card">
        <IconRefresh className="size-3.5" />Reset
      </Button>
    )}

    {/* Export */}
    <Button
      variant="outline"
      size="sm"
      className="bg-white dark:bg-card hover:border-primary/50"
      onClick={activeTab === "pickup" ? exportPickupsToExcel : exportDeliveriesToExcel}
    >
      Export
    </Button>
  </div>

  {pagination?.total > 0 && (
    <span className="text-xs text-muted-foreground shrink-0">
      {pagination.total.toLocaleString("en-IN")} tasks
    </span>
  )}
</div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Task #</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{activeTab === "pickup" ? "Farmer" : "Vendor"}</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Delivery Person</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Scheduled</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">{activeTab === "pickup" ? "Pickup Address" : "Delivery Address"}</TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Qty (kg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array.from({ length: 7 }).map((__, j) => <TableCell key={j} className="px-4 py-3.5"><div className="h-4 bg-muted rounded w-full max-w-[120px]" /></TableCell>)}
                        </TableRow>
                      ))
                    ) : tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-20 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            {activeTab === "pickup" ? <IconPackage className="size-10 opacity-30" /> : <IconTruck className="size-10 opacity-30" />}
                            <div>
                              <p className="text-sm font-medium text-foreground">No {activeTab} tasks found</p>
                              <p className="text-xs mt-0.5">Try adjusting your filters or create a new task</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-1"><IconPlus className="size-3.5" />Create Task</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.delivery_id} onClick={() => openTask(task)} className={`group cursor-pointer border-b last:border-0 transition-colors hover:bg-primary/5 ${selectedTaskId === task.delivery_id && sheetOpen ? "bg-primary/5" : ""}`}>
                          <TableCell className="px-4 py-3.5"><span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{task.delivery_number}</span></TableCell>
                          <TableCell className="px-4 py-3.5"><div className="text-sm font-medium text-foreground">{activeTab === "pickup" ? task.farmer?.full_name ?? "—" : task.vendor?.shop_name ?? "—"}</div></TableCell>
                          <TableCell className="px-4 py-3.5">
                            {task.delivery_person ? (
                              <div>
                                <div className="text-sm font-medium">{task.delivery_person.full_name}</div>
                                <div className="text-xs text-muted-foreground font-mono">{task.delivery_person.vehicle_number}</div>
                              </div>
                            ) : <span className="text-xs text-muted-foreground italic">Unassigned</span>}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(task.scheduled_date)}</div>
                            <div className="text-xs font-medium mt-0.5">{task.scheduled_time_slot}</div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge status={task.status} />
                              {activeTab === "pickup" && task.procurement_status && <ProcurementStatusBadge status={task.procurement_status} />}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 max-w-[180px]">
                            <p className="text-xs text-muted-foreground truncate">
                              {activeTab === "delivery"
                                ? (task.delivery_address === "string" || !task.delivery_address ? "—" : task.delivery_address)
                                : (task.pickup_address === "string" || !task.pickup_address ? "—" : task.pickup_address)}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right tabular-nums text-sm font-semibold">
                            {task.actual_quantity_kg > 0 ? <span className="text-emerald-600">{task.actual_quantity_kg}</span> : <span className="text-muted-foreground">{task.expected_quantity_kg ?? "—"}</span>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination?.total_pages > 1 && (
                <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
                  <span className="text-xs text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)}</span> of <span className="font-medium text-foreground">{pagination.total.toLocaleString("en-IN")}</span> tasks
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-8 h-8 p-0"><IconChevronLeft className="size-4" /></Button>
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      const p = i + 1;
                      return <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => setPage(p)} className="w-8 h-8 p-0 text-sm">{p}</Button>;
                    })}
                    {pagination.total_pages > 5 && <span className="text-xs text-muted-foreground px-1">…</span>}
                    <Button size="sm" variant="outline" disabled={page >= pagination.total_pages || loading} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 p-0"><IconChevronRight className="size-4" /></Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <TaskDetailSheet taskId={selectedTaskId} open={sheetOpen} onOpenChange={(v) => { setSheetOpen(v); if (!v) setSelectedTaskId(null); }} onTaskUpdated={refetchAll} />
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} defaultType={activeTab} onCreated={refetchAll} />

      {/* Quick Assign: Pickups */}
      <AssignDialog task={assignTask} open={assignOpen} onOpenChange={setAssignOpen} onAssigned={refetchAll} />

      {/* Quick Assign: Deliveries */}
      <AssignDialog task={assignDeliveryTask} open={assignDeliveryOpen} onOpenChange={setAssignDeliveryOpen} onAssigned={refetchAll} />

      {/* Procurement Review Dialog */}
      <ProcurementReviewDialog
        task={procurementReviewTask}
        onOpenChange={(open) => { if (!open) setProcurementReviewTask(null); }}
        onFinalized={async () => {
          setProcurementReviewTask(null);
          await refetchAll();
        }}
      />
    </ProtectedRoute>
  );
}