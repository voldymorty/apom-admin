
import api from "./api";

export const login = async (mobile_number, password) => {
  const res = await api.post("/admin/auth/login", { mobile_number, password });
  return res.data;
};

export const getMe = async () => {
  const res = await api.get("/admin/auth/me");
  return res.data;
};
