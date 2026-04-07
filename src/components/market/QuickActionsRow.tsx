import { motion } from 'framer-motion';
import { getCityPrice, MARKET_ITEMS } from '@/lib/market-data';
import { useMemo } from 'react';
import MarketImage from '@/components/market/MarketImage';
import { useMarket } from '@/contexts/MarketContext';

interface QuickActionsRowProps {
  city: string;
  onItemTap: (name: string) => void;
}

const QUICK_ITEMS = ['mk_egg_white', 'mk_chicken_breast', 'mk_milk_toned', 'mk_paneer', 'mk_banana', 'mk_moong_dal'];

export default function QuickActionsRow({ city, onItemTap }: QuickActionsRowProps) {
  const { vegOnly } = useMarket();

  const items = useMemo(() => {
    return QUICK_ITEMS.map(id => {
      const item = MARKET_ITEMS.find(i => i.id === id);
      if (!item) return null;
      if (vegOnly && !item.isVeg) return null;
      const price = getCityPrice(item.basePrice, city);
      return { ...item, cityPrice: price };
    }).filter(Boolean) as any[];
  }, [city, vegOnly]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-bold text-foreground px-1">Quick Browse</h2>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {items.map((item, i) => {
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onItemTap(item.name)}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all shadow-sm"
            >
              <MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" />
              <div className="text-left">
                <p className="text-[11px] font-semibold text-foreground whitespace-nowrap">{item.name.split('(')[0].trim()}</p>
                <p className="text-[10px] font-bold text-primary">₹{item.cityPrice}<span className="text-muted-foreground font-normal">/{item.unit}</span></p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
