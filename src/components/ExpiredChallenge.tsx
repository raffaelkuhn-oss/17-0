import { Link } from "@tanstack/react-router";

/** Copy for retired (v1, pre-15-Oct) challenge and run links. */
export const EXPIRED_CHALLENGE_COPY = "This challenge is from an older version of 17-0 and has expired. Fancy a fresh one?";
export const EXPIRED_CHALLENGE_CTA = "Draft your own XI";
export const EXPIRED_CHALLENGE_TITLE = "Challenge expired — 17-0 Draft";

/**
 * Shown for a retired v1 link on /draft?c=… and /r/<code> (200, never a 404). The old XI is not
 * replayed and no player from the old pool is rendered. One tap starts a fresh draft.
 */
export function ExpiredChallenge() {
  return (
    <section className="mx-auto max-w-xl py-12 text-center" data-testid="challenge-expired">
      <p className="text-xs tracking-[0.4em] text-primary uppercase">Friend's challenge</p>
      <h1 className="mt-4 text-4xl">Old challenge link</h1>
      <p className="mt-3 text-lg text-muted-foreground" data-testid="challenge-expired-copy">
        {EXPIRED_CHALLENGE_COPY}
      </p>
      <Link
        to="/draft"
        search={{}}
        className="btn-primary hover:btn-primary-hover mt-8 inline-flex w-full max-w-sm justify-center px-8"
        data-testid="challenge-expired-draft"
      >
        {EXPIRED_CHALLENGE_CTA}
      </Link>
    </section>
  );
}
