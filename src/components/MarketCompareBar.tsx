import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X } from 'lucide-react';
import type { MarketItem } from '@/lib/market-service';

interface MarketCompareBarProps {
  selected: MarketItem[];
  onCompare: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

export default function MarketCompareBar({ selected, onCompare, onClear, onRemove }: MarketCompareBarProps) {
  if (selected.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-lg"
      >
        <div className="rounded-2xl bg-card border border-border shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">{selected.length} selected</span>
            <button onClick={onClear} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          </div>
          <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
            {selected.map(item => (
              <div key={item.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted shrink-0">
                <span className="text-[10px] font-semibold text-foreground truncate max-w-[80px]">{item.name}</span>
                <button onClick={() => onRemove(item.id)}>
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={onCompare}
            disabled={selected.length < 2}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Compare {selected.length} items
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
