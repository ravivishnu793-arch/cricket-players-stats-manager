ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_role_check;

ALTER TABLE public.players
  ADD CONSTRAINT players_role_check
  CHECK (role IN ('Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'));