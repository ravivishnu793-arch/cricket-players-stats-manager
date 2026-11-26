-- Create profiles table to track all users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- System can insert profiles (for trigger)
CREATE POLICY "System can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Create function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users into profiles table
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Update notify_all_users function to query from profiles instead of user_roles
CREATE OR REPLACE FUNCTION public.notify_all_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  player_name text;
  notification_title text;
  notification_message text;
BEGIN
  -- For batting stats updates
  IF TG_TABLE_NAME = 'batting_stats' THEN
    -- Get player name
    SELECT name INTO player_name FROM public.players WHERE id = NEW.player_id;
    
    notification_title := 'Batting Stats Updated';
    notification_message := 'Stats updated for ' || COALESCE(player_name, 'a player');
    
    -- Create notification for all users (using profiles table)
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      p.id,
      notification_title,
      notification_message,
      'stats',
      NEW.player_id
    FROM public.profiles p;
    
  -- For bowling stats updates
  ELSIF TG_TABLE_NAME = 'bowling_stats' THEN
    -- Get player name
    SELECT name INTO player_name FROM public.players WHERE id = NEW.player_id;
    
    notification_title := 'Bowling Stats Updated';
    notification_message := 'Stats updated for ' || COALESCE(player_name, 'a player');
    
    -- Create notification for all users (using profiles table)
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      p.id,
      notification_title,
      notification_message,
      'stats',
      NEW.player_id
    FROM public.profiles p;
    
  -- For announcements
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    notification_title := 'New Announcement';
    notification_message := NEW.title;
    
    -- Create notification for all users (using profiles table)
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      p.id,
      notification_title,
      notification_message,
      'announcement',
      NEW.id
    FROM public.profiles p;
  END IF;
  
  RETURN NEW;
END;
$$;