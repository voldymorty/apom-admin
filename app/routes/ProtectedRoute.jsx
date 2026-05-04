// app/routes/ProtectedRoute.jsx
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_PUBLIC_REDIRECT } from "./AppRoutes";

const ProtectedRoute = ({ children, redirectTo = DEFAULT_PUBLIC_REDIRECT }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = React.useState(false);
  const [hasStoredAuth, setHasStoredAuth] = React.useState(false);

  React.useEffect(() => {
    const storedAuth = localStorage.getItem("auth_status");
    setHasStoredAuth(storedAuth === "authenticated");
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated && !hasStoredAuth) {
      const nextParam = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`${redirectTo}${nextParam}`);
    }
  }, [isReady, isAuthenticated, hasStoredAuth, router, redirectTo, pathname]);

  if (!isReady) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!isAuthenticated && !hasStoredAuth) {
    return null;
  }

  return children;
};

export default ProtectedRoute;
