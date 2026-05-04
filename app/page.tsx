"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import {
  DEFAULT_AUTH_REDIRECT,
  DEFAULT_PUBLIC_REDIRECT,
} from "./routes/AppRoutes";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const storedAuth = localStorage.getItem("auth_status");
    const isStoredAuth = storedAuth === "authenticated";
    const destination =
      isAuthenticated || isStoredAuth
        ? DEFAULT_AUTH_REDIRECT
        : DEFAULT_PUBLIC_REDIRECT;
    router.replace(destination);
  }, [router, isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}


