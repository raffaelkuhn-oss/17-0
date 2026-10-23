// Run: bun scripts/test-share-links.ts
// One check per share path: every URL is short, built from SITE_URL, carries no tag, and its landing
// is classified as source "share" (or, for Daily, left unattributed on purpose). See share-text.ts runLink().
import { SITE_URL } from "../src/lib/site";
import { challengeLink, runLink, shareText, whatsappUrl, xIntentUrl } from "../src/lib/share-text";
import { runShare, type ShareNav } from "../src/lib/share-file";
import { encodeChallenge } from "../src/lib/challenge";
import { runFromCode } from "../src/lib/og/run-page";
import { SOURCES, isShareLanding, landingSource, nextVisit } from "../src/lib/retention";
import { handleRetentionEvent } from "../src/lib/retention-server";
import type { Campaign, MatchResult } from "../src/lib/sim";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const mk = (o: string, extra: Partial<Campaign> = {}): Campaign => {
  const results = [...o].map((x, i) => ({ round: `R${i}`, opponent: "X", gf: 1, ga: 0, outcome: x as MatchResult["outcome"] }));
  const won = [...o].filter((x) => x === "W").length, drawn = [...o].filter((x) => x === "D").length;
  return { results, won, drawn, lost: o.length - won - drawn, points: 0, eliminatedIn: null, champion: false, perfect: false, ...extra } as Campaign;
};
const HOST = new URL(SITE_URL).hostname;
/** A landing as the browser sees it: path + search of a share URL. */
const land = (url: string, referrer = "", ref?: string | null) => {
  const u = new URL(url);
  return landingSource({ utmSource: u.searchParams.get("utm_source"), ref: ref ?? u.searchParams.get("ref"), pathname: u.pathname, search: u.search, referrer, ownHost: HOST });
};

// Real v2 codes (Classic and Legend), decodable by the /r/ page.
const classicCode = encodeChallenge({ mode: "classic", seed: 424242, picks: [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2] });
const legendCode = encodeChallenge({ mode: "legend", seed: 777, picks: [3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1] });
t("codes render on /r/", !!runFromCode(classicCode) && !!runFromCode(legendCode));
const mid = mk("WWDWLWWWWWLL", { eliminatedIn: "Quarter-Final" });

for (const [mode, code] of [["Classic", classicCode], ["Legend", legendCode]] as const) {
  const want = `${SITE_URL}/r/${code}`;
  const st = { title: "17-0 Draft", ...shareText({ campaign: mid, challengeCode: code }) };
  const clean = (u: string) => u === want && !u.includes("?") && !u.includes("#");
  t(`${mode}: shareText url = SITE_URL/r/<code>, no query`, clean(st.url) && st.full.endsWith("\n" + want));
  // 1. image-file share (link inside the text) and 2. native share (url field)
  const seen: ShareData[] = [];
  const nav: ShareNav = { share: async (d) => { seen.push(d); } };
  await runShare(nav, "file", st, new File(["x"], "card.jpg", { type: "image/jpeg" }));
  t(`${mode} image-file share: text ends with SITE_URL/r/<code>`, (seen[0]?.text ?? "").endsWith("\n" + want) && seen[0]?.url === undefined);
  await runShare(nav, "native", st);
  t(`${mode} native share: url = SITE_URL/r/<code>`, clean(seen[1]?.url ?? "") && !(seen[1]?.text ?? "").includes("http"));
  // 3. copy fallback (primary button without Web Share) and 6. "Copy text": both copy t.full
  t(`${mode} copy fallback / copy text: last line SITE_URL/r/<code>`, clean(st.full.split("\n").at(-1) ?? ""));
  // 4. X intent
  const x = new URL(xIntentUrl(st));
  t(`${mode} X intent: url param = SITE_URL/r/<code>`, x.origin === "https://x.com" && clean(x.searchParams.get("url") ?? "") && !(x.searchParams.get("text") ?? "").includes("http"));
  // 5. WhatsApp
  const wa = new URL(whatsappUrl(st));
  t(`${mode} WhatsApp: text ends with SITE_URL/r/<code>`, wa.origin === "https://wa.me" && (wa.searchParams.get("text") ?? "").endsWith("\n" + want));
  t(`${mode}: /r/ landing -> share (no referrer, e.g. WhatsApp)`, land(want) === "share");
  t(`${mode}: /r/ landing via t.co -> share (path beats referrer)`, land(want, "https://t.co/abc") === "share");
}

// Challenge a friend
const ch = challengeLink(classicCode);
t("Challenge: SITE_URL/draft?c=<code>, only the c param", ch === `${SITE_URL}/draft?c=${classicCode}` && [...new URL(ch).searchParams.keys()].join() === "c");
t("Challenge landing -> share", land(ch) === "share" && land(ch, "https://wa.me/") === "share");

// Daily
const daily = shareText({ campaign: mid, dailyNumber: 12 });
t("Daily: SITE_URL/daily, no code, no query", daily.url === `${SITE_URL}/daily` && runLink({ dailyNumber: 12, challengeCode: undefined }) === `${SITE_URL}/daily`);
t("Daily landing stays unattributed (direct)", land(daily.url) === "direct");

// Live-preview / extra-pool runs: no code (picks aren't in the legends pool), plain /draft
t("Live-preview / extra-pool: SITE_URL/draft, no query", shareText({ campaign: mid }).url === `${SITE_URL}/draft`);

// Classifier details and precedence
t("isShareLanding", isShareLanding("/r/abc", "") && isShareLanding("/r/abc/", "") && isShareLanding("/draft", "?c=x") && isShareLanding("/draft/", "?mode=legend&c=x"));
t("isShareLanding rejects", !isShareLanding("/r/", "") && !isShareLanding("/r/a/b", "") && !isShareLanding("/draft", "") && !isShareLanding("/draft", "?c=") && !isShareLanding("/daily", "?c=x") && !isShareLanding("/", ""));
t("plain /draft, no referrer -> direct", land(`${SITE_URL}/draft`) === "direct");
t("plain /draft, same-site referrer / -> direct", land(`${SITE_URL}/draft`, `${SITE_URL}/`) === "direct");
t("plain /draft from reddit -> reddit (referrer still works)", land(`${SITE_URL}/draft`, "https://old.reddit.com/r/soccer/") === "reddit");
t("explicit creator ref wins over share path", land(`${SITE_URL}/r/${classicCode}?ref=c01`) === "direct" && land(`${SITE_URL}/r/${classicCode}?ref=c01`, "https://www.tiktok.com/") === "tiktok");
t("explicit utm_source wins over share path", land(`${SITE_URL}/draft?c=${classicCode}&utm_source=newsletter`) === "newsletter");
t("invalid ref is not a tag: share path still wins", land(`${SITE_URL}/r/${classicCode}?ref=bogus`) === "share");
t("/r/ -> /draft before hydration (same-site /r/ referrer) -> share", land(`${SITE_URL}/draft`, `${SITE_URL}/r/${classicCode}`) === "share");
t("/r/ -> Play this challenge before hydration -> share", land(`${SITE_URL}/draft?c=${classicCode}`, `${SITE_URL}/r/${classicCode}`) === "share");
t("foreign site's /r/ path is not ours -> other", land(`${SITE_URL}/draft`, "https://example.com/r/abc") === "other");

// First-time visitor on /r/: the first visit stores "share" as the source (same single key as before);
// a later visit from elsewhere keeps it (first source wins, as for every source).
const fv = nextVisit(null, new Date("2026-10-23T12:00:00Z"), land(`${SITE_URL}/r/${classicCode}`));
t("first visit on /r/: visit d0 with source share, state fields unchanged", fv.events.join() === "visit" && fv.state.source === "share" && Object.keys(fv.state).sort().join() === "firstSeen,lastSeen,source");
t("next day from reddit: source stays share", nextVisit(fv.state, new Date("2026-10-24T12:00:00Z"), "reddit").state.source === "share");

// Server allowlist
t("'share' is in SOURCES", (SOURCES as readonly string[]).includes("share"));
const writes: { blobs?: string[] }[] = [];
const env = { RETENTION: { writeDataPoint: (p: { blobs?: string[] }) => writes.push(p) } };
await handleRetentionEvent(new Request("https://x/e", { method: "POST", body: JSON.stringify({ event: "visit", bucket: "d0", mode: "none", source: "share", ref: "none" }) }), env);
t("server accepts source 'share' (blob4)", writes.length === 1 && writes[0]?.blobs?.[3] === "share");

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log("all share-link checks passed");
