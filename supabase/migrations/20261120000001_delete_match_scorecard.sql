CREATE OR REPLACE FUNCTION public.delete_match_scorecard(_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete match scorecards' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.matches WHERE id = _match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match scorecard not found' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.apply_match_stats(_match_id, -1);
  DELETE FROM public.matches WHERE id = _match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_match_scorecard(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_match_scorecard(uuid) TO authenticated;