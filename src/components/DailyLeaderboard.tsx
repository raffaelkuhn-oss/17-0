import { useCallback, useEffect, useState } from "react";
import { browserStorage } from "@/lib/daily";
import { useServerFn } from "@tanstack/react-start";
import { getDailyLeaderboard, submitDailyResult, type LeaderboardEntry as Entry } from "@/lib/leaderboard.functions";
import type { DailyRecord } from "@/lib/daily";
import { recordLabel } from "@/lib/record";

const NAME_KEY = "ucl170:daily:name";
const SUBMIT_PREFIX = "ucl170:daily:submitted:";

function cleanName(raw: string) {
  return raw.replace(/\s+/g, " ").trim().slice(0, 20);
}

export function DailyLeaderboard({
  dayKey,
  record,
}: {
  dayKey: string;
  record: DailyRecord | null;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitResult = useServerFn(submitDailyResult);
  const fetchBoard = useServerFn(getDailyLeaderboard);
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchBoard({ data: { dayKey } });
      setEnabled(res.enabled);
      setEntries(res.entries);
    } catch {
      setEnabled(false);
    }
  }, [dayKey, fetchBoard]);

  useEffect(() => {
    const store = browserStorage(); // null when storage is blocked (private mode): never throw
    if (store) {
      setName(store.getItem(NAME_KEY) ?? "");
      setSubmitted(store.getItem(SUBMIT_PREFIX + dayKey) === "1");
    }
    void load();
  }, [dayKey, load]);

  async function submit() {
    if (!record) return;
    const clean = cleanName(name);
    if (clean.length < 2) {
      setError("Pick a name with at least 2 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    // The server replays today's draft and re-simulates the campaign, so the
    // client cannot post fabricated wins, ratings or trophies.
    let res: { ok: boolean; error?: string };
    try {
      res = await submitResult({ data: { dayKey, name: clean, picks: record.names } });
    } catch {
      res = { ok: false, error: "Could not submit your result. Try again." };
    }
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not submit your result. Try again.");
      return;
    }
    try {
      browserStorage()?.setItem(NAME_KEY, clean);
      browserStorage()?.setItem(SUBMIT_PREFIX + dayKey, "1");
    } catch {
      /* quota / blocked: the submit itself still succeeded */
    }
    setSubmitted(true);
    void load();
  }

  if (!enabled) {
    return (
      <aside className="surface h-fit rounded-2xl p-5">
        <p className="text-xs tracking-[0.35em] text-primary uppercase">Leaderboard</p>
        <p className="mt-3 text-sm text-muted-foreground">The leaderboard is not available.</p>
      </aside>
    );
  }

  return (
    <aside className="surface h-fit rounded-2xl p-5">
      {record && !submitted && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <label htmlFor="daily-name" className="block text-sm font-medium text-primary">
            Add your name to today's board
          </label>
          <input
            id="daily-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={submit}
            disabled={busy}
            className="btn-primary hover:btn-primary-hover w-full disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit result"}
          </button>
        </div>
      )}

      {record && submitted && (
        <p className="text-sm text-muted-foreground">
          Your result is on the board. Come back tomorrow for a new draft.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="mt-5 text-xs tracking-[0.35em] text-primary uppercase">Today's ranking</p>

      <ol className="mt-3 space-y-1.5">
        {entries === null && <li className="text-sm text-muted-foreground">Loading rankings…</li>}
        {entries?.length === 0 && (
          <li className="text-sm text-muted-foreground">No results yet today. Be the first.</li>
        )}
        {entries?.map((e, i) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-display w-6 text-muted-foreground">{i + 1}</span>
              <span className="truncate">{e.name}</span>
              {e.perfect ? <span title="Perfect 17-0">🏆</span> : e.champion ? <span>⭐</span> : null}
            </span>
            <span className="font-display shrink-0">
              {recordLabel(e)}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-muted-foreground">
        Ranked by trophy, then wins, then league points. Results are verified on the server.
      </p>
    </aside>
  );
}
