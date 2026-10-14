// Manual e2e (not in CI): bun run build && npx vite preview --port 4173, then node scripts/e2e-challenge.mjs (needs playwright).
import { chromium, webkit } from "playwright";
const BASE = "http://localhost:4173";
const PICKS = [0,1,2,3,0,1,2,3,0,1,2];
async function draft(page, picks) {
  const seen = [];
  for (let s = 0; s < 11; s++) {
    await page.getByRole("heading", { name: `Pick ${s + 1} of 11` }).waitFor();
    const btns = page.locator('button[aria-label^="Pick "]');
    seen.push((await btns.allInnerTexts()).map((t) => t.split("\n")[0]).join(","));
    await btns.nth(picks[s]).click();
  }
  await page.getByRole("button", { name: "Simulate the campaign" }).click();
  const record = (await page.locator("h1").first().innerText()).trim();
  const scores = (await page.locator("ol li .font-display").allInnerTexts()).join(" ");
  return { seen, record, scores };
}
let fails = 0; const ok = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
for (const [name, bt] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await bt.launch();
  const opts = { viewport: { width: 390, height: 844 }, isMobile: name === "chromium", hasTouch: true };
  const a = await (await browser.newContext(opts)).newPage();
  await a.goto(BASE + "/draft", { waitUntil: "networkidle" }); await a.waitForTimeout(800);
  const A = await draft(a, PICKS);
  const code = await a.getByTestId("challenge-button").getAttribute("data-challenge");
  console.log(`${name}: challenger ${A.record}, link /draft?c=${code}`);
  const ctxB = await browser.newContext(opts); const b = await ctxB.newPage();
  await b.goto(`${BASE}/draft?c=${code}`, { waitUntil: "networkidle" }); await b.waitForTimeout(800);
  const theirs = (await b.getByTestId("challenge-theirs").innerText()).trim();
  ok(`${name}: banner shows challenger's real result (${theirs})`, theirs === A.record);
  const B = await draft(b, PICKS);
  ok(`${name}: same 11 candidate sets in new context`, B.seen.join("|") === A.seen.join("|"));
  ok(`${name}: same picks -> identical result + scores (${B.record})`, B.record === A.record && B.scores === A.scores);
  ok(`${name}: comparison shown`, await b.getByTestId("challenge-compare").isVisible());
  const b2 = await (await browser.newContext(opts)).newPage();
  await b2.goto(`${BASE}/draft?c=${code}`, { waitUntil: "networkidle" }); await b2.waitForTimeout(500);
  const B2 = await draft(b2, [3,3,3,3,3,3,3,3,3,3,3]);
  ok(`${name}: different picks, same pool (seen equal for slot 1)`, B2.seen[0] === A.seen[0]);
  for (const bad of ["djF8Y3x6enp6enp6fDAxMjM", code.slice(0, -2), "%3Cscript%3E", "dj98Y3wxfDAxMjMwMTIzMDEy"]) {
    const t = await (await browser.newContext(opts)).newPage();
    await t.goto(`${BASE}/draft?c=${bad}`, { waitUntil: "networkidle" });
    ok(`${name}: tampered '${bad.slice(0, 12)}' -> fallback note + normal draft`, (await t.getByTestId("challenge-invalid").isVisible()) && (await t.locator('button[aria-label^="Pick "]').count()) === 4 && (await t.getByTestId("challenge-banner").count()) === 0);
  }
  const d = await (await browser.newContext(opts)).newPage();
  await d.goto(`${BASE}/daily`, { waitUntil: "networkidle" });
  ok(`${name}: /daily renders, no challenge banner`, (await d.getByTestId("challenge-banner").count()) === 0 && (await d.locator("h1").count()) > 0);
  await browser.close();
}
console.log(fails ? `${fails} FAILED` : "ALL PASS"); process.exit(fails ? 1 : 0);
