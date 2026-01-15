// Centralized API base URL configuration for local dev + production builds.
// Set VITE_API_BASE_URL in your environment (or GitHub Actions secrets) to point to your backend.
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.DEV ? "http://localhost:3001" : "");

export function apiUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}
