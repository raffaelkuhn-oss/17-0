/** Optional tip link (build-time VITE_TIP_URL). SupportCard renders nothing until it is set. */
export const TIP_URL = (import.meta.env["VITE_TIP_URL"] as string | undefined)?.trim() || "";
