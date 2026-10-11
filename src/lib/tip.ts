/** Normalize a tip URL: only http(s) links are allowed; anything else is treated as unset. */
export function parseTipUrl(value: string | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

/** Optional tip link (build-time VITE_TIP_URL). SupportCard renders nothing until it is set to a valid http(s) URL. */
export const TIP_URL = parseTipUrl(import.meta.env["VITE_TIP_URL"] as string | undefined);
