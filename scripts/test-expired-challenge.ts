// Retired v1 (pre-15-Oct) challenge and run links: friendly expired note + "Draft your own XI",
// never a replay of the old XI, never a 404, default og image. (PM, 19 Oct.)
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { CHALLENGE_VERSION_LEGACY, decodeChallenge, encodeChallenge, isExpiredChallenge } from "../src/lib/challenge";
import { isExpiredRunCode, runFromCode } from "../src/lib/og/run-page";
import { PLAYERS } from "../src/lib/players";
import { ExpiredChallenge, EXPIRED_CHALLENGE_COPY, EXPIRED_CHALLENGE_CTA } from "../src/components/ExpiredChallenge";

let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const picks = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2];
const v1 = encodeChallenge({ mode: "classic", seed: 1000, picks, version: CHALLENGE_VERSION_LEGACY });
const v1legend = encodeChallenge({ mode: "legend", seed: 77, picks, version: CHALLENGE_VERSION_LEGACY });
const v2 = encodeChallenge({ mode: "classic", seed: 1000, picks });

// 1) Logic
t("v1 codes are expired (classic + legend)", isExpiredChallenge(v1) && isExpiredChallenge(v1legend));
t("v1 codes never decode or replay", decodeChallenge(v1) === null && runFromCode(v1) === null);
t("v1 run code is expired on /r/", isExpiredRunCode(v1));
t("v2 codes are not expired and still replay", !isExpiredChallenge(v2) && !!decodeChallenge(v2) && !!runFromCode(v2));
t("garbage / tampered / unknown version is not 'expired' (keeps the 'didn't work' note)", ["", "garbage", v1.slice(0, -3), btoa("v9|c|rs|01230123012").replace(/=+$/, "")].every((c) => !isExpiredChallenge(c)));

// 2) Copy: warm, short, "chance" never "odds"
t("copy verbatim", EXPIRED_CHALLENGE_COPY === "This challenge is from an older version of 17-0 and has expired. Fancy a fresh one?" && EXPIRED_CHALLENGE_CTA === "Draft your own XI");
t("no betting words", !/\b(odds|bet|betting)\b/i.test(EXPIRED_CHALLENGE_COPY + EXPIRED_CHALLENGE_CTA));

// 3) Render the note inside a memory router (the button is a router Link to a fresh /draft)
const root = createRootRoute({ component: () => createElement(ExpiredChallenge) });
const draft = createRoute({ getParentRoute: () => root, path: "/draft", validateSearch: (s: Record<string, unknown>) => s as { c?: string } });
const router = createRouter({ routeTree: root.addChildren([draft]), history: createMemoryHistory({ initialEntries: [`/draft?c=${v1}`] }) });
await router.load();
const html = renderToString(createElement(RouterProvider, { router } as never));
t("note renders with the copy", html.includes('data-testid="challenge-expired"') && html.includes(EXPIRED_CHALLENGE_COPY.replace("'", "&#x27;")));
const btn = /<a[^>]*data-testid="challenge-expired-draft"[^>]*>([^<]*)<\/a>/.exec(html);
t("one primary button 'Draft your own XI'", !!btn && btn[1] === EXPIRED_CHALLENGE_CTA && /class="[^"]*btn-primary/.test(btn[0]));
t("button starts a fresh draft (href /draft, no ?c=)", !!btn && /href="\/draft"/.test(btn[0]));
t(`no player rendered (none of ${PLAYERS.length} pool names)`, PLAYERS.length > 0 && PLAYERS.every((p) => !html.includes(p.name)));

// 4) Routes wire it up: 200 page (no notFound/404), DraftGame not rendered, default og image
const draftSrc = readFileSync(new URL("../src/routes/draft.tsx", import.meta.url), "utf8");
const expiredAt = draftSrc.indexOf("if (expired)");
t("/draft?c=<v1>: returns the note before DraftGame (no replay)", expiredAt > 0 && draftSrc.indexOf("<ExpiredChallenge />", expiredAt) > 0 && draftSrc.indexOf("<ExpiredChallenge />", expiredAt) < draftSrc.indexOf("<DraftGame"));
const runSrc = readFileSync(new URL("../src/routes/r.$code.tsx", import.meta.url), "utf8");
t("/r/<v1>: note page, no notFound()/404", runSrc.includes("isExpiredRunCode(code)") && runSrc.includes("<ExpiredChallenge />") && !/notFound\(|status:\s*404/.test(runSrc));
const expHead = runSrc.slice(runSrc.indexOf("if (loaderData?.expired)"), runSrc.indexOf('"Run not found'));
t("/r/<v1> head: no per-run og:image (site default from __root), noindex", expHead.length > 0 && !expHead.includes("og:image") && expHead.includes("robots"));
const og = readFileSync(new URL("../src/lib/og/handler.ts", import.meta.url), "utf8");
t("og handler: an unreplayable code falls back to the default image", /if \(!run\) return fallback\(url, "invalid"\)/.test(og));
// 5) Fan-made footer is in the root layout, which wraps both routes (scripts/test-footer.ts checks it).
t("routes do not render their own footer", !/<footer[\s>]/.test(draftSrc + runSrc + readFileSync(new URL("../src/components/ExpiredChallenge.tsx", import.meta.url), "utf8")));
if (fails) process.exit(1);
