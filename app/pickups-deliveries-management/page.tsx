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
  created_at: string;
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
  delivery_notes: string | null;
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
  farmer: { farmer_id: number; full_name: string } | null;
  crop: unknown | null;
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
  order_id: string;
  vendor_id: string;
  delivery_address: string;
  delivery_contact_name: string;
  delivery_contact_number: string;
  delivery_person_id: string;
  scheduled_date: string;
  scheduled_time_slot: string;
  expected_quantity_kg: string;
  delivery_notes: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DELIVERY_STATUSES: DeliveryStatus[] = [
  "assigned",
  "accepted",
  "in_transit",
  "reached",
  "completed",
  "failed",
  "cancelled",
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
  "06:00-09:00",
  "09:00-12:00",
  "12:00-15:00",
  "15:00-18:00",
  "18:00-21:00",
];

const DEFAULT_FILTERS: Filters = {
  search: "",
  status: "",
  from_date: "",
  to_date: "",
};

const DEFAULT_FORM: CreateTaskForm = {
  delivery_type: "pickup",
  farmer_id: "",
  crop_id: "",
  pickup_address: "",
  pickup_contact_name: "",
  pickup_contact_number: "",
  order_id: "",
  vendor_id: "",
  delivery_address: "",
  delivery_contact_name: "",
  delivery_contact_number: "",
  delivery_person_id: "",
  scheduled_date: "",
  scheduled_time_slot: "",
  expected_quantity_kg: "",
  delivery_notes: "",
};

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; className: string; dot: string; icon: React.ReactNode }
> = {
  assigned: {
    label: "Assigned",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: <IconUser className="size-3" />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    icon: <IconCheck className="size-3" />,
  },
  in_transit: {
    label: "In Transit",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: <IconTruck className="size-3" />,
  },
  reached: {
    label: "Reached",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
    icon: <IconMapPin className="size-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: <IconCheck className="size-3" />,
  },
  failed: {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: <IconAlertTriangle className="size-3" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    icon: <IconX className="size-3" />,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, day] = iso.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
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

// ─── Shared Components ────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
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

function TypeBadge({ type }: { type: DeliveryType }) {
  return (
    <Badge
      variant="outline"
      className={
        type === "pickup"
          ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
          : "bg-teal-50 text-teal-700 border-teal-200 font-medium"
      }
    >
      {type === "pickup" ? (
        <IconPackage className="size-3 mr-1" />
      ) : (
        <IconTruck className="size-3 mr-1" />
      )}
      {type === "pickup" ? "Pickup" : "Delivery"}
    </Badge>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-8 h-8" : "w-5 h-5";
  return (
    <svg
      className={`animate-spin ${s} text-current`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
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
      <Label
        htmlFor={id}
        className="text-xs uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && (
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-sm font-medium break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

// ─── Create Task Dialog ───────────────────────────────────────────────────────

function CreateTaskDialog({
  open,
  onOpenChange,
  defaultType,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: DeliveryType;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateTaskForm>({
    ...DEFAULT_FORM,
    delivery_type: defaultType,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...DEFAULT_FORM, delivery_type: defaultType });
  }, [open, defaultType]);

  const set = (k: keyof CreateTaskForm, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (
      !form.pickup_address ||
      !form.pickup_contact_name ||
      !form.pickup_contact_number ||
      !form.delivery_person_id ||
      !form.scheduled_date ||
      !form.scheduled_time_slot
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        delivery_type: form.delivery_type,
        pickup_address: form.pickup_address,
        pickup_contact_name: form.pickup_contact_name,
        pickup_contact_number: form.pickup_contact_number,
        delivery_address: form.delivery_address,
        delivery_contact_name: form.delivery_contact_name,
        delivery_contact_number: form.delivery_contact_number,
        delivery_person_id: Number(form.delivery_person_id),
        scheduled_date: form.scheduled_date,
        scheduled_time_slot: form.scheduled_time_slot,
        expected_quantity_kg: form.expected_quantity_kg
          ? Number(form.expected_quantity_kg)
          : undefined,
        delivery_notes: form.delivery_notes || undefined,
      };
      if (form.delivery_type === "pickup") {
        if (form.farmer_id) body.farmer_id = Number(form.farmer_id);
        if (form.crop_id) body.crop_id = Number(form.crop_id);
      } else {
        if (form.order_id) body.order_id = Number(form.order_id);
        if (form.vendor_id) body.vendor_id = Number(form.vendor_id);
      }
      await api.post("/admin/pickups-deliveries", body);
      toast.success(
        `${form.delivery_type === "pickup" ? "Pickup" : "Delivery"} task created successfully`
      );
      onOpenChange(false);
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Schedule a pickup from a farmer or a delivery to a vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type toggle */}
          <FormField label="Task Type" id="task_type">
            <div className="flex rounded-lg border overflow-hidden">
              {(["pickup", "delivery"] as DeliveryType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => set("delivery_type", t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${
                    form.delivery_type === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "pickup" ? (
                    <IconPackage className="size-4" />
                  ) : (
                    <IconTruck className="size-4" />
                  )}
                  {t === "pickup" ? "Pickup" : "Delivery"}
                </button>
              ))}
            </div>
          </FormField>

          {/* Conditional fields */}
          {form.delivery_type === "pickup" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Farmer ID" id="farmer_id">
                <Input
                  id="farmer_id"
                  placeholder="e.g. 1"
                  value={form.farmer_id}
                  onChange={(e) => set("farmer_id", e.target.value)}
                />
              </FormField>
              <FormField label="Crop ID" id="crop_id">
                <Input
                  id="crop_id"
                  placeholder="e.g. 5"
                  value={form.crop_id}
                  onChange={(e) => set("crop_id", e.target.value)}
                />
              </FormField>
            </div>
          )}
          {form.delivery_type === "delivery" && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Order ID" id="order_id">
                <Input
                  id="order_id"
                  placeholder="e.g. 10"
                  value={form.order_id}
                  onChange={(e) => set("order_id", e.target.value)}
                />
              </FormField>
              <FormField label="Vendor ID" id="vendor_id">
                <Input
                  id="vendor_id"
                  placeholder="e.g. 3"
                  value={form.vendor_id}
                  onChange={(e) => set("vendor_id", e.target.value)}
                />
              </FormField>
            </div>
          )}

          {/* Pickup location */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pickup Details
            </p>
            <FormField label="Pickup Address *" id="pickup_address">
              <Textarea
                id="pickup_address"
                rows={2}
                placeholder="123 Farm Road, Pollachi"
                value={form.pickup_address}
                onChange={(e) => set("pickup_address", e.target.value)}
                className="resize-none"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact Name *" id="pickup_contact_name">
                <Input
                  id="pickup_contact_name"
                  placeholder="Rajan Kumar"
                  value={form.pickup_contact_name}
                  onChange={(e) => set("pickup_contact_name", e.target.value)}
                />
              </FormField>
              <FormField label="Contact Number *" id="pickup_contact_number">
                <Input
                  id="pickup_contact_number"
                  placeholder="9876543210"
                  value={form.pickup_contact_number}
                  onChange={(e) =>
                    set("pickup_contact_number", e.target.value)
                  }
                />
              </FormField>
            </div>
          </div>

          {/* Delivery location */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Details
            </p>
            <FormField label="Delivery Address" id="delivery_address">
              <Textarea
                id="delivery_address"
                rows={2}
                placeholder="12 Market Street, Chennai"
                value={form.delivery_address}
                onChange={(e) => set("delivery_address", e.target.value)}
                className="resize-none"
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact Name" id="delivery_contact_name">
                <Input
                  id="delivery_contact_name"
                  placeholder="Karthik R"
                  value={form.delivery_contact_name}
                  onChange={(e) =>
                    set("delivery_contact_name", e.target.value)
                  }
                />
              </FormField>
              <FormField label="Contact Number" id="delivery_contact_number">
                <Input
                  id="delivery_contact_number"
                  placeholder="9123456789"
                  value={form.delivery_contact_number}
                  onChange={(e) =>
                    set("delivery_contact_number", e.target.value)
                  }
                />
              </FormField>
            </div>
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Delivery Person ID *" id="delivery_person_id">
              <Input
                id="delivery_person_id"
                placeholder="e.g. 2"
                value={form.delivery_person_id}
                onChange={(e) => set("delivery_person_id", e.target.value)}
              />
            </FormField>
            <FormField label="Expected Qty (kg)" id="expected_quantity_kg">
              <Input
                id="expected_quantity_kg"
                type="number"
                placeholder="e.g. 100"
                value={form.expected_quantity_kg}
                onChange={(e) => set("expected_quantity_kg", e.target.value)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Scheduled Date *" id="scheduled_date">
              <Input
                id="scheduled_date"
                type="date"
                value={form.scheduled_date}
                onChange={(e) => set("scheduled_date", e.target.value)}
              />
            </FormField>
            <FormField label="Time Slot *" id="scheduled_time_slot">
              <Select
                value={form.scheduled_time_slot}
                onValueChange={(v) => set("scheduled_time_slot", v)}
              >
                <SelectTrigger id="scheduled_time_slot">
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Notes" id="delivery_notes">
            <Textarea
              id="delivery_notes"
              rows={2}
              placeholder="Any special instructions..."
              value={form.delivery_notes}
              onChange={(e) => set("delivery_notes", e.target.value)}
              className="resize-none"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Spinner size="sm" /> Creating…
              </>
            ) : (
              <>
                <IconPlus className="size-4" /> Create Task
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Dialog ────────────────────────────────────────────────────────────

function AssignDialog({
  task,
  open,
  onOpenChange,
  onAssigned,
}: {
  task: TaskDetail | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAssigned: () => void;
}) {
  const [deliveryPersonId, setDeliveryPersonId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && task) {
      setDeliveryPersonId(
        task.delivery_person_id ? String(task.delivery_person_id) : ""
      );
      setScheduledDate(task.scheduled_date ?? "");
      setTimeSlot(task.scheduled_time_slot ?? "");
    }
  }, [open, task]);

  const handleAssign = async () => {
    if (!task || !deliveryPersonId || !scheduledDate || !timeSlot) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/assign`, {
        delivery_person_id: Number(deliveryPersonId),
        scheduled_date: scheduledDate,
        scheduled_time_slot: timeSlot,
      });
      toast.success("Delivery personnel assigned successfully");
      onOpenChange(false);
      onAssigned();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign / Reassign</DialogTitle>
          <DialogDescription>
            Update the delivery person and schedule for{" "}
            <span className="font-mono font-semibold">
              {task?.delivery_number}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <FormField label="Delivery Person ID *" id="assign_dp_id">
            <Input
              id="assign_dp_id"
              placeholder="e.g. 2"
              value={deliveryPersonId}
              onChange={(e) => setDeliveryPersonId(e.target.value)}
            />
          </FormField>
          <FormField label="Scheduled Date *" id="assign_date">
            <Input
              id="assign_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </FormField>
          <FormField label="Time Slot *" id="assign_slot">
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger id="assign_slot">
                <SelectValue placeholder="Select slot" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Spinner size="sm" /> Assigning…
              </>
            ) : (
              "Confirm Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Detail Sheet ────────────────────────────────────────────────────────

function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
}: {
  taskId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onTaskUpdated: () => void;
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
  const cancelInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setLoading(true);
    setTask(null);
    try {
      const data = await api.get(`/admin/pickups-deliveries/${taskId}`);
      setTask(data.data.data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchHistory = useCallback(async () => {
    if (!taskId) return;
    setHistoryLoading(true);
    try {
      const data = await api.get(
        `/admin/pickups-deliveries/${taskId}/history`
      );
      setHistory(data.data.data.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (open && taskId) {
      setShowCancelForm(false);
      setCancelReason("");
      fetchTask();
      fetchHistory();
    }
  }, [open, taskId, fetchTask, fetchHistory]);

  useEffect(() => {
    if (showCancelForm)
      setTimeout(() => cancelInputRef.current?.focus(), 50);
  }, [showCancelForm]);

  const handleStatusChange = async (newStatus: DeliveryStatus) => {
    if (!task) return;
    setStatusLoading(true);
    try {
      await api.patch(`/admin/pickups-deliveries/${task.delivery_id}/status`, {
        status: newStatus,
        remarks: `Status updated to ${newStatus}`,
      });
      toast.success(
        `Status → ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`
      );
      await fetchTask();
      await fetchHistory();
      onTaskUpdated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!task || !cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await api.patch(
        `/admin/pickups-deliveries/${task.delivery_id}/cancel`,
        { failure_reason: cancelReason.trim() }
      );
      toast.success("Task cancelled");
      setShowCancelForm(false);
      setCancelReason("");
      await fetchTask();
      await fetchHistory();
      onTaskUpdated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
            {loading || !task ? (
              <div className="space-y-2">
                <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-64 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <SheetTitle className="font-mono text-base">
                    {task.delivery_number}
                  </SheetTitle>
                  <TypeBadge type={task.delivery_type} />
                  <StatusBadge status={task.status} />
                </div>
                <SheetDescription>
                  Scheduled {formatDate(task.scheduled_date)} ·{" "}
                  {task.scheduled_time_slot}
                </SheetDescription>
              </>
            )}
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : !task ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <IconAlertTriangle className="w-10 h-10 opacity-30" />
              <p className="text-sm">Failed to load task details</p>
              <Button variant="ghost" size="sm" onClick={fetchTask}>
                Try again
              </Button>
            </div>
          ) : (
            <Tabs
              defaultValue="details"
              className="flex-1 flex flex-col min-h-0"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-muted/10 px-6 h-auto py-0 gap-0 shrink-0">
                {[
                  { value: "details", label: "Details", icon: <IconPackage className="size-4" /> },
                  { value: "history", label: "History", icon: <IconHistory className="size-4" />, count: history.length },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary py-3 px-0 mr-7 font-medium"
                  >
                    {tab.icon}
                    <span className="ml-1.5">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-semibold text-muted-foreground">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ── Details Tab ── */}
              <TabsContent
                value="details"
                className="flex-1 overflow-y-auto p-6 space-y-4 mt-0"
              >
                {/* Status Actions */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Actions
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => setShowAssign(true)}
                    >
                      <IconUser className="size-3" />
                      Reassign
                    </Button>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {STATUS_FLOW[task.status]?.filter(
                      (s) => s !== "cancelled"
                    ).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          Advance status to
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_FLOW[task.status]
                            .filter((s) => s !== "cancelled")
                            .map((nextStatus) => (
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
                                    {STATUS_CONFIG[nextStatus]?.label ??
                                      nextStatus}
                                  </>
                                )}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}
{STATUS_FLOW[task.status]?.filter(
                      (s) => s !== "cancelled"
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground font-medium">
                        No further actions available:DELIVERY COMPLETED
                      </p>
                    )}
                    {!NON_CANCELLABLE.includes(task.status) && (
                      <div className="pt-1 border-t border-border/60">
                        {!showCancelForm ? (
                          <button
                            onClick={() => setShowCancelForm(true)}
                            className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
                          >
                            <IconBan className="size-3.5" />
                            Cancel this task
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <FormField
                              label="Cancellation reason"
                              id="cancel_reason"
                            >
                              <Textarea
                                ref={cancelInputRef}
                                id="cancel_reason"
                                rows={2}
                                placeholder="Farmer not available at pickup location..."
                                value={cancelReason}
                                onChange={(e) =>
                                  setCancelReason(e.target.value)
                                }
                                className="resize-none"
                              />
                            </FormField>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleCancel}
                                disabled={
                                  cancelLoading || !cancelReason.trim()
                                }
                                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                              >
                                {cancelLoading ? (
                                  <>
                                    <Spinner size="sm" /> Cancelling…
                                  </>
                                ) : (
                                  "Confirm Cancel"
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowCancelForm(false);
                                  setCancelReason("");
                                }}
                                className="h-8 text-xs"
                              >
                                Nevermind
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {task.status === "cancelled" && (
                      <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                        <IconAlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">
                            Task Cancelled
                          </p>
                          {task.failure_reason && (
                            <p className="text-xs text-red-600 mt-0.5">
                              {task.failure_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {task.status === "failed" && task.failure_reason && (
                      <div className="flex gap-2.5 bg-red-50 rounded-lg px-3 py-2.5 border border-red-100">
                        <IconAlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-red-700">
                            Task Failed
                          </p>
                          <p className="text-xs text-red-600 mt-0.5">
                            {task.failure_reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Person */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Delivery Personnel
                    </span>
                  </div>
                  {task.delivery_person ? (
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      <InfoRow
                        icon={<IconUser className="size-3.5" />}
                        label="Name"
                        value={task.delivery_person.full_name}
                      />
                      <InfoRow
                        icon={<IconTruck className="size-3.5" />}
                        label="Vehicle"
                        value={`${task.delivery_person.vehicle_type.toUpperCase()} · ${task.delivery_person.vehicle_number}`}
                      />
                      <InfoRow
                        icon={<IconPhone className="size-3.5" />}
                        label="Mobile"
                        value={
                          task.delivery_person.user?.mobile_number ? (
                            <a
                              href={`tel:${task.delivery_person.user.mobile_number}`}
                              className="text-primary hover:underline"
                            >
                              {task.delivery_person.user.mobile_number}
                            </a>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <InfoRow label="Rating" value={`★ ${task.delivery_person.rating}`} />
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground italic">
                      No delivery person assigned
                    </div>
                  )}
                </div>

                {/* Locations */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-indigo-50/50">
                      <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
                        <IconMapPin className="size-3.5" /> Pickup Location
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.pickup_address || "—"}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <IconUser className="size-3" />
                          {task.pickup_contact_name || "—"}
                        </span>
                        {task.pickup_contact_number && (
                          <a
                            href={`tel:${task.pickup_contact_number}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <IconPhone className="size-3" />
                            {task.pickup_contact_number}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-teal-50/50">
                      <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide flex items-center gap-1.5">
                        <IconMapPin className="size-3.5" /> Delivery Location
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {task.delivery_address || "—"}
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <IconUser className="size-3" />
                          {task.delivery_contact_name || "—"}
                        </span>
                        {task.delivery_contact_number && (
                          <a
                            href={`tel:${task.delivery_contact_number}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <IconPhone className="size-3" />
                            {task.delivery_contact_number}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quantity + Schedule */}
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <InfoRow
                      icon={<IconCalendar className="size-3.5" />}
                      label="Scheduled"
                      value={`${formatDate(task.scheduled_date)} · ${task.scheduled_time_slot}`}
                    />
                    <InfoRow
                      icon={<IconPackage className="size-3.5" />}
                      label="Quantity"
                      value={`${task.actual_quantity_kg ?? 0} / ${task.expected_quantity_kg ?? "—"} kg`}
                    />
                    {task.estimated_distance_km && (
                      <InfoRow
                        label="Distance"
                        value={`${task.actual_distance_km ?? "—"} / ${task.estimated_distance_km} km`}
                      />
                    )}
                    {task.estimated_time_minutes && (
                      <InfoRow
                        icon={<IconClockHour4 className="size-3.5" />}
                        label="Time"
                        value={`${task.actual_time_minutes ?? "—"} / ${task.estimated_time_minutes} min`}
                      />
                    )}
                  </div>
                </div>

                {/* Timeline */}
                {(task.accepted_at ||
                  task.started_at ||
                  task.reached_at ||
                  task.completed_at) && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Timeline
                      </span>
                    </div>
                    <div className="px-4 py-3 space-y-2.5">
                      {[
                        { label: "Accepted", time: task.accepted_at },
                        { label: "Started", time: task.started_at },
                        { label: "Reached", time: task.reached_at },
                        { label: "Completed", time: task.completed_at },
                      ]
                        .filter((t) => t.time)
                        .map((t) => (
                          <div
                            key={t.label}
                            className="flex items-center gap-3"
                          >
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-medium w-20 text-muted-foreground">
                              {t.label}
                            </span>
                            <span className="text-xs">
                              {formatDateTime(t.time)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Linked entities */}
                {(task.farmer || task.vendor || task.order) && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Linked Records
                      </span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-3">
                      {task.farmer && (
                        <InfoRow label="Farmer" value={task.farmer.full_name} />
                      )}
                      {task.vendor && (
                        <InfoRow
                          label="Vendor"
                          value={task.vendor.shop_name}
                        />
                      )}
                      {task.order && (
                        <InfoRow
                          label="Order"
                          value={
                            <span className="font-mono">
                              {task.order.order_number}
                            </span>
                          }
                        />
                      )}
                      {task.otp_code && (
                        <InfoRow
                          label="OTP"
                          value={
                            <span
                              className={`font-mono font-bold ${task.otp_verified_at ? "text-emerald-600" : "text-amber-600"}`}
                            >
                              {task.otp_code}{" "}
                              {task.otp_verified_at ? "✓" : "(pending)"}
                            </span>
                          }
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Notes + proof */}
                {task.delivery_notes && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800 mb-0.5">
                      Notes
                    </p>
                    <p className="text-xs text-amber-700">{task.delivery_notes}</p>
                  </div>
                )}

                {task.proof_photo_url && (
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Proof Photo
                      </span>
                    </div>
                    <div className="p-3">
                      <img
                        src={task.proof_photo_url}
                        alt="Delivery proof"
                        className="rounded-lg w-full object-cover max-h-40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── History Tab ── */}
              <TabsContent
                value="history"
                className="flex-1 overflow-y-auto p-6 mt-0"
              >
                {historyLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Spinner size="lg" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <IconHistory className="size-10 opacity-30" />
                    <p className="text-sm">No history yet</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4 pl-10">
                      {history.map((h, i) => (
                        <div key={h.history_id} className="relative">
                          {/* dot */}
                          <div
                            className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-background ${
                              i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                            }`}
                          />
                          <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                {h.old_status && (
                                  <>
                                    <StatusBadge
                                      status={h.old_status as DeliveryStatus}
                                    />
                                    <IconArrowRight className="size-3 text-muted-foreground" />
                                  </>
                                )}
                                <StatusBadge
                                  status={h.new_status as DeliveryStatus}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDateTime(h.created_at)}
                              </span>
                            </div>
                            {h.remarks && (
                              <p className="text-xs text-muted-foreground">
                                {h.remarks}
                              </p>
                            )}
                            {h.changed_user && (
                              <p className="text-[10px] text-muted-foreground">
                                By {h.changed_user.mobile_number}
                              </p>
                            )}
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

      {/* Assign dialog */}
      <AssignDialog
        task={task}
        open={showAssign}
        onOpenChange={setShowAssign}
        onAssigned={async () => {
          await fetchTask();
          onTaskUpdated();
        }}
      />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PickupsDeliveriesPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DeliveryType>("pickup");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        delivery_type: activeTab,
      });
      if (filters.status) params.set("status", filters.status);
      if (filters.from_date) params.set("from_date", filters.from_date);
      if (filters.to_date) params.set("to_date", filters.to_date);

      const data = await api.get(`/admin/pickups-deliveries?${params}`);
      setTasks(data.data.data.tasks ?? []);
      setPagination(data.data.data.pagination);
    } catch (e) {
      toast.error("Failed to fetch tasks");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchTasks, 0);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Reset page when tab or filters change
  useEffect(() => {
    setPage(1);
  }, [activeTab, filters]);

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

  const openTask = (task: TaskListItem) => {
    setSelectedTaskId(task.delivery_id);
    setSheetOpen(true);
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
                  Pickups & Deliveries
                </h1>
                <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                  {pagination?.total > 0
                    ? `${pagination.total.toLocaleString("en-IN")} total ${activeTab} tasks · manage farm pickups and vendor deliveries`
                    : "Manage farm pickups and vendor deliveries."}
                </p>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 shrink-0"
              >
                <IconPlus className="size-4" />
                New Task
              </Button>
            </div>

            {/* ── Main Card ── */}
            <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
              {/* ── Tab switcher ── */}
              <div className="border-b bg-muted/10">
                <div className="flex px-4 pt-3">
                  {(["pickup", "delivery"] as DeliveryType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors mr-2 ${
                        activeTab === t
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "pickup" ? (
                        <IconPackage className="size-4" />
                      ) : (
                        <IconTruck className="size-4" />
                      )}
                      {t === "pickup" ? "Pickups" : "Deliveries"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Toolbar ── */}
              <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Status filter */}
                  <Select
                    value={filters.status || "all_status"}
                    onValueChange={(v) =>
                      handleFilterChange(
                        "status",
                        v === "all_status" ? "" : v
                      )
                    }
                  >
                    <SelectTrigger className="w-40 bg-white dark:bg-card">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_status">All Statuses</SelectItem>
                      {DELIVERY_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_CONFIG[s]?.label ?? s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date range */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="date"
                      value={filters.from_date}
                      onChange={(e) =>
                        handleFilterChange("from_date", e.target.value)
                      }
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      type="date"
                      value={filters.to_date}
                      onChange={(e) =>
                        handleFilterChange("to_date", e.target.value)
                      }
                      className="h-9 w-36 text-sm bg-white dark:bg-card"
                    />
                  </div>

                  {/* Reset */}
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

                {pagination?.total > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {pagination.total.toLocaleString("en-IN")} tasks
                  </span>
                )}
              </div>

              {/* ── Table ── */}
              <div className="overflow-x-auto">
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Task #
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        {activeTab === "pickup" ? "Farmer" : "Vendor"}
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Delivery Person
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Scheduled
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Status
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                        Pickup Address
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                        Qty (kg)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i} className="animate-pulse">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j} className="px-4 py-3.5">
                              <div className="h-4 bg-muted rounded w-full max-w-[120px]" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : tasks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-20 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-3">
                            {activeTab === "pickup" ? (
                              <IconPackage className="size-10 opacity-30" />
                            ) : (
                              <IconTruck className="size-10 opacity-30" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                No {activeTab} tasks found
                              </p>
                              <p className="text-xs mt-0.5">
                                Try adjusting your filters or create a new task
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCreateOpen(true)}
                              className="gap-1.5 mt-1"
                            >
                              <IconPlus className="size-3.5" />
                              Create Task
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow
                          key={task.delivery_id}
                          onClick={() => openTask(task)}
                          className={`group cursor-pointer border-b last:border-0 transition-colors hover:bg-primary/5 ${
                            selectedTaskId === task.delivery_id && sheetOpen
                              ? "bg-primary/5"
                              : ""
                          }`}
                        >
                          <TableCell className="px-4 py-3.5">
                            <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {task.delivery_number}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="text-sm font-medium text-foreground">
                              {activeTab === "pickup"
                                ? task.farmer?.full_name ?? "—"
                                : task.vendor?.shop_name ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            {task.delivery_person ? (
                              <div>
                                <div className="text-sm font-medium">
                                  {task.delivery_person.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono">
                                  {task.delivery_person.vehicle_number}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(task.scheduled_date)}
                            </div>
                            <div className="text-xs font-medium mt-0.5">
                              {task.scheduled_time_slot}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3.5">
                            <StatusBadge status={task.status} />
                          </TableCell>
                          <TableCell className="px-4 py-3.5 max-w-[180px]">
                            <p className="text-xs text-muted-foreground truncate">
                              {task.pickup_address === "string"
                                ? "—"
                                : task.pickup_address}
                            </p>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-right tabular-nums text-sm font-semibold">
                            {task.actual_quantity_kg > 0 ? (
                              <span className="text-emerald-600">
                                {task.actual_quantity_kg}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {task.expected_quantity_kg ?? "—"}
                              </span>
                            )}
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
                    tasks
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
                      <span className="text-xs text-muted-foreground px-1">
                        …
                      </span>
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

      {/* ── Task Detail Sheet ── */}
      <TaskDetailSheet
        taskId={selectedTaskId}
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setSelectedTaskId(null);
        }}
        onTaskUpdated={fetchTasks}
      />

      {/* ── Create Task Dialog ── */}
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultType={activeTab}
        onCreated={fetchTasks}
      />
    </ProtectedRoute>
  );
}