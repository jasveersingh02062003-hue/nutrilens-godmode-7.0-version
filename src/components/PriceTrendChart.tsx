import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import { getPriceHistory } from '@/lib/market-service';
import { format, parseISO } from 'date-fns';

interface PriceTrendChartProps {
  city: string;
  itemName: string;
  compact?: boolean;
}

export default function PriceTrendChart({ city, itemName, compact = false }: PriceTrendChartProps) {
  const [data, setData] = useState<Array<{ date: string; price: number; label: string }>>([]);
  const [range, setRange] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPriceHistory(city, itemName, range).then(rows => {
      setData(rows.map((r: any) => ({
        date: r.price_date,
        price: Number(r.avg_price),
        label: format(parseISO(r.price_date), 'dd MMM'),
      })));
      setLoading(false);
    });
  }, [city, itemName, range]);

  if (loading) {
    return <div className={`${compact ? 'h-24' : 'h-44'} rounded-xl bg-muted animate-pulse`} />;
  }

  if (data.length === 0) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} rounded-xl bg-muted/50 border border-dashed border-border text-center`}>
        <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-muted-foreground">No trend data yet</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {/* FIRECRAWL_HOOK: Live price tracking will populate this chart */}
          Live trends coming soon
        </p>
      </div>
    );
  }

  const minPrice = Math.min(...data.map(d => d.price));
  const maxPrice = Math.max(...data.map(d => d.price));
  const change = data.length >= 2 ? data[data.length - 1].price - data[0].price : 0;
  const pctChange = data[0].price > 0 ? Math.round((change / data[0].price) * 100) : 0;

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground">{itemName} — {city}</span>
            <span className={`text-[10px] font-bold ${pctChange > 0 ? 'text-destructive' : pctChange < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
              {pctChange > 0 ? '↑' : pctChange < 0 ? '↓' : '→'}{Math.abs(pctChange)}%
            </span>
          </div>
          <div className="flex gap-1">
            {([7, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  range === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={compact ? 'h-20' : 'h-36'}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            {!compact && (
              <YAxis
                domain={[minPrice * 0.95, maxPrice * 1.05]}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={35}
                tickFormatter={(v) => `₹${v}`}
              />
            )}
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              formatter={(value: number) => [`₹${value}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: compact ? 2 : 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!compact && (
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Last 7 days · Static data · Live scraping coming soon</span>
          {/* FIRECRAWL_HOOK: Update this label when live data is active */}
        </div>
      )}
    </div>
  );
}
