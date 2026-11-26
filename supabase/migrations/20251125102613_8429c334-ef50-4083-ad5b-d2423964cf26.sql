-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('stats', 'announcement')),
  related_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to create notifications for all authenticated users
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
    
    -- Create notification for all authenticated users
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      ur.user_id,
      notification_title,
      notification_message,
      'stats',
      NEW.player_id
    FROM public.user_roles ur;
    
  -- For bowling stats updates
  ELSIF TG_TABLE_NAME = 'bowling_stats' THEN
    -- Get player name
    SELECT name INTO player_name FROM public.players WHERE id = NEW.player_id;
    
    notification_title := 'Bowling Stats Updated';
    notification_message := 'Stats updated for ' || COALESCE(player_name, 'a player');
    
    -- Create notification for all authenticated users
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      ur.user_id,
      notification_title,
      notification_message,
      'stats',
      NEW.player_id
    FROM public.user_roles ur;
    
  -- For announcements
  ELSIF TG_TABLE_NAME = 'announcements' THEN
    notification_title := 'New Announcement';
    notification_message := NEW.title;
    
    -- Create notification for all authenticated users
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    SELECT 
      ur.user_id,
      notification_title,
      notification_message,
      'announcement',
      NEW.id
    FROM public.user_roles ur;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for batting_stats
CREATE TRIGGER notify_batting_stats_update
AFTER INSERT OR UPDATE ON public.batting_stats
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users();

-- Create triggers for bowling_stats
CREATE TRIGGER notify_bowling_stats_update
AFTER INSERT OR UPDATE ON public.bowling_stats
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users();

-- Create triggers for announcements
CREATE TRIGGER notify_announcements_insert
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_all_users();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;