import { motion } from 'framer-motion';
import { PlusCircle, Scale } from 'lucide-react';

interface MarketItemCardProps {
  rank: number;
  name: string;
  emoji: string;
  price: number;
  unit: string;
  protein: number;
  calories: number;
  costPerGram: number;
  pesColor: 'green' | 'yellow' | 'red';
  pes: number;
  priceChange?: number;
  servingDesc: string;
  isVeg: boolean;
  isCompareSelected?: boolean;
  badge?: 'popular' | 'best_seller' | 'new' | null;
  badgeCity?: string;
  onTap: () => void;
  onAddToPlan: (e: React.MouseEvent) => void;
  onToggleCompare: (e: React.MouseEvent) => void;
  index: number;
}

export default function MarketItemCard({
  rank, name, emoji, price, unit, protein, calories, costPerGram, pesColor, pes, priceChange, servingDesc, isVeg, isCompareSelected, badge, badgeCity, onTap, onAddToPlan, onToggleCompare, index
}: MarketItemCardProps) {
  const pesGradient = pesColor === 'green'
    ? 'from-green-500/8 to-transparent'
    : pesColor === 'yellow'
    ? 'from-amber-500/8 to-transparent'
    : 'from-red-500/8 to-transparent';

  const pesBg = pesColor === 'green'
    ? 'bg-green-500/15 text-green-700'
    : pesColor === 'yellow'
    ? 'bg-amber-500/15 text-amber-700'
    : 'bg-red-500/15 text-red-700';

  const badgeEl = badge === 'popular' ? (
    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-primary/15 text-primary">
      🔥 Popular{badgeCity ? ` in ${badgeCity}` : ''}
    </span>
  ) : badge === 'best_seller' ? (
    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-amber-500/15 text-amber-700">
      ⭐ Best Seller
    </span>
  ) : badge === 'new' ? (
    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-blue-500/15 text-blue-700">
      🆕 New
    </span>
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="relative"
    >
      <button
        onClick={onTap}
        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${pesGradient} border text-left transition-all duration-200 active:scale-[0.99] ${
          isCompareSelected ? 'border-primary/40 shadow-sm' : 'border-border hover:border-primary/20'
        }`}
      >
        {/* Emoji + Rank */}
        <div className="relative">
          <div className="w-13 h-13 rounded-xl bg-card border border-border flex items-center justify-center">
            <span className="text-2xl">{emoji}</span>
          </div>
          <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
            {rank}
          </span>
          {/* Veg/Non-veg dot */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-sm border border-background ${
            isVeg ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-foreground truncate">{name}</p>
            {badgeEl}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-semibold text-foreground">₹{price}<span className="text-[10px] font-normal text-muted-foreground">/{unit}</span></span>
            {priceChange !== undefined && priceChange !== 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                priceChange > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
              }`}>
                {priceChange > 0 ? '↑' : '↓'}{Math.abs(priceChange)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">💪 {protein}g</span>
            <span className="text-[10px] text-muted-foreground">· 🔥 {calories} kcal</span>
            <span className="text-[10px] text-muted-foreground">· {servingDesc}</span>
          </div>
        </div>

        {/* PES + Cost */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${pesBg}`}>
            PES {pes}
          </span>
          <span className="text-[9px] text-muted-foreground font-medium">₹{costPerGram}/g</span>
          {/* Quick actions */}
          <div className="flex gap-1">
            <button
              onClick={onAddToPlan}
              className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              title="Add to Plan"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </div>
      </button>

      {/* Compare toggle */}
      <button
        onClick={onToggleCompare}
        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
          isCompareSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground hover:bg-muted'
        }`}
      >
        <Scale className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
