import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  audience: 'user' | 'admin' | 'brand';
  brand_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  link_url: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetches notifications for the current user, scoped by audience.
 * Audience filter is applied at the RLS layer too.
 */
export function useNotifications(audience: 'user' | 'admin' | 'brand' = 'user') {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('audience', audience)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [user, audience]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notifications-${audience}-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, audience, load]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return { items, unreadCount, loading, markRead, markAllRead, reload: load };
}
