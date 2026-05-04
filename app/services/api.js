// src/services/api.js
import axios from "axios";

export const baseURL = "http://172.16.0.227:5000/api";

const api = axios.create({
  baseURL: baseURL,
});

// Refresh token flow removed. We only use access tokens now.

// Attach token before request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s by clearing token and redirecting to login
api.interceptors.response.use(
  response => response,
  error => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      if (!originalRequest.url.includes('/login')) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_status");
        localStorage.removeItem("user_data");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);


export default api;
