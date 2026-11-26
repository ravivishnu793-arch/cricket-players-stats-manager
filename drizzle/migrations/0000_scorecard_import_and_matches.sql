
-- Cricket over helpers (cricket notation: 7.5 = 7 overs 5 balls = 47 balls)
CREATE OR REPLACE FUNCTION public.overs_to_balls(o numeric) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (floor(coalesce(o,0))*6 + round((coalesce(o,0) - floor(coalesce(o,0)))*10))::int
$$;
CREATE OR REPLACE FUNCTION public.balls_to_overs(b integer) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (coalesce(b,0) / 6) + ((coalesce(b,0) % 6)::numeric / 10)
$$;

ALTER TABLE public.batting_stats ADD COLUMN IF NOT EXISTS balls_faced integer DEFAULT 0;

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date date NOT NULL,
  title text,
  venue text,
  tournament text,
  format text,
  overs_limit integer,
  team1_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team2_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  toss_winner_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  toss_decision text,
  winner_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  result text,
  target integer,
  team1_runs integer, team1_wickets integer, team1_balls integer,
  team2_runs integer, team2_wickets integer, team2_balls integer,
  status text DEFAULT 'completed',
  import_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.match_batting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  position integer,
  runs integer NOT NULL DEFAULT 0,
  balls integer NOT NULL DEFAULT 0,
  fours integer NOT NULL DEFAULT 0,
  sixes integer NOT NULL DEFAULT 0,
  dismissal text,
  not_out boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.match_bowling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  balls integer NOT NULL DEFAULT 0,
  maidens integer NOT NULL DEFAULT 0,
  runs integer NOT NULL DEFAULT 0,
  wickets integer NOT NULL DEFAULT 0,
  wides integer NOT NULL DEFAULT 0,
  no_balls integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.match_fielding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  catches integer NOT NULL DEFAULT 0,
  run_outs integer NOT NULL DEFAULT 0,
  stumpings integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.player_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_normalized text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.ocr_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_path text,
  status text NOT NULL DEFAULT 'processing',
  extracted jsonb,
  reviewed jsonb,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  players_detected integer DEFAULT 0,
  players_matched integer DEFAULT 0,
  players_new integer DEFAULT 0,
  confidence numeric,
  errors text[] DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.matches, public.match_batting, public.match_bowling, public.match_fielding, public.player_aliases TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.matches, public.match_batting, public.match_bowling, public.match_fielding, public.player_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_imports TO authenticated;
GRANT ALL ON public.matches, public.match_batting, public.match_bowling, public.match_fielding, public.player_aliases, public.ocr_imports TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_batting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_bowling ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_fielding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view match batting" ON public.match_batting FOR SELECT USING (true);
CREATE POLICY "Admins manage match batting" ON public.match_batting FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view match bowling" ON public.match_bowling FOR SELECT USING (true);
CREATE POLICY "Admins manage match bowling" ON public.match_bowling FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view match fielding" ON public.match_fielding FOR SELECT USING (true);
CREATE POLICY "Admins manage match fielding" ON public.match_fielding FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone can view aliases" ON public.player_aliases FOR SELECT USING (true);
CREATE POLICY "Admins manage aliases" ON public.player_aliases FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage imports" ON public.ocr_imports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ocr_imports_updated_at BEFORE UPDATE ON public.ocr_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Skip per-row notifications during bulk import
CREATE OR REPLACE FUNCTION public.notify_all_users()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  player_name text;
BEGIN
  IF coalesce(current_setting('app.bulk_import', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'batting_stats' THEN
    SELECT name INTO player_name FROM public.players WHERE id = NEW.player_id;
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT p.id, 'Batting Stats Updated', 'Stats updated for ' || COALESCE(player_name, 'a player'), 'stats', NEW.player_id FROM public.profiles p;
  ELSIF TG_TABLE_NAME = 'bowling_stats' THEN
    SELECT name INTO player_name FROM public.players WHERE id = NEW.player_id;
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT p.id, 'Bowling Stats Updated', 'Stats updated for ' || COALESCE(player_name, 'a player'), 'stats', NEW.player_id FROM public.profiles p;
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT p.id, 'New Announcement', NEW.title, 'announcement', NEW.id FROM public.profiles p;
  END IF;
  RETURN NEW;
END;
$function$;

-- Apply (+1) or reverse (-1) one match's contribution to career totals
CREATE OR REPLACE FUNCTION public.apply_match_stats(_match_id uuid, _sign integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; m record; cur_best text; bw int; br int;
BEGIN
  SELECT * INTO m FROM matches WHERE id = _match_id;

  FOR r IN SELECT * FROM match_batting WHERE match_id = _match_id LOOP
    INSERT INTO batting_stats (player_id) SELECT r.player_id WHERE NOT EXISTS (SELECT 1 FROM batting_stats WHERE player_id = r.player_id);
    UPDATE batting_stats SET
      innings = greatest(0, coalesce(innings,0) + _sign),
      runs = greatest(0, coalesce(runs,0) + _sign*r.runs),
      balls_faced = greatest(0, coalesce(balls_faced,0) + _sign*r.balls),
      fours = greatest(0, coalesce(fours,0) + _sign*r.fours),
      sixes = greatest(0, coalesce(sixes,0) + _sign*r.sixes),
      not_outs = greatest(0, coalesce(not_outs,0) + CASE WHEN r.not_out THEN _sign ELSE 0 END),
      highest_score = CASE WHEN _sign > 0 THEN greatest(coalesce(highest_score,0), r.runs) ELSE highest_score END
    WHERE player_id = r.player_id;
  END LOOP;

  FOR r IN SELECT * FROM match_bowling WHERE match_id = _match_id LOOP
    INSERT INTO bowling_stats (player_id) SELECT r.player_id WHERE NOT EXISTS (SELECT 1 FROM bowling_stats WHERE player_id = r.player_id);
    SELECT best_bowling INTO cur_best FROM bowling_stats WHERE player_id = r.player_id LIMIT 1;
    bw := nullif(split_part(coalesce(cur_best,''),'/',1),'')::int;
    br := nullif(split_part(coalesce(cur_best,''),'/',2),'')::int;
    UPDATE bowling_stats SET
      matches = greatest(0, coalesce(matches,0) + _sign),
      innings = greatest(0, coalesce(innings,0) + _sign),
      wickets = greatest(0, coalesce(wickets,0) + _sign*r.wickets),
      runs_conceded = greatest(0, coalesce(runs_conceded,0) + _sign*r.runs),
      overs_bowled = balls_to_overs(greatest(0, overs_to_balls(overs_bowled) + _sign*r.balls)),
      three_wickets = greatest(0, coalesce(three_wickets,0) + CASE WHEN r.wickets = 3 THEN _sign ELSE 0 END),
      four_wickets = greatest(0, coalesce(four_wickets,0) + CASE WHEN r.wickets >= 4 THEN _sign ELSE 0 END),
      best_bowling = CASE WHEN _sign > 0 AND r.balls > 0 AND (bw IS NULL OR r.wickets > bw OR (r.wickets = bw AND r.runs < coalesce(br, 9999)))
                          THEN r.wickets || '/' || r.runs ELSE best_bowling END
    WHERE player_id = r.player_id;
  END LOOP;

  UPDATE players SET matches_played = greatest(0, coalesce(matches_played,0) + _sign)
  WHERE id IN (SELECT player_id FROM match_batting WHERE match_id=_match_id
               UNION SELECT player_id FROM match_bowling WHERE match_id=_match_id
               UNION SELECT player_id FROM match_fielding WHERE match_id=_match_id);

  UPDATE teams SET
    matches_played = greatest(0, coalesce(matches_played,0) + _sign),
    wins = greatest(0, coalesce(wins,0) + CASE WHEN m.winner_id = teams.id THEN _sign ELSE 0 END),
    losses = greatest(0, coalesce(losses,0) + CASE WHEN m.winner_id IS NOT NULL AND m.winner_id <> teams.id THEN _sign ELSE 0 END)
  WHERE id IN (m.team1_id, m.team2_id);
  UPDATE teams SET win_percentage = CASE WHEN coalesce(matches_played,0) > 0 THEN round(wins::numeric*100/matches_played, 2) ELSE 0 END
  WHERE id IN (m.team1_id, m.team2_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_match_stats(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Atomic import. mode: 'new' or 'update' (replaces existing match _existing_id)
CREATE OR REPLACE FUNCTION public.import_scorecard(_payload jsonb, _mode text DEFAULT 'new', _existing_id uuid DEFAULT NULL, _import_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mj jsonb := _payload->'match'; mid uuid; r jsonb; title text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can import scorecards'; END IF;
  IF mj IS NULL OR coalesce(mj->>'match_date','') = '' THEN RAISE EXCEPTION 'Match date is required'; END IF;
  PERFORM set_config('app.bulk_import', 'on', true);

  IF _mode = 'update' AND _existing_id IS NOT NULL THEN
    PERFORM apply_match_stats(_existing_id, -1);
    DELETE FROM match_batting WHERE match_id = _existing_id;
    DELETE FROM match_bowling WHERE match_id = _existing_id;
    DELETE FROM match_fielding WHERE match_id = _existing_id;
    mid := _existing_id;
    UPDATE matches SET match_date=(mj->>'match_date')::date, title=mj->>'title', venue=mj->>'venue', tournament=mj->>'tournament',
      format=mj->>'format', overs_limit=nullif(mj->>'overs_limit','')::int,
      team1_id=nullif(mj->>'team1_id','')::uuid, team2_id=nullif(mj->>'team2_id','')::uuid,
      toss_winner_id=nullif(mj->>'toss_winner_id','')::uuid, toss_decision=mj->>'toss_decision',
      winner_id=nullif(mj->>'winner_id','')::uuid, result=mj->>'result', target=nullif(mj->>'target','')::int,
      team1_runs=nullif(mj->>'team1_runs','')::int, team1_wickets=nullif(mj->>'team1_wickets','')::int, team1_balls=nullif(mj->>'team1_balls','')::int,
      team2_runs=nullif(mj->>'team2_runs','')::int, team2_wickets=nullif(mj->>'team2_wickets','')::int, team2_balls=nullif(mj->>'team2_balls','')::int,
      import_id=coalesce(_import_id, import_id)
    WHERE id = mid;
  ELSE
    INSERT INTO matches (match_date,title,venue,tournament,format,overs_limit,team1_id,team2_id,toss_winner_id,toss_decision,winner_id,result,target,
      team1_runs,team1_wickets,team1_balls,team2_runs,team2_wickets,team2_balls,import_id,created_by)
    VALUES ((mj->>'match_date')::date, mj->>'title', mj->>'venue', mj->>'tournament', mj->>'format', nullif(mj->>'overs_limit','')::int,
      nullif(mj->>'team1_id','')::uuid, nullif(mj->>'team2_id','')::uuid, nullif(mj->>'toss_winner_id','')::uuid, mj->>'toss_decision',
      nullif(mj->>'winner_id','')::uuid, mj->>'result', nullif(mj->>'target','')::int,
      nullif(mj->>'team1_runs','')::int, nullif(mj->>'team1_wickets','')::int, nullif(mj->>'team1_balls','')::int,
      nullif(mj->>'team2_runs','')::int, nullif(mj->>'team2_wickets','')::int, nullif(mj->>'team2_balls','')::int, _import_id, auth.uid())
    RETURNING id INTO mid;
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'batting','[]')) LOOP
    INSERT INTO match_batting (match_id,player_id,team_id,position,runs,balls,fours,sixes,dismissal,not_out)
    VALUES (mid,(r->>'player_id')::uuid,nullif(r->>'team_id','')::uuid,nullif(r->>'position','')::int,
      greatest(0,coalesce((r->>'runs')::int,0)),greatest(0,coalesce((r->>'balls')::int,0)),greatest(0,coalesce((r->>'fours')::int,0)),
      greatest(0,coalesce((r->>'sixes')::int,0)),r->>'dismissal',coalesce((r->>'not_out')::boolean,false));
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'bowling','[]')) LOOP
    INSERT INTO match_bowling (match_id,player_id,team_id,balls,maidens,runs,wickets,wides,no_balls)
    VALUES (mid,(r->>'player_id')::uuid,nullif(r->>'team_id','')::uuid,greatest(0,coalesce((r->>'balls')::int,0)),
      greatest(0,coalesce((r->>'maidens')::int,0)),greatest(0,coalesce((r->>'runs')::int,0)),greatest(0,coalesce((r->>'wickets')::int,0)),
      greatest(0,coalesce((r->>'wides')::int,0)),greatest(0,coalesce((r->>'no_balls')::int,0)));
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'fielding','[]')) LOOP
    INSERT INTO match_fielding (match_id,player_id,catches,run_outs,stumpings)
    VALUES (mid,(r->>'player_id')::uuid,greatest(0,coalesce((r->>'catches')::int,0)),greatest(0,coalesce((r->>'run_outs')::int,0)),greatest(0,coalesce((r->>'stumpings')::int,0)));
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(_payload->'aliases','[]')) LOOP
    INSERT INTO player_aliases (player_id, alias, alias_normalized)
    VALUES ((r->>'player_id')::uuid, r->>'alias', lower(regexp_replace(r->>'alias','[^a-zA-Z0-9]+',' ','g')))
    ON CONFLICT (alias_normalized) DO UPDATE SET player_id = EXCLUDED.player_id;
  END LOOP;

  PERFORM apply_match_stats(mid, 1);

  IF _import_id IS NOT NULL THEN
    UPDATE ocr_imports SET status='imported', match_id=mid, reviewed=_payload WHERE id=_import_id;
  END IF;

  title := coalesce(nullif(mj->>'title',''), 'A new match');
  INSERT INTO notifications (user_id, title, message, type, related_id)
  SELECT p.id, 'Match Imported', title || ' scorecard added — stats updated', 'stats', mid FROM profiles p;
  RETURN mid;
END $$;
REVOKE EXECUTE ON FUNCTION public.import_scorecard(jsonb, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_scorecard(jsonb, text, uuid, uuid) TO authenticated;
