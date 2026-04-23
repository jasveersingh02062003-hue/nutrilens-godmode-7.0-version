import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Crown, Calendar, CreditCard, FileText, XCircle, ChevronRight, IndianRupee, PauseCircle, PlayCircle } from 'lucide-react';
import {
  onPlanChange, cancelSubscription, pauseSubscription, resumeSubscription,
  type Plan, type SubscriptionStatus,
} from '@/lib/subscription-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BillingHistorySheet from './BillingHistorySheet';
import RetentionOfferScreen from '../RetentionOfferScreen';

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
}

export default function ManageSubscriptionSheet({ open, onClose, onUpgradeClick }: Props) {
  const [plan, setPlan] = useState<Plan>('free');
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [methodLabel, setMethodLabel] = useState<string>('—');
  const [nextChargeAmount, setNextChargeAmount] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showRetention, setShowRetention] = useState(false);
  const [showPausePicker, setShowPausePicker] = useState(false);

  useEffect(() => {
    const off = onPlanChange((p) => {
      setPlan(p.plan);
      setStatus(p.status);
      setPeriodEnd(p.current_period_end);
    });
    return off;
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) return;
      const { data } = await supabase
        .from('payment_events')
        .select('raw_payload, amount_inr')
        .eq('user_id', uid)
        .eq('event_type', 'subscribe')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const display = (data as any)?.raw_payload?.payment_method_display;
      if (display) setMethodLabel(display);
      const amt = (data as any)?.amount_inr;
      if (typeof amt === 'number') setNextChargeAmount(amt);
    })();
  }, [open]);

  async function performCancel() {
    setCancelling(true);
    const ok = await cancelSubscription();
    setCancelling(false);
    setShowRetention(false);
    if (ok) toast.success('Subscription cancelled. You keep Pro until the end of your billing period.');
    else toast.error('Could not cancel. Please try again.');
  }

  async function performPause(days: 7 | 14 | 30) {
    setPausing(true);
    const ok = await pauseSubscription(days);
    setPausing(false);
    setShowPausePicker(false);
    if (ok) toast.success(`Subscription paused for ${days} days. Your billing date moves out by the same amount.`);
    else toast.error('Could not pause. Please try again.');
  }

  async function performResume() {
    setPausing(true);
    const ok = await resumeSubscription();
    setPausing(false);
    if (ok) toast.success('Subscription resumed.');
    else toast.error('Could not resume. Please try again.');
  }

  const renewDate = periodEnd
    ? new Date(periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const isPaused = status === 'paused';

  return (
    <>
      <Sheet open={open && !showRetention} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[85dvh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-base font-display">Manage subscription</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(85dvh - 80px)' }}>
            {/* Plan card */}
            <div
              className="rounded-2xl p-4 text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Current plan</span>
                {isPaused && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-foreground/20">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-xl font-display font-bold capitalize">{plan === 'free' ? 'Free' : `NutriLens ${plan === 'ultra' ? 'Ultra' : 'Pro'}`}</p>
              {plan !== 'free' && periodEnd && (
                <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {isPaused ? 'Resumes on' : 'Renews'} {renewDate}
                </p>
              )}
              {plan !== 'free' && !isPaused && nextChargeAmount !== null && (
                <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
                  <IndianRupee className="w-3 h-3" /> ₹{nextChargeAmount.toLocaleString('en-IN')} on next renewal
                </p>
              )}
            </div>

            {plan === 'free' ? (
              <button
                onClick={() => { onClose(); onUpgradeClick(); }}
                className="w-full py-3.5 rounded-full font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                  color: 'hsl(var(--primary-foreground))',
                }}
              >
                Upgrade to Pro
              </button>
            ) : (
              <>
                <Row icon={<CreditCard className="w-4 h-4" />} label="Payment method" value={methodLabel} />
                <Row
                  icon={<FileText className="w-4 h-4" />}
                  label="Billing history"
                  onClick={() => setShowHistory(true)}
                  showChevron
                />

                {isPaused ? (
                  <button
                    onClick={performResume}
                    disabled={pausing}
                    className="w-full mt-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {pausing ? 'Resuming…' : 'Resume subscription'}
                  </button>
                ) : showPausePicker ? (
                  <div className="mt-2 rounded-xl border border-border bg-card p-3">
                    <p className="text-xs font-semibold text-foreground mb-2">Pause for how long?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => performPause(d as 7 | 14 | 30)}
                          disabled={pausing}
                          className="py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold disabled:opacity-50"
                        >
                          {d} days
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowPausePicker(false)}
                      className="w-full mt-2 text-[11px] text-muted-foreground"
                    >
                      Never mind
                    </button>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Your billing date moves out by the same amount — you don't lose any paid time.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPausePicker(true)}
                    disabled={pausing || cancelling}
                    className="w-full mt-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <PauseCircle className="w-4 h-4" />
                    Pause subscription
                  </button>
                )}

                <button
                  onClick={() => setShowRetention(true)}
                  disabled={cancelling || pausing}
                  className="w-full py-3 rounded-xl border border-border bg-card text-sm font-semibold text-destructive flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                </button>
                <p className="text-[10px] text-muted-foreground text-center px-4">
                  {isPaused
                    ? `Paused — no charges until you resume.`
                    : `You'll keep Pro access until ${renewDate}. No further charges.`}
                </p>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showRetention && (
        <RetentionOfferScreen
          onAccept={() => { setShowRetention(false); onClose(); }}
          onDismiss={performCancel}
        />
      )}

      <BillingHistorySheet open={showHistory} onClose={() => setShowHistory(false)} />
    </>
  );
}

function Row({
  icon, label, value, onClick, showChevron,
}: { icon: React.ReactNode; label: string; value?: string; onClick?: () => void; showChevron?: boolean }) {
  const Inner = (
    <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div className="flex-1 text-left">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {value && <p className="text-[11px] text-muted-foreground mt-0.5">{value}</p>}
      </div>
      {showChevron && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </div>
  );
  return onClick ? <button onClick={onClick} className="w-full text-left">{Inner}</button> : Inner;
}
