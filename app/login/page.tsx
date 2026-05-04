"use client";

import * as React from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "motion/react";
import PublicRoute from "../routes/PublicRoute";
import { 
  Truck, 
  Package, 
  ShieldCheck, 
  Phone, 
  Lock, 
  ChevronRight,
  Boxes
} from "lucide-react";

export default function LoginPage() {
  const [mobile, setMobile] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const { login } = useAuth();
  
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Stabilize random positions for background icons to prevent hydration mismatches and purity errors
  const iconPositions = React.useMemo(() => {
    return [...Array(8)].map((_, i) => ({
      x: Math.random() * 800,
      y: Math.random() * 800,
      left: `${10 + (i * 12) % 80}%`,
      top: `${15 + (i * 10) % 70}%`,
      duration: 6 + i,
      iconType: i % 3
    }));
  }, []);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits, spaces, dashes, plus, and parentheses
    if (/^[\d\s\-\+\(\)]*$/.test(value)) {
      setMobile(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Basic validation
    const cleanMobile = mobile.replace(/\D/g, "");
    if (cleanMobile.length < 10) {
      setError("Please enter a valid mobile number (at least 10 digits)");
      setIsLoading(false);
      return;
    }

    if (!password) {
      setError("Please enter your password");
      setIsLoading(false);
      return;
    }

    try {
      await login(mobile, password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicRoute>
      <div className="flex min-h-screen overflow-hidden bg-background">
      {/* Visual Hero Section - Visible only on Desktop */}
      <div className="relative hidden w-[55%] overflow-hidden bg-zinc-950 lg:block border-r border-zinc-800/50">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.4, 0.3],
              x: [0, 50, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-primary/20 blur-[130px]"
          />
          <motion.div
            animate={{
              scale: [1.1, 1, 1.1],
              opacity: [0.2, 0.3, 0.2],
              x: [0, -40, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-primary/10 blur-[130px]"
          />
        </div>

        {/* Floating Icons Background */}
        <div className="absolute inset-0 pointer-events-none">
          {mounted && iconPositions.map((pos, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: pos.x, 
                y: pos.y,
                opacity: 0 
              }}
              animate={{
                y: [0, -(40 + i * 5), 0],
                rotate: [0, 15, 0],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: pos.duration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute text-primary"
              style={{
                left: pos.left,
                top: pos.top,
              }}
            >
              {pos.iconType === 0 ? (
                <Package size={40} />
              ) : pos.iconType === 1 ? (
                <Truck size={40} />
              ) : (
                <Boxes size={40} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        {/* Content Overlay */}
        <div className="relative flex h-full flex-col justify-between p-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3.5"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-primary shadow-2xl shadow-primary/40 ring-4 ring-primary/10">
              <Package className="text-white fill-white/10" size={26} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white/95">APOM Admin</span>
          </motion.div>

          <div className="max-w-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 uppercase tracking-wider"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Management System v2.0
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-8 text-7xl font-extrabold leading-[1.1] tracking-tighter"
            >
              Efficiency in every{" "}
              <span className="text-primary italic font-serif">delivery.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-zinc-400 leading-relaxed font-medium"
            >
              Manage logistics, track performance, and optimize your operations 
              with the most powerful admin dashboard for the Apom ecosystem.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex items-center gap-8 text-sm font-semibold text-zinc-500"
          >
            <div className="flex items-center gap-2.5 transition-colors hover:text-zinc-300 cursor-default">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800">
                <ShieldCheck className="text-primary" size={14} />
              </div>
              Secure Access
            </div>
            <div className="flex items-center gap-2.5 transition-colors hover:text-zinc-300 cursor-default">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              Real-time Analytics
            </div>
            <div className="flex items-center gap-2.5 transition-colors hover:text-zinc-300 cursor-default">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              Centralized Control
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex w-full flex-col items-center justify-center p-8 lg:p-12 lg:w-[45%] bg-background/50 backdrop-blur-sm relative transition-all duration-500">
        {/* Subtle radial glow for form section */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.03)_0%,transparent_70%)] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[440px] space-y-10 relative z-10"
        >
          {/* Header */}
          <div className="text-center lg:text-left space-y-3">
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-xl shadow-primary/20">
                <Package className="text-white" size={24} />
              </div>
              <span className="text-2xl font-bold tracking-tight">APOM Admin</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
              Welcome Back
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              Access your dashboard and manage operations.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-7">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-3"
                >
                  <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2.5"
              >
                <Label htmlFor="mobile" className="text-sm font-semibold tracking-wide ml-1">
                  Mobile Number
                </Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110">
                    <Phone size={19} strokeWidth={2} />
                  </div>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+91 00000 00000"
                    value={mobile}
                    onChange={handleMobileChange}
                    className="pl-12 h-14 bg-muted/40 border-muted-foreground/10 rounded-2xl focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-base"
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-xs font-medium">
                    Required
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <Label htmlFor="password" className="text-sm font-semibold tracking-wide">
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300 group-focus-within:text-primary group-focus-within:scale-110">
                    <Lock size={19} strokeWidth={2} />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 bg-muted/40 border-muted-foreground/10 rounded-2xl focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-base"
                    required
                    disabled={isLoading}
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-2"
            >
              <Button
                type="submit"
                className="w-full h-14 text-base font-bold rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98] relative overflow-hidden group/btn disabled:opacity-80"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    Verifying Identity...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 relative z-10">
                    Sign In to Dashboard 
                    <ChevronRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                  </span>
                )}
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
              </Button>
            </motion.div>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-6 border-t border-muted/30"
          >
            <p className="text-center text-sm text-muted-foreground font-medium">
              Authorized personnel only. Need help?{" "}
              <button className="font-bold text-primary hover:underline hover:underline-offset-4 decoration-2">
                Contact Technical Support
              </button>
            </p>
          </motion.div>
        </motion.div>

        {/* System Status Indicator - Bottom right */}
        <div className="absolute bottom-6 right-8 hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-muted/50">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">System Online</span>
        </div>
      </div>
    </div>
    </PublicRoute>
  );
}
