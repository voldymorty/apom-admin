"use client";

import {
  createContext,
  useState,
  useEffect,
  useContext,
} from "react";

type AuthContextType = {
  admin: any;
  loading: boolean;
  login: (data: any) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (data: any) => {
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("auth_status", "authenticated");

    setAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("auth_status");

    setAdmin(null);
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};