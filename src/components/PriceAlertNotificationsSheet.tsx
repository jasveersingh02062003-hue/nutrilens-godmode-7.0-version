import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, TrendingDown, TrendingUp, Trash2, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface PriceAlertNotification {
  id: string;
  alert_id: string | null;
  item_name: string;
  city: string;
  current_price: number;
  threshold_price: number;
  direction: string;
  is_read: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAfterChange?: () => void;
}

export default function PriceAlertNotificationsSheet({ open, onOpenChange, onAfterChange }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<PriceAlertNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    supabase
      .from('price_alert_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setItems(data as PriceAlertNotification[]);
        setLoading(false);
      });
  }, [open, user]);

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('price_alert_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (!error) {
      setItems(prev => prev.map(n => ({ ...n, is_read: true })));
      onAfterChange?.();
      toast.success('All notifications marked as read');
    }
  };

  const removeOne = async (id: string) => {
    const { error } = await supabase.from('price_alert_notifications').delete().eq('id', id);
    if (!error) {
      setItems(prev => prev.filter(n => n.id !== id));
      onAfterChange?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Price Alerts
          </SheetTitle>
        </SheetHeader>

        {items.some(i => !i.is_read) && (
          <button
            onClick={markAllRead}
            className="w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}

        {loading && <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No price alerts yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Set alerts on Market items to get notified when prices change.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {items.map(n => {
            const Icon = n.direction === 'below' ? TrendingDown : TrendingUp;
            const tone = n.direction === 'below' ? 'text-primary' : 'text-amber-500';
            return (
              <div
                key={n.id}
                className={`relative p-3 rounded-xl border transition-colors ${
                  n.is_read
                    ? 'bg-muted/30 border-border/50'
                    : 'bg-card border-primary/30 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{n.item_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ₹{Number(n.current_price).toFixed(0)} in {n.city} · target ₹{Number(n.threshold_price).toFixed(0)}{' '}
                      {n.direction === 'below' ? 'or less' : 'or more'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={() => removeOne(n.id)}
                    aria-label="Delete notification"
                    className="text-muted-foreground/60 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {!n.is_read && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
