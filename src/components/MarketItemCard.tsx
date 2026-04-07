import { motion } from 'framer-motion';
import { PlusCircle, Scale, TrendingDown, TrendingUp, Minus, Info, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { getFoodImage } from '@/lib/food-images';
import { getItemTip } from '@/lib/nutrition-tips';

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
  itemId?: string;
}

const PES_CONFIG = {
  green: {
    gradient: 'from-green-500/8 via-green-500/3 to-transparent',
    badge: 'bg-green-500/15 text-green-700 border-green-500/20',
    dot: 'bg-green-500',
    label: 'Great Value',
  },
  yellow: {
    gradient: 'from-amber-500/8 via-amber-500/3 to-transparent',
    badge: 'bg-amber-500/15 text-amber-700 border-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Moderate',
  },
  red: {
    gradient: 'from-red-500/8 via-red-500/3 to-transparent',
    badge: 'bg-red-500/15 text-red-700 border-red-500/20',
    dot: 'bg-red-500',
    label: 'Expensive',
  },
};

function getNutritionInsight(protein: number, calories: number, costPerGram: number, isVeg: boolean): string | null {
  if (protein >= 25 && costPerGram < 15) return '💎 High protein, great value';
  if (protein >= 20) return '💪 Excellent protein source';
  if (calories < 50 && isVeg) return '🍃 Low-calorie superfood';
  if (costPerGram < 5) return '🏆 Top budget protein pick';
  if (protein >= 15) return '✨ Good protein source';
  return null;
}

export default function MarketItemCard({
  rank, name, emoji, price, unit, protein, calories, costPerGram, pesColor, pes, priceChange, servingDesc, isVeg, isCompareSelected, badge, badgeCity, onTap, onAddToPlan, onToggleCompare, index, itemId
}: MarketItemCardProps) {
  const [showTip, setShowTip] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const config = PES_CONFIG[pesColor];
  const insight = getNutritionInsight(protein, calories, costPerGram, isVeg);
  const imageUrl = itemId ? getFoodImage(itemId) : null;
  const tip = itemId ? getItemTip(itemId) : null;

  const badgeEl = badge === 'popular' ? (
    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-primary/15 text-primary animate-pulse">
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

  const TrendIcon = priceChange && priceChange > 0 ? TrendingUp : priceChange && priceChange < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.3 }}
      className="relative"
    >
      <button
        onClick={onTap}
        className={`w-full flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${config.gradient} border text-left transition-all duration-200 active:scale-[0.99] ${
          isCompareSelected ? 'border-primary/40 shadow-md shadow-primary/5' : 'border-border/60 hover:border-primary/20 hover:shadow-sm'
        }`}
      >
        {/* Image/Emoji area with rank badge */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-sm overflow-hidden">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={name}
                  loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
                {!imgLoaded && <span className="text-[28px] absolute">{emoji}</span>}
              </>
            ) : (
              <span className="text-[28px]">{emoji}</span>
            )}
          </div>
          <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-muted-foreground">
            {rank}
          </span>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-sm border-2 border-background ${
            isVeg ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-bold text-foreground truncate max-w-[140px]">{name}</p>
            {badgeEl}
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-foreground">
              ₹{price}
              <span className="text-[10px] font-normal text-muted-foreground">/{unit}</span>
            </span>
            {priceChange !== undefined && priceChange !== 0 && (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                  priceChange > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'
                }`}
              >
                <TrendIcon className="w-2.5 h-2.5" />
                {Math.abs(priceChange)}%
              </motion.span>
            )}
          </div>

          {/* Nutrition row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-foreground/80">
              💪 {protein}g
            </span>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] text-muted-foreground">🔥 {calories} cal</span>
            <span className="text-[10px] text-muted-foreground/50">·</span>
            <span className="text-[10px] text-muted-foreground">{servingDesc}</span>
          </div>

          {/* Cost per gram protein + tip toggle */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/60 text-[9px] font-semibold text-foreground/70">
              ₹{costPerGram}/g protein
            </span>
            {(insight || tip) && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowTip(!showTip); }}
                className="text-muted-foreground/50 hover:text-primary transition-colors"
              >
                {tip ? <Lightbulb className="w-3 h-3" /> : <Info className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Nutrition tip / insight tooltip */}
          {showTip && (tip || insight) && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-[9px] text-primary font-medium mt-1 leading-relaxed"
            >
              {tip || insight}
            </motion.p>
          )}
        </div>

        {/* Right column: PES + Actions */}
        <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: Math.min(index * 0.03 + 0.1, 0.35), type: 'spring', stiffness: 300 }}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${config.badge}`}
          >
            PES {pes}
          </motion.div>

          <div className="flex gap-1.5">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onAddToPlan}
              className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              title="Add to Meal Plan"
            >
              <PlusCircle className="w-3.5 h-3.5 text-primary" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onToggleCompare}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                isCompareSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/80 text-muted-foreground hover:bg-muted'
              }`}
              title="Compare"
            >
              <Scale className="w-3 h-3" />
            </motion.button>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
