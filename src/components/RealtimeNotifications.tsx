import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp, Trophy, Megaphone } from 'lucide-react';

export const RealtimeNotifications = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to batting_stats changes
    const battingChannel = supabase
      .channel(`batting-stats-changes-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batting_stats'
        },
        async (payload) => {
          const playerId = (payload.new as any)?.player_id || (payload.old as any)?.player_id;
          
          // Fetch player name
          const { data: player } = await supabase
            .from('players')
            .select('name')
            .eq('id', playerId)
            .single();

          const playerName = player?.name || 'A player';
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            toast.success(`Batting stats updated for ${playerName}`, {
              icon: <TrendingUp className="w-4 h-4" />,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to bowling_stats changes
    const bowlingChannel = supabase
      .channel(`bowling-stats-changes-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bowling_stats'
        },
        async (payload) => {
          const playerId = (payload.new as any)?.player_id || (payload.old as any)?.player_id;
          
          // Fetch player name
          const { data: player } = await supabase
            .from('players')
            .select('name')
            .eq('id', playerId)
            .single();

          const playerName = player?.name || 'A player';
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            toast.success(`Bowling stats updated for ${playerName}`, {
              icon: <Trophy className="w-4 h-4" />,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to announcements changes
    const announcementsChannel = supabase
      .channel(`announcements-changes-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.info('New announcement posted!', {
              icon: <Megaphone className="w-4 h-4" />,
              description: (payload.new as any)?.title,
              duration: 6000,
            });
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Announcement updated', {
              icon: <Megaphone className="w-4 h-4" />,
              description: (payload.new as any)?.title,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(battingChannel);
      supabase.removeChannel(bowlingChannel);
      supabase.removeChannel(announcementsChannel);
    };
  }, [userId]);

  return null;
};
