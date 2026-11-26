-- Add team statistics and logo columns to teams table
ALTER TABLE public.teams
ADD COLUMN logo_url TEXT,
ADD COLUMN matches_played INTEGER DEFAULT 0,
ADD COLUMN wins INTEGER DEFAULT 0,
ADD COLUMN losses INTEGER DEFAULT 0,
ADD COLUMN win_percentage NUMERIC(5,2) DEFAULT 0.00;

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for team logos
CREATE POLICY "Team logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');

CREATE POLICY "Only admins can upload team logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update team logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete team logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-logos' AND has_role(auth.uid(), 'admin'::app_role));