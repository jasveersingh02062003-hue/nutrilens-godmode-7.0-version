import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Smartphone, CreditCard, Building2, Wallet, Lock, X, ShieldCheck, Sparkles } from 'lucide-react';
import TestModeBadge from './TestModeBadge';
import PaymentProcessing from './PaymentProcessing';
import PaymentSuccessScreen from './PaymentSuccessScreen';
import { listSavedMethods, saveMockMethod, type SavedPaymentMethod, maskUpi } from '@/lib/mock-payment-methods';
import { mockSubscribe, refreshPlan } from '@/lib/subscription-service';
import { isPaddleConfigured, openPaddleCheckout } from '@/lib/paddle';
import { supabase } from '@/integrations/supabase/client';
import { logEvent } from '@/lib/events';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  amountPaise: number;
  durationDays: number;
  planLabel: string;
  /** Human-readable Paddle price id; required when Paddle is configured. */
  priceId?: 'premium_monthly' | 'premium_yearly' | 'ultra_monthly';
  onSuccess: () => void;
}

type Stage = 'pick' | 'upi-input' | 'processing' | 'success';

interface ReceiptData {
  id: string;
  amount_inr: number;
  period_end: string;
  display_name: string;
}

const UPI_APPS = [
  { id: 'gpay', label: 'Google Pay', emoji: '🟦', recommended: true },
  { id: 'phonepe', label: 'PhonePe', emoji: '🟪' },
  { id: 'paytm', label: 'Paytm', emoji: '🟦' },
];

export default function PaymentMethodSheet({ open, onClose, amountPaise, durationDays, planLabel, priceId, onSuccess }: Props) {
  const paddleMode = isPaddleConfigured() && !!priceId;

  async function handlePaddleCheckout() {
    if (!priceId) return;
    void logEvent({ name: 'subscribe_started', properties: { priceId, amount_paise: amountPaise, gateway: 'paddle' } });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      let succeeded = false;
      await openPaddleCheckout({
        priceId,
        customerEmail: user?.email,
        userId: user?.id,
        onSuccess: async () => {
          succeeded = true;
          // Webhook will flip the DB; refresh the cache.
          await refreshPlan();
          toast.success('Payment successful! Welcome to Pro.');
          onSuccess();
        },
        onClose: () => {
          // Fires whether the user closed the overlay or completed it. If we
          // never saw `checkout.completed`, treat it as abandonment.
          if (!succeeded) {
            void logEvent({ name: 'subscribe_failed', properties: { priceId, reason: 'user_closed', gateway: 'paddle' } });
          }
        },
      });
    } catch (e) {
      console.error('[paddle] checkout failed', e);
      void logEvent({ name: 'subscribe_failed', properties: { priceId, reason: 'open_error', gateway: 'paddle', error: e instanceof Error ? e.message : String(e) } });
      toast.error('Could not open checkout. Please try again.');
    }
  }

  const [stage, setStage] = useState<Stage>('pick');
  const [saved, setSaved] = useState<SavedPaymentMethod[]>([]);
  const [upiInput, setUpiInput] = useState('');
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (!open) return;
    setStage('pick');
    setUpiInput('');
    setReceipt(null);
    void listSavedMethods().then(setSaved);
  }, [open]);

  const amountRupees = (amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  async function runMockCharge(opts: { type: 'upi' | 'card' | 'netbanking' | 'wallet'; display: string; persist?: boolean }) {
    setStage('processing');
    // Realistic 2.5s delay so the spinner doesn't feel fake
    await new Promise((r) => setTimeout(r, 2500));
    const ok = await mockSubscribe('premium', durationDays, {
      payment_method_type: opts.type,
      payment_method_display: opts.display,
      amount_paise: amountPaise,
    });
    if (!ok) {
      toast.error('Payment could not be completed. Please try again.');
      setStage('pick');
      return;
    }
    if (opts.persist) {
      void saveMockMethod({ type: opts.type, display_name: opts.display });
    }
    const periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    setReceipt({
      id: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      amount_inr: Math.round(amountPaise / 100),
      period_end: periodEnd.toISOString(),
      display_name: opts.display,
    });
    setStage('success');
  }

  function handleUpiAppPick(appLabel: string) {
    void runMockCharge({ type: 'upi', display: `UPI · ${appLabel}`, persist: true });
  }

  function handleUpiSubmit() {
    const vpa = upiInput.trim();
    if (!/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(vpa)) {
      toast.error('Enter a valid UPI ID (e.g. name@bank)');
      return;
    }
    void runMockCharge({ type: 'upi', display: `UPI · ${maskUpi(vpa)}`, persist: true });
  }

  function handleSavedPick(m: SavedPaymentMethod) {
    void runMockCharge({ type: m.type, display: m.display_name });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && stage !== 'processing' && onClose()}>
      <SheetContent side="bottom" className="h-[92dvh] p-0 rounded-t-3xl border-none">
        <AnimatePresence mode="wait" initial={false}>
          {stage === 'processing' && (
            <PaymentProcessing key="proc" amountRupees={amountRupees} planLabel={planLabel} />
          )}

          {stage === 'success' && receipt && (
            <PaymentSuccessScreen
              key="success"
              receipt={receipt}
              planLabel={planLabel}
              durationDays={durationDays}
              onDone={() => {
                onSuccess();
              }}
            />
          )}

          {(stage === 'pick' || stage === 'upi-input') && (
            <motion.div
              key={stage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col bg-background"
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-border flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-foreground">Pay ₹{amountRupees}</p>
                    <TestModeBadge />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{planLabel}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center" aria-label="Close">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>

              {stage === 'upi-input' ? (
                <div className="flex-1 overflow-y-auto px-5 py-5">
                  <button onClick={() => setStage('pick')} className="text-xs text-primary font-semibold mb-4">
                    ← Back
                  </button>
                  <h3 className="text-base font-bold text-foreground mb-1">Enter your UPI ID</h3>
                  <p className="text-xs text-muted-foreground mb-4">We'll send a collect request to this UPI ID</p>
                  <input
                    autoFocus
                    value={upiInput}
                    onChange={(e) => setUpiInput(e.target.value.toLowerCase())}
                    placeholder="yourname@bank"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={handleUpiSubmit}
                    className="w-full mt-4 py-3.5 rounded-full font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                      color: 'hsl(var(--primary-foreground))',
                    }}
                  >
                    Verify and Pay ₹{amountRupees}
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                  {/* Paddle real checkout — only when configured */}
                  {paddleMode && (
                    <Section title="Secure checkout" subtitle="Recommended">
                      <button
                        onClick={handlePaddleCheckout}
                        className="w-full flex items-center gap-3 px-3.5 py-3.5 active:bg-muted/50 transition-colors text-left"
                      >
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-primary-foreground"
                          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' }}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">Pay with card / UPI</span>
                            <Sparkles className="w-3 h-3 text-primary" />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Secure checkout · Cards, UPI, wallets, net banking
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </Section>
                  )}

                  {/* Saved */}
                  {saved.length > 0 && (
                    <Section title="Saved methods">
                      {saved.map((m) => (
                        <Row
                          key={m.id}
                          icon={iconForType(m.type)}
                          label={m.display_name}
                          onClick={() => handleSavedPick(m)}
                        />
                      ))}
                    </Section>
                  )}

                  {/* UPI */}
                  <Section title="UPI" subtitle="Recommended · Instant">
                    {UPI_APPS.map((app) => (
                      <Row
                        key={app.id}
                        emoji={app.emoji}
                        label={app.label}
                        badge={app.recommended ? 'Recommended' : undefined}
                        onClick={() => handleUpiAppPick(app.label)}
                      />
                    ))}
                    <Row
                      icon={<Smartphone className="w-4 h-4" />}
                      label="Enter UPI ID"
                      onClick={() => setStage('upi-input')}
                    />
                  </Section>

                  {/* Cards */}
                  <Section title="Cards">
                    <Row
                      icon={<CreditCard className="w-4 h-4" />}
                      label="Add Debit / Credit Card"
                      onClick={() => runMockCharge({ type: 'card', display: 'Card · ****1234', persist: true })}
                    />
                  </Section>

                  {/* NetBanking */}
                  <Section title="Net Banking">
                    <Row
                      icon={<Building2 className="w-4 h-4" />}
                      label="HDFC Bank"
                      onClick={() => runMockCharge({ type: 'netbanking', display: 'HDFC Bank', persist: true })}
                    />
                    <Row
                      icon={<Building2 className="w-4 h-4" />}
                      label="ICICI Bank"
                      onClick={() => runMockCharge({ type: 'netbanking', display: 'ICICI Bank', persist: true })}
                    />
                    <Row
                      icon={<Building2 className="w-4 h-4" />}
                      label="Other banks"
                      onClick={() => runMockCharge({ type: 'netbanking', display: 'NetBanking', persist: false })}
                    />
                  </Section>

                  {/* Wallets */}
                  <Section title="Wallets">
                    <Row
                      icon={<Wallet className="w-4 h-4" />}
                      label="Amazon Pay"
                      onClick={() => runMockCharge({ type: 'wallet', display: 'Amazon Pay', persist: true })}
                    />
                    <Row
                      icon={<Wallet className="w-4 h-4" />}
                      label="Mobikwik"
                      onClick={() => runMockCharge({ type: 'wallet', display: 'Mobikwik', persist: true })}
                    />
                  </Section>

                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground pt-2 pb-4">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px]">256-bit encrypted · Powered by NutriLens</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function iconForType(t: SavedPaymentMethod['type']) {
  if (t === 'upi') return <Smartphone className="w-4 h-4" />;
  if (t === 'card') return <CreditCard className="w-4 h-4" />;
  if (t === 'netbanking') return <Building2 className="w-4 h-4" />;
  return <Wallet className="w-4 h-4" />;
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 px-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
        {subtitle && <p className="text-[10px] text-primary font-semibold">{subtitle}</p>}
      </div>
      <div className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

function Row({
  icon,
  emoji,
  label,
  badge,
  onClick,
}: {
  icon?: React.ReactNode;
  emoji?: string;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-3 active:bg-muted/50 transition-colors text-left"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        {emoji ? <span className="text-base leading-none">{emoji}</span> : icon}
      </div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {badge && (
        <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
