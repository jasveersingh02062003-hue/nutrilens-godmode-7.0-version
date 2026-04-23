import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, ArrowRight, Sparkles } from 'lucide-react';
import ConfettiCelebration from '@/components/ConfettiCelebration';

interface ReceiptData {
  id: string;
  amount_inr: number;
  period_end: string;
  display_name: string;
}

interface Props {
  receipt: ReceiptData;
  planLabel: string;
  durationDays: number;
  onDone: () => void;
}

export default function PaymentSuccessScreen({ receipt, planLabel, durationDays, onDone }: Props) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate?.([20, 60, 20]); } catch { /* noop */ }
    }
  }, []);

  const renewDate = new Date(receipt.period_end).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col bg-background relative overflow-hidden"
    >
      <ConfettiCelebration show={true} />

      <div className="flex-1 overflow-y-auto px-6 pt-12 pb-32 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-5"
        >
          <CheckCircle2 className="w-12 h-12 text-primary" strokeWidth={2.5} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-display font-bold text-foreground"
        >
          Welcome to NutriLens Pro <span className="inline-block">🎉</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-muted-foreground mt-2 max-w-xs"
        >
          Your free trial has started. You'll be charged ₹{receipt.amount_inr.toLocaleString('en-IN')} on {renewDate}.
        </motion.p>

        {/* Receipt card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-sm mt-6 rounded-2xl bg-card border border-border p-4 text-left"
        >
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Receipt</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{receipt.id}</span>
          </div>
          <Row label="Plan" value={planLabel} />
          <Row label="Amount" value={`₹${receipt.amount_inr.toLocaleString('en-IN')}`} />
          <Row label="Method" value={receipt.display_name} />
          <Row label="Trial ends" value={renewDate} />
          <Row label="Duration" value={`${durationDays} days`} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 flex items-center gap-1.5 text-muted-foreground"
        >
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="text-[11px]">All Pro features unlocked</span>
        </motion.div>
      </div>

      {/* Sticky CTA */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 pb-6">
        <button
          onClick={onDone}
          className="w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          Open my dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] font-semibold text-foreground text-right max-w-[60%]">{value}</span>
    </div>
  );
}
