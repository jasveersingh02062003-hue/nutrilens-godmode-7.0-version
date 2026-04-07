import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp, ShoppingBag, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { getTopMarketItems, type MarketItem } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';

const BANNER_VARIANTS = [
  { key: 'best_value', icon: ShoppingBag, gradient: 'from-primary/10 to-primary/5', border: 'border-primary/20' },
  { key: 'price_drop', icon: TrendingDown, gradient: 'from-green-500/10 to-green-500/5', border: 'border-green-500/20' },
  { key: 'community', icon: Users, gradient: 'from-accent/10 to-accent/5', border: 'border-accent/20' },
];

export default function SmartMarketBanner() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const city = (profile as any)?.city || 'India';
  const [topItem, setTopItem] = useState<MarketItem | null>(null);

  useEffect(() => {
    getTopMarketItems(city, 1).then(items => {
      if (items.length > 0) setTopItem(items[0]);
    });
  }, [city]);

  // Rotate banner type by day
  const dayOfYear = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  }, []);

  const variant = BANNER_VARIANTS[dayOfYear % BANNER_VARIANTS.length];
  const Icon = variant.icon;

  if (!topItem) return null;

  let title = '';
  let subtitle = '';
  switch (variant.key) {
    case 'best_value':
      title = `Best protein value: ${topItem.name}`;
      subtitle = `₹${topItem.costPerGramProtein}/g protein · PES ${topItem.pes}`;
      break;
    case 'price_drop':
      title = topItem.priceChange && topItem.priceChange < 0
        ? `${topItem.name} dropped ${Math.abs(topItem.priceChange)}%`
        : `Top value: ${topItem.name} at ₹${topItem.price}`;
      subtitle = `${topItem.protein}g protein · Smart pick today`;
      break;
    case 'community':
      title = 'Help improve market prices';
      subtitle = `Report prices in ${city} for better accuracy`;
      break;
  }

  return (
    <motion.button
      onClick={() => navigate('/market')}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${variant.gradient} border ${variant.border} text-left transition-transform active:scale-[0.98]`}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-9 h-9 rounded-xl bg-card/80 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <span className="text-[10px] font-semibold text-primary shrink-0">View →</span>
    </motion.button>
  );
}
