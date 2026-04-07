import { motion } from 'framer-motion';
import { Flame, Wallet, ArrowRight, RefreshCw } from 'lucide-react';

interface SmartItem {
  name: string;
  emoji: string;
  price: number;
  unit: string;
  protein: number;
  costPerGram: number;
}

interface MarketSmartSectionsProps {
  budgetPicks: SmartItem[];
  comparePair: { a: SmartItem; b: SmartItem } | null;
  onItemTap?: (name: string) => void;
}

export default function MarketSmartSections({ budgetPicks, comparePair, onItemTap }: MarketSmartSectionsProps) {
  return (
    <div className="space-y-4">
      {/* Budget Hero Picks */}
      {budgetPicks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Wallet className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Budget Hero Picks — Under ₹100</h3>
          </div>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1">
            {budgetPicks.map((item, i) => (
              <motion.button
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onItemTap?.(item.name)}
                className="flex-shrink-0 w-36 p-3 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors text-left"
              >
                <span className="text-2xl">{item.emoji}</span>
                <p className="text-[11px] font-bold text-foreground mt-2 truncate">{item.name}</p>
                <p className="text-sm font-semibold text-foreground">₹{item.price}<span className="text-[9px] font-normal text-muted-foreground">/{item.unit}</span></p>
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-primary font-semibold">{item.protein}g protein</span>
                </div>
                <span className="text-[9px] text-muted-foreground">₹{item.costPerGram}/g</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Compare & Save */}
      {comparePair && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20"
        >
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">Compare & Save</h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Item A */}
            <button
              onClick={() => onItemTap?.(comparePair.a.name)}
              className="flex-1 p-3 rounded-xl bg-card border border-border text-center"
            >
              <span className="text-2xl">{comparePair.a.emoji}</span>
              <p className="text-[11px] font-bold text-foreground mt-1">{comparePair.a.name}</p>
              <p className="text-sm font-semibold text-foreground">₹{comparePair.a.price}/{comparePair.a.unit}</p>
              <p className="text-[10px] text-muted-foreground">{comparePair.a.protein}g protein</p>
            </button>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-primary">VS</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Item B (better value) */}
            <button
              onClick={() => onItemTap?.(comparePair.b.name)}
              className="flex-1 p-3 rounded-xl bg-primary/5 border border-primary/20 text-center"
            >
              <span className="text-2xl">{comparePair.b.emoji}</span>
              <p className="text-[11px] font-bold text-foreground mt-1">{comparePair.b.name}</p>
              <p className="text-sm font-semibold text-primary">₹{comparePair.b.price}/{comparePair.b.unit}</p>
              <p className="text-[10px] text-primary font-semibold">{comparePair.b.protein}g protein</p>
              <p className="text-[9px] text-primary font-bold mt-0.5">
                Save ₹{comparePair.a.price - comparePair.b.price}/{comparePair.a.unit}
              </p>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
