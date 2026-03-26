import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, MapPin, Users, Globe } from 'lucide-react';
import { getLivePrice, type LivePrice } from '@/lib/live-price-service';

interface Props {
  itemName: string;
  city?: string;
}

const SOURCE_LABELS: Record<string, { icon: typeof Users; label: string }> = {
  community: { icon: Users, label: 'community reports' },
  firecrawl: { icon: Globe, label: 'market data' },
  static: { icon: MapPin, label: 'avg estimate' },
};

export default function LivePriceBanner({ itemName, city }: Props) {
  const [price, setPrice] = useState<LivePrice | null>(null);

  useEffect(() => {
    if (!itemName) return;
    getLivePrice(itemName, city).then(setPrice);
  }, [itemName, city]);

  if (!price) return null;

  const info = SOURCE_LABELS[price.source] || SOURCE_LABELS.static;
  const Icon = info.icon;
  const displayCity = price.city || city || '';

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
      <MapPin className="h-3 w-3 shrink-0" />
      <span className="capitalize">{displayCity}</span>
      <span className="font-semibold text-foreground">
        ₹{price.price}/{price.unit}
      </span>
      <span className="text-muted-foreground">today</span>
      <span className="ml-auto flex items-center gap-1 text-[10px]">
        <Icon className="h-2.5 w-2.5" />
        {price.reportCount && price.reportCount > 0 && `${price.reportCount} `}
        {info.label}
      </span>
    </div>
  );
}
