/**
 * Test runner: runs every scripts/test-*.ts (sorted, one bun process each, from the repo root) and
 * fails if any of them fails. New test files are picked up automatically; package.json lists none.
 * A file fails when it exits non-zero, crashes, or prints a line starting with "FAIL" (so a test
 * that forgets to set its exit code still fails). All files run even after a failure.
 * Usage: bun scripts/run-tests.ts [--dir <dir>] [filter]   (filter: substring of the file name)
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const dir = resolve(dirIdx >= 0 ? (args[dirIdx + 1] ?? "") : join(import.meta.dir));
const filter = args.filter((_, i) => i !== dirIdx && i !== dirIdx + 1)[0] ?? "";
const root = resolve(import.meta.dir, "..");

const files = readdirSync(dir)
  .filter((f) => /^test-.+\.ts$/.test(f) && f.includes(filter))
  .sort();
if (files.length === 0) {
  console.error(`run-tests: no test-*.ts files in ${dir}${filter ? ` matching "${filter}"` : ""}`);
  process.exit(1);
}

const failed: string[] = [];
const t0 = Date.now();
for (const f of files) {
  const start = Date.now();
  const p = Bun.spawnSync(["bun", join(dir, f)], { cwd: root, stdout: "pipe", stderr: "pipe", env: process.env });
  const out = p.stdout.toString(), err = p.stderr.toString();
  process.stdout.write(out);
  process.stderr.write(err);
  const failLine = /^FAIL\b/m.test(out) || /^FAIL\b/m.test(err);
  const ok = p.exitCode === 0 && !failLine;
  if (!ok) failed.push(f);
  console.log(`${ok ? "ok  " : "FAIL"} ${f} (${Date.now() - start} ms${p.exitCode !== 0 ? `, exit ${p.exitCode ?? p.signalCode}` : ""}${failLine && p.exitCode === 0 ? ", printed FAIL but exited 0" : ""})`);
}
console.log(`\nrun-tests: ${files.length - failed.length}/${files.length} files passed in ${Date.now() - t0} ms`);
if (failed.length) {
  console.log(`failed: ${failed.join(", ")}`);
  process.exit(1);
}
