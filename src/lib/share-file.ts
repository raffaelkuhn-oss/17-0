/**
 * Result sharing via the Web Share API, with the card image as a file when the browser allows it.
 * Pure (navigator is injected) so scripts/test-share-file.ts can cover every fallback path.
 * Order: image file + text (navigator.canShare({ files }) true) -> text + link (navigator.share) -> copy.
 * Analytics get the share type only ("file" / "native" / "copy"), never picks or records.
 */
import { isAbortError } from "./copy-text";

export type ShareNav = {
  share?: ((data: ShareData) => Promise<void>) | undefined;
  canShare?: ((data: ShareData) => boolean) | undefined;
};

export type ShareMethod = "file" | "native" | "copy";

/** Synchronous, so the caller can record share_click in the same tick as the click. */
export function pickShareMethod(nav: ShareNav | undefined, file: File | null | undefined): ShareMethod {
  if (!nav || typeof nav.share !== "function") return "copy";
  if (file && typeof nav.canShare === "function") {
    try {
      if (nav.canShare({ files: [file] })) return "file";
    } catch {
      // Some browsers throw on unsupported file types instead of returning false.
    }
  }
  return "native";
}

export type ShareOutcome = "shared" | "aborted" | "failed";

/**
 * Calls navigator.share for the picked method. "aborted" = the user closed the sheet (do nothing);
 * "failed" = any other error (show the manual-copy box: the user gesture is gone, so no retry).
 * The file share carries the text with the link inside it: several share targets drop `url` when files are attached.
 */
export async function runShare(
  nav: ShareNav,
  method: Exclude<ShareMethod, "copy">,
  t: { title: string; body: string; url: string; full: string },
  file?: File | null,
): Promise<ShareOutcome> {
  try {
    if (method === "file" && file) await nav.share!({ files: [file], title: t.title, text: t.full });
    else await nav.share!({ title: t.title, text: t.body, url: t.url });
    return "shared";
  } catch (e) {
    return isAbortError(e) ? "aborted" : "failed";
  }
}
