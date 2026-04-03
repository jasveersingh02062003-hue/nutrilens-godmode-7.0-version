import { scopedGet, scopedSet } from '@/lib/scoped-storage';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const CAROUSEL = [
  { name: 'Soya Chunks', price: 6, protein: 26, pes: 4.33, color: 'hsl(var(--primary))' },
  { name: 'Eggs (2)', price: 12, protein: 12, pes: 1.0, color: 'hsl(var(--primary))' },
  { name: 'Paneer (100g)', price: 40, protein: 18, pes: 0.45, color: 'hsl(45, 93%, 47%)' },
  { name: 'Pizza (1 slice)', price: 100, protein: 10, pes: 0.10, color: 'hsl(0, 84%, 60%)' },
];

interface Props {
  onDismiss: () => void;
}

export default function PESExplanationCard({ onDismiss }: Props) {
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCarouselIdx(p => (p + 1) % CAROUSEL.length), 2500);
    return () => clearInterval(t);
  }, []);

  const item = CAROUSEL[carouselIdx];

  const handleDismiss = () => {
    scopedSet('pes_explanation_seen', 'true');
    onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-card/95 backdrop-blur-xl border-t border-border p-6 pb-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">Food Value Intelligence</h3>
          <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          We calculate how much protein you get for every rupee you spend. This is your{' '}
          <span className="font-bold text-foreground">Protein Efficiency Score (PES)</span>.
        </p>

        {/* Thresholds */}
        <div className="space-y-2.5 mb-5">
          {[
            { color: 'bg-green-500', label: 'Green ≥ 0.8', desc: 'Excellent value. Best for your budget.' },
            { color: 'bg-amber-500', label: 'Yellow 0.4–0.8', desc: 'Average. Can be improved.' },
            { color: 'bg-red-500', label: 'Red < 0.4', desc: "Poor value. You're paying too much." },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${t.color} shrink-0`} />
              <div>
                <span className="text-xs font-bold text-foreground">{t.label}</span>
                <span className="text-xs text-muted-foreground ml-1.5">{t.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Carousel example */}
        <AnimatePresence mode="wait">
          <motion.div
            key={carouselIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl bg-muted/50 border border-border p-3 mb-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">{item.name}</span>
              <span className="text-lg font-black" style={{ color: item.color }}>
                {item.pes.toFixed(2)}/₹
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ₹{item.price} → {item.protein}g protein
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Testimonial */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 mb-6">
          <p className="text-xs text-foreground/80 italic leading-relaxed">
            "I saved ₹2000 this month just by swapping paneer for soya. And I hit my protein goal!"
          </p>
          <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">— Priya, Delhi</p>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDismiss}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold"
        >
          Got it, let's go!
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
