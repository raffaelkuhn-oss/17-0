// Self-test for scripts/run-tests.ts against a throwaway fixture dir (never recurses into scripts/).
import { mkdtempSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const run = (dir: string, ...extra: string[]) => {
  const p = Bun.spawnSync(["bun", "scripts/run-tests.ts", "--dir", dir, ...extra], { stdout: "pipe", stderr: "pipe" });
  return { code: p.exitCode, out: p.stdout.toString() };
};
const fx = (files: Record<string, string>) => {
  const d = mkdtempSync(join(tmpdir(), "rt-"));
  for (const [n, s] of Object.entries(files)) writeFileSync(join(d, n), s);
  return d;
};
const dirs: string[] = [];
const ok = fx({ "test-a.ts": 'console.log("PASS a")', "test-b.ts": 'console.log("PASS b")', "helper.ts": "process.exit(1)" }); dirs.push(ok);
const r1 = run(ok);
t("all passing -> exit 0, 2/2, non test-* files ignored", r1.code === 0 && r1.out.includes("2/2 files passed"));
const bad = fx({ "test-a.ts": "process.exit(3)", "test-b.ts": 'console.log("FAIL silently")', "test-c.ts": "throw new Error('boom')", "test-d.ts": 'console.log("PASS")' }); dirs.push(bad);
const r2 = run(bad);
t("exit code, printed FAIL and crash all fail; runner keeps going", r2.code === 1 && r2.out.includes("1/4 files passed") && r2.out.includes("failed: test-a.ts, test-b.ts, test-c.ts"));
const empty = fx({}); dirs.push(empty);
t("no test files -> exit 1", run(empty).code === 1);
t("filter", run(bad, "test-d").code === 0);
// The real suite: every scripts/test-*.ts is picked up (CI runs `bun run test` -> run-tests.ts).
const real = readdirSync("scripts").filter((f) => /^test-.+\.ts$/.test(f));
t(`real suite has ${real.length} test files incl. explainer and footer`, real.length >= 14 && real.includes("test-explainer.ts") && real.includes("test-footer.ts"));
const pkg = JSON.parse(await Bun.file("package.json").text()) as { scripts: Record<string, string> };
t("package.json test script uses the runner and lists no files", pkg.scripts["test"] === "bun scripts/run-tests.ts");
for (const d of dirs) rmSync(d, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
