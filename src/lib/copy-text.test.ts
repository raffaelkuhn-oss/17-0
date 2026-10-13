// @ts-nocheck -- bun:test types are not installed; run with `bun test`.
import { describe, expect, test } from "bun:test";
import { copyText, isAbortError } from "./copy-text";

const g = globalThis as Record<string, unknown>;

function fakeDom(execResult: boolean) {
  const calls: string[] = [];
  const ta = { value: "", style: {} as Record<string, string>, setAttribute() {}, select() { calls.push("select"); }, setSelectionRange() { calls.push("range"); } };
  g.document = {
    body: { appendChild() {}, removeChild() {} },
    activeElement: null,
    createElement: () => ta,
    createRange: () => ({ selectNodeContents() {} }),
    execCommand: (c: string) => { calls.push(c); return execResult; },
  };
  g.window = { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) };
  return { calls, ta };
}

describe("copyText", () => {
  test("uses execCommand synchronously and selects with setSelectionRange", async () => {
    const { calls, ta } = fakeDom(true);
    const p = copyText("hello");
    expect(calls).toContain("copy"); // happened before any await
    expect(calls).toContain("range");
    expect(ta.value).toBe("hello");
    expect(await p).toBe(true);
  });
  test("falls back to navigator.clipboard", async () => {
    fakeDom(false);
    let written = "";
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText: async (t: string) => { written = t; } } } });
    expect(await copyText("x")).toBe(true);
    expect(written).toBe("x");
  });
  test("resolves false when everything fails", async () => {
    fakeDom(false);
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {} });
    expect(await copyText("x")).toBe(false);
  });
  test("isAbortError", () => {
    expect(isAbortError(new DOMException("x", "AbortError"))).toBe(true);
    expect(isAbortError(new Error("x"))).toBe(false);
  });
});
