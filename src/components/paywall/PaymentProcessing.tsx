import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface Props {
  amountRupees: string;
  planLabel: string;
}

const STEPS = [
  'Connecting to your bank…',
  'Verifying payment…',
  'Activating Pro features…',
];

export default function PaymentProcessing({ amountRupees, planLabel }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const a = setTimeout(() => setIdx(1), 800);
    const b = setTimeout(() => setIdx(2), 1700);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col items-center justify-center bg-background px-8"
    >
      {/* Spinner */}
      <div className="relative w-20 h-20 mb-6">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-primary/20"
        />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
      </div>

      <p className="text-base font-bold text-foreground">Paying ₹{amountRupees}</p>
      <p className="text-xs text-muted-foreground mt-1">{planLabel}</p>

      <div className="mt-8 space-y-2 w-full max-w-xs">
        {STEPS.map((s, i) => (
          <motion.div
            key={s}
            animate={{ opacity: idx >= i ? 1 : 0.35 }}
            className="flex items-center gap-2"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${idx >= i ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
            <span className={`text-xs ${idx >= i ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
              {s}
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground mt-8 text-center">
        Don't close this screen. This may take a few seconds.
      </p>
    </motion.div>
  );
}
