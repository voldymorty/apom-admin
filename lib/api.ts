
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.70:3001";

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/v1/web/auth/login`,
    PROFILE: `${API_BASE_URL}/api/v1/web/auth/profile`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/v1/web/auth/change-password`,
  },
} as const;


/**
 * Get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  return endpoint;
}


/**
 * Get authorization header with bearer token
 */
export function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
