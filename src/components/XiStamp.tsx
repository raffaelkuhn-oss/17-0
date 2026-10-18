import { xiDare, type XiStamp } from "@/lib/xi-chance";

/** The "1 in N" stamp on the result screen (copy-stamp.md §1–2, mock A). Computed on the device. */
export function XiStampCard({ stamp }: { stamp: XiStamp }) {
  return (
    <div
      className="mx-auto mt-5 max-w-sm rounded-2xl px-5 py-4 text-center"
      style={{ backgroundColor: "#faf7eb", color: "#1b3a20" }}
      data-testid="xi-stamp"
    >
      <p className="text-xs font-bold tracking-[0.2em]" style={{ color: "#2e7d32" }}>
        THIS XI GOES 17-0
      </p>
      <p className="font-display text-5xl leading-tight" data-testid="xi-stamp-n">
        1 in {stamp.n}
      </p>
      <p className="text-sm font-semibold" style={{ color: "#2e7d32" }}>
        seasons, in our sims
      </p>
      <p className="text-sm">title chance {stamp.titlePct}%</p>
      <p className="mt-2">
        <span
          className="inline-block rounded-full px-3 py-0.5 text-xs font-bold tracking-wider uppercase"
          style={{ backgroundColor: "#fae3ab" }}
          data-testid="xi-tier"
        >
          {stamp.tier}
        </span>
      </p>
      <p className="mt-1 text-xs opacity-80">{stamp.flavour}</p>
    </div>
  );
}

/** The dare line (xiDare) just above Share result (mock A: white, extra bold, under the stamp).
 * On the device only; it never adds anything to a link. */
export function XiDareLine({ stamp }: { stamp: Pick<XiStamp, "n"> }) {
  return (
    <p className="mb-3 text-lg font-extrabold text-white" data-testid="xi-dare">
      {xiDare(stamp)}
    </p>
  );
}
