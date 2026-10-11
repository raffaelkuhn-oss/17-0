// Run: bun scripts/test-daily-cookie.ts
import { createDailyCookie, newCookieId, verifyDailyCookie } from "../src/lib/daily-cookie";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const id = newCookieId(), day = "2026-10-11";
const v = (await createDailyCookie("s3cret", { dayKey: day, state: "b", id }))!;
t("roundtrip valid", (await verifyDailyCookie("s3cret", v))?.state === "b");
t("tampered sig rejected", (await verifyDailyCookie("s3cret", v.slice(0, -2) + "xx")) === null);
t("state flip c->b rejected", (await verifyDailyCookie("s3cret", v.replace(".b.", ".c."))) === null);
t("day change rejected", (await verifyDailyCookie("s3cret", v.replace(day, "2026-10-12"))) === null);
t("wrong secret rejected", (await verifyDailyCookie("other", v)) === null);
t("garbage rejected, no throw", (await verifyDailyCookie("s3cret", "a.b")) === null);
t("missing secret: create -> null", (await createDailyCookie(undefined, { dayKey: day, state: "c", id })) === null);
t("missing secret: verify -> null", (await verifyDailyCookie(undefined, v)) === null);
process.exit(fails ? 1 : 0);
