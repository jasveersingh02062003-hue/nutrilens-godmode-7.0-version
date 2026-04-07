import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingDown, Wallet, Sparkles, Trophy, Target, Bell, Zap } from 'lucide-react';
import { useMarket } from '@/contexts/MarketContext';
import MarketPageHeader from '@/components/MarketPageHeader';
import PriceAlertSheet from '@/components/PriceAlertSheet';
import { DealsSkeleton } from '@/components/market/MarketSkeleton';
import MarketImage from '@/components/market/MarketImage';
import { useNavigate } from 'react-router-dom';

export default function MarketDeals() {
  const navigate = useNavigate();
  const { city, cityLabel, processedItems, locationLoading, vegOnly } = useMarket();
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertItem, setAlertItem] = useState({ name: '', price: 0 });

  const filteredProcessed = useMemo(() => vegOnly ? processedItems.filter(i => i.isVeg) : processedItems, [processedItems, vegOnly]);

  const priceDrops = useMemo(() => {
    const drops = [
      { id: 'mk_egg_white', drop: 12 }, { id: 'mk_tomato', drop: 8 },
      { id: 'mk_bangda', drop: 15 }, { id: 'mk_onion', drop: 6 },
      { id: 'mk_cabbage', drop: 10 }, { id: 'mk_watermelon', drop: 20 },
    ];
    return drops.map(d => {
      const item = filteredProcessed.find(i => i.id === d.id);
      if (!item) return null;
      return { ...item, drop: d.drop };
    }).filter(Boolean) as any[];
  }, [filteredProcessed]);

  const budgetPicks = useMemo(() => filteredProcessed.filter(i => i.cityPrice <= 100 && i.protein >= 3).sort((a, b) => a.costPerGram - b.costPerGram).slice(0, 8), [filteredProcessed]);
  const bestPES = useMemo(() => [...filteredProcessed].sort((a, b) => b.pes - a.pes).slice(0, 10), [filteredProcessed]);
  const highProteinBudget = useMemo(() => filteredProcessed.filter(i => i.protein >= 15).sort((a, b) => a.costPerGram - b.costPerGram).slice(0, 8), [filteredProcessed]);

  const combo = useMemo(() => {
    if (vegOnly) {
      // Veg combo: paneer + soya + milk
      const paneer = filteredProcessed.find(i => i.id === 'mk_paneer');
      const soya = filteredProcessed.find(i => i.id === 'mk_soya_chunks');
      const milk = filteredProcessed.find(i => i.id === 'mk_milk_toned');
      if (!paneer || !soya || !milk) return null;
      const totalProtein = (paneer.protein * 1) + (soya.protein * 0.5) + (milk.protein * 5);
      const totalCost = (paneer.cityPrice * 0.1) + (soya.cityPrice * 0.05) + (milk.cityPrice * 0.5);
      return { items: [paneer, soya, milk], totalProtein: Math.round(totalProtein), totalCost: Math.round(totalCost) };
    }
    const eggs = filteredProcessed.find(i => i.id === 'mk_egg_white');
    const chicken = filteredProcessed.find(i => i.id === 'mk_chicken_breast');
    const milk = filteredProcessed.find(i => i.id === 'mk_milk_toned');
    if (!eggs || !chicken || !milk) return null;
    const totalProtein = (eggs.protein * 4) + (chicken.protein * 1.5) + (milk.protein * 5);
    const totalCost = (eggs.cityPrice * 4) + (chicken.cityPrice * 0.15) + (milk.cityPrice * 0.5);
    return { items: [eggs, chicken, milk], totalProtein: Math.round(totalProtein), totalCost: Math.round(totalCost) };
  }, [filteredProcessed, vegOnly]);

  if (locationLoading) {
    return (
      <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
        <MarketPageHeader title="Deals & Picks" city="Loading..." />
        <DealsSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-background pb-24">
      <MarketPageHeader title="Deals & Picks" city={cityLabel} />

      <div className="px-4 pt-4 space-y-6">
        {/* Deals Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-br from-primary/12 to-accent/8 border border-primary/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Smart Picks for You</h2>
          </div>
          <p className="text-[11px] text-muted-foreground">Curated based on PES score, budget, and protein content</p>
        </motion.div>

        {/* 1. Price Drops */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-bold text-foreground">Price Drops This Week</h3>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {priceDrops.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0 p-3 rounded-xl bg-green-500/5 border border-green-500/15 min-w-[100px] text-center"
              >
                <div className="mx-auto mb-1"><MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" /></div>
                <p className="text-[10px] font-semibold text-foreground truncate">{item.name.split('(')[0].trim()}</p>
                <p className="text-[11px] font-bold text-foreground">₹{item.cityPrice}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-green-500/15 text-green-600">
                  ↓{item.drop}%
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 2. Budget Protein Combo */}
        {combo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/8 to-orange-500/5 border border-amber-500/20"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-foreground">Budget Protein Combo</h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3">Get ~{combo.totalProtein}g protein for just ₹{combo.totalCost}/day</p>
            <div className="flex gap-2 mb-3">
              {combo.items.map((item: any) => (
                <div key={item.id} className="flex-1 p-2 rounded-xl bg-card border border-border/50 text-center">
                  <div className="mx-auto"><MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" /></div>
                  <p className="text-[9px] font-semibold text-foreground mt-0.5 truncate">{item.name.split('(')[0].trim()}</p>
                  <p className="text-[9px] text-muted-foreground">{item.protein}g protein</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-[10px] font-bold text-foreground">Total: ~{combo.totalProtein}g protein</span>
              <span className="text-[10px] font-bold text-primary">₹{combo.totalCost}/day</span>
            </div>
          </motion.div>
        )}

        {/* 3. Best PES This Week */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Best PES Rankings</h3>
            <span className="text-[9px] text-muted-foreground ml-auto">Protein per ₹</span>
          </div>
          <div className="space-y-1.5">
            {bestPES.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50"
                >
                  <span className="w-6 text-center text-[11px] font-bold text-muted-foreground">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[9px] text-muted-foreground">₹{item.cityPrice}/{item.unit} · {item.protein}g protein</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    item.pesColor === 'green' ? 'bg-green-500/10 text-green-600'
                    : item.pesColor === 'yellow' ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-red-500/10 text-red-600'
                  }`}>
                    PES {item.pes}
                  </span>
                </motion.div>
            ))}
          </div>
        </div>

        {/* 4. High Protein Low Cost Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">High Protein, Low Cost</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {highProteinBudget.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                className="p-3 rounded-xl bg-card border border-border/50 hover:border-primary/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <MarketImage itemId={item.id} emoji={item.emoji} alt={item.name} size="sm" />
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.pesColor === 'green' ? 'bg-green-500/10 text-green-600'
                    : item.pesColor === 'yellow' ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-red-500/10 text-red-600'
                  }`}>PES {item.pes}</span>
                </div>
                <p className="text-[11px] font-semibold text-foreground truncate">{item.name}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[12px] font-bold text-primary">₹{item.cityPrice}</span>
                  <span className="text-[9px] text-muted-foreground">/{item.unit}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{item.protein}g protein · ₹{item.costPerGram}/g</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 5. Price Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/8 to-indigo-500/5 border border-blue-500/15"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">Price Forecast</p>
          <p className="text-[12px] font-medium text-foreground">Chicken prices may drop next week based on seasonal trends. Tomato prices expected to rise after monsoon.</p>
          <p className="text-[9px] text-muted-foreground mt-1.5">Based on 30-day historical data</p>
        </motion.div>

        {/* 6. Price Alert CTA */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            const topItem = bestPES[0];
            setAlertItem({ name: topItem?.name || 'Eggs', price: topItem?.cityPrice || 6 });
            setAlertOpen(true);
          }}
          className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Set Price Alert</p>
            <p className="text-[10px] text-muted-foreground">Get notified when prices drop below your target</p>
          </div>
        </motion.button>
      </div>

      <PriceAlertSheet
        open={alertOpen}
        onOpenChange={setAlertOpen}
        itemName={alertItem.name}
        city={city || 'India'}
        currentPrice={alertItem.price}
      />
    </div>
  );
}
