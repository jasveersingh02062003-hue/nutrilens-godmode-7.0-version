import { motion } from 'framer-motion';
import { getCityPrice, MARKET_ITEMS } from '@/lib/market-data';
import { useMemo, useState } from 'react';
import { getFoodImage } from '@/lib/food-images';

interface QuickActionsRowProps {
  city: string;
  onItemTap: (name: string) => void;
}

const QUICK_ITEMS = ['mk_egg_white', 'mk_chicken_breast', 'mk_milk_toned', 'mk_paneer', 'mk_banana', 'mk_moong_dal'];

function FadeImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

export default function QuickActionsRow({ city, onItemTap }: QuickActionsRowProps) {
  const items = useMemo(() => {
    return QUICK_ITEMS.map(id => {
      const item = MARKET_ITEMS.find(i => i.id === id);
      if (!item) return null;
      const price = getCityPrice(item.basePrice, city);
      return { ...item, cityPrice: price };
    }).filter(Boolean) as any[];
  }, [city]);

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-bold text-foreground px-1">⚡ Quick Browse</h2>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {items.map((item, i) => {
          const imageUrl = getFoodImage(item.id);
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
              {imageUrl ? (
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <FadeImage src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <span className="text-xl">{item.emoji}</span>
              )}
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
