// app/routes/PublicRoute.jsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { DEFAULT_AUTH_REDIRECT } from "./AppRoutes";

const PublicRoute = ({ children, redirectTo = DEFAULT_AUTH_REDIRECT }) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);
  const [hasStoredAuth, setHasStoredAuth] = React.useState(false);

  React.useEffect(() => {
    const storedAuth = localStorage.getItem("auth_status");
    setHasStoredAuth(storedAuth === "authenticated");
    setIsReady(true);
  }, []);

  React.useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated || hasStoredAuth) {
      router.replace(redirectTo);
    }
  }, [isReady, isAuthenticated, hasStoredAuth, router, redirectTo]);

  if (!isReady) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (isAuthenticated || hasStoredAuth) {
    return null;
  }

  return children;
};

export default PublicRoute;
