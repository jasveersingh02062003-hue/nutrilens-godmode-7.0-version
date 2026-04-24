import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ExternalLink, ShieldCheck, AlertTriangle, Bell, Heart, ChefHat, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { getMarketItemDetail, type MarketItem, type MarketItemDetail } from '@/lib/market-service';
import { MARKET_ITEMS, type Micronutrients } from '@/lib/market-data';
import PESBadge from './PESBadge';
import { toast } from 'sonner';
import PriceTrendChart from './PriceTrendChart';
import type { PESColor } from '@/lib/pes-engine';
import PriceFreshnessBadge from './PriceFreshnessBadge';
import PriceAlertSheet from './PriceAlertSheet';

interface MarketItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MarketItem | null;
  city: string;
  onReportPrice?: (itemName: string) => void;
}

// Lookup raw item for micro/health/cooking data
function findRawItem(name: string) {
  return MARKET_ITEMS.find(m => m.name === name);
}

const MICRO_LABELS: { key: keyof Micronutrients; label: string; unit: string; daily: number }[] = [
  { key: 'iron', label: 'Iron', unit: 'mg', daily: 18 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', daily: 1000 },
  { key: 'vitB12', label: 'Vitamin B12', unit: 'mcg', daily: 2.4 },
  { key: 'zinc', label: 'Zinc', unit: 'mg', daily: 11 },
  { key: 'vitD', label: 'Vitamin D', unit: 'IU', daily: 600 },
  { key: 'vitC', label: 'Vitamin C', unit: 'mg', daily: 90 },
  { key: 'omega3', label: 'Omega-3', unit: 'mg', daily: 1100 },
  { key: 'selenium', label: 'Selenium', unit: 'mcg', daily: 55 },
  { key: 'folate', label: 'Folate', unit: 'mcg', daily: 400 },
  { key: 'vitA', label: 'Vitamin A', unit: 'mcg', daily: 900 },
];

export default function MarketItemDetailSheet({ open, onOpenChange, item, city, onReportPrice }: MarketItemDetailSheetProps) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MarketItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [servingGrams, setServingGrams] = useState(100);
  const [showCookingTips, setShowCookingTips] = useState(false);

  const rawItem = useMemo(() => item ? findRawItem(item.name) : null, [item?.name]);

  useEffect(() => {
    if (item && open) {
      setLoading(true);
      setServingGrams(100);
      setShowCookingTips(false);
      getMarketItemDetail(item, city).then(d => {
        setDetail(d);
        setLoading(false);
      });
    }
  }, [item, city, open]);

  if (!item) return null;

  const multiplier = servingGrams / 100;
  const isEmoji = item.imageUrl && item.imageUrl.length <= 4;

  // Scaled nutrition values
  const scaled = {
    protein: Math.round(item.protein * multiplier * 10) / 10,
    calories: Math.round(item.calories * multiplier),
    carbs: item.carbs !== undefined ? Math.round(item.carbs * multiplier * 10) / 10 : undefined,
    fat: item.fat !== undefined ? Math.round(item.fat * multiplier * 10) / 10 : undefined,
    fiber: item.fiber !== undefined ? Math.round(item.fiber * multiplier * 10) / 10 : undefined,
    sugar: item.sugar !== undefined ? Math.round(item.sugar * multiplier * 10) / 10 : undefined,
  };

  // Scaled price (for kg items)
  const scaledPrice = item.unit === 'kg'
    ? Math.round(item.price * servingGrams / 1000)
    : item.price;

  // Scaled micronutrients
  const scaledMicros = rawItem?.micro
    ? Object.fromEntries(
        Object.entries(rawItem.micro).map(([k, v]) => [k, Math.round((v as number) * multiplier * 100) / 100])
      ) as Micronutrients
    : null;

  const hasMicros = scaledMicros && Object.values(scaledMicros).some(v => v && v > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto pb-6">
        <SheetHeader className="pb-0">
          <SheetTitle className="sr-only">{item.name}</SheetTitle>
          <SheetDescription className="sr-only">Food item details</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-2">
          {/* ── Hero Section ── */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {isEmoji ? (
                <span className="text-4xl">{item.imageUrl}</span>
              ) : item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🥗</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {item.brand && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.brand}</p>}
              <h3 className="text-lg font-bold text-foreground leading-tight">{item.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
                {item.isVerified && (
                  <span className="flex items-center gap-0.5 text-[9px] text-primary font-semibold">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {rawItem?.isVeg !== undefined && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${rawItem.isVeg ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}`}>
                    {rawItem.isVeg ? '● Veg' : '● Non-Veg'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <PriceFreshnessBadge lastUpdated={item.lastUpdated} isStale={(item as any).isStale} />
              </div>
            </div>
          </div>

          {/* ── Price Card ── */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <div className="flex-1">
              <p className="text-2xl font-bold text-foreground">
                ₹{scaledPrice}
                <span className="text-sm font-normal text-muted-foreground">
                  {item.unit === 'kg' ? ` for ${servingGrams}g` : `/${item.unit || item.servingSize || 'unit'}`}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                {item.unit === 'kg' ? `₹${item.price}/kg` : ''} · ₹{item.costPerGramProtein}/g protein
              </p>
            </div>
            {item.priceChange !== undefined && item.priceChange !== 0 && (
              <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                item.priceChange > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                {item.priceChange > 0 ? '↑' : '↓'}{Math.abs(item.priceChange)}%
              </div>
            )}
          </div>

          {/* ── Serving Size Slider ── */}
          {item.unit === 'kg' && (
            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Serving Size</p>
                <span className="text-sm font-bold text-primary">{servingGrams}g</span>
              </div>
              <Slider
                value={[servingGrams]}
                onValueChange={([v]) => setServingGrams(v)}
                min={50}
                max={1000}
                step={25}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">50g</span>
                <div className="flex gap-1.5">
                  {[100, 200, 500].map(g => (
                    <button
                      key={g}
                      onClick={() => setServingGrams(g)}
                      className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                        servingGrams === g
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {g}g
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-muted-foreground">1kg</span>
              </div>
            </div>
          )}

          {/* ── Macros Grid ── */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Nutrition {servingGrams !== 100 ? `(${servingGrams}g)` : '(per 100g)'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Protein', value: `${scaled.protein}g`, color: 'text-primary', highlight: true },
                { label: 'Calories', value: `${scaled.calories}`, color: 'text-foreground' },
                { label: 'Carbs', value: scaled.carbs !== undefined ? `${scaled.carbs}g` : '—', color: 'text-foreground' },
                { label: 'Fat', value: scaled.fat !== undefined ? `${scaled.fat}g` : '—', color: 'text-foreground' },
                { label: 'Fiber', value: scaled.fiber !== undefined ? `${scaled.fiber}g` : '—', color: 'text-foreground' },
                { label: 'Sugar', value: scaled.sugar !== undefined ? `${scaled.sugar}g` : '—', color: 'text-foreground' },
              ].map(n => (
                <div key={n.label} className={`p-2.5 rounded-xl bg-card border text-center ${n.highlight ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <p className="text-[10px] text-muted-foreground">{n.label}</p>
                  <p className={`text-sm font-bold ${n.color}`}>{n.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Micronutrients ── */}
          {hasMicros && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Micronutrients {servingGrams !== 100 ? `(${servingGrams}g)` : ''}
              </p>
              <div className="space-y-1.5">
                {MICRO_LABELS.filter(m => scaledMicros![m.key] && scaledMicros![m.key]! > 0).map(m => {
                  const val = scaledMicros![m.key]!;
                  const pct = Math.min(Math.round((val / m.daily) * 100), 999);
                  return (
                    <div key={m.key} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 shrink-0">{m.label}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 50 ? 'bg-primary' : pct >= 20 ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-foreground w-16 text-right">
                        {val}{m.unit} <span className="text-muted-foreground">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                <p className="text-[9px] text-muted-foreground mt-1">% of Recommended Daily Intake</p>
              </div>
            </div>
          )}

          {/* ── PES Score ── */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[11px] font-bold text-foreground mb-1">PES Score: {item.pes}/10</p>
            <p className="text-[10px] text-muted-foreground">
              {item.pesColor === 'green' ? '🟢 Excellent value — high protein per rupee spent' :
               item.pesColor === 'yellow' ? '🟡 Fair value — moderate protein per rupee' :
               '🔴 Low value — expensive relative to protein content'}
            </p>
          </div>

          {/* ── Health Benefits ── */}
          {rawItem?.healthBenefits && rawItem.healthBenefits.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Heart className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Health Benefits</p>
              </div>
              <div className="space-y-1.5">
                {rawItem.healthBenefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                    <span className="text-primary mt-0.5 shrink-0">✦</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Cooking Tips (Collapsible) ── */}
          {rawItem?.cookingTips && rawItem.cookingTips.length > 0 && (
            <div>
              <button
                onClick={() => setShowCookingTips(!showCookingTips)}
                className="flex items-center gap-1.5 w-full text-left"
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex-1">Cooking Tips</p>
                {showCookingTips ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {showCookingTips && (
                <div className="space-y-1.5 mt-2 pl-5">
                  {rawItem.cookingTips.map((t, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                      <span className="text-amber-500 mt-0.5 shrink-0">👨‍🍳</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Allergens ── */}
          {(item.allergens?.length || rawItem?.allergenTags?.length) ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-foreground">Allergen Warning</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[...(item.allergens || []), ...(rawItem?.allergenTags || [])].filter((v, i, a) => a.indexOf(v) === i).map((a: string) => {
                    const isSevere = ['gluten', 'peanut', 'tree nuts', 'shellfish', 'fish'].includes(a.toLowerCase());
                    return (
                      <span
                        key={a}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          isSevere
                            ? 'bg-destructive/15 text-destructive border border-destructive/20'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isSevere ? '⚠️' : '⚡'} {a}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* ── Buy Online Links (affiliate + platform) ── */}
          {((item.affiliateLinks && item.affiliateLinks.length > 0) || (item.platforms && item.platforms.length > 0)) && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Buy Online</p>
              </div>
              <div className="space-y-1.5">
                {/* Affiliate links first (tracked) */}
                {item.affiliateLinks?.map((link: any, i: number) => (
                  <a
                    key={`aff-${i}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try {
                        const clicks = JSON.parse(localStorage.getItem('nutrilens_affiliate_clicks') || '[]');
                        clicks.push({ product: item.name, platform: link.platform, price: link.price, ts: Date.now() });
                        localStorage.setItem('nutrilens_affiliate_clicks', JSON.stringify(clicks.slice(-200)));
                      } catch {}
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {link.platform === 'Amazon' ? '🛒' : link.platform === 'BigBasket' ? '🧺' : '🔗'}
                    </div>
                    <span className="text-sm font-semibold text-foreground flex-1">{link.platform}</span>
                    <span className="text-sm font-bold text-primary">₹{link.price}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-primary/60" />
                  </a>
                ))}
                {/* Regular platform links */}
                {item.platforms?.filter((p: any) => 
                  !item.affiliateLinks?.some((a: any) => a.platform === p.name)
                ).map((p: any, i: number) => (
                  <a
                    key={`plat-${i}`}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <span className="text-sm font-semibold text-foreground flex-1">{p.name}</span>
                    <span className="text-sm font-bold text-foreground">₹{p.price}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Price Trend ── */}
          {item.source === 'fresh' && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price Trend (7 days)</p>
              <PriceTrendChart city={city} itemName={item.name} compact />
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="flex gap-2 pt-2 pb-4">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                onReportPrice?.(item.name);
                onOpenChange(false);
              }}
            >
              Report Price
            </Button>
            <Button
              variant="outline"
              className="text-xs"
              onClick={() => setAlertOpen(true)}
            >
              <Bell className="w-3.5 h-3.5 mr-1" /> Alert
            </Button>
            <Button
              className="flex-1 text-xs"
              onClick={() => {
                toast.success(`${item.name} noted! Open Meal Planner to add it.`, { icon: '✅' });
                onOpenChange(false);
                navigate('/planner');
              }}
            >
              Add to Meal Plan
            </Button>
          </div>
        </div>

        <PriceAlertSheet
          open={alertOpen}
          onOpenChange={setAlertOpen}
          itemName={item.name}
          city={city}
          currentPrice={item.price}
        />
      </SheetContent>
    </Sheet>
  );
}
