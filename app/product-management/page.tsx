"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/animate-ui/components/radix/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import api from "@/app/services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

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
            <Tabs defaultValue="categories" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="categories" className="gap-2">
                  <IconCategory className="size-4" /> Categories
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2">
                  <IconPackage className="size-4" /> Products
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2">
                  <IconTag className="size-4" /> Inventory
                </TabsTrigger>
                <TabsTrigger value="pricing" className="gap-2">
                  <IconCurrencyRupee className="size-4" /> Pricing
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories">
                <CategoriesTab />
              </TabsContent>
              <TabsContent value="products">
                <ProductsTab />
              </TabsContent>
              <TabsContent value="inventory">
                <InventoryTab />
              </TabsContent>
              <TabsContent value="pricing">
                <PricingTab />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function CategoriesTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    category_name: "",
    category_code: "",
    description: "",
    display_order: "",
    is_active: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
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

  const handleDelete = async (cat: any) => {
    if (!confirm(`Deactivate category "${cat.category_name}"?`)) return;
    try {
      await api.delete(`/admin/products/categories/${cat.category_id}`);
      toast.success("Category deactivated");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to deactivate");
    }
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
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(cat)}>
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

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? "Edit Category" : "Add Category"}</SheetTitle>
            <SheetDescription>
              {editTarget ? "Update category details below." : "Fill in the details to create a new category."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField label="Category Name *" id="cat_name">
              <Input
                id="cat_name"
                value={form.category_name}
                onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                placeholder="e.g. Vegetables"
                required
              />
            </FormField>
            <FormField label="Category Code *" id="cat_code">
              <Input
                id="cat_code"
                value={form.category_code}
                onChange={(e) => setForm((f) => ({ ...f, category_code: e.target.value.toUpperCase() }))}
                placeholder="e.g. VEG"
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
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>
                  Choose Image
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {imageFile ? imageFile.name : "No file chosen"}
                </span>
              </div>
            </FormField>
            <FormField label="Category Icon" id="cat_icon">
              <div className="flex items-center gap-3">
                <input
                  ref={iconRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => iconRef.current?.click()}>
                  Choose Icon
                </Button>
                <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                  {iconFile ? iconFile.name : "No file chosen"}
                </span>
              </div>
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
            <SheetFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editTarget ? "Save Changes" : "Create Category"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [seasonalFilter, setSeasonalFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const limit = 10;

  // Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Product form
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
      A: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: "", effective_to: "" },
      B: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: "", effective_to: "" },
      C: { base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: "", effective_to: "" },
    } as Record<Grade, { base_price_per_kg: string; wholesale_price_per_kg: string; retail_price_per_kg: string; minimum_order_kg: string; effective_from: string; effective_to: string }>,
  });

  const [form, setForm] = useState(emptyProductForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/admin/products/categories", { params: { is_active: true } });
      const data = res.data?.data ?? res.data;
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
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
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, categoryFilter, activeFilter, seasonalFilter]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyProductForm());
    setImageFile(null);
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

  const openDetail = async (product: any) => {
    setDetailOpen(true);
    setDetailProduct(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/products/${product.product_id}`);
      setDetailProduct(res.data?.data ?? res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch product details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id) { toast.error("Category is required"); return; }
    if (!form.product_name.trim()) { toast.error("Product name is required"); return; }
    if (!form.product_code.trim()) { toast.error("Product code is required"); return; }
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
        // Build inventory & pricing JSON arrays for create
        const inventoryArr = GRADES
          .filter((g) => form.inventory[g].available_quantity_kg !== "")
          .map((g) => ({
            grade: g,
            available_quantity_kg: Number(form.inventory[g].available_quantity_kg),
            warehouse_location: form.inventory[g].warehouse_location || undefined,
            minimum_stock_alert: form.inventory[g].minimum_stock_alert ? Number(form.inventory[g].minimum_stock_alert) : 20,
          }));
          // AFTER — all pricing fields included
          const pricingArr = GRADES
            .filter((g) => form.pricing[g].base_price_per_kg !== "" && form.pricing[g].effective_from !== "")
            .map((g) => ({
              grade: g,
              base_price_per_kg: Number(form.pricing[g].base_price_per_kg),
              wholesale_price_per_kg: Number(form.pricing[g].wholesale_price_per_kg),
              ...(form.pricing[g].retail_price_per_kg ? { retail_price_per_kg: Number(form.pricing[g].retail_price_per_kg) } : {}),
              minimum_order_kg: Number(form.pricing[g].minimum_order_kg) || 10,
              effective_from: form.pricing[g].effective_from,
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
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: any) => {
    if (!confirm(`Deactivate product "${product.product_name}"?`)) return;
    try {
      await api.delete(`/admin/products/${product.product_id}`);
      toast.success("Product deactivated");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to deactivate");
    }
  };

  return (
    <>
      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        {/* Toolbar */}
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
            {/* Category filter */}
            <Select value={categoryFilter || "all_cat"} onValueChange={(v) => { setCategoryFilter(v === "all_cat" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-white dark:bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_cat">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Active filter */}
            <Select value={activeFilter || "all_active"} onValueChange={(v) => { setActiveFilter(v === "all_active" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_active">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {/* Seasonal filter */}
            <Select value={seasonalFilter || "all_season"} onValueChange={(v) => { setSeasonalFilter(v === "all_season" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_season">All Types</SelectItem>
                <SelectItem value="true">Seasonal</SelectItem>
                <SelectItem value="false">Year-round</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={openCreate}>
            <IconPlus className="mr-2 size-4" /> Add Product
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">S.No</TableHead>
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
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Loading products...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No products found.</TableCell>
                </TableRow>
              ) : (
                products.map((p, i) => (
                  <TableRow key={p.product_id} className="group hover:bg-primary/5 border-b last:border-0">
                    <TableCell className="px-4 py-3 text-muted-foreground">{(page - 1) * limit + i + 1}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-semibold group-hover:text-primary transition-colors">{p.product_name}</div>
                      {p.is_seasonal && (
                        <div className="text-[10px] text-amber-600 font-medium uppercase tracking-widest">
                          Seasonal · {monthName(p.season_start_month)} – {monthName(p.season_end_month)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">{p.product_code}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {p.category?.category_name ?? "--"}
                    </TableCell>
                    <TableCell className="px-4 py-3 font-semibold">
                      {formatKg(p.current_stock_kg)}
                    </TableCell>
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
                      {p.active_pricing_count ?? 0} active
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge active={p.is_active} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View details" onClick={() => openDetail(p)}>
                          <IconEye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
                          <IconEdit className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Deactivate" onClick={() => handleDelete(p)}>
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

        {/* Pagination */}
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

      {/* Create / Edit Product Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? "Edit Product" : "Add Product"}</SheetTitle>
            <SheetDescription>
              {editTarget ? "Update product details below." : "Fill in the details to add a new product."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Basic Info */}
            <SectionHeading>Basic Information</SectionHeading>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Product Name *" id="p_name" className="col-span-2">
                <Input id="p_name" value={form.product_name} onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))} placeholder="e.g. Tomato" required />
              </FormField>
              <FormField label="Product Code *" id="p_code">
                <Input id="p_code" value={form.product_code} onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value.toUpperCase() }))} placeholder="e.g. VEG001" required />
              </FormField>
              <FormField label="Category *" id="p_cat">
                <Select value={form.category_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v === "none" ? "" : v }))}>
                  <SelectTrigger id="p_cat" className="bg-white dark:bg-card">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Unit" id="p_unit">
                <Input id="p_unit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="kg" />
              </FormField>
              <FormField label="Description" id="p_desc" className="col-span-2">
                <Textarea id="p_desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={2} />
              </FormField>
            </div>

            {/* Seasonal */}
            <div className="flex items-center gap-3">
              <Switch id="p_seasonal" checked={form.is_seasonal} onCheckedChange={(v) => setForm((f) => ({ ...f, is_seasonal: v }))} />
              <Label htmlFor="p_seasonal">Seasonal Product</Label>
            </div>
            {form.is_seasonal && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Season Start Month" id="p_start">
                  <Select value={form.season_start_month || "none"} onValueChange={(v) => setForm((f) => ({ ...f, season_start_month: v === "none" ? "" : v }))}>
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Season End Month" id="p_end">
                  <Select value={form.season_end_month || "none"} onValueChange={(v) => setForm((f) => ({ ...f, season_end_month: v === "none" ? "" : v }))}>
                    <SelectTrigger className="bg-white dark:bg-card">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}

            {/* Image */}
            <FormField label="Product Image" id="p_img">
              <div className="flex items-center gap-3">
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()}>Choose Image</Button>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">{imageFile ? imageFile.name : "No file chosen"}</span>
              </div>
            </FormField>

            {/* Edit-only: is_active */}
            {editTarget && (
              <div className="flex items-center gap-3">
                <Switch id="p_active" checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label htmlFor="p_active">Active</Label>
              </div>
            )}

            {/* Inventory per grade (create only) */}
            {!editTarget && (
              <>
                <SectionHeading>Initial Inventory (Optional)</SectionHeading>
                <div className="space-y-4">
                  {GRADES.map((g) => (
                    <div key={g} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <GradeBadge grade={g} />
                        <span className="text-sm font-medium">Grade {g} Inventory</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField label="Quantity (kg)" id={`inv_qty_${g}`}>
                          <Input
                            id={`inv_qty_${g}`}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0"
                            value={form.inventory[g].available_quantity_kg}
                            onChange={(e) => setForm((f) => ({ ...f, inventory: { ...f.inventory, [g]: { ...f.inventory[g], available_quantity_kg: e.target.value } } }))}
                          />
                        </FormField>
                        <FormField label="Warehouse Location" id={`inv_wh_${g}`}>
                          <Input
                            id={`inv_wh_${g}`}
                            placeholder="e.g. Rack-1"
                            value={form.inventory[g].warehouse_location}
                            onChange={(e) => setForm((f) => ({ ...f, inventory: { ...f.inventory, [g]: { ...f.inventory[g], warehouse_location: e.target.value } } }))}
                          />
                        </FormField>
                        <FormField label="Min Stock Alert (kg)" id={`inv_min_${g}`}>
                          <Input
                            id={`inv_min_${g}`}
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="20"
                            value={form.inventory[g].minimum_stock_alert}
                            onChange={(e) => setForm((f) => ({ ...f, inventory: { ...f.inventory, [g]: { ...f.inventory[g], minimum_stock_alert: e.target.value } } }))}
                          />
                        </FormField>
                      </div>
                    </div>
                  ))}
                </div>

                <SectionHeading>Initial Pricing (Optional)</SectionHeading>
                <div className="space-y-4">
                  {GRADES.map((g) => (
                    <div key={g} className="rounded-xl border bg-muted/20 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <GradeBadge grade={g} />
                        <span className="text-sm font-medium">Grade {g} Pricing</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="Base Price / kg (Rs)" id={`pr_base_${g}`}>
                          <Input id={`pr_base_${g}`} type="number" min={0} step="0.01" placeholder="0" value={form.pricing[g].base_price_per_kg} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], base_price_per_kg: e.target.value } } }))} />
                        </FormField>
                        <FormField label="Wholesale Price / kg (Rs)" id={`pr_ws_${g}`}>
                          <Input id={`pr_ws_${g}`} type="number" min={0} step="0.01" placeholder="0" value={form.pricing[g].wholesale_price_per_kg} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], wholesale_price_per_kg: e.target.value } } }))} />
                        </FormField>
                        <FormField label="Retail Price / kg (Rs)" id={`pr_rt_${g}`}>
                          <Input id={`pr_rt_${g}`} type="number" min={0} step="0.01" placeholder="0" value={form.pricing[g].retail_price_per_kg} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], retail_price_per_kg: e.target.value } } }))} />
                        </FormField>
                        <FormField label="Min Order (kg)" id={`pr_mo_${g}`}>
                          <Input id={`pr_mo_${g}`} type="number" min={0} step="0.01" placeholder="10" value={form.pricing[g].minimum_order_kg} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], minimum_order_kg: e.target.value } } }))} />
                        </FormField>
                        <FormField label="Effective From *" id={`pr_ef_${g}`}>
                          <Input id={`pr_ef_${g}`} type="date" value={form.pricing[g].effective_from} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], effective_from: e.target.value } } }))} />
                        </FormField>
                        <FormField label="Effective To" id={`pr_et_${g}`}>
                          <Input id={`pr_et_${g}`} type="date" value={form.pricing[g].effective_to} onChange={(e) => setForm((f) => ({ ...f, pricing: { ...f.pricing, [g]: { ...f.pricing[g], effective_to: e.target.value } } }))} />
                        </FormField>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <SheetFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : editTarget ? "Save Changes" : "Create Product"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Product Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Product Details</SheetTitle>
            <SheetDescription>Full inventory and pricing breakdown</SheetDescription>
          </SheetHeader>
          {detailLoading ? (
            <div className="mt-8 text-center text-muted-foreground">Loading...</div>
          ) : detailProduct ? (
            <ProductDetail product={detailProduct} />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── Product detail view ────────────────────────────────────────────────────────

function ProductDetail({ product }: { product: any }) {
  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-emerald-50/40 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Product</p>
            <p className="text-2xl font-semibold">{product.product_name}</p>
            <p className="text-sm text-muted-foreground">{product.category?.category_name} · {product.product_code}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge active={product.is_active} />
            {product.is_seasonal && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                Seasonal · {monthName(product.season_start_month)} – {monthName(product.season_end_month)}
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Stock</p>
            <p className="text-xl font-semibold text-foreground">{formatKg(product.current_stock_kg)}</p>
          </div>
          <div className="rounded-lg bg-white/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Unit</p>
            <p className="text-xl font-semibold">{product.unit ?? "kg"}</p>
          </div>
        </div>
      </div>

      {/* Inventory */}
      <div>
        <p className="text-sm font-semibold mb-3">Inventory by Grade</p>
        <div className="space-y-2">
          {(product.inventory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory records.</p>
          ) : (
            product.inventory.map((inv: any) => (
              <div key={inv.inventory_id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <GradeBadge grade={inv.grade} />
                  <span className="text-sm font-semibold">{formatKg(inv.available_quantity_kg)} available</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Reserved</span>
                    <span className="font-medium text-foreground">{formatKg(inv.reserved_quantity_kg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Alert</span>
                    <span className="font-medium text-foreground">{formatKg(inv.minimum_stock_alert)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span className="font-medium text-foreground">{inv.warehouse_location ?? "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Restocked</span>
                    <span className="font-medium text-foreground">{formatDate(inv.last_restocked_at)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pricing */}
      <div>
        <p className="text-sm font-semibold mb-3">Pricing by Grade</p>
        <div className="space-y-2">
          {(product.pricing ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No pricing records.</p>
          ) : (
            product.pricing.map((pr: any) => (
              <div key={pr.pricing_id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <GradeBadge grade={pr.grade} />
                  <StatusBadge active={pr.is_active} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
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
                  <div className="flex justify-between col-span-2">
                    <span>Effective</span>
                    <span className="font-medium text-foreground">{formatDate(pr.effective_from)} → {pr.effective_to ? formatDate(pr.effective_to) : "Ongoing"}</span>
                  </div>
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
// INVENTORY TAB
// ═══════════════════════════════════════════════════════════════════════════════

function InventoryTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const limit = 10;
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Adjust stock sheet
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any | null>(null); // full product detail
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

  // Transaction history sheet
  const [txOpen, setTxOpen] = useState(false);
  const [txInventoryId, setTxInventoryId] = useState<number | null>(null);
  const [txProductName, setTxProductName] = useState("");
  const [txGrade, setTxGrade] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState<number | null>(null);

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

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (gradeFilter) params.grade = gradeFilter;
      if (categoryFilter) params.category_id = Number(categoryFilter);
      const res = await api.get("/admin/inventory", { params });
      const data = res.data?.data ?? res.data;
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setTotalPages(data?.pagination?.total_pages ?? null);
      setTotalItems(data?.pagination?.total ?? null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, [page, limit, gradeFilter, categoryFilter]);

  useEffect(() => { fetchCategories(); fetchLowStock(); }, [fetchCategories, fetchLowStock]);
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

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

  // ── Open adjust: fetch full product to get per-grade inventory_id ──────────
  const openAdjust = async (productId: number, productName: string) => {
    setAdjustProduct(null);
    setSelectedGrade("A");
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
      // Pre-fill warehouse location from Grade A inventory if available
      const gradeAInv = detail?.inventory?.find((inv: any) => inv.grade === "A");
      if (gradeAInv?.warehouse_location) {
        setAdjustForm((f) => ({ ...f, warehouse_location: gradeAInv.warehouse_location }));
      }
    } catch {
      toast.error("Failed to load product inventory details");
      setAdjustOpen(false);
    } finally {
      setAdjustLoadingProduct(false);
    }
  };

  // ── When grade changes in adjust sheet, update warehouse/min from that grade ─
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

  // ── Open transactions: fetch product detail to get inventory_id for grade ──
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

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.quantity_kg || Number(adjustForm.quantity_kg) <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (!adjustProduct) return;

    // Resolve the correct inventory_id for the selected grade
    const inv = adjustProduct.inventory?.find((i: any) => i.grade === selectedGrade);
    if (!inv) {
      toast.error(`No inventory record found for Grade ${selectedGrade}`);
      return;
    }

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
      fetchInventory();
      fetchLowStock();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to adjust stock");
    } finally {
      setAdjustSaving(false);
    }
  };

  // Derive current qty for selected grade from loaded product detail
  const selectedInv = adjustProduct?.inventory?.find((i: any) => i.grade === selectedGrade);

  return (
    <>
      {/* Low stock alert */}
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
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select value={gradeFilter || "all_grade"} onValueChange={(v) => { setGradeFilter(v === "all_grade" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_grade">All Grades</SelectItem>
                {GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter || "all_cat"} onValueChange={(v) => { setCategoryFilter(v === "all_cat" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44 bg-white dark:bg-card">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_cat">All Categories</SelectItem>
                {categories.map((c) => <SelectItem key={c.category_id} value={String(c.category_id)}>{c.category_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { fetchInventory(); fetchLowStock(); }}>
              <IconRefresh className="size-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">S.No</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Product</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Category</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Total Stock</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Grade A</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Grade B</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Grade C</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Active Pricing</TableHead>
                <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Loading inventory...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No inventory data found.</TableCell>
                </TableRow>
              ) : (
                products.map((p, i) => {
                  const isLow = lowStock.some((ls) => ls.product_id === p.product_id);
                  return (
                    <TableRow key={p.product_id} className={`group border-b last:border-0 ${isLow ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-primary/5"}`}>
                      <TableCell className="px-4 py-3 text-muted-foreground">{(page - 1) * limit + i + 1}</TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isLow && <IconAlertTriangle className="size-4 text-amber-500 shrink-0" />}
                          <div>
                            <div className="font-semibold">{p.product_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{p.product_code}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.category?.category_name ?? "--"}</TableCell>
                      <TableCell className="px-4 py-3 font-semibold">{formatKg(p.current_stock_kg)}</TableCell>
                      {GRADES.map((g) => {
                        const qty = p.grade_stock?.[g] ?? 0;
                        const isBelowMin = lowStock.some((ls) => ls.product_id === p.product_id && ls.grade === g);
                        return (
                          <TableCell key={g} className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className={`font-medium text-sm ${isBelowMin ? "text-amber-600" : ""}`}>
                                {formatKg(qty)}
                              </span>
                              {/* ── Per-grade transaction history button ── */}
                              <button
                                type="button"
                                className="text-[10px] text-primary underline underline-offset-2 hover:opacity-70 text-left w-fit"
                                onClick={() => openTransactions(p.product_id, p.product_name, g)}
                              >
                                History
                              </button>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">{p.active_pricing_count ?? 0}</TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => openAdjust(p.product_id, p.product_name)}
                        >
                          <IconRefresh className="mr-1 size-3.5" /> Adjust Stock
                        </Button>
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

      {/* Stock Adjustment Sheet */}
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
            <form onSubmit={handleAdjust} className="mt-6 space-y-4">
              {/* Grade selector — now drives inventory_id resolution */}
              <FormField label="Grade" id="adj_grade">
                <Select value={selectedGrade} onValueChange={(v) => handleGradeChange(v as Grade)}>
                  <SelectTrigger className="bg-white dark:bg-card">
                    <SelectValue />
                  </SelectTrigger>
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

              {/* Warn if no inventory record exists for this grade */}
              {adjustProduct && !selectedInv && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                  No inventory record for Grade {selectedGrade}. Stock adjustment cannot proceed.
                </p>
              )}

              <FormField label="Transaction Type" id="adj_type">
                <Select value={adjustForm.transaction_type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, transaction_type: v }))}>
                  <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Quantity (kg) *" id="adj_qty">
                <Input
                  id="adj_qty"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="0"
                  value={adjustForm.quantity_kg}
                  onChange={(e) => setAdjustForm((f) => ({ ...f, quantity_kg: e.target.value }))}
                  required
                />
              </FormField>
              <FormField label="Reference Type" id="adj_ref_type">
                <Select value={adjustForm.reference_type} onValueChange={(v) => setAdjustForm((f) => ({ ...f, reference_type: v }))}>
                  <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              {adjustForm.reference_type !== "manual" && (
                <FormField label="Reference ID" id="adj_ref_id">
                  <Input
                    id="adj_ref_id"
                    type="number"
                    placeholder="Reference record ID"
                    value={adjustForm.reference_id}
                    onChange={(e) => setAdjustForm((f) => ({ ...f, reference_id: e.target.value }))}
                  />
                </FormField>
              )}
              <FormField label="Warehouse Location" id="adj_wh">
                <Input id="adj_wh" placeholder="e.g. Rack-1" value={adjustForm.warehouse_location} onChange={(e) => setAdjustForm((f) => ({ ...f, warehouse_location: e.target.value }))} />
              </FormField>
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

      {/* Transaction History Sheet */}
      <Sheet open={txOpen} onOpenChange={setTxOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Transaction History</SheetTitle>
            <SheetDescription>{txProductName}{txGrade ? ` · Grade ${txGrade}` : ""}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-3">
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PricingTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const limit = 10;
  const [productFilter, setProductFilter] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("true");

  // Expanded product detail rows: productId → pricing[]
  const [expandedPricing, setExpandedPricing] = useState<Record<number, any[]>>({});
  const [expandingId, setExpandingId] = useState<number | null>(null);

  // Add pricing sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    product_id: "",
    grade: "A" as Grade,
    base_price_per_kg: "",
    wholesale_price_per_kg: "",
    retail_price_per_kg: "",
    minimum_order_kg: "10",
    effective_from: "",
    effective_to: "",
  });

  const fetchAllProducts = useCallback(async () => {
    try {
      const res = await api.get("/admin/products", { params: { limit: 100, page: 1 } });
      const data = res.data?.data ?? res.data;
      setAllProducts(Array.isArray(data?.products) ? data.products : []);
    } catch { /* silent */ }
  }, []);

  const fetchPricing = useCallback(async () => {
    setLoading(true);
    // Clear expanded rows when filters/page change
    setExpandedPricing({});
    try {
      const params: any = { page, limit };
      if (productFilter) params.product_id = Number(productFilter);
      if (gradeFilter) params.grade = gradeFilter;
      if (activeFilter !== "") params.is_active = activeFilter === "true";
      const res = await api.get("/admin/pricing", { params });
      const data = res.data?.data ?? res.data;
      setProducts(Array.isArray(data?.products) ? data.products : []);
      setTotalPages(data?.pagination?.total_pages ?? null);
      setTotalItems(data?.pagination?.total ?? null);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to fetch pricing");
    } finally {
      setLoading(false);
    }
  }, [page, limit, productFilter, gradeFilter, activeFilter]);

  useEffect(() => { fetchAllProducts(); }, [fetchAllProducts]);
  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  // Toggle expand: fetch full product detail to get its pricing[]
  const toggleExpand = async (productId: number) => {
    if (expandedPricing[productId]) {
      setExpandedPricing((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      return;
    }
    setExpandingId(productId);
    try {
      const res = await api.get(`/admin/products/${productId}`);
      const detail = res.data?.data ?? res.data;
      setExpandedPricing((prev) => ({ ...prev, [productId]: detail?.pricing ?? [] }));
    } catch {
      toast.error("Failed to load pricing details");
    } finally {
      setExpandingId(null);
    }
  };

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingForm.product_id) { toast.error("Product is required"); return; }
    if (!pricingForm.base_price_per_kg || !pricingForm.wholesale_price_per_kg) { toast.error("Base and wholesale prices are required"); return; }
    if (!pricingForm.effective_from) { toast.error("Effective from date is required"); return; }
    setSaving(true);
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
      setSheetOpen(false);
      // Refresh expanded row if it's open for the affected product
      const pid = Number(pricingForm.product_id);
      if (expandedPricing[pid]) {
        const res = await api.get(`/admin/products/${pid}`);
        const detail = res.data?.data ?? res.data;
        setExpandedPricing((prev) => ({ ...prev, [pid]: detail?.pricing ?? [] }));
      }
      fetchPricing();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to add pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePricing = async (pricingId: number, productId: number) => {
    if (!confirm("Deactivate this pricing entry?")) return;
    try {
      await api.delete(`/admin/pricing/${pricingId}`);
      toast.success("Pricing deactivated");
      // Refresh expanded row
      if (expandedPricing[productId]) {
        const res = await api.get(`/admin/products/${productId}`);
        const detail = res.data?.data ?? res.data;
        setExpandedPricing((prev) => ({ ...prev, [productId]: detail?.pricing ?? [] }));
      }
      fetchPricing();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to deactivate pricing");
    }
  };

  return (
    <>
      <Card className="border-none shadow-md ring-1 ring-border bg-white/70 backdrop-blur-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 p-4 border-b bg-muted/30 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select value={productFilter || "all_prod"} onValueChange={(v) => { setProductFilter(v === "all_prod" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-48 bg-white dark:bg-card">
                <SelectValue placeholder="All Products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_prod">All Products</SelectItem>
                {allProducts.map((p) => <SelectItem key={p.product_id} value={String(p.product_id)}>{p.product_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={gradeFilter || "all_grade"} onValueChange={(v) => { setGradeFilter(v === "all_grade" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_grade">All Grades</SelectItem>
                {GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={activeFilter || "all_status"} onValueChange={(v) => { setActiveFilter(v === "all_status" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-36 bg-white dark:bg-card">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_status">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={() => {
            setPricingForm({ product_id: "", grade: "A", base_price_per_kg: "", wholesale_price_per_kg: "", retail_price_per_kg: "", minimum_order_kg: "10", effective_from: "", effective_to: "" });
            setSheetOpen(true);
          }}>
            <IconPlus className="mr-2 size-4" /> Add Pricing
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="px-4 py-3 w-8" />
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Product</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Code</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Stock</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Grade Stock</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Active Pricing</TableHead>
                <TableHead className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading pricing data...</TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No pricing data found.</TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isExpanded = Boolean(expandedPricing[p.product_id]);
                  const pricingRows = expandedPricing[p.product_id] ?? [];
                  return (
                    <>
                      {/* Product summary row */}
                      <TableRow
                        key={`prod-${p.product_id}`}
                        className="group hover:bg-primary/5 border-b cursor-pointer"
                        onClick={() => toggleExpand(p.product_id)}
                      >
                        <TableCell className="px-4 py-3">
                          {expandingId === p.product_id ? (
                            <span className="text-xs text-muted-foreground">…</span>
                          ) : (
                            <IconChevronRight className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-semibold">{p.product_name}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">{p.product_code}</Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3">{formatKg(p.current_stock_kg)}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex gap-1">
                            {GRADES.map((g) => (
                              <span key={g} className="inline-flex items-center gap-1 text-xs bg-muted/60 rounded px-1.5 py-0.5">
                                <span className="font-bold">{g}</span>
                                <span className="text-muted-foreground">{p.grade_stock?.[g] ?? 0}</span>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <span className={`text-sm font-semibold ${(p.active_pricing_count ?? 0) === 0 ? "text-red-500" : "text-emerald-600"}`}>
                            {p.active_pricing_count ?? 0} active
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <StatusBadge active={p.is_active} />
                        </TableCell>
                      </TableRow>

                      {/* Expanded per-grade pricing rows */}
                      {isExpanded && (
                        pricingRows.length === 0 ? (
                          <TableRow key={`empty-${p.product_id}`} className="bg-muted/10">
                            <TableCell colSpan={7} className="px-8 py-3 text-sm text-muted-foreground italic">
                              No pricing records for this product.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pricingRows.map((pr: any) => (
                            <TableRow key={`pr-${pr.pricing_id}`} className="bg-muted/10 hover:bg-muted/20 border-b">
                              <TableCell className="px-4 py-2" />
                              <TableCell className="px-8 py-2" colSpan={2}>
                                <div className="flex items-center gap-2">
                                  <GradeBadge grade={pr.grade} />
                                  <StatusBadge active={pr.is_active} />
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(pr.effective_from)} → {pr.effective_to ? formatDate(pr.effective_to) : "Ongoing"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="text-muted-foreground">Base: <span className="font-semibold text-foreground">{formatRs(pr.base_price_per_kg)}/kg</span></span>
                                  <span className="text-muted-foreground">Wholesale: <span className="font-semibold text-foreground">{formatRs(pr.wholesale_price_per_kg)}/kg</span></span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2">
                                <div className="flex flex-col gap-0.5 text-xs">
                                  <span className="text-muted-foreground">Retail: <span className="font-semibold text-foreground">{formatRs(pr.retail_price_per_kg)}/kg</span></span>
                                  <span className="text-muted-foreground">Min order: <span className="font-semibold text-foreground">{formatKg(pr.minimum_order_kg)}</span></span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-2" />
                              <TableCell className="px-4 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-red-500 hover:text-red-600"
                                  title="Deactivate pricing"
                                  onClick={(e) => { e.stopPropagation(); handleDeletePricing(pr.pricing_id, p.product_id); }}
                                >
                                  <IconTrash className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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

      {/* Add Pricing Sheet — unchanged except retail_price fix below */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Pricing</SheetTitle>
            <SheetDescription>Create a new pricing entry for a product grade.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAddPricing} className="mt-6 space-y-4">
            <FormField label="Product *" id="pr_product">
              <Select value={pricingForm.product_id || "none"} onValueChange={(v) => setPricingForm((f) => ({ ...f, product_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {allProducts.map((p) => <SelectItem key={p.product_id} value={String(p.product_id)}>{p.product_name} ({p.product_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Grade *" id="pr_grade">
              <Select value={pricingForm.grade} onValueChange={(v) => setPricingForm((f) => ({ ...f, grade: v as Grade }))}>
                <SelectTrigger className="bg-white dark:bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Base Price / kg (Rs) *" id="pr_base">
              <Input id="pr_base" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.base_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, base_price_per_kg: e.target.value }))} required />
            </FormField>
            <FormField label="Wholesale Price / kg (Rs) *" id="pr_ws">
              <Input id="pr_ws" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.wholesale_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, wholesale_price_per_kg: e.target.value }))} required />
            </FormField>
            <FormField label="Retail Price / kg (Rs)" id="pr_rt">
              <Input id="pr_rt" type="number" min={0} step="0.01" placeholder="0.00" value={pricingForm.retail_price_per_kg} onChange={(e) => setPricingForm((f) => ({ ...f, retail_price_per_kg: e.target.value }))} />
            </FormField>
            <FormField label="Min Order (kg)" id="pr_mo">
              <Input id="pr_mo" type="number" min={0} step="0.01" placeholder="10" value={pricingForm.minimum_order_kg} onChange={(e) => setPricingForm((f) => ({ ...f, minimum_order_kg: e.target.value }))} />
            </FormField>
            <FormField label="Effective From *" id="pr_ef">
              <Input id="pr_ef" type="date" value={pricingForm.effective_from} onChange={(e) => setPricingForm((f) => ({ ...f, effective_from: e.target.value }))} required />
            </FormField>
            <FormField label="Effective To" id="pr_et">
              <Input id="pr_et" type="date" value={pricingForm.effective_to} onChange={(e) => setPricingForm((f) => ({ ...f, effective_to: e.target.value }))} />
            </FormField>
            <SheetFooter className="pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Pricing"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
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