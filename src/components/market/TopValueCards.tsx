import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import MarketImage from '@/components/market/MarketImage';

interface TopValueItem {
  name: string;
  emoji: string;
  price: number;
  unit: string;
  protein: number;
  costPerGram: number;
  pes: number;
  pesColor: 'green' | 'yellow' | 'red';
  priceChange?: number;
  itemId?: string;
}

interface TopValueCardsProps {
  items: TopValueItem[];
  onItemTap: (name: string) => void;
}

export default function TopValueCards({ items, onItemTap }: TopValueCardsProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Trophy className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-bold text-foreground">Today's Best Value</h2>
        <span className="text-[9px] text-muted-foreground ml-auto">Ranked by PES</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {items.slice(0, 3).map((item, i) => {
          const imageUrl = item.itemId ? getFoodImage(item.itemId) : null;
          return (
            <motion.button
              key={item.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 300 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onItemTap(item.name)}
              className="relative p-3 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-all text-center shadow-sm overflow-hidden"
            >
              {/* Rank medal */}
              {i === 0 && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center z-10">
                  <span className="text-[10px]">🥇</span>
                </div>
              )}
              {i === 1 && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-300/20 flex items-center justify-center z-10">
                  <span className="text-[10px]">🥈</span>
                </div>
              )}
              {i === 2 && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-700/20 flex items-center justify-center z-10">
                  <span className="text-[10px]">🥉</span>
                </div>
              )}

              {/* Image or emoji */}
              {imageUrl ? (
                <div className="w-14 h-14 mx-auto rounded-xl overflow-hidden mb-1.5 bg-muted">
                  <FadeImage src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-3xl block mb-1.5">{item.emoji}</span>
              )}

              <p className="text-[11px] font-bold text-foreground truncate">{item.name.split('(')[0].trim()}</p>
              <p className="text-[12px] font-bold text-primary mt-0.5">₹{item.price}<span className="text-[9px] font-normal text-muted-foreground">/{item.unit}</span></p>

              <div className="mt-1.5 flex flex-col items-center gap-0.5">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                  item.pesColor === 'green' ? 'bg-green-500/15 text-green-700'
                  : item.pesColor === 'yellow' ? 'bg-amber-500/15 text-amber-700'
                  : 'bg-red-500/15 text-red-700'
                }`}>
                  PES {item.pes}
                </span>
                <span className="text-[9px] text-muted-foreground">💪 {item.protein}g protein</span>
              </div>

              <div className="mt-1 flex items-center justify-center">
                <span className="text-[8px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                  ₹{item.costPerGram}/g
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
