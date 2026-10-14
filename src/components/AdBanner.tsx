/**
 * AdBanner
 *
 * Unpaid "Friends of 17-0" link to the original basketball drafting game at 82-0.com.
 * Label by relationship: friend -> "Friends of 17-0" + rel noopener; use "Sponsored" and
 * rel="sponsored" only when money or a link swap is involved.
 */
export function AdBanner({
  label = "Friends of 17-0",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`ad-banner ${className}`}>
      <span className="ad-banner-label">{label}</span>
      <a
        href="https://www.82-0.com/"
        target="_blank"
        rel="noreferrer noopener"
        className="ad-banner-slot group flex-col gap-1 text-foreground no-underline transition-colors hover:border-primary"
      >
        <span className="font-display text-lg tracking-wide">82-0</span>
        <span className="max-w-[16rem] text-sm text-muted-foreground">
          The original basketball draft game. Build a squad of NBA legends and chase the perfect season.
        </span>
        <span className="mt-1 text-xs text-primary group-hover:underline">Play 82-0.com →</span>
      </a>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        for sponsoring inquiries write an email to:{" "}
        <a href="mailto:ucl17zero@gmail.com" className="inline-flex min-h-11 items-center px-2 text-primary hover:underline">
          ucl17zero@gmail.com
        </a>
      </p>
    </div>
  );
}
