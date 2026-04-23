import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentEvent {
  id: string;
  created_at: string;
  event_type: string;
  amount_inr: number | null;
  raw_payload: any;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BillingHistorySheet({ open, onClose }: Props) {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from('payment_events')
        .select('id, created_at, event_type, amount_inr, raw_payload')
        .eq('event_type', 'subscribe')
        .order('created_at', { ascending: false })
        .limit(50);
      setEvents((data ?? []) as PaymentEvent[]);
      setLoading(false);
    })();
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[80dvh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="text-base font-display">Billing history</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto" style={{ maxHeight: 'calc(80dvh - 80px)' }}>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Loading…</p>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e) => {
                const method = e.raw_payload?.payment_method_display ?? 'Mock payment';
                const date = new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                return (
                  <div key={e.id} className="rounded-xl bg-card border border-border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">₹{(e.amount_inr ?? 0).toLocaleString('en-IN')}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{method}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{date}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {e.raw_payload?.mock ? 'Test' : 'Paid'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
