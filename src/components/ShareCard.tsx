import { SITE_URL } from "@/lib/site";
import { useEffect, useState } from "react";
import { renderShareImage } from "@/lib/share-image";
import type { Player } from "@/lib/players";
import type { Campaign } from "@/lib/sim";
import { recordLong } from "@/lib/record";

const SHARE_URL = SITE_URL;

function headline(campaign: Campaign) {
  if (campaign.perfect) return "I went 17-0 in the Champions League draft game";
  if (campaign.champion) return "I won the Champions League in 17-0";
  if (campaign.eliminatedIn === "League Phase") return "My all-time XI didn't survive the league phase in 17-0";
  return `My all-time XI went out in the ${campaign.eliminatedIn} in 17-0`;
}

function caption(campaign: Campaign, contextLabel?: string) {
  const record = recordLong(campaign);
  const ctx = contextLabel ? `${contextLabel}\n` : "";
  return `${headline(campaign)} — ${record}.\n${ctx}\nCan you beat it?\n${SHARE_URL}\n\n#ChampionsLeague #UCL #17_0 #Football`;
}

export function ShareCard({
  picks,
  campaign,
  rating,
  contextLabel,
}: {
  picks: Player[];
  campaign: Campaign;
  rating: number;
  contextLabel?: string | undefined;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    renderShareImage({ picks, campaign, rating, context: contextLabel }).then((b) => {
      if (!b || cancelled) return;
      url = URL.createObjectURL(b);
      setBlob(b);
      setPreview(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [picks, campaign, rating, contextLabel]);

  function flash(msg: string) {
    setCopied(msg);
    setTimeout(() => setCopied(null), 2200);
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `17-0-result-${recordLong(campaign)}.png`;
    a.click();
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption(campaign, contextLabel));
      flash("Caption copied");
    } catch {
      /* unsupported */
    }
  }

  async function shareImage() {
    const text = caption(campaign, contextLabel);
    const file =
      blob && typeof File !== "undefined"
        ? new File([blob], "17-0-result.png", { type: "image/png" })
        : null;

    if (file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: "17-0 Champions League Draft" });
        return;
      } catch {
        /* cancelled or unsupported */
      }
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "17-0", text, url: SHARE_URL });
        return;
      } catch {
        /* cancelled */
      }
    }
    download();
    await copyCaption();
  }

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${headline(campaign)} — ${recordLong(campaign)}. Can you beat it?`,
  )}&url=${encodeURIComponent(SHARE_URL)}`;

  return (
    <div className="surface rounded-2xl p-5 text-center">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Share your result</p>
      <h2 className="mt-2 text-2xl">Brag about it</h2>

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

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          onClick={shareImage}
          className="btn-primary hover:btn-primary-hover w-full px-4 text-sm whitespace-nowrap"
        >
          Share result card
        </button>
        <button
          onClick={download}
          className="btn-ghost w-full px-4 text-sm whitespace-nowrap"
          disabled={!preview}
        >
          Download image
        </button>
        <a
          href={tweet}
          target="_blank"
          rel="noreferrer"
          className="btn-ghost w-full px-4 text-sm whitespace-nowrap"
        >
          Post on X
        </a>
        <button onClick={copyCaption} className="btn-ghost w-full px-4 text-sm whitespace-nowrap">
          {copied ?? "Copy caption for Instagram"}
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Download the card, then attach it to your post — image posts get far more reach than links.
      </p>
    </div>
  );
}
