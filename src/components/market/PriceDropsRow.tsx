import { motion } from 'framer-motion';
import { TrendingDown } from 'lucide-react';

interface PriceDropItem {
  name: string;
  emoji: string;
  price: number;
  unit: string;
  dropPercent: number;
}

interface PriceDropsRowProps {
  items: PriceDropItem[];
  onItemTap: (name: string) => void;
}

export default function PriceDropsRow({ items, onItemTap }: PriceDropsRowProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <TrendingDown className="w-4 h-4 text-green-500" />
        <h2 className="text-xs font-bold text-foreground">Price Drops This Week</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {items.map((item, i) => (
          <motion.button
            key={item.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onItemTap(item.name)}
            className="flex-shrink-0 p-3 rounded-xl bg-green-500/5 border border-green-500/15 hover:border-green-500/30 transition-all min-w-[110px] text-center"
          >
            <span className="text-2xl block mb-1">{item.emoji}</span>
            <p className="text-[11px] font-semibold text-foreground truncate">{item.name.split('(')[0].trim()}</p>
            <p className="text-[11px] font-bold text-foreground mt-0.5">₹{item.price}<span className="text-[9px] font-normal text-muted-foreground">/{item.unit}</span></p>
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-green-500/15 text-green-600"
            >
              ↓ {item.dropPercent}% off
            </motion.span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
