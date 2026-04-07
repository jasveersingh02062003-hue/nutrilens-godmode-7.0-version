import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTopMarketItems, type MarketItem } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ArrowRight, TrendingUp } from 'lucide-react';
import PESBadge from './PESBadge';
import type { PESColor } from '@/lib/pes-engine';

export default function MarketCompactView() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const city = profile?.city || 'India';

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
        <span className="text-[10px] text-muted-foreground">📍 {city}</span>
      </div>

      {items.slice(0, 8).map((item, i) => (
        <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
          <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {item.brand ? `${item.brand} ` : ''}{item.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {item.protein}g protein · ₹{item.price}{item.unit ? `/${item.unit}` : ''}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <PESBadge pes={item.pes} color={item.pesColor as PESColor} size="sm" />
            <span className="text-[9px] text-muted-foreground">₹{item.costPerGramProtein}/g</span>
          </div>
        </div>
      ))}

      <button
        onClick={() => navigate('/market')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-sm font-semibold text-primary transition-colors"
      >
        View Full Market <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
