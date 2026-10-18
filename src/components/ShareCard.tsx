import { useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "@/lib/copy-text";
import { shareImageFor } from "@/lib/share-image";
import { pickShareMethod, runShare } from "@/lib/share-file";
import { shareText } from "@/lib/share-text";
import { xiStamp } from "@/lib/xi-chance";
import { XiDareLine } from "@/components/XiStamp";
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
  /** Current Daily streak (from localStorage), shown in the Daily share text from 2 days up. */
  dailyStreak?: number | undefined;
  /** Mode recorded on share_click. */
  trackMode?: RetentionMode;
  /** The drafted XI: drives the "1 in N" stamp and the card image. */
  picks?: Player[] | undefined;
  /** Label in the card footer, e.g. "Daily Challenge · 18 Oct". */
  contextLabel?: string | undefined;
};

/** The XI's stamp, computed on the device (closed form, ~35 µs; nothing is sent anywhere). */
function useStamp(picks: Player[] | undefined) {
  // Keyed by player ids, not array identity: some callers rebuild the picks array on every render.
  const key = picks?.map((p) => p.id).join(",") ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (picks && picks.length === 11 ? xiStamp(picks) : undefined), [key]);
}

/** The card image as a File for navigator.share({ files }), rendered once per run as soon as the result shows,
 * so the click handler can share synchronously (Safari drops the user gesture across an await). */
function useCardFile(picks: Player[] | undefined, campaign: Campaign, contextLabel: string | undefined) {
  const stamp = useStamp(picks);
  const key = picks?.map((p) => p.id).join(",") ?? "";
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    if (!picks || !stamp || typeof File === "undefined") return;
    let cancelled = false;
    shareImageFor({ picks, campaign, stamp, context: contextLabel }).then((b) => {
      if (b && !cancelled) setFile(new File([b], `17-0-result-${recordLong(campaign)}.jpg`, { type: "image/jpeg" }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, campaign, stamp, contextLabel]);
  return file;
}

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

export function ShareButton({ campaign, challengeCode, dailyNumber, dailyStreak, trackMode, picks, contextLabel, className }: ShareProps & { className?: string }) {
  const { copied, manualText, setManualText, copy } = useCopy();
  const stamp = useStamp(picks);
  const t = { title: "17-0 Draft", ...shareText({ campaign, challengeCode, dailyNumber, dailyStreak, stamp }) };
  const file = useCardFile(picks, campaign, contextLabel);

  /**
   * Primary CTA. With Web Share file support: the card image + text (link inside the text). Otherwise
   * text + link via the share sheet, else copy. share_click carries the share type only and is sent in the
   * same tick as the share/copy call, so a cancelled share sheet still counts (intent, not completion).
   */
  function onClick() {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    const method = pickShareMethod(nav, file);
    if (method === "copy" || !nav) {
      copy(t.full);
      track("copy", trackMode);
      return;
    }
    void runShare(nav, method, t, file).then((outcome) => {
      if (outcome === "failed") setManualText(t.full); // gesture is gone, so show manual copy
    });
    track(method, trackMode);
  }

  return (
    <div className="w-full">
      {stamp && <XiDareLine stamp={stamp} />}
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
  contextLabel,
  challengeCode,
  dailyNumber,
  dailyStreak,
  trackMode,
}: ShareProps & {
  picks: Player[];
  /** Kept for callers; the card now shows the XI stamp instead of the squad rating. */
  rating?: number;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const { copied, manualText, copy } = useCopy();
  const stamp = useStamp(picks);
  const t = shareText({ campaign, challengeCode, dailyNumber, dailyStreak, stamp });

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!stamp) return;
    shareImageFor({ picks, campaign, stamp, context: contextLabel }).then((b) => {
      if (!b || cancelled) return;
      url = URL.createObjectURL(b);
      setPreview(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks.map((p) => p.id).join(","), campaign, stamp, contextLabel]);

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
