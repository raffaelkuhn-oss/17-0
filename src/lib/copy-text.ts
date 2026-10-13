/**
 * Copy text to the clipboard in a way that works on iOS Safari and in-app
 * browsers (Instagram, X, etc.).
 *
 * MUST be called synchronously from inside a user-gesture handler (click/tap),
 * with the text already computed — no `await` before calling it. iOS drops the
 * user activation across awaits, after which both the async Clipboard API and
 * execCommand("copy") are refused.
 *
 * Strategy:
 * 1. execCommand("copy") on a hidden, iOS-friendly textarea — synchronous, so it
 *    always runs inside the gesture and works where navigator.clipboard is
 *    missing or blocked (WKWebView in-app browsers, non-secure contexts).
 * 2. navigator.clipboard.writeText, started synchronously in the same gesture.
 * Resolves true if either path succeeded, false otherwise (caller should then
 * show the text for manual copy).
 */
export function copyText(text: string): Promise<boolean> {
  const execOk = execCommandCopy(text);
  if (execOk) return Promise.resolve(true);

  const clip = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
  if (clip && typeof clip.writeText === "function") {
    try {
      // Called synchronously (no await before this line).
      return clip.writeText(text).then(
        () => true,
        () => false,
      );
    } catch {
      return Promise.resolve(false);
    }
  }
  return Promise.resolve(false);
}

export function execCommandCopy(text: string): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  // iOS: must be editable for selection to work, but readOnly avoids the keyboard.
  ta.contentEditable = "true";
  ta.readOnly = true;
  ta.setAttribute("aria-hidden", "true");
  // 16px font prevents iOS zoom; keep it in-viewport but invisible.
  ta.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;font-size:16px;pointer-events:none;";
  const active = document.activeElement as HTMLElement | null;
  document.body.appendChild(ta);
  let ok = false;
  try {
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    ta.select();
    ta.setSelectionRange(0, text.length); // required on iOS
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    window.getSelection()?.removeAllRanges();
    document.body.removeChild(ta);
    active?.focus?.({ preventScroll: true } as FocusOptions);
  }
  return ok;
}

/** True for a user-cancelled share sheet, which should be ignored silently. */
export function isAbortError(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { name?: string }).name === "AbortError";
}
