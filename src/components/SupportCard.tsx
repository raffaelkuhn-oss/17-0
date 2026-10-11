import { TIP_URL } from "@/lib/tip";

export function SupportCard() {
  if (!TIP_URL) return null;

  return (
    <div className="surface rounded-2xl p-6 text-center">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Support the project</p>
      <h2 className="mt-2 text-3xl">Keep the lights on</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        17-0 is free to play. If you want to help cover hosting and keep new features coming, you
        can leave a tip.
      </p>
      <a
        href={TIP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary hover:btn-primary-hover mt-6 inline-flex text-sm"
      >
        Leave a tip
      </a>
    </div>
  );
}
