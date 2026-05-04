// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const login = (data) => {
    localStorage.setItem("accessToken", data.accessToken);
    setAdmin(data.admin);
    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    setAdmin(null);
    navigate("/login");
  };

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) {
      setLoading(false);
      return;
    }

    api.get("/admin/me")
      .then(res => {
        setAdmin(res.data.admin);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          logout();
        } else {
          logout();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
