// File-share fallback: Web Share with the card image when canShare({ files }) allows it, else text + link, else copy.
import { pickShareMethod, runShare, type ShareNav } from "../src/lib/share-file";
let fails = 0;
const t = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fails++; };
const file = new File([new Uint8Array([1, 2, 3])], "17-0-result.jpg", { type: "image/jpeg" });
const T = { title: "17-0 Draft", body: "9W 1D 2L…", url: "https://ucl17-0.com/r/abc", full: "9W 1D 2L…\nhttps://ucl17-0.com/r/abc" };
const calls: ShareData[] = [];
const nav = (o: { canShare?: boolean | "throw" | "missing"; reject?: string }): ShareNav => ({
  share: async (d) => { calls.push(d); if (o.reject) { const e = new Error(o.reject); e.name = o.reject; throw e; } },
  canShare: o.canShare === "missing" ? undefined : (d) => { if (o.canShare === "throw") throw new TypeError("bad"); return o.canShare === true && !!d.files?.length; },
});
t("no navigator -> copy", pickShareMethod(undefined, file) === "copy");
t("no navigator.share -> copy", pickShareMethod({}, file) === "copy");
t("no canShare -> text share", pickShareMethod(nav({ canShare: "missing" }), file) === "native");
t("canShare false -> text share", pickShareMethod(nav({ canShare: false }), file) === "native");
t("canShare throws -> text share", pickShareMethod(nav({ canShare: "throw" }), file) === "native");
t("image not ready -> text share", pickShareMethod(nav({ canShare: true }), null) === "native");
t("canShare true -> file share", pickShareMethod(nav({ canShare: true }), file) === "file");
calls.length = 0;
t("file share sends the file + text with the link", (await runShare(nav({ canShare: true }), "file", T, file)) === "shared" && calls[0]?.files?.[0] === file && calls[0]?.text === T.full && calls[0]?.url === undefined);
calls.length = 0;
t("text share sends text + url, no files", (await runShare(nav({ canShare: false }), "native", T, file)) === "shared" && !calls[0]?.files && calls[0]?.url === T.url && calls[0]?.text === T.body);
t("AbortError (sheet closed) -> aborted, no fallback", (await runShare(nav({ canShare: true, reject: "AbortError" }), "file", T, file)) === "aborted");
t("NotAllowedError -> failed (caller shows manual copy)", (await runShare(nav({ canShare: true, reject: "NotAllowedError" }), "file", T, file)) === "failed");
t("DataError on text share -> failed", (await runShare(nav({ canShare: false, reject: "DataError" }), "native", T)) === "failed");
process.exit(fails ? 1 : 0);
