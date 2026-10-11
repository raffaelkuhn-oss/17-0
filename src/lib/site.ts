/** Single source of truth for the public site URL (no trailing slash). */
const raw = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.trim();
export const SITE_URL = (raw || "https://ucl-17-0.lovable.app").replace(/\/+$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
export const absUrl = (path = "/") => (path === "/" ? SITE_URL : `${SITE_URL}${path}`);
