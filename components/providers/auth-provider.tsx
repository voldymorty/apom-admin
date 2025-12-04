"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS } from "@/lib/api";

type User = {
  id: number;
  email: string;
  mobile_number: string;
  roles: string[];
};

type AuthContextType = {
  isAuthenticated: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  logout: () => void;
  user: User | null;
  token: string | null;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const router = useRouter();

  // Check for existing session on mount
  React.useEffect(() => {
    const authStatus = localStorage.getItem("auth_status");
    const authToken = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("user_data");

    if (authStatus === "authenticated" && authToken && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setIsAuthenticated(true);
        setUser(parsedUser);
        setToken(authToken);
      } catch (error) {
        // Invalid user data, clear storage
        localStorage.removeItem("auth_status");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_data");
        localStorage.removeItem("refresh_token");
      }
    }
  }, []);

  const login = React.useCallback(
    async (mobile: string, password: string): Promise<void> => {
      const cleanMobile = mobile.replace(/\D/g, ""); // Remove non-digits

      // Make API call to login endpoint
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile_number: cleanMobile,
          password: password,
        }),
      });

      const data = await response.json().catch(() => {
        throw new Error("Failed to connect to server. Please try again.");
      });

      // Check if login was successful
      if (!response.ok || !data.success) {
        // Handle validation errors
        if (
          data.errors &&
          Array.isArray(data.errors) &&
          data.errors.length > 0
        ) {
          const errorMessages = data.errors
            .map((err: { message: string }) => err.message)
            .join(", ");
          throw new Error(errorMessages);
        }
        throw new Error(data.message || "Login failed");
      }

      // Extract data from response
      const { user, token, refreshToken } = data.data;

      if (!user || !token) {
        throw new Error("Invalid response from server");
      }

      // Store authentication data
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      localStorage.setItem("auth_status", "authenticated");
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(user));

      // Store refresh token if provided
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      router.push("/dashboard");
    },
    [router]
  );

  const logout = React.useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_status");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    router.push("/");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, user, token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
