import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDailyLeaderboard } from "@/lib/leaderboard.functions";
import { Link } from "@tanstack/react-router";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { dailyKey } from "@/lib/daily";

export function HomeLeaderboard() {
  const [key, setKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const fetchBoard = useServerFn(getDailyLeaderboard);
  useEffect(() => {
    const k = dailyKey();
    setKey(k);
    fetchBoard({ data: { dayKey: k } })
      .then((res) => setEnabled(res.enabled))
      .catch(() => setEnabled(false));
  }, [fetchBoard]);

  // Leaderboard disabled (missing Supabase env): hide heading and intro too.
  if (!enabled) return null;

  return (
    <section id="ranking" className="mx-auto max-w-2xl px-6 py-12">
      <h2 className="text-2xl">Today's ranking</h2>
      <p className="mt-2 mb-4 text-sm text-muted-foreground">
        Global leaderboard for today's Daily Challenge.{" "}
        <Link to="/daily" className="text-primary underline underline-offset-4">
          Play today's draft
        </Link>
        .
      </p>
      {key ? (
        <DailyLeaderboard dayKey={key} record={null} />
      ) : (
        <div className="surface rounded-2xl p-5 text-sm text-muted-foreground">
          Loading today's ranking…
        </div>
      )}
    </section>
  );
}
