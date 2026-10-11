DROP POLICY IF EXISTS "Anyone can submit a result" ON public.daily_leaderboard;
REVOKE INSERT, UPDATE, DELETE ON public.daily_leaderboard FROM anon, authenticated;
GRANT SELECT ON public.daily_leaderboard TO anon, authenticated;
GRANT ALL ON public.daily_leaderboard TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS daily_leaderboard_day_name_uniq
  ON public.daily_leaderboard (day_key, lower(name));