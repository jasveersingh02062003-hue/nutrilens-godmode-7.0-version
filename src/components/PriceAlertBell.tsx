import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import PriceAlertNotificationsSheet from './PriceAlertNotificationsSheet';

export default function PriceAlertBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('price_alert_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setUnread(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUnread();

    // Realtime subscription — instant bell update on insert/update/delete
    const channel = supabase
      .channel('price-alert-notifications-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'price_alert_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnread]);

  if (!user) return null;

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        aria-label={`Price alerts${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="relative w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
          >
            {unread > 9 ? '9+' : unread}
          </motion.span>
        )}
      </motion.button>

      <PriceAlertNotificationsSheet
        open={open}
        onOpenChange={setOpen}
        onAfterChange={fetchUnread}
      />
    </>
  );
}
