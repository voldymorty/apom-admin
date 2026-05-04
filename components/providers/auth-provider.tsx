"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as authService from "@/app/services/authService";

type User = {
  user_id: number;
  mobile_number: string;
  email: string;
  role: string;
  last_login?: string;
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

      if (cleanMobile.length < 10) {
        throw new Error("Please enter a valid mobile number (at least 10 digits)");
      }

      if (!password || password.length < 1) {
        throw new Error("Please enter your password");
      }

      try {
        const result = await authService.login(cleanMobile, password);
        
        if (result.success && result.data) {
          const { token, admin } = result.data;
          
          setIsAuthenticated(true);
          setUser(admin);
          setToken(token);
          
          localStorage.setItem("auth_status", "authenticated");
          localStorage.setItem("auth_token", token);
          localStorage.setItem("user_data", JSON.stringify(admin));
          
          router.push("/dashboard");
        } else {
          throw new Error(result.message || "Login failed");
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.message || error.message || "An error occurred during login");
      }
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
