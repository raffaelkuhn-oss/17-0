import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { dailyKey } from "@/lib/daily";

export function HomeLeaderboard() {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => setKey(dailyKey()), []);

  return (
    <div>
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
    </div>
  );
}
