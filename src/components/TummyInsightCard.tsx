import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { getTodayKey } from '@/lib/store';

const TIPS = [
  { emoji: '🥦', title: 'Fiber First', text: 'Start meals with fiber-rich foods like dal, sabzi, or salad to reduce bloating and improve digestion.' },
  { emoji: '🧂', title: 'Watch Sodium', text: 'Excess salt causes water retention. Skip papad, pickles, and packaged snacks to reduce puffiness.' },
  { emoji: '🚶', title: 'Post-Meal Walk', text: 'A 10-minute walk after lunch and dinner stabilizes blood sugar and reduces belly bloating.' },
  { emoji: '🫘', title: 'FODMAP Awareness', text: 'Some foods like rajma, chole, and raw onions cause gas. Soak legumes well and cook thoroughly.' },
  { emoji: '💧', title: 'Hydrate Smart', text: 'Drink water between meals, not during. This prevents diluting digestive enzymes and reduces bloating.' },
  { emoji: '🍵', title: 'Jeera Water', text: 'Morning jeera water stimulates digestive enzymes and acts as a mild diuretic to reduce water weight.' },
  { emoji: '🧘', title: 'Stress & Cortisol', text: 'High stress increases cortisol, which promotes visceral fat storage. Try 5 minutes of deep breathing daily.' },
];

export default function TummyInsightCard() {
  const dismissKey = `nutrilens_tummy_dismiss_${getTodayKey()}`;
  const [dismissed, setDismissed] = useState(() => !!scopedGet(dismissKey));

  if (dismissed) return null;

  // Rotate tip based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tip = TIPS[dayOfYear % TIPS.length];

  const handleDismiss = () => {
    scopedSet(dismissKey, '1');
    setDismissed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-foreground">Tummy Insight</p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-2xl">{tip.emoji}</span>
        <div>
          <p className="text-xs font-semibold text-foreground">{tip.title}</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{tip.text}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-border" />
        <p className="text-[8px] text-muted-foreground">Hard belly = visceral fat · Fluctuating belly = bloating</p>
        <div className="flex-1 h-px bg-border" />
      </div>
    </motion.div>
  );
}
