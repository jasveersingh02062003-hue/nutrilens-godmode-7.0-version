import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, ShieldCheck, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { getMarketItemDetail, type MarketItem, type MarketItemDetail } from '@/lib/market-service';
import PESBadge from './PESBadge';
import PriceTrendChart from './PriceTrendChart';
import type { PESColor } from '@/lib/pes-engine';
import { formatDistanceToNow } from 'date-fns';

interface MarketItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MarketItem | null;
  city: string;
  onReportPrice?: (itemName: string) => void;
}

export default function MarketItemDetailSheet({ open, onOpenChange, item, city, onReportPrice }: MarketItemDetailSheetProps) {
  const [detail, setDetail] = useState<MarketItemDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item && open) {
      setLoading(true);
      getMarketItemDetail(item, city).then(d => {
        setDetail(d);
        setLoading(false);
      });
    }
  }, [item, city, open]);

  if (!item) return null;

  const isEmoji = item.imageUrl && item.imageUrl.length <= 4;
  const lastUpdatedLabel = item.lastUpdated && item.lastUpdated !== 'static'
    ? formatDistanceToNow(new Date(item.lastUpdated), { addSuffix: true })
    : 'Static price';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="pb-0">
          <SheetTitle className="text-base sr-only">{item.brand ? `${item.brand} ${item.name}` : item.name}</SheetTitle>
          <SheetDescription className="sr-only">Food item details</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-2">
          {/* Header with image */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {isEmoji ? (
                <span className="text-4xl">{item.imageUrl}</span>
              ) : item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
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
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Updated {lastUpdatedLabel}</span>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <div className="flex-1">
              <p className="text-2xl font-bold text-foreground">₹{item.price}<span className="text-sm font-normal text-muted-foreground">/{item.unit || item.servingSize || 'unit'}</span></p>
              <p className="text-[11px] text-muted-foreground">₹{item.costPerGramProtein}/g protein</p>
            </div>
            {item.priceChange !== undefined && item.priceChange !== 0 && (
              <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                item.priceChange > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                {item.priceChange > 0 ? '↑' : '↓'}{Math.abs(item.priceChange)}%
              </div>
            )}
          </div>

          {/* Nutrition Grid */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Nutrition</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Protein', value: `${item.protein}g`, color: 'text-primary' },
                { label: 'Calories', value: `${item.calories}`, color: 'text-foreground' },
                { label: 'Carbs', value: item.carbs !== undefined ? `${item.carbs}g` : '—', color: 'text-foreground' },
                { label: 'Fat', value: item.fat !== undefined ? `${item.fat}g` : '—', color: 'text-foreground' },
                { label: 'Fiber', value: item.fiber !== undefined ? `${item.fiber}g` : '—', color: 'text-foreground' },
                { label: 'Sugar', value: item.sugar !== undefined ? `${item.sugar}g` : '—', color: 'text-foreground' },
              ].map(n => (
                <div key={n.label} className="p-2.5 rounded-xl bg-card border border-border text-center">
                  <p className="text-[10px] text-muted-foreground">{n.label}</p>
                  <p className={`text-sm font-bold ${n.color}`}>{n.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PES Explanation */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[11px] font-bold text-foreground mb-1">PES Score: {item.pes}/10</p>
            <p className="text-[10px] text-muted-foreground">
              {item.pesColor === 'green' ? '🟢 Excellent value — high protein per rupee spent' :
               item.pesColor === 'yellow' ? '🟡 Fair value — moderate protein per rupee' :
               '🔴 Low value — expensive relative to protein content'}
            </p>
          </div>

          {/* Platform Links (packed products) */}
          {item.platforms && item.platforms.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Buy Online</p>
              <div className="space-y-1.5">
                {item.platforms.map((p: any, i: number) => (
                  <a
                    key={i}
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

          {/* Price Trend */}
          {item.source === 'fresh' && (
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Price Trend</p>
              <PriceTrendChart city={city} itemName={item.name} compact />
            </div>
          )}

          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-foreground">Allergen Warning</p>
                <p className="text-[10px] text-muted-foreground">Contains: {item.allergens.join(', ')}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pb-4">
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
            <Button className="flex-1 text-xs">
              Add to Meal Plan
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
