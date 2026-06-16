"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import api from "@/app/services/api";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Zap,
  MoreVertical,
  ShieldCheck,
  UserPlus,
  Search,
  Users,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from "../routes/ProtectedRoute";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── ADDED: Dialog imports for soft-delete and hard-delete confirmation ──
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminsManagementPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "update">("add");
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user: currentAdmin } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    mobile_number: "",
  });

  // ── ADDED: soft-delete confirmation state ──
  const [softDeleteTarget, setSoftDeleteTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [isSoftDeleting, setIsSoftDeleting] = useState(false);

  // ── ADDED: hard-delete confirmation state ──
  const [hardDeleteTarget, setHardDeleteTarget] = useState<{
    id: number;
    label: string;
  } | null>(null);
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // Fetch all admins
  const fetchAdmins = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/auth/list");
      console.log("Admins API Response:", res.data); // Helpful for debugging in browser console
      
      let extractedAdmins = [];
      
      if (res.data) {
        // 1. Check for standard nested structures based on your provided JSON
        if (res.data.data && Array.isArray(res.data.data.admins)) {
          extractedAdmins = res.data.data.admins;
        }
        // 2. Direct array in res.data
        else if (Array.isArray(res.data)) {
          extractedAdmins = res.data;
        } 
        // 3. res.data.admins or res.data.data is a direct array
        else if (Array.isArray(res.data.admins)) {
          extractedAdmins = res.data.admins;
        } else if (Array.isArray(res.data.data)) {
          extractedAdmins = res.data.data;
        } else {
          const firstArrayKey = Object.keys(res.data).find((key) =>
            Array.isArray(res.data[key])
          );
          if (firstArrayKey) {
            extractedAdmins = res.data[firstArrayKey];
          } else if (res.data.data) {
            const nestedArrayKey = Object.keys(res.data.data).find((key) =>
              Array.isArray(res.data.data[key])
            );
             if (nestedArrayKey) extractedAdmins = res.data.data[nestedArrayKey];
          }
        }
      }
      
      setAdmins(extractedAdmins);
      
      if (extractedAdmins.length === 0) {
        console.warn("Admins list is empty. Check API response structure.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch admins");
      toast.error("Error", {
        description: err.response?.data?.message || "Failed to fetch admins",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    if (!Array.isArray(admins)) return [];
    
    const query = searchQuery.toLowerCase().trim();
    
    return admins.filter((admin) => {
      if (!admin) return false;
      
      // If there's no search query, show everything
      if (!query) return true;
      
      // Check each field safely
      const nameMatch = admin.name?.toLowerCase().includes(query);
      const emailMatch = admin.email?.toLowerCase().includes(query);
      const mobileMatch = admin.mobile_number?.toLowerCase().includes(query);
      const roleMatch = admin.role?.toLowerCase().includes(query);
      
      return nameMatch || emailMatch || mobileMatch || roleMatch;
    });
  }, [admins, searchQuery]);

  // Open modal to add a new admin
  const openAddModal = () => {
    setModalMode("add");
    setSelectedAdmin(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "admin",
      mobile_number: "",
    });
    setShowModal(true);
  };

  // Open modal to update an admin
  const openUpdateModal = (admin: any) => {
    setModalMode("update");
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name || "",
      email: admin.email || "",
      password: "",
      role: admin.role || "admin",
      mobile_number: admin.mobile_number || "",
    });
    setShowModal(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // ── CHANGED: opens soft-delete dialog instead of window.confirm ──
  const softDeleteAdmin = (admin: any) => {
    setSoftDeleteTarget({
      id: admin.id ?? admin.user_id,
      label: admin.name || admin.email || admin.mobile_number || "this admin",
    });
  };

  // ── ADDED: executes soft-delete after user confirms ──
  const confirmSoftDelete = async () => {
    if (!softDeleteTarget || isSoftDeleting) return;
    setIsSoftDeleting(true);
    try {
      const response = await api.delete(
        `/admin/auth/${softDeleteTarget.id}/soft`
      );
      if (response.status === 200) {
        await fetchAdmins();
        toast.success("Deleted", {
          description: "Admin has been soft deleted successfully.",
        });
        setSoftDeleteTarget(null);
      }
    } catch (err: any) {
      toast.error("Error", {
        description:
          err.response?.data?.message || "Failed to delete admin",
      });
    } finally {
      setIsSoftDeleting(false);
    }
  };

  // ── CHANGED: opens hard-delete dialog instead of window.confirm ──
  const hardDeleteAdmin = (admin: any) => {
    setHardDeleteTarget({
      id: admin.id ?? admin.user_id,
      label: admin.name || admin.email || admin.mobile_number || "this admin",
    });
  };

  // ── ADDED: executes hard-delete after user confirms ──
  const confirmHardDelete = async () => {
    if (!hardDeleteTarget || isHardDeleting) return;
    setIsHardDeleting(true);
    try {
      await api.delete(`/admin/auth/${hardDeleteTarget.id}/hard`);
      await fetchAdmins();
      toast.success("Permanently Deleted", {
        description: "Admin has been permanently removed.",
      });
      setHardDeleteTarget(null);
    } catch (err: any) {
      toast.error("Error", {
        description:
          err.response?.data?.message || "Failed to delete admin",
      });
    } finally {
      setIsHardDeleting(false);
    }
  };

  // Handle restore
  const restoreAdmin = async (id: number) => {
    try {
      const response = await api.patch(`/admin/auth/${id}/restore`);
      if (response.status === 200) {
        await fetchAdmins();
        toast.success("Restored", {
          description: "Admin has been successfully restored.",
        });
      }
    } catch (err: any) {
      toast.error("Error", {
        description:
          err.response?.data?.message || "Failed to restore admin",
      });
    }
  };

  // Handle submit (add or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (modalMode === "add") {
        await api.post("/admin/auth/create-admin", formData);
        toast.success("Added", {
          description: "Admin added successfully.",
        });
      } else {
        await api.put(
          `/admin/${selectedAdmin.user_id || selectedAdmin.id}`,
          formData
        );
        toast.success("Updated", {
          description: "Admin updated successfully.",
        });
      }
      setShowModal(false);
      fetchAdmins();
    } catch (err: any) {
      toast.error("Error", {
        description: err.response?.data?.message || "Operation failed",
      });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.warning("Validation", { description: "Name is required" });
      return false;
    }
    if (!formData.email.trim()) {
      toast.warning("Validation", { description: "Email is required" });
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(formData.email)) {
      toast.warning("Validation", {
        description: "Enter a valid email address",
      });
      return false;
    }
    if (
      modalMode === "add" &&
      (!formData.password || formData.password.trim().length < 6)
    ) {
      toast.warning("Validation", {
        description: "Password must be at least 6 characters",
      });
      return false;
    }
    return true;
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
        <div className="flex flex-1 flex-col p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  Admins Management
                </h1>
              <p className="text-muted-foreground mt-1">
                Manage administrative personnel and their system permissions.
              </p>
            </div>
            <Button 
                onClick={openAddModal} 
                className="gap-2 shadow-lg shadow-primary/20 rounded-xl px-5 h-12"
            >
              <UserPlus size={18} />
              Add Admin
            </Button>
          </div>

          <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
            <CardHeader className="pb-3 border-b border-muted/50">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  Admin Directory
                </CardTitle>
                <div className="relative flex-1 md:max-w-sm">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Search size={16} />
                  </div>
                  <Input
                    placeholder="Search by name, email or mobile..."
                    className="pl-9 h-10 border-muted/50 bg-muted/20 focus-visible:ring-primary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                    <p className="text-sm font-medium">Loading admins...</p>
                </div>
              ) : filteredAdmins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
                    <Users size={40} strokeWidth={1} className="opacity-20" />
                    <p>No admins found matching your criteria.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[80px] font-bold">SN</TableHead>
                        <TableHead className="font-bold">Admin Phone</TableHead>
                        <TableHead className="font-bold">Email</TableHead>
                        <TableHead className="font-bold">Role</TableHead>
                          <TableHead className="font-bold text-center">
                            Actions
                          </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.map((admin, index) => (
                          <TableRow
                            key={admin.id || admin.user_id}
                            className="group transition-colors hover:bg-muted/10"
                          >
                          <TableCell className="font-medium text-muted-foreground">
                              {String(index + 1).padStart(2, "0")}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs">
                                  {admin.mobile_number || "—"}
                                </span>
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5 mt-0.5">
                                  <span
                                    className={
                                      admin.is_active
                                        ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                                        : "h-1.5 w-1.5 rounded-full bg-red-500"
                                    }
                                  />
                                {admin.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-sm">
                                <span className="text-foreground">
                                  {admin.email}
                                </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                                variant={
                                  admin.role === "superadmin"
                                    ? "default"
                                    : "secondary"
                                }
                                className="capitalize font-bold rounded-lg px-2.5 py-0.5"
                            >
                              {admin.role || "Admin"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary"
                                    onClick={() => openUpdateModal(admin)}
                                    title="Edit Preferences"
                                >
                                    <Edit2 size={16} />
                                </Button>
                                
                                {!admin.is_active ? (
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-9 w-9 rounded-lg hover:bg-emerald-50 hover:text-emerald-600"
                                    onClick={() =>
                                      restoreAdmin(admin.id || admin.user_id)
                                    }
                                            title="Restore Access"
                                        >
                                            <RotateCcw size={16} />
                                        </Button>
                                    
                                ) : (
                                    <>
                                    {/* UNCHANGED: now calls dialog opener instead of window.confirm */}
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-9 w-9 rounded-lg hover:bg-orange-50 hover:text-orange-600"
                                      onClick={() => softDeleteAdmin(admin)}
                                            title="Deactivate Account"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-600"
                                      onClick={() => hardDeleteAdmin(admin)}
                                            title="Permanently Expunge"
                                        >
                                            <Zap size={16} />
                                        </Button>
                                    </>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal Overlay */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-background rounded-3xl shadow-2xl overflow-hidden border border-muted/50"
              >
                <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">
                          {modalMode === "add"
                            ? "Register New Admin"
                            : "Modify Admin Profile"}
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        Please fill in the identification details below.
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        {modalMode === "add" ? (
                          <UserPlus size={24} />
                        ) : (
                          <Edit2 size={24} />
                        )}
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4">
                      {/* <div className="space-y-2">
                          <Label
                            htmlFor="name"
                            className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground"
                          >
                            Full Name
                          </Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="e.g. Alexander Pierce"
                          value={formData.name}
                          onChange={handleChange}
                          className="h-12 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20"
                          required
                        />
                      </div> */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label
                              htmlFor="email"
                              className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground"
                            >
                              Work Email
                            </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="admin@apom.in"
                            value={formData.email}
                            onChange={handleChange}
                            className="h-12 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                            <Label
                              htmlFor="mobile_number"
                              className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground"
                            >
                              Mobile Identification
                            </Label>
                          <Input
                            id="mobile_number"
                            name="mobile_number"
                            placeholder="+91 XXXXX XXXXX"
                            value={formData.mobile_number}
                            onChange={handleChange}
                            className="h-12 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground"
                          >
                            Security Password
                          </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                            placeholder={
                              modalMode === "add"
                                ? "Initialize passkey"
                                : "Leave blank to keep unchanged"
                            }
                          value={formData.password}
                          onChange={handleChange}
                          className="h-12 rounded-xl bg-muted/30 border-muted/50 focus-visible:ring-primary/20"
                          required={modalMode === "add"}
                        />
                      </div>
                      {/* <div className="space-y-2">
                          <Label htmlFor="role" className="text-xs font-bold uppercase tracking-widest ml-1 text-muted-foreground">Permission Hierarchy</Label>
                          <Select 
                            value={formData.role} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                          >
                            <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-muted/50 w-full focus:ring-primary/20">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-muted/50">
                              <SelectItem value="admin">Regional Administrator</SelectItem>
                              <SelectItem value="superadmin">System Superuser</SelectItem>
                            </SelectContent>
                          </Select>
                      </div> */}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-muted/50">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowModal(false)}
                        className="h-12 rounded-xl px-6 font-bold"
                      >
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        className="h-12 rounded-xl px-8 font-bold shadow-lg shadow-primary/20"
                      >
                        {modalMode === "add" ? "Grant Access" : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

          {/* ── ADDED: Soft-delete (Deactivate) confirmation dialog ── */}
          <Dialog
            open={!!softDeleteTarget}
            onOpenChange={(open) => {
              if (!open) setSoftDeleteTarget(null);
            }}
          >
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-orange-600">
                  Deactivate Admin
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to deactivate{" "}
                  <span className="font-semibold text-foreground">
                    {softDeleteTarget?.label}
                  </span>
                  ? Their account will be suspended and they will lose access to
                  the system. This can be undone by restoring the account.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSoftDeleteTarget(null)}
                  disabled={isSoftDeleting}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={confirmSoftDelete}
                  disabled={isSoftDeleting}
                >
                  {isSoftDeleting ? "Deactivating..." : "Yes, Deactivate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── ADDED: Hard-delete (Permanent) confirmation dialog ── */}
          <Dialog
            open={!!hardDeleteTarget}
            onOpenChange={(open) => {
              if (!open) setHardDeleteTarget(null);
            }}
          >
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  Permanently Delete Admin
                </DialogTitle>
                <DialogDescription>
                  <span className="font-semibold text-destructive block mb-1">
                    ⚠ WARNING — This action cannot be undone.
                  </span>
                  Are you sure you want to permanently delete{" "}
                  <span className="font-semibold text-foreground">
                    {hardDeleteTarget?.label}
                  </span>
                  ? All data associated with this account will be irreversibly
                  expunged from the system.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setHardDeleteTarget(null)}
                  disabled={isHardDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmHardDelete}
                  disabled={isHardDeleting}
                >
                  {isHardDeleting
                    ? "Deleting..."
                    : "Yes, Permanently Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </SidebarInset>
    </SidebarProvider>
    </ProtectedRoute>
  );
}
