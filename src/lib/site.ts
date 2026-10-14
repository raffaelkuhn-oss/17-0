/** Single source of truth for the public site URL (no trailing slash). */
const raw = (import.meta.env["VITE_SITE_URL"] as string | undefined)?.trim();
export const SITE_URL = (raw || "https://ucl17-0.com").replace(/\/+$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
/** Canonical form: home is `${SITE_URL}/` (matches sitemap.xml); other paths have no trailing slash. */
export const absUrl = (path = "/") => `${SITE_URL}${path}`;
