"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import * as RadioGroup from "@radix-ui/react-radio-group"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconEdit,
  IconTrash,
  IconAlertTriangle,
  IconEye,
  IconPackage,
  IconTag,
  IconCategory,
  IconCurrencyRupee,
  IconArrowUp,
  IconArrowDown,
  IconRefresh,
  IconChevronRight,
} from "@tabler/icons-react";
import { toast } from "sonner";
import ProtectedRoute from "../routes/ProtectedRoute";
import api, { imageBaseURL } from "@/app/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────
// export const imgURL = "http://172.16.0.227:5000";
const GRADES = ["A", "B", "C"] as const;
type Grade = (typeof GRADES)[number];

const TRANSACTION_TYPES = [
  { value: "stock_in", label: "Stock In" },
  { value: "stock_out", label: "Stock Out" },
  { value: "adjustment", label: "Adjustment" },
  { value: "return", label: "Return" },
  { value: "wastage", label: "Wastage" },
] as const;

const REFERENCE_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "pickup", label: "Pickup" },
  { value: "order", label: "Order" },
  { value: "return", label: "Return" },
] as const;

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatRs(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return `Rs ${n.toLocaleString("en-IN")}`;
}

function formatKg(value: any) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--";
  return `${n.toLocaleString("en-IN")} kg`;
}

function formatDate(value: any) {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN");
}

function monthName(m: number | null) {
  if (!m) return "--";
  return MONTHS.find((mo) => mo.value === m)?.label ?? String(m);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProductPage() {
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
              <p className="text-muted-foreground underline underline-offset-4 decoration-primary/30">
                Manage products, categories, inventory and pricing.
              </p>
            </div>
            {/* ── Only two tabs now — Inventory & Pricing live inside the Products accordion ── */}
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="categories" className="gap-2 cursor-pointer">
                  <IconCategory className="size-4" /> Categories
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2 cursor-pointer">
                  <IconPackage className="size-4" /> Products
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories">
                <CategoriesTab />
              </TabsContent>
              <TabsContent value="products">
                <ProductsTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB  (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

function CategoriesTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
const [deleting, setDeleting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category_name: "",
    category_code: "",
    description: "",
    display_order: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imgerr, setimgerr] = useState<Boolean>(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterActive === "active") params.is_active = true;
      if (filterActive === "inactive") params.is_active = false;
      const res = await api.get("/admin/products/categories", { params });
      const data = res.data?.data ?? res.data;
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  }, [filterActive]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ category_name: "", category_code: "", description: "", display_order: "", is_active: true });
    setImageFile(null);
    setIconFile(null);
    setSheetOpen(true);
  };

  const openEdit = (cat: any) => {
    setEditTarget(cat);
    setForm({
      category_name: cat.category_name ?? "",
      category_code: cat.category_code ?? "",
      description: cat.description ?? "",
      display_order: cat.display_order != null ? String(cat.display_order) : "",
      is_active: Boolean(cat.is_active),
    });
    setImageFile(null);
    setIconFile(null);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_name.trim()) { toast.error("Category name is required"); return; }
    if (!form.category_code.trim()) { toast.error("Category code is required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("category_name", form.category_name.trim());
      fd.append("category_code", form.category_code.trim().toUpperCase());
      if (form.description.trim()) fd.append("description", form.description.trim());
      if (form.display_order) fd.append("display_order", form.display_order);
      if (imageFile) fd.append("image", imageFile);
      if (iconFile) fd.append("icon", iconFile);
      if (editTarget) {
        fd.append("is_active", String(form.is_active));
        await api.put(`/admin/products/categories/${editTarget.category_id}`, fd);
        toast.success("Category updated successfully");
      } else {
        await api.post("/admin/products/categories", fd);
        toast.success("Category created successfully");
      }
      setSheetOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
  if (!deleteTarget) return;
  setDeleting(true);
  try {
    await api.delete(`/admin/products/categories/${deleteTarget.category_id}`);
    toast.success("Category deactivated");
    setDeleteTarget(null);
    fetchCategories();
  } catch (err: any) {
    toast.error(err.response?.data?.message ?? "Failed to deactivate");
  } finally {
    setDeleting(false);
  }
};

  const handleimgerror = (value: any) => {
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const fileName = value.name.toLowerCase();
    const fileExtension = fileName.split(".").pop();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Only JPG, JPEG, PNG images are allowed");
      setimgerr(true);
      return;
    }
    setImageFile(value);
    setimgerr(false);
  };

  const filtered = useMemo(() => {
    if (filterActive === "all") return categories;
    return categories.filter((c) =>
      filterActive === "active" ? c.is_active : !c.is_active
    );
  }, [categories, filterActive]);

  return (
    <>
      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white dark:bg-card">
                  <IconFilter className="mr-2 size-4" />
                  {filterActive === "all" ? "All" : filterActive === "active" ? "Active" : "Inactive"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setFilterActive("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterActive("active")}>Active Only</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterActive("inactive")}>Inactive Only</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="mr-2 size-4" /> Add Category
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">S.No</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category image</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Code</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Description</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Order</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading categories...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No categories found.</TableCell>
                </TableRow>
              ) : (
                filtered.map((cat, i) => (
                  <TableRow key={cat.category_id} className="group hover:bg-primary/5 border-b last:border-0">
                    <TableCell className="px-4 py-3 text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="px-4 py-3 font-semibold"><img src={`${imageBaseURL}${cat.image_url}`} className="h-20 w-25" alt="cat.img" /></TableCell>
                    <TableCell className="px-4 py-3 font-semibold">{cat.category_name}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">{cat.category_code}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {cat.description || "--"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-muted-foreground">{cat.display_order ?? "--"}</TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge active={cat.is_active} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                          <IconEdit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeleteTarget(cat)}>
                          <IconTrash className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? "Edit Category" : "Add Category"}</SheetTitle>
            <SheetDescription>
              {editTarget ? "Update category details below." : "Fill in the details to create a new category."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 px-4">
            <FormField label="Category Name *" id="cat_name">
              <Input id="cat_name" value={form.category_name} className="capitalize" onChange={(e) =>{ 
                 const value = e.target.value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

                setForm((f) => ({ ...f, category_name:value }))} } placeholder=" eg.Vegetables" required />
            </FormField>
            <FormField label="Category Code *" id="cat_code">
              <Input id="cat_code" value={form.category_code} className="capitalize" onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value.toUpperCase() }))} placeholder="eg. VEG" required />
            </FormField>
            <FormField label="Description" id="cat_desc">
              <Textarea id="cat_desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} />
            </FormField>
            <FormField label="Display Order" id="cat_order">
              <Input id="cat_order" type="number" min={0} value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))} placeholder="e.g. 1" />
            </FormField>
            <FormField label="Category Image" id="cat_image">
              <div className="flex items-center gap-3">
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleimgerror(e.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>Choose Image</Button>
                <span className="text-sm text-muted-foreground truncate max-w-[180px]">{imageFile ? imageFile.name : "No file chosen"}</span>
              </div>
              {imgerr && <div><span className="text-sm text-red-600">Only JPG, JPEG, PNG images are allowed</span></div>}
            </FormField>
            {editTarget && (
              <div className="flex items-center gap-3">
                <Switch id="cat_active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label htmlFor="cat_active">Active</Label>
              </div>
            )}
            <SheetFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editTarget ? "Save Changes" : "Create Category"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet> */}


<Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
  <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
    {/* Header */}
    <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
      <DialogTitle className="flex items-center gap-2 text-base">
        <IconCategory className="size-4 text-muted-foreground" />
        {editTarget ? "Edit Category" : "Add Category"}
      </DialogTitle>
      <DialogDescription className="text-xs mt-0.5">
        {editTarget ? "Update category details below." : "Fill in the details to create a new category."}
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <FormField label="Category Name *" id="cat_name">
          <Input
            id="cat_name"
            value={form.category_name}
            className="capitalize"
            onChange={(e) => {
              const value = e.target.value
                .toLowerCase()
                .replace(/\b\w/g, (c) => c.toUpperCase());
              setForm((f) => ({ ...f, category_name: value }));
            }}
            placeholder=" eg.Vegetables"
            required
          />
        </FormField>
        <FormField label="Category Code *" id="cat_code">
          <Input
            id="cat_code"
            value={form.category_code}
            className="capitalize"
            onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value.toUpperCase() }))}
            placeholder="eg. VEG"
            required
          />
        </FormField>
        <FormField label="Description" id="cat_desc">
          <Textarea
            id="cat_desc"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
            rows={3}
          />
        </FormField>
        <FormField label="Display Order" id="cat_order">
          <Input
            id="cat_order"
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
            placeholder="e.g. 1"
          />
        </FormField>
        <FormField label="Category Image" id="cat_image">
          <div className="flex items-center gap-3">
            <input
              ref={imageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleimgerror(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>
              Choose Image
            </Button>
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">
              {imageFile ? imageFile.name : "No file chosen"}
            </span>
          </div>
          {imgerr && (
            <span className="text-sm text-red-600">Only JPG, JPEG, PNG images are allowed</span>
          )}
        </FormField>
        {editTarget && (
          <div className="flex items-center gap-3">
            <Switch
              id="cat_active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
            <Label htmlFor="cat_active">Active</Label>
          </div>
        )}
      </div>

      {/* Footer */}
      <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : editTarget ? "Save Changes" : "Create Category"}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>


      {/* ── Delete Confirmation Dialog ── */}
<Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
  <DialogContent className="sm:max-w-[420px]">
    <DialogHeader>
      <DialogTitle className="text-destructive flex items-center gap-2">
        <IconAlertTriangle className="size-5" />
        Delete Category
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete{" "}
        <span className="font-semibold text-foreground">{deleteTarget?.category_name}</span>?
        <b>Are you sure you want to delete Fruits? This will permanently delete the category and all associated products, inventory, and related data.</b>
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
        <IconTrash className="mr-2 size-4" />
        {deleting ? "Deleting..." : "Delete"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB  — now includes Inventory + Pricing inline accordion
// ═══════════════════════════════════════════════════════════════════════════════

function ProductsTab() {
  // ── Product list state ─────────────────────────────────────────────────────
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [productDeleteTarget, setProductDeleteTarget] = useState<any | null>(null);
const [productDeleting, setProductDeleting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [seasonalFilter, setSeasonalFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const limit = 10;
  // const units = ['kg', 'piece', 'bunch', 'dozen', 'gram']; // could be fetched from API if dynamic
  const units = ['kg']; // could be fetched from API if dynamic

  // ── Accordion expanded rows: productId → { detail, loading } ──────────────
  const [expandedRows, setExpandedRows] = useState<
    Record<number, { detail: any | null; loading: boolean }>
  >({});

  // ── Edit Inventory & Pricing dialog ───────────────────────────────────────────
const [editInvPriceOpen, setEditInvPriceOpen] = useState(false);
const [editInvPriceProduct, setEditInvPriceProduct] = useState<any | null>(null);

  // ── Low stock (from InventoryTab) ──────────────────────────────────────────
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
const [productFormTab, setProductFormTab] = useState<"details" | "inventory">("details");
const [productFormGrade, setProductFormGrade] = useState<Grade>("A");
  // ── Create / Edit product sheet ────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Stock Adjustment sheet (from InventoryTab) ─────────────────────────────
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null);
  const [adjustLoadingProduct, setAdjustLoadingProduct] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<Grade>("A");
  const [adjustForm, setAdjustForm] = useState({
    transaction_type: "stock_in",
    quantity_kg: "",
    reference_type: "manual",
    reference_id: "",
    warehouse_location: "",
    minimum_stock_alert: "",
    remarks: "",
  });
  const [adjustSaving, setAdjustSaving] = useState(false);

  // ── Transaction History sheet (from InventoryTab) ──────────────────────────
  const [txOpen, setTxOpen] = useState(false);
  const [txInventoryId, setTxInventoryId] = useState<number | null>(null);
  const [txProductName, setTxProductName] = useState("");
  const [txGrade, setTxGrade] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState<number | null>(null);

  // ── Add Pricing sheet (from PricingTab) ────────────────────────────────────
  const [pricingSheetOpen, setPricingSheetOpen] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    product_id: "",
    grade: "A" as Grade,
    base_price_per_kg: "",
    wholesale_price_per_kg: "",
    retail_price_per_kg: "",
    minimum_order_kg: "10",
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  // ── Product create/edit form ───────────────────────────────────────────────
  const emptyProductForm = () => ({
    category_id: "",
    product_name: "",
    product_code: "",
    description: "",
    unit: "kg",
    is_seasonal: false,
    season_start_month: "",
    season_end_month: "",
    is_active: true,
    inventory: {
      A: { available_quantity_kg: "", warehouse_location: "", minimum_stock_alert: "" },
      B: { available_quantity_kg: "", warehouse_location: "", minimum_stock_alert: "" },
      C: { available_quantity_kg: "", warehouse_location: "", minimum_stock_alert: "" },
    } as Record<Grade, { available_quantity_kg: string; warehouse_location: string; minimum_stock_alert: string }>,
    pricing: {
      A: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: new Date().toISOString().split("T")[0], effective_to: "" },
      B: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: new Date().toISOString().split("T")[0], effective_to: "" },
      C: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: new Date().toISOString().split("T")[0], effective_to: "" },
    } as Record<Grade, { base_price_per_kg: string; wholesale_price_per_kg: string; retail_price_per_kg: string; minimum_order_kg: string; effective_from: string; effective_to: string }>,
  });

  const [form, setForm] = useState(emptyProductForm());
  const [imgerr, setimgerr] = useState<Boolean>(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/admin/products/categories", { params: { is_active: true } });
      const data = res.data?.data ?? res.data;
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch { /* silent */ }
  }, []);
  const fetchLowStock = useCallback(async () => {
    try {
      const res = await api.get("/admin/inventory/low-stock");
      const data = res.data?.data ?? res.data;
      setLowStock(Array.isArray(data?.inventory) ? data.inventory : []);
      setLowStockCount(data?.count ?? 0);
    } catch { /* silent */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter) params.category_id = Number(categoryFilter);
      if (activeFilter !== "") params.is_active = activeFilter === "true";
      if (seasonalFilter !== "") params.is_seasonal = seasonalFilter === "true";
      const res = await api.get("/admin/products", { params });
      const data = res.data?.data ?? res.data;
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setTotalPages(data?.pagination?.total_pages ?? null);
      setTotalItems(data?.pagination?.total ?? null);
      // Collapse all expanded rows when the page changes
      setExpandedRows({});
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, categoryFilter, activeFilter, seasonalFilter]);

  useEffect(() => { fetchCategories(); fetchLowStock();  }, [fetchCategories, fetchLowStock,]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Accordion toggle ───────────────────────────────────────────────────────
  const toggleRow = async (productId: number) => {
    // If already expanded, collapse it
    if (expandedRows[productId]) {
      setExpandedRows((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }
    // Mark as loading
    setExpandedRows((prev) => ({ ...prev, [productId]: { detail: null, loading: true } }));
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const detail = res.data?.data ?? res.data;
      setExpandedRows((prev) => ({ ...prev, [productId]: { detail, loading: false } }));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to load product details");
      setExpandedRows((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  // Helper: refresh the detail for an already-expanded row after mutations
  const refreshExpandedRow = async (productId: number) => {
    if (!expandedRows[productId]) return;
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const detail = res.data?.data ?? res.data;
      setExpandedRows((prev) => ({ ...prev, [productId]: { detail, loading: false } }));
    } catch { /* silent */ }
  };

  // ── Product create / edit ──────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyProductForm());
    setImageFile(null);
      setProductFormTab("details"); 
  setProductFormGrade("A");        
    setSheetOpen(true);
  };

  const openEdit = (product: any) => {
    setEditTarget(product);
    setForm({
      category_id: String(product.category?.category_id ?? product.category_id ?? ""),
      product_name: product.product_name ?? "",
      product_code: product.product_code ?? "",
      description: product.description ?? "",
      unit: product.unit ?? "kg",
      is_seasonal: Boolean(product.is_seasonal),
      season_start_month: product.season_start_month != null ? String(product.season_start_month) : "",
      season_end_month: product.season_end_month != null ? String(product.season_end_month) : "",
      is_active: Boolean(product.is_active),
      inventory: emptyProductForm().inventory,
      pricing: emptyProductForm().pricing,
    });
    setImageFile(null);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editTarget) {
    if (!form.category_id) { toast.error("Category is required"); return; }
    if (!form.product_name.trim()) { toast.error("Product name is required"); return; }
    if (!form.product_code.trim()) { toast.error("Product code is required"); return; }
    if(!form.inventory) { toast.error("Product Unit is required"); return; };
    if(!imageFile) { toast.error("Product Image is required"); return; };


  const grades = ["A", "B", "C"] as const;
const missingGrade = grades.find((g) => {
  const item = form.inventory[g];
  return item.available_quantity_kg === "" || item.minimum_stock_alert === "";
});
if (missingGrade) {
  toast.error(`Inventory quantity and min alert are required for Grade ${missingGrade} (enter 0 if none)`);
  setProductFormTab("inventory");
  setProductFormGrade(missingGrade);
  return;
}

// ── NEW: Pricing validation ──
const missingPricingGrade = grades.find((g) => {
  const item = form.pricing[g];
  return (
    item.base_price_per_kg === "" ||
    item.wholesale_price_per_kg === "" ||
    item.retail_price_per_kg === ""
  );
});
if (missingPricingGrade) {
  toast.error(`Base, wholesale and retail prices are required for Grade ${missingPricingGrade}`);
  setProductFormTab("inventory");
  setProductFormGrade(missingPricingGrade);
  return;
}
    }
    // if(!form.inventory["A"].available_quantity_kg) { toast.error("At least one complete inventory detail is required."); return; };
    // if(!form.inventory["A"].warehouse_location) { toast.error("At least one complete inventory detail is required."); return; };
    // if(!form.inventory["A"].minimum_stock_alert) { toast.error("At least one complete inventory detail is required."); return; };

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("category_id", form.category_id);
      fd.append("product_name", form.product_name.trim());
      fd.append("product_code", form.product_code.trim().toUpperCase());
      if (form.description.trim()) fd.append("description", form.description.trim());
      fd.append("unit", form.unit || "kg");
      fd.append("is_seasonal", String(form.is_seasonal));
      if (form.is_seasonal) {
        if (form.season_start_month) fd.append("season_start_month", form.season_start_month);
        if (form.season_end_month) fd.append("season_end_month", form.season_end_month);
      }
      if (imageFile) fd.append("image", imageFile);

      if (!editTarget) {
        const inventoryArr = GRADES
          .filter((g) => form.inventory[g].available_quantity_kg !== "")
          .map((g) => ({
            grade: g,
            available_quantity_kg: Number(form.inventory[g].available_quantity_kg),
            // warehouse_location: form.inventory[g].warehouse_location || undefined,
            minimum_stock_alert: form.inventory[g].minimum_stock_alert ? Number(form.inventory[g].minimum_stock_alert) : 20,
          }));
        const pricingArr = GRADES
  .filter((g) => form.pricing[g].base_price_per_kg !== "")
  .map((g) => ({
    grade: g,
    base_price_per_kg: Number(form.pricing[g].base_price_per_kg),
    wholesale_price_per_kg: Number(form.pricing[g].wholesale_price_per_kg),
    ...(form.pricing[g].retail_price_per_kg ? { retail_price_per_kg: Number(form.pricing[g].retail_price_per_kg) } : {}),
    minimum_order_kg: Number(form.pricing[g].minimum_order_kg) || 10,
    effective_from: form.pricing[g].effective_from || new Date().toISOString().split("T")[0],
    ...(form.pricing[g].effective_to ? { effective_to: form.pricing[g].effective_to } : {}),
  }));
        if (inventoryArr.length > 0) fd.append("inventory", JSON.stringify(inventoryArr));
        if (pricingArr.length > 0) fd.append("pricing", JSON.stringify(pricingArr));
        await api.post("/admin/products", fd);
        toast.success("Product created successfully");
      } else {
        fd.append("is_active", String(form.is_active));
        await api.put(`/admin/products/${editTarget.product_id}`, fd);
        toast.success("Product updated successfully");
      }
      setSheetOpen(false);
      fetchProducts();
      fetchLowStock();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleimgerr = (value: any) => {
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const fileName = value.name.toLowerCase();
    const fileExtension = fileName.split(".").pop();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Only JPG, JPEG, PNG images are allowed");
      setimgerr(true);
      return;
    }
    setImageFile(value);
    setimgerr(false);
  };

const handleDelete = async () => {
  if (!productDeleteTarget) return;
  setProductDeleting(true);
  try {
    await api.delete(`/admin/products/${productDeleteTarget.product_id}`);
    toast.success("Product deactivated");
    setProductDeleteTarget(null);
    fetchProducts();
  } catch (err: any) {
    toast.error(err.response?.data?.message ?? "Failed to deactivate");
  } finally {
    setProductDeleting(false);
  }
};

  // ── Stock Adjustment handlers (lifted from InventoryTab) ───────────────────
  const openAdjust = async (productId: number, defaultGrade?: Grade) => {
    setAdjustProduct(null);
    setSelectedGrade(defaultGrade ?? "A");
    setAdjustForm({
      transaction_type: "stock_in",
      quantity_kg: "",
      reference_type: "manual",
      reference_id: "",
      warehouse_location: "",
      minimum_stock_alert: "",
      remarks: "",
    });
    setAdjustOpen(true);
    setAdjustLoadingProduct(true);
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const detail = res.data?.data ?? res.data;
      setAdjustProduct(detail);
      const gradeInv = detail?.inventory?.find((inv: any) => inv.grade === (defaultGrade ?? "A"));
      if (gradeInv?.warehouse_location) {
        setAdjustForm((f) => ({ ...f, warehouse_location: gradeInv.warehouse_location }));
      }
      if (gradeInv?.minimum_stock_alert) {
        setAdjustForm((f) => ({ ...f, minimum_stock_alert: String(gradeInv.minimum_stock_alert) }));
      }
    } catch {
      toast.error("Failed to load product inventory details");
      setAdjustOpen(false);
    } finally {
      setAdjustLoadingProduct(false);
    }
  };

  const handleGradeChange = (grade: Grade) => {
    setSelectedGrade(grade);
    if (!adjustProduct) return;
    const inv = adjustProduct.inventory?.find((i: any) => i.grade === grade);
    setAdjustForm((f) => ({
      ...f,
      warehouse_location: inv?.warehouse_location ?? "",
      minimum_stock_alert: inv?.minimum_stock_alert ? String(inv.minimum_stock_alert) : "",
    }));
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.quantity_kg || Number(adjustForm.quantity_kg) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!adjustProduct) return;
    const inv = adjustProduct.inventory?.find((i: any) => i.grade === selectedGrade);
    if (!inv) { toast.error(`No inventory record found for Grade ${selectedGrade}`); return; }

    setAdjustSaving(true);
    try {
      const body: any = {
        transaction_type: adjustForm.transaction_type,
        quantity_kg: Number(adjustForm.quantity_kg),
        reference_type: adjustForm.reference_type,
      };
      if (adjustForm.reference_id) body.reference_id = Number(adjustForm.reference_id);
      if (adjustForm.warehouse_location) body.warehouse_location = adjustForm.warehouse_location;
      if (adjustForm.minimum_stock_alert) body.minimum_stock_alert = Number(adjustForm.minimum_stock_alert);
      if (adjustForm.remarks) body.remarks = adjustForm.remarks;

      const res = await api.patch(`/admin/inventory/${inv.inventory_id}`, body);
      const result = res.data?.data;
      toast.success(
        `Grade ${selectedGrade} stock updated: ${formatKg(result?.previous_quantity_kg)} → ${formatKg(result?.new_quantity_kg)}`
      );
      setAdjustOpen(false);
      fetchProducts();
      fetchLowStock();
      // Refresh the expanded accordion row so numbers update inline
      await refreshExpandedRow(adjustProduct.product_id);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to adjust stock");
    } finally {
      setAdjustSaving(false);
    }
  };

  const selectedInv = adjustProduct?.inventory?.find((i: any) => i.grade === selectedGrade);

  // ── Transaction History handlers (lifted from InventoryTab) ────────────────
  const fetchTransactions = useCallback(async (invId: number, pg = 1) => {
    setTxLoading(true);
    try {
      const res = await api.get(`/admin/inventory/${invId}/transactions`, { params: { page: pg, limit: 10 } });
      const data = res.data?.data ?? res.data;
      setTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setTxTotalPages(data?.pagination?.total_pages ?? null);
    } catch { /* silent */ }
    finally { setTxLoading(false); }
  }, []);

  const openTransactions = async (productId: number, productName: string, grade: Grade) => {
    setTxProductName(productName);
    setTxGrade(grade);
    setTxPage(1);
    setTransactions([]);
    setTxOpen(true);
    setTxLoading(true);
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const detail = res.data?.data ?? res.data;
      const inv = detail?.inventory?.find((i: any) => i.grade === grade);
      if (!inv) {
        toast.error(`No inventory record found for Grade ${grade}`);
        setTxOpen(false);
        return;
      }
      setTxInventoryId(inv.inventory_id);
      fetchTransactions(inv.inventory_id, 1);
    } catch {
      toast.error("Failed to load inventory details");
      setTxOpen(false);
      setTxLoading(false);
    }
  };

  // ── Pricing handlers (lifted from PricingTab) ──────────────────────────────
  const openAddPricing = (productId: number) => {
    setPricingForm({
      product_id: String(productId),
      grade: "A",
      base_price_per_kg: "",
      wholesale_price_per_kg: "",
      retail_price_per_kg: "",
      minimum_order_kg: "10",
      effective_from: new Date().toISOString().split("T")[0],
      effective_to: "",
    });
    setPricingSheetOpen(true);
  };

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingForm.product_id) { toast.error("Product is required"); return; }
    if (!pricingForm.base_price_per_kg || !pricingForm.wholesale_price_per_kg) { toast.error("Base and wholesale prices are required"); return; }
    if (!pricingForm.effective_from) { toast.error("Effective from date is required"); return; }
    setPricingSaving(true);
    try {
      const body: any = {
        product_id: Number(pricingForm.product_id),
        grade: pricingForm.grade,
        base_price_per_kg: Number(pricingForm.base_price_per_kg),
        wholesale_price_per_kg: Number(pricingForm.wholesale_price_per_kg),
        minimum_order_kg: Number(pricingForm.minimum_order_kg) || 10,
        effective_from: pricingForm.effective_from,
      };
      if (pricingForm.retail_price_per_kg) body.retail_price_per_kg = Number(pricingForm.retail_price_per_kg);
      if (pricingForm.effective_to) body.effective_to = pricingForm.effective_to;

      await api.post("/admin/pricing", body);
      toast.success("Pricing added successfully");
      setPricingSheetOpen(false);
      fetchProducts();
      await refreshExpandedRow(Number(pricingForm.product_id));
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to add pricing");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleDeletePricing = async (pricingId: number, productId: number) => {
    if (!confirm("Deactivate this pricing entry?")) return;
    try {
      await api.delete(`/admin/pricing/${pricingId}`);
      toast.success("Pricing deactivated");
      fetchProducts();
      await refreshExpandedRow(productId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to deactivate pricing");
    }
  };

  const openEditInvPrice = (product: any) => {
  setEditInvPriceProduct(product);
  setEditInvPriceOpen(true);
};

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Low stock alert banner (from InventoryTab) ── */}
      {lowStockCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <IconAlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {lowStockCount} item{lowStockCount > 1 ? "s" : ""} below minimum stock level
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStock.slice(0, 5).map((item) => (
                <span key={item.inventory_id} className="text-xs bg-amber-100 text-amber-800 rounded px-2 py-0.5">
                  {item.product?.product_name} Grade {item.grade} — {formatKg(item.available_quantity_kg)} / {formatKg(item.minimum_stock_alert)} min
                </span>
              ))}
              {lowStockCount > 5 && <span className="text-xs text-amber-700">+{lowStockCount - 5} more</span>}
            </div>
          </div>
        </div>
      )}

      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative w-64">
              <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-white dark:bg-card"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={categoryFilter || "all_cat"} onValueChange={(v) => { setCategoryFilter(v === "all_cat" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-white dark:bg-card"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_cat">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeFilter || "all_active"} onValueChange={(v) => { setActiveFilter(v === "all_active" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_active">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 ps-3">
            <h1>Seasonal:</h1>
             <RadioGroup.Root
          value={seasonalFilter || "all_seasonal"}
          onValueChange={(v) =>  {setSeasonalFilter(v === "all_seasonal" ? "" : v); setPage(1); }}
          aria-label="Status"
          className="relative flex bg-gray-200 rounded-full p-1 w-12 h-5 overflow-hidden"
        >
          {/* Sliding background */}
          <div
            className="absolute top-1 bottom-1 w-[30%] rounded-full bg-white shadow transition-all duration-75 ease-in-out"
            style={{
              left:  seasonalFilter === "true" ? "50%" : "4px",
              backgroundColor: seasonalFilter === "true" ? "#10B981" : "#4B5563",
            }}
          />

          {/* Active */}
          <RadioGroup.Item
            value=""
            className="relative z-10 w-1/2 text-center py-1.5 text-sm font-medium 
            text-gray-600 data-[state=checked]:text-black cursor-pointer 
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
          >
          </RadioGroup.Item>

          {/* Inactive */}
          <RadioGroup.Item
            value="true"
            className="relative z-10 w-1/2 text-center py-1.5 text-sm font-medium 
            text-gray-600 data-[state=checked]:text-black cursor-pointer 
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
          >
          </RadioGroup.Item>
        </RadioGroup.Root>
        </div>
          </div>
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="mr-2 size-4" /> Add Product
          </Button>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {/* expand chevron col */}
                <TableHead className="px-4 py-3 w-8" />
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">S.No</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Product Image</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Product</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Code</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Stock (kg)</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Grade Stock</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Pricing</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">Loading products...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">No products found.</TableCell>
                </TableRow>
              ) : (
                products.map((p, i) => {
                  const isExpanded = Boolean(expandedRows[p.product_id]);
                  const rowState = expandedRows[p.product_id];
                  const isLow = lowStock.some((ls) => ls.product_id === p.product_id);

                  return (
                    <>
                      {/* ── Main product row ── */}
                      <TableRow
                        key={`prod-${p.product_id}`}
                        className={`group border-b cursor-pointer transition-colors ${
                          isExpanded
                            ? "bg-primary/5 hover:bg-primary/5"
                            : isLow
                            ? "bg-amber-50/40 hover:bg-amber-50/70"
                            : "hover:bg-primary/5"
                        }`}
                        onClick={() => toggleRow(p.product_id)}
                      >
                        {/* Chevron */}
                        <TableCell className="px-4 py-3">
                          <IconChevronRight
                            className={`size-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-muted-foreground">{(page - 1) * limit + i + 1}</TableCell>
                        <TableCell className="px-4 py-3">
                          <img src={`${imageBaseURL}${p.image_url}`} className="h-20 w-20 object-cover rounded" alt={p.product_name} />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {isLow && <IconAlertTriangle className="size-4 text-amber-500 shrink-0" />}
                            <div>
                              <div className="font-semibold group-hover:text-primary transition-colors">{p.product_name}</div>
                              {p.is_seasonal && (
                                <div className="text-[10px] text-amber-600 font-medium uppercase tracking-widest">
                                  Seasonal · {monthName(p.season_start_month)} – {monthName(p.season_end_month)}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">{p.product_code}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.category?.category_name ?? "--"}</TableCell>
                        <TableCell className="px-4 py-3 font-semibold">{formatKg(p.current_stock_kg)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {GRADES.map((g) => (
                              <span key={g} className="inline-flex items-center gap-1 text-xs bg-muted/60 rounded px-1.5 py-0.5">
                                <span className="font-bold text-foreground">{g}</span>
                                <span className="text-muted-foreground">{p.grade_stock?.[g] ?? 0}</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                          <span className={`font-semibold ${(p.active_pricing_count ?? 0) === 0 ? "text-red-500" : "text-emerald-600"}`}>
                            {p.active_pricing_count ?? 0} active
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <StatusBadge active={p.is_active} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
                              <IconEdit className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Deactivate" onClick={() => setProductDeleteTarget(p)}>
                              <IconTrash className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* ── Expanded accordion row ── */}
                      {isExpanded && (
                        <TableRow key={`expand-${p.product_id}`} className="border-b">
                          <TableCell colSpan={11} className="p-0 bg-muted/20">
                            {rowState?.loading ? (
                              <div className="px-10 py-6 text-sm text-muted-foreground">Loading inventory &amp; pricing...</div>
                            ) : rowState?.detail ? (
                              <ProductAccordionContent
                                product={rowState.detail}
                                lowStock={lowStock}
                                onAdjustStock={(grade) => openAdjust(rowState.detail.product_id, grade)}
                                onViewHistory={(grade) => openTransactions(rowState.detail.product_id, rowState.detail.product_name, grade)}
                                onAddPricing={() => openAddPricing(rowState.detail.product_id)}
                                onDeletePricing={(pricingId) => handleDeletePricing(pricingId, rowState.detail.product_id)}
                                onEditInvPrice={() => openEditInvPrice(rowState.detail)}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground">{page}</span>
            {totalPages ? ` of ${totalPages}` : ""}
            {totalItems != null ? ` | ${totalItems} total` : ""}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button size="sm" variant="outline" disabled={!totalPages || page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════════════
          CREATE / EDIT PRODUCT SHEET  (unchanged from original)
      ════════════════════════════════════════════════════════════════════ */}
   {/* ════════════════════════════════════════════════════════════════════
    CREATE / EDIT PRODUCT SHEET
════════════════════════════════════════════════════════════════════ */}
<Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
  <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
    {/* Header */}
    <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
      <DialogTitle className="flex items-center gap-2 text-base">
        <IconPackage className="size-4 text-muted-foreground" />
        {editTarget ? "Edit Product" : "Add Product"}
      </DialogTitle>
      <DialogDescription className="text-xs mt-0.5">
        {editTarget ? "Update product details below." : "Fill in the details to add a new product."}
      </DialogDescription>
    </DialogHeader>

    {/* Tab bar */}
    {!editTarget && (
      <div className="flex border-b shrink-0 bg-muted/30">
        {(["details", "inventory"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setProductFormTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
              productFormTab === t
                ? "border-primary text-foreground bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "details" ? "Product details" : "Inventory & pricing"}
          </button>
        ))}
      </div>
    )}

    <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* ── TAB 1: Product Details ── */}
        {(editTarget || productFormTab === "details") && (
          <>
            <SectionHeading>Basic Information</SectionHeading>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Product Name *" id="p_name" className="col-span-2">
                <Input
                  id="p_name"
                  className="capitalize"
                  value={form.product_name}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
                    setForm((f) => ({ ...f, product_name: value }));
                  }}
                  placeholder="eg. Tomato"
                  required
                />
              </FormField>
              <FormField label="Product Code *" id="p_code">
                <Input
                  id="p_code"
                  value={form.product_code}
                  onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value.toUpperCase() }))}
                  placeholder="eg. VEG001"
                  required
                />
              </FormField>
              <FormField label="Category *" id="p_cat">
                <Select
                  value={form.category_id || "none"}
                  required
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="p_cat" className="bg-white dark:bg-card">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.category_id} value={String(c.category_id)}>
                        {c.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Unit" id="p_unit">
                <Select
                  value={form.unit || "none"}
                  required
                  onValueChange={(v) => setForm((f) => ({ ...f, unit: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="p_unit" className="bg-white dark:bg-card">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u, index) => (
                      <SelectItem key={index} value={String(u)}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Description" id="p_desc" className="col-span-2">
                <Textarea
                  id="p_desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                />
              </FormField>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="p_seasonal"
                checked={form.is_seasonal}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_seasonal: v }))}
              />
              <Label htmlFor="p_seasonal">Seasonal Product</Label>
            </div>

            {form.is_seasonal && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Season Start Month" id="p_start">
                  <Select
                    value={form.season_start_month || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, season_start_month: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Season End Month" id="p_end">
                  <Select
                    value={form.season_end_month || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, season_end_month: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            <FormField label="Product Image" id="p_img">
              <div className="flex items-center gap-3">
                <input
                  ref={imageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleimgerr(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>
                  Choose Image
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {imageFile ? imageFile.name : "No file chosen"}
                </span>
              </div>
              {imgerr && <span className="text-sm text-red-600">Only JPG, JPEG, PNG images are allowed</span>}
            </FormField>

            {editTarget && (
              <div className="flex items-center gap-3">
                <Switch
                  id="p_active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label htmlFor="p_active">Active</Label>
              </div>
            )}
          </>
        )}

        {/* ── TAB 2: Inventory & Pricing (add only) ── */}
        {!editTarget && productFormTab === "inventory" && (
          <>
            {/* Grade Tabs */}
            <div className="flex gap-2">
              {GRADES.map((g) => {
                const styles: Record<string, string> = {
                  A: "bg-emerald-50 text-emerald-800 border-emerald-300",
                  B: "bg-sky-50 text-sky-800 border-sky-300",
                  C: "bg-amber-50 text-amber-800 border-amber-300",
                };
                const inactive = "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70";
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setProductFormGrade(g)}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                      productFormGrade === g ? styles[g] : inactive
                    }`}
                  >
                    Grade {g}
                  </button>
                );
              })}
            </div>

            {/* Grade badge + hint */}
            <div className="flex items-center gap-2">
              <GradeBadge grade={productFormGrade} />
              <span className="text-xs text-muted-foreground">
                All inventory and Pricing fields required (enter 0 if none)
              </span>
            </div>

            {/* Inventory */}
            <SectionHeading>Inventory</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity (kg) *" id={`inv_qty_${productFormGrade}`}>
                <Input
                  id={`inv_qty_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={form.inventory[productFormGrade].available_quantity_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      inventory: {
                        ...f.inventory,
                        [productFormGrade]: { ...f.inventory[productFormGrade], available_quantity_kg: e.target.value },
                      },
                    }))
                  }
                />
              </FormField>
              <FormField label="Min Stock Alert (kg) *" id={`inv_min_${productFormGrade}`}>
                <Input
                  id={`inv_min_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="20"
                  value={form.inventory[productFormGrade].minimum_stock_alert}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      inventory: {
                        ...f.inventory,
                        [productFormGrade]: { ...f.inventory[productFormGrade], minimum_stock_alert: e.target.value },
                      },
                    }))
                  }
                />
              </FormField>
            </div>

            {/* Pricing */}
            <SectionHeading>Pricing</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Base Price / kg (Rs) *" id={`pr_base_${productFormGrade}`}>
                <Input
                  id={`pr_base_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={form.pricing[productFormGrade].base_price_per_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], base_price_per_kg: e.target.value } },
                    }))
                  }
                />
              </FormField>
              <FormField label="Wholesale Price / kg (Rs) *" id={`pr_ws_${productFormGrade}`}>
                <Input
                  id={`pr_ws_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={form.pricing[productFormGrade].wholesale_price_per_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], wholesale_price_per_kg: e.target.value } },
                    }))
                  }
                />
              </FormField>
              <FormField label="Retail Price / kg (Rs) *" id={`pr_rt_${productFormGrade}`}>
                <Input
                  id={`pr_rt_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={form.pricing[productFormGrade].retail_price_per_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], retail_price_per_kg: e.target.value } },
                    }))
                  }
                />
              </FormField>
              <FormField label="Min Order (kg) *" id={`pr_mo_${productFormGrade}`}>
                <Input
                  id={`pr_mo_${productFormGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="10"
                  value={form.pricing[productFormGrade].minimum_order_kg}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], minimum_order_kg: e.target.value } },
                    }))
                  }
                />
              </FormField>
              {/* <FormField label="Effective From" id={`pr_ef_${productFormGrade}`}>
                <Input
                  id={`pr_ef_${productFormGrade}`}
                  type="date"
                  value={form.pricing[productFormGrade].effective_from}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], effective_from: e.target.value } },
                    }))
                  }
                />
              </FormField>
              <FormField label="Effective To" id={`pr_et_${productFormGrade}`}>
                <Input
                  id={`pr_et_${productFormGrade}`}
                  type="date"
                  value={form.pricing[productFormGrade].effective_to}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pricing: { ...f.pricing, [productFormGrade]: { ...f.pricing[productFormGrade], effective_to: e.target.value } },
                    }))
                  }
                />
              </FormField> */}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
        {!editTarget ? (
          productFormTab === "details" ? (
            <>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Validate tab 1 before advancing
                  if (!form.category_id) { toast.error("Category is required"); return; }
                  if (!form.product_name.trim()) { toast.error("Product name is required"); return; }
                  if (!form.product_code.trim()) { toast.error("Product code is required"); return; }
                  if (!imageFile) { toast.error("Product image is required"); return; }
                  setProductFormTab("inventory");
                }}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setProductFormTab("details")} disabled={saving}>
                Previous
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Product"}
              </Button>
            </>
          )
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

      {/* ════════════════════════════════════════════════════════════════════
          STOCK ADJUSTMENT SHEET  (lifted from InventoryTab)
      ════════════════════════════════════════════════════════════════════ */}
      <Sheet open={adjustOpen} onOpenChange={setAdjustOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adjust Stock</SheetTitle>
            <SheetDescription>
              {adjustProduct
                ? `${adjustProduct.product_name} — Grade ${selectedGrade} · Current: ${formatKg(selectedInv?.available_quantity_kg ?? 0)}`
                : "Loading product details..."}
            </SheetDescription>
          </SheetHeader>

          {adjustLoadingProduct ? (
            <div className="mt-8 text-center text-muted-foreground text-sm">Loading inventory details...</div>
          ) : (
            <form onSubmit={handleAdjust} className="mt-6 space-y-4 px-4">
              <FormField label="Grade" id="adj_grade">
                <Select value={selectedGrade} onValueChange={(v) => handleGradeChange(v as Grade)}>
                  <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => {
                      const inv = adjustProduct?.inventory?.find((i: any) => i.grade === g);
                      return (
                        <SelectItem key={g} value={g}>
                          Grade {g}{inv ? ` — ${formatKg(inv.available_quantity_kg)}` : " — no record"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormField>

              {adjustProduct && !selectedInv && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                  No inventory record for Grade {selectedGrade}. Stock adjustment cannot proceed.
                </p>
              )}

              <FormField label="Transaction Type" id="adj_type">
                <Select value={adjustForm.transaction_type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, transaction_type: v }))}>
                  <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{TRANSACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Quantity (kg) *" id="adj_qty">
                <Input id="adj_qty" type="number" min={0.01} step="0.01" placeholder="0" value={adjustForm.quantity_kg} onChange={(e) => setAdjustForm((f) => ({ ...f, quantity_kg: e.target.value }))} required />
              </FormField>
              <FormField label="Reference Type" id="adj_ref_type">
                <Select value={adjustForm.reference_type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, reference_type: v }))}>
                  <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>{REFERENCE_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              {adjustForm.reference_type !== "manual" && (
                <FormField label="Reference ID" id="adj_ref_id">
                  <Input id="adj_ref_id" type="number" placeholder="Reference record ID" value={adjustForm.reference_id} onChange={(e) => setAdjustForm((f) => ({ ...f, reference_id: e.target.value }))} />
                </FormField>
              )}
              {/* <FormField label="Warehouse Location" id="adj_wh">
                <Input id="adj_wh" placeholder="e.g. Rack-1" value={adjustForm.warehouse_location} onChange={(e) => setAdjustForm((f) => ({ ...f, warehouse_location: e.target.value }))} />
              </FormField> */}
              <FormField label="Min Stock Alert (kg)" id="adj_min">
                <Input id="adj_min" type="number" min={0} step="0.01" placeholder="Leave blank to keep current" value={adjustForm.minimum_stock_alert} onChange={(e) => setAdjustForm((f) => ({ ...f, minimum_stock_alert: e.target.value }))} />
              </FormField>
              <FormField label="Remarks" id="adj_remarks">
                <Textarea id="adj_remarks" placeholder="Optional notes" rows={2} value={adjustForm.remarks} onChange={(e) => setAdjustForm((f) => ({ ...f, remarks: e.target.value }))} />
              </FormField>
              <SheetFooter className="pt-4 gap-2">
                <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)} disabled={adjustSaving}>Cancel</Button>
                <Button type="submit" disabled={adjustSaving || !selectedInv}>
                  {adjustSaving ? "Saving..." : "Apply Adjustment"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* ════════════════════════════════════════════════════════════════════
          TRANSACTION HISTORY SHEET  (lifted from InventoryTab)
      ════════════════════════════════════════════════════════════════════ */}
      <Sheet open={txOpen} onOpenChange={setTxOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transaction History</SheetTitle>
            <SheetDescription>{txProductName}{txGrade ? ` · Grade ${txGrade}` : ""}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3 px-3">
            {txLoading ? (
              <p className="text-center text-muted-foreground text-sm">Loading...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">No transactions found.</p>
            ) : (
              transactions.map((tx: any) => (
                <div key={tx.transaction_id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{tx.transaction_type}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-semibold flex items-center gap-1">
                        {["stock_in", "return"].includes(tx.transaction_type)
                          ? <IconArrowUp className="size-3 text-emerald-500" />
                          : <IconArrowDown className="size-3 text-red-500" />}
                        {formatKg(tx.quantity_kg)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Before → After</span>
                      <span className="font-medium">{formatKg(tx.previous_quantity)} → {formatKg(tx.new_quantity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference</span>
                      <span className="font-medium">{tx.reference_type ?? "--"} {tx.reference_id ? `#${tx.reference_id}` : ""}</span>
                    </div>
                    {tx.remarks && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Remarks: </span>
                        <span className="font-medium">{tx.remarks}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {txTotalPages && txTotalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={txPage <= 1 || txLoading} onClick={() => { const p = txPage - 1; setTxPage(p); if (txInventoryId) fetchTransactions(txInventoryId, p); }}>Prev</Button>
                <span className="text-sm text-muted-foreground self-center">Page {txPage} of {txTotalPages}</span>
                <Button size="sm" variant="outline" disabled={txPage >= (txTotalPages ?? 1) || txLoading} onClick={() => { const p = txPage + 1; setTxPage(p); if (txInventoryId) fetchTransactions(txInventoryId, p); }}>Next</Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ════════════════════════════════════════════════════════════════════
          ADD PRICING SHEET  (lifted from PricingTab)
      ════════════════════════════════════════════════════════════════════ */}
      <Sheet open={pricingSheetOpen} onOpenChange={setPricingSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Pricing</SheetTitle>
            <SheetDescription>Create a new pricing entry for a product grade.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAddPricing} className="mt-6 space-y-4 px-4">
            <FormField label="Grade *" id="pr_grade">
              <Select value={pricingForm.grade} onValueChange={(v) => setPricingForm((f) => ({ ...f, grade: v as Grade }))}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <FormField label="Base Price / kg (Rs) *" id="pr_base">
              <Input id="pr_base" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.base_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, base_price_per_kg: e.target.value }))} required />
            </FormField>
            <FormField label="Wholesale Price / kg (Rs) *" id="pr_ws">
              <Input id="pr_ws" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.wholesale_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, wholesale_price_per_kg: e.target.value }))} required />
            </FormField>
            <FormField label="Retail Price / kg (Rs) *" id="pr_rt">
              <Input id="pr_rt" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.retail_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, retail_price_per_kg: e.target.value }))} required />
            </FormField>
            <FormField label="Min Order (kg)" id="pr_mo">
              <Input id="pr_mo" type="number" min={0} step="0.01" placeholder="10" value={pricingForm.minimum_order_kg} onChange={(e) => setPricingForm((f) => ({ ...f, minimum_order_kg: e.target.value }))} />
            </FormField>
            {/* <FormField label="Effective From *" id="pr_ef">
              <Input id="pr_ef" type="date" value={pricingForm.effective_from} onChange={(e) => setPricingForm((f) => ({ ...f, effective_from: e.target.value }))} required />
            </FormField>
            <FormField label="Effective To" id="pr_et">
              <Input id="pr_et" type="date" value={pricingForm.effective_to} onChange={(e) => setPricingForm((f) => ({ ...f, effective_to: e.target.value }))} />
            </FormField> */}
            <SheetFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setPricingSheetOpen(false)} disabled={pricingSaving}>Cancel</Button>
              <Button type="submit" disabled={pricingSaving}>{pricingSaving ? "Saving..." : "Add Pricing"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation Dialog ── */}
<Dialog open={!!productDeleteTarget} onOpenChange={(open) => { if (!open) setProductDeleteTarget(null); }}>
  <DialogContent className="sm:max-w-[420px]">
    <DialogHeader>
      <DialogTitle className="text-destructive flex items-center gap-2">
        <IconAlertTriangle className="size-5" />
        Delete Product
      </DialogTitle>
      <DialogDescription>
        Are you sure you want to delete{" "}
        <span className="font-semibold text-foreground">{productDeleteTarget?.product_name}</span>?
        This action will delete the product permanently.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setProductDeleteTarget(null)} disabled={productDeleting}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={productDeleting}>
        <IconTrash className="mr-2 size-4" />
        {productDeleting ? "Deleting..." : "Delete Product"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* ════════════════════════════════════════════════════════════════════
    EDIT INVENTORY & PRICING DIALOG
════════════════════════════════════════════════════════════════════ */}
<EditInventoryPricingDialog
  open={editInvPriceOpen}
  onOpenChange={setEditInvPriceOpen}
  product={editInvPriceProduct}
  onSuccess={async () => {
    fetchProducts();
    fetchLowStock();
    if (editInvPriceProduct?.product_id) {
      await refreshExpandedRow(editInvPriceProduct.product_id);
    }
  }}
/>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT ACCORDION CONTENT
// Renders the expanded inline panel with Inventory + Pricing side by side
// ═══════════════════════════════════════════════════════════════════════════════

interface ProductAccordionContentProps {
  product: any;
  lowStock: any[];
  onAdjustStock: (grade: Grade) => void;
  onViewHistory: (grade: Grade) => void;
  onAddPricing: () => void;
  onDeletePricing: (pricingId: number) => void;
  onEditInvPrice: () => void;
}

function ProductAccordionContent({
  product,
  lowStock,
  onAdjustStock,
  onViewHistory,
  onAddPricing,
  onDeletePricing,
  onEditInvPrice
}: ProductAccordionContentProps) {
  return (
    <div className="px-4 py-5 grid grid-cols-2 gap-6">
      {/* ── LEFT: Inventory by Grade ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Inventory by Grade
          </p>
          {/* <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={(e) => { e.stopPropagation(); onAdjustStock("A"); }}
          >
            <IconRefresh className="mr-1 size-3" /> Adjust Stock
          </Button> */}
        </div>

        <div className="space-y-2">
          {(product.inventory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No inventory records.</p>
          ) : (
            (product.inventory as any[]).map((inv: any) => {
              const isBelowMin = lowStock.some(
                (ls) => ls.product_id === product.product_id && ls.grade === inv.grade
              );
              return (
                <div key={inv.inventory_id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <GradeBadge grade={inv.grade} />
                    <span className={`text-sm font-semibold flex items-center gap-1 ${isBelowMin ? "text-amber-600" : ""}`}>
                      {isBelowMin && <IconAlertTriangle className="size-3.5 text-amber-500" />}
                      {formatKg(inv.available_quantity_kg)} available
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Reserved</span>
                      <span className="font-medium text-foreground">{formatKg(inv.reserved_quantity_kg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Alert</span>
                      <span className={`font-medium ${isBelowMin ? "text-amber-600" : "text-foreground"}`}>
                        {formatKg(inv.minimum_stock_alert)}
                      </span>
                    </div>
                    {/* <div className="flex justify-between">
                      <span>Location</span>
                      <span className="font-medium text-foreground">{inv.warehouse_location ?? "--"}</span>
                    </div> */}
                    <div className="flex justify-between">
                      <span>Last Restocked</span>
                      <span className="font-medium text-foreground">{formatDate(inv.last_restocked_at)}</span>
                    </div>
                  </div>
                  {/* Per-grade action row */}
                  <div className="flex items-center gap-3 mt-3 pt-2.5 border-t">
                    <button
                      type="button"
                      className="text-[11px] text-primary underline underline-offset-2 hover:opacity-70"
                      onClick={(e) => { e.stopPropagation(); onViewHistory(inv.grade as Grade); }}
                    >
                      View History
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-6 px-2 ml-auto"
                      onClick={(e) => { e.stopPropagation(); onAdjustStock(inv.grade as Grade); }}
                    >
                      <IconRefresh className="mr-1 size-3" /> Adjust Grade {inv.grade}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Pricing by Grade ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Pricing by Grade
          </p>
         {/* <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={(e) => { e.stopPropagation(); onEditInvPrice(); }}
          >
            <IconEdit className="mr-1 size-3" /> Edit Inventory & Pricing
          </Button> */}
        </div>

        <div className="space-y-2">
          {(product.pricing ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No pricing records.</p>
          ) : (
            (product.pricing as any[]).map((pr: any) => (
              <div key={pr.pricing_id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GradeBadge grade={pr.grade} />
                    <StatusBadge active={pr.is_active} />
                  </div>
                  <div className="flex items-center gap-2">
            <Button
            size="sm"
            variant="outline"
            className="text-xs h-7 px-2"
            onClick={(e) => { e.stopPropagation(); onAddPricing(); }}
          >
            <IconEdit className="mr-1 size-3" /> Edit Pricing
          </Button>
                        {/* <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-red-500 hover:text-red-600"
                    title="Deactivate pricing"
                    onClick={(e) => { e.stopPropagation(); onDeletePricing(pr.pricing_id); }}
                  >
                    <IconTrash className="size-3.5" />
                  </Button> */}
                  </div>
                 
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-muted-foreground border-b ">
                  <div className="flex justify-between">
                    <span>Base Price</span>
                    <span className="font-semibold text-foreground">{formatRs(pr.base_price_per_kg)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wholesale</span>
                    <span className="font-semibold text-foreground">{formatRs(pr.wholesale_price_per_kg)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retail</span>
                    <span className="font-semibold text-foreground">{formatRs(pr.retail_price_per_kg)}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Order</span>
                    <span className="font-semibold text-foreground">{formatKg(pr.minimum_order_kg)}</span>
                  </div>
                  {/* <div className="flex justify-between col-span-2 ">
                    <span>Effective</span>
                    <span className="font-medium text-foreground">
                      {formatDate(pr.effective_from)} → {pr.effective_to ? formatDate(pr.effective_to) : "Ongoing"}
                    </span>
                  </div> */}
                </div>    
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS  (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
          : "bg-muted text-muted-foreground border-transparent"
      }
    >
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT INVENTORY & PRICING DIALOG
// Per-grade dialog for updating both inventory quantities and pricing
// ═══════════════════════════════════════════════════════════════════════════════

interface EditInventoryPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onSuccess: () => void;
}

function EditInventoryPricingDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: EditInventoryPricingDialogProps) {
  const [activeGrade, setActiveGrade] = useState<Grade>("A");
  const [saving, setSaving] = useState(false);

  // Per-grade form state
  const emptyGradeForm = () => ({
    // Inventory
    quantity_kg: "",
    minimum_stock_alert: "",
    // Pricing
    base_price_per_kg: "",
    wholesale_price_per_kg: "",
    retail_price_per_kg: "",
    minimum_order_kg: "10",
    effective_from: new Date().toISOString().split("T")[0],
    effective_to: "",
  });

  const [gradeData, setGradeData] = useState
  <Record<Grade, ReturnType<typeof emptyGradeForm>>
>({ A: emptyGradeForm(), B: emptyGradeForm(), C: emptyGradeForm() });

  // Seed form from existing product data when dialog opens
  useEffect(() => {
    if (!open || !product) return;
    const next: Record<Grade, ReturnType<typeof emptyGradeForm>> = {
      A: emptyGradeForm(),
      B: emptyGradeForm(),
      C: emptyGradeForm(),
    };
    GRADES.forEach((g) => {
      const inv = product.inventory?.find((i: any) => i.grade === g);
      const pr = product.pricing
        ?.filter((p: any) => p.grade === g && p.is_active)
        ?.sort((a: any, b: any) =>
          new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
        )?.[0];

      if (inv) {
        next[g].quantity_kg = inv.available_quantity_kg != null ? String(inv.available_quantity_kg) : "";
        next[g].minimum_stock_alert = inv.minimum_stock_alert != null ? String(inv.minimum_stock_alert) : "";
      }
      if (pr) {
        next[g].base_price_per_kg = pr.base_price_per_kg != null ? String(pr.base_price_per_kg) : "";
        next[g].wholesale_price_per_kg = pr.wholesale_price_per_kg != null ? String(pr.wholesale_price_per_kg) : "";
        next[g].retail_price_per_kg = pr.retail_price_per_kg != null ? String(pr.retail_price_per_kg) : "";
        next[g].minimum_order_kg = pr.minimum_order_kg != null ? String(pr.minimum_order_kg) : "10";
        next[g].effective_from = new Date().toISOString().split("T")[0];
        next[g].effective_to = "";
      }
    });
    setGradeData(next);
    setActiveGrade("A");
  }, [open, product]);

  const setField = (grade: Grade, field: string, value: string) => {
    setGradeData((prev) => ({
      ...prev,
      [grade]: { ...prev[grade], [field]: value },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
  if (!product) return;

  // ── NEW: Validate retail price when pricing is being updated ──
  const missingRetailGrade = GRADES.find((g) => {
    const item = gradeData[g];
    // If base price (and thus a pricing update) is provided, retail is required
    return item.base_price_per_kg !== "" && item.retail_price_per_kg === "";
  });
  if (missingRetailGrade) {
    toast.error(`Retail price is required for Grade ${missingRetailGrade}`);
    setActiveGrade(missingRetailGrade);
    return;
  }
    setSaving(true);

    try {
      const promises: Promise<any>[] = [];

      for (const g of GRADES) {
        const d = gradeData[g];
        const inv = product.inventory?.find((i: any) => i.grade === g);
        const activePricing = product.pricing
          ?.filter((p: any) => p.grade === g && p.is_active)
          ?.sort((a: any, b: any) =>
            new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
          )?.[0];

        // ── Inventory: patch if record exists and quantity changed ──
        if (inv && d.quantity_kg !== "") {
          const body: any = {
            transaction_type: "adjustment",
            quantity_kg: Number(d.quantity_kg),
            reference_type: "manual",
          };
          if (d.minimum_stock_alert !== "") {
            body.minimum_stock_alert = Number(d.minimum_stock_alert);
          }
          promises.push(api.patch(`/admin/inventory/${inv.inventory_id}`, body));
        }

        // ── Pricing: add new entry if base price + effective_from filled ──
        if (d.base_price_per_kg && d.effective_from) {
          const pricingBody: any = {
            product_id: product.product_id,
            grade: g,
            base_price_per_kg: Number(d.base_price_per_kg),
            wholesale_price_per_kg: Number(d.wholesale_price_per_kg),
            retail_price_per_kg: Number(d.retail_price_per_kg),
            minimum_order_kg: Number(d.minimum_order_kg) || 10,
            effective_from: d.effective_from,
          };
          // if (d.retail_price_per_kg) pricingBody.retail_price_per_kg = Number(d.retail_price_per_kg);
          if (d.effective_to) pricingBody.effective_to = d.effective_to;

          // If there's already an active pricing entry for this grade and same effective_from, skip duplicate
          const isSameEntry =
            activePricing &&
            activePricing.effective_from?.split("T")[0] === d.effective_from &&
            String(activePricing.base_price_per_kg) === d.base_price_per_kg;

          if (!isSameEntry) {
            promises.push(api.post("/admin/pricing", pricingBody));
          }
        }
      }

      await Promise.all(promises);
      toast.success("Inventory & pricing updated successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const gradeTabStyle: Record<Grade, string> = {
    A: "bg-emerald-50 text-emerald-800 border-emerald-300",
    B: "bg-sky-50 text-sky-800 border-sky-300",
    C: "bg-amber-50 text-amber-800 border-amber-300",
  };
  const gradeTabInactive = "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70";

  const d = gradeData[activeGrade];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <IconEdit className="size-4 text-muted-foreground" />
            Edit Inventory &amp; Pricing
          </DialogTitle>
          <DialogDescription className="text-xs mt-0.5">
            {product?.product_name} · Update per-grade inventory quantities and pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Grade Tabs */}
            <div className="flex gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGrade(g)}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                    activeGrade === g ? gradeTabStyle[g] : gradeTabInactive
                  }`}
                >
                  Grade {g}
                </button>
              ))}
            </div>

            {/* Grade badge header */}
            <div className="flex items-center gap-2">
              <GradeBadge grade={activeGrade} />
              {product?.inventory?.find((i: any) => i.grade === activeGrade) ? (
                <span className="text-xs text-muted-foreground">
                  Current stock: {formatKg(product.inventory.find((i: any) => i.grade === activeGrade)?.available_quantity_kg)}
                </span>
              ) : (
                <span className="text-xs text-amber-600">No inventory record for this grade</span>
              )}
            </div>

            {/* ── Inventory Section ── */}
            <SectionHeading>Inventory</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity (kg)" id={`edit_qty_${activeGrade}`}>
                <Input
                  id={`edit_qty_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 150"
                  value={d.quantity_kg}
                  onChange={(e) => setField(activeGrade, "quantity_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Min stock alert (kg)" id={`edit_min_${activeGrade}`}>
                <Input
                  id={`edit_min_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 20"
                  value={d.minimum_stock_alert}
                  onChange={(e) => setField(activeGrade, "minimum_stock_alert", e.target.value)}
                />
              </FormField>
            </div>

            {/* ── Pricing Section ── */}
            <SectionHeading>Pricing</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Base price / kg (Rs)" id={`edit_base_${activeGrade}`}>
                <Input
                  id={`edit_base_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={d.base_price_per_kg}
                  onChange={(e) => setField(activeGrade, "base_price_per_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Wholesale price / kg (Rs)" id={`edit_ws_${activeGrade}`}>
                <Input
                  id={`edit_ws_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={d.wholesale_price_per_kg}
                  onChange={(e) => setField(activeGrade, "wholesale_price_per_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Retail price / kg (Rs) *" id={`edit_rt_${activeGrade}`}>
                <Input
                  id={`edit_rt_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={d.retail_price_per_kg}
                  onChange={(e) => setField(activeGrade, "retail_price_per_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Min order (kg)" id={`edit_mo_${activeGrade}`}>
                <Input
                  id={`edit_mo_${activeGrade}`}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="10"
                  value={d.minimum_order_kg}
                  onChange={(e) => setField(activeGrade, "minimum_order_kg", e.target.value)}
                />
              </FormField>
              <FormField label="Effective from" id={`edit_ef_${activeGrade}`}>
                <Input
                  id={`edit_ef_${activeGrade}`}
                  type="date"
                  value={d.effective_from}
                  onChange={(e) => setField(activeGrade, "effective_from", e.target.value)}
                />
              </FormField>
              <FormField label="Effective to" id={`edit_et_${activeGrade}`}>
                <Input
                  id={`edit_et_${activeGrade}`}
                  type="date"
                  value={d.effective_to}
                  onChange={(e) => setField(activeGrade, "effective_to", e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const styles: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-800 border-emerald-200",
    B: "bg-sky-100 text-sky-800 border-sky-200",
    C: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <Badge variant="outline" className={`font-bold text-xs px-2 ${styles[grade] ?? "bg-muted"}`}>
      Grade {grade}
    </Badge>
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
      <Label htmlFor={id} className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}