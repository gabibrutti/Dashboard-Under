/**
 * Base do BACKEND (server). Em produção vem do GitHub Actions:
 *   VITE_API_BASE_URL = https://seu-backend.com
 * Local:
 *   VITE_API_BASE_URL=http://localhost:3001
 */
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3001";

export function apiUrl(path = "") {
  const base = String(API_BASE).replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
