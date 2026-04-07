import { motion } from 'framer-motion';
import { TrendingDown, Trophy, Zap } from 'lucide-react';

interface HeroItem {
  name: string;
  emoji: string;
  price: number;
  unit: string;
  protein: number;
  costPerGram: number;
  priceChange?: number;
}

interface MarketHeroSectionProps {
  bestValue: HeroItem | null;
  biggestDrop: HeroItem | null;
  city: string;
  onTap?: (name: string) => void;
}

export default function MarketHeroSection({ bestValue, biggestDrop, city, onTap }: MarketHeroSectionProps) {
  if (!bestValue) return null;

  return (
    <div className="space-y-3">
      {/* Best Value Hero */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => onTap?.(bestValue.name)}
        className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 text-left"
      >
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Best Protein Value Today</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">{bestValue.emoji}</span>
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">{bestValue.name}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-semibold text-foreground">₹{bestValue.price}/{bestValue.unit}</span>
              <span className="text-xs text-muted-foreground">💪 {bestValue.protein}g protein</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold text-primary">₹{bestValue.costPerGram}/g protein</span>
              <span className="text-[10px] text-muted-foreground">📍 {city}</span>
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-xl bg-primary/15">
            <Zap className="w-4 h-4 text-primary" />
          </div>
        </div>
      </motion.button>

      {/* Price Drop Alert */}
      {biggestDrop && biggestDrop.priceChange && biggestDrop.priceChange < 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => onTap?.(biggestDrop.name)}
          className="w-full p-3 rounded-2xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-foreground">
                🔥 {biggestDrop.name} dropped {Math.abs(biggestDrop.priceChange)}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                Now ₹{biggestDrop.price}/{biggestDrop.unit} — Buy before price goes up!
              </p>
            </div>
          </div>
        </motion.button>
      )}
    </div>
  );
}
