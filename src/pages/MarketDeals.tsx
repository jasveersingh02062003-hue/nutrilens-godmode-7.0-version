import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingDown, Wallet, Sparkles } from 'lucide-react';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor } from '@/lib/market-data';
import MarketPageHeader from '@/components/MarketPageHeader';
import { useUserProfile } from '@/contexts/UserProfileContext';

export default function MarketDeals() {
  const { profile } = useUserProfile();
  const city = (profile as any)?.city || 'India';

  const processedItems = useMemo(() => {
    return MARKET_ITEMS.map(item => {
      const price = getCityPrice(item.basePrice, city);
      const pes = calculateMarketPES(item.protein, price);
      return { ...item, cityPrice: price, pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes), costPerGram: item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999 };
    });
  }, [city]);

  const budgetPicks = useMemo(() => processedItems.filter(i => i.cityPrice <= 100 && i.protein >= 3).sort((a, b) => a.costPerGram - b.costPerGram).slice(0, 8), [processedItems]);
  const bestPES = useMemo(() => [...processedItems].sort((a, b) => b.pes - a.pes).slice(0, 8), [processedItems]);
  const highProteinBudget = useMemo(() => processedItems.filter(i => i.protein >= 15).sort((a, b) => a.costPerGram - b.costPerGram).slice(0, 8), [processedItems]);

  const sections = [
    { title: '🔥 Best Value (Highest PES)', subtitle: 'Most protein per rupee', items: bestPES, icon: Flame, color: 'text-orange-500' },
    { title: '💰 Budget Picks', subtitle: 'Under ₹100 with good protein', items: budgetPicks, icon: Wallet, color: 'text-green-500' },
    { title: '💪 High Protein, Low Cost', subtitle: '15g+ protein, sorted by cost efficiency', items: highProteinBudget, icon: Sparkles, color: 'text-primary' },
  ];

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="Deals & Picks" city={city !== 'India' ? city : 'All India'} />

      <div className="px-4 pt-4 space-y-6">
        {/* Deals Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Smart Picks for You</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">Curated based on PES score, budget, and protein content</p>
        </motion.div>

        {/* Deal Sections */}
        {sections.map((section, si) => (
          <div key={si} className="space-y-3">
            <div className="flex items-center gap-2">
              <section.icon className={`w-4 h-4 ${section.color}`} />
              <div>
                <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                <p className="text-[10px] text-muted-foreground">{section.subtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {section.items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.pesColor === 'green' ? 'bg-green-500/10 text-green-600' : item.pesColor === 'yellow' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                      PES {item.pes}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-sm font-bold text-primary">₹{item.cityPrice}</span>
                    <span className="text-[9px] text-muted-foreground">/{item.unit}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{item.protein}g protein · {item.calories} cal</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
