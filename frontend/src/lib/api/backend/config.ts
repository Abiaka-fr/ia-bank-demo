/**
 * API base URL configuration.
 *
 * Single switch: `NEXT_PUBLIC_API_BASE_URL`.
 *
 * - **empty** (default) — all requests go relative (`/api/...`). For demo mode.
 * - **set** (e.g. `http://localhost:8000`) — absolute requests to the backend server.
 */
const RAW_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Without trailing slash: concatenated paths always start with `/`. */
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

export const isBackendLive = API_BASE_URL !== "";
