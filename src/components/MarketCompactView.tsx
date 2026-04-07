import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopMarketItems, type MarketItem } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ArrowRight, TrendingUp, Clock } from 'lucide-react';
import PESBadge from './PESBadge';
import type { PESColor } from '@/lib/pes-engine';
import { formatDistanceToNow } from 'date-fns';

export default function MarketCompactView() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const city = (profile as any)?.city || 'India';

  useEffect(() => {
    getTopMarketItems(city, 8).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [city]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-secondary" />
          <h3 className="text-sm font-bold text-foreground">Top Value Foods</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Static prices</span>
          <span className="mx-0.5">·</span>
          <span>📍 {city}</span>
        </div>
      </div>

      {items.slice(0, 8).map((item, i) => {
        const isEmoji = item.imageUrl && item.imageUrl.length <= 4;
        return (
          <button
            key={item.id}
            onClick={() => navigate('/market')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border text-left hover:border-primary/20 transition-colors active:scale-[0.99]"
          >
            {/* Image */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {isEmoji ? (
                <span className="text-xl">{item.imageUrl}</span>
              ) : item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xl">🥗</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>
                <p className="text-sm font-semibold text-foreground truncate">
                  {item.brand ? `${item.brand} ` : ''}{item.name}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">
                  {item.protein}g protein · ₹{item.price}{item.unit ? `/${item.unit}` : ''}
                </span>
                {item.priceChange !== undefined && item.priceChange !== 0 && (
                  <span className={`text-[9px] font-bold ${item.priceChange > 0 ? 'text-destructive' : 'text-primary'}`}>
                    {item.priceChange > 0 ? '↑' : '↓'}{Math.abs(item.priceChange)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
              <span className="text-[9px] text-muted-foreground">₹{item.costPerGramProtein}/g</span>
            </div>
          </button>
        );
      })}

      <button
        onClick={() => navigate('/market')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold text-primary transition-colors"
      >
        View Full Market <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
