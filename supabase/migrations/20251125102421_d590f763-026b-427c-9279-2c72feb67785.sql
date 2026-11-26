-- Enable realtime for stats and announcements tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.batting_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bowling_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;