CREATE TABLE public.daily_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key text NOT NULL,
  name text NOT NULL,
  won smallint NOT NULL,
  drawn smallint NOT NULL,
  lost smallint NOT NULL,
  points smallint NOT NULL DEFAULT 0,
  rating smallint NOT NULL DEFAULT 0,
  champion boolean NOT NULL DEFAULT false,
  perfect boolean NOT NULL DEFAULT false,
  eliminated_in text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_leaderboard_day_key_format CHECK (day_key ~ '^\d{4}-\d{2}-\d{2}$'),
  CONSTRAINT daily_leaderboard_name_len CHECK (char_length(btrim(name)) BETWEEN 2 AND 20),
  CONSTRAINT daily_leaderboard_counts CHECK (
    won BETWEEN 0 AND 17 AND drawn BETWEEN 0 AND 17 AND lost BETWEEN 0 AND 17
    AND won + drawn + lost BETWEEN 1 AND 17
  ),
  CONSTRAINT daily_leaderboard_points CHECK (points BETWEEN 0 AND 24),
  CONSTRAINT daily_leaderboard_rating CHECK (rating BETWEEN 0 AND 100),
  CONSTRAINT daily_leaderboard_elim CHECK (eliminated_in IS NULL OR char_length(eliminated_in) <= 40)
);

CREATE INDEX daily_leaderboard_rank_idx
  ON public.daily_leaderboard (day_key, champion DESC, won DESC, points DESC, created_at ASC);

GRANT SELECT, INSERT ON public.daily_leaderboard TO anon;
GRANT SELECT, INSERT ON public.daily_leaderboard TO authenticated;
GRANT ALL ON public.daily_leaderboard TO service_role;

ALTER TABLE public.daily_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is publicly readable"
  ON public.daily_leaderboard FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can submit a result"
  ON public.daily_leaderboard FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);