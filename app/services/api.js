// src/services/api.js
import axios from "axios";

export const baseURL = "https://api.apom.in/api";
export const imageBaseURL = "https://api.apom.in";

// export const baseURL = "https://apomapi.freshmindz.in/api";
// export const imageBaseURL = "https://apomapi.freshmindz.in";

// export const baseURL = "http://localhost:5000/api";
// export const imageBaseURL = "http://localhost:5000/";

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
