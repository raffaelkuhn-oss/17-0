import { useEffect, useRef, useState } from "react";
import { copyText, isAbortError } from "@/lib/copy-text";
import { renderShareImage } from "@/lib/share-image";
import { shareText } from "@/lib/share-text";
import { trackEvent, type RetentionMode, type ShareVia } from "@/lib/retention";
import type { Player } from "@/lib/players";
import type { Campaign } from "@/lib/sim";
import { recordLong } from "@/lib/record";

export type ShareProps = {
  campaign: Campaign;
  /** v2 challenge code of this run (links to the run page /r/<code>). */
  challengeCode?: string | undefined;
  /** Daily number; set only for Daily Challenge runs. */
  dailyNumber?: number | undefined;
  /** Mode recorded on share_click. */
  trackMode?: RetentionMode;
};

function track(via: ShareVia, mode: RetentionMode = "none") {
  trackEvent("share_click", mode, via);
}

/** Copy result + manual-copy fallback, shared by the primary and secondary buttons. */
function useCopy() {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  /** Synchronous entry point: must run directly inside the click handler. */
  function copy(text: string) {
    void copyText(text).then((ok) => {
      if (ok) {
        setManualText(null);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } else {
        setManualText(text);
      }
    });
  }
  return { copied, manualText, setManualText, copy };
}

function ManualCopy({ text }: { text: string }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(0, text.length);
  }, [text]);
  return (
    <div className="mt-3 text-left" data-testid="manual-copy">
      <label className="text-xs text-muted-foreground" htmlFor="manual-share">
        Copy didn't work in this browser. Press and hold to copy:
      </label>
      <textarea
        id="manual-share"
        ref={ref}
        readOnly
        value={text}
        rows={5}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-1 w-full rounded-lg border border-input bg-secondary p-2 text-base"
      />
    </div>
  );
}

/**
 * Primary CTA on the result screen. Mobile (Web Share API): native share sheet with text + run link.
 * Elsewhere: copies text + link and shows "Copied!". share_click is sent in the same tick as the
 * share/copy call, so a cancelled share sheet is still counted (intent, not completion).
 */
export function ShareButton({ campaign, challengeCode, dailyNumber, trackMode, className }: ShareProps & { className?: string }) {
  const { copied, manualText, setManualText, copy } = useCopy();
  const t = shareText({ campaign, challengeCode, dailyNumber });

  function onClick() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ title: "17-0 Draft", text: t.body, url: t.url }).catch((e: unknown) => {
        if (isAbortError(e)) return; // user closed the sheet
        setManualText(t.full); // gesture is gone, so show manual copy
      });
      track("native", trackMode);
      return;
    }
    copy(t.full);
    track("copy", trackMode);
  }

  return (
    <div className="w-full">
      <button
        onClick={onClick}
        data-testid="share-primary"
        className={className ?? "btn-primary hover:btn-primary-hover w-full px-6 text-base"}
      >
        {copied ? "Copied!" : "Share result"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied!" : ""}
      </span>
      {manualText && <ManualCopy text={manualText} />}
    </div>
  );
}

/** Secondary share options: result image (save), X, WhatsApp, copy text. */
export function ShareCard({
  picks,
  campaign,
  rating,
  contextLabel,
  challengeCode,
  dailyNumber,
  trackMode,
}: ShareProps & {
  picks: Player[];
  rating: number;
  contextLabel?: string | undefined;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const { copied, manualText, copy } = useCopy();
  const t = shareText({ campaign, challengeCode, dailyNumber });

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    renderShareImage({ picks, campaign, rating, context: contextLabel }).then((b) => {
      if (!b || cancelled) return;
      url = URL.createObjectURL(b);
      setPreview(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [picks, campaign, rating, contextLabel]);

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `17-0-result-${recordLong(campaign)}.jpg`;
    a.click();
    track("download", trackMode);
  }

  const xUrl = `https://x.com/intent/post?text=${encodeURIComponent(t.body)}&url=${encodeURIComponent(t.url)}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(t.full)}`;

  return (
    <div className="surface rounded-2xl p-5 text-center">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">More ways to share</p>

      {preview ? (
        <img
          src={preview}
          alt={`17-0 result card: ${campaign.won} wins, ${campaign.drawn} draws, ${campaign.lost} losses`}
          width={1200}
          height={630}
          className="mt-4 w-full rounded-xl border border-border"
        />
      ) : (
        <div className="mt-4 aspect-[1200/630] w-full animate-pulse rounded-xl bg-secondary" />
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <a
          href={xUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("x", trackMode)}
          className="btn-ghost w-full px-3 text-sm whitespace-nowrap"
        >
          Post on X
        </a>
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => track("whatsapp", trackMode)}
          className="btn-ghost w-full px-3 text-sm whitespace-nowrap"
        >
          WhatsApp
        </a>
        <button
          onClick={() => {
            copy(t.full);
            track("copy", trackMode);
          }}
          className="btn-ghost w-full px-3 text-sm whitespace-nowrap"
          data-testid="copy-caption"
        >
          {copied ? "Copied!" : "Copy text"}
        </button>
        <button
          onClick={download}
          className="btn-ghost w-full px-3 text-sm whitespace-nowrap"
          disabled={!preview}
        >
          Save image
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied!" : ""}
        </span>
      </div>
      {manualText && <ManualCopy text={manualText} />}
      <p className="mt-3 text-xs text-muted-foreground">
        Posting to Instagram? Save the image and attach it — image posts reach more people than links.
      </p>
    </div>
  );
}
