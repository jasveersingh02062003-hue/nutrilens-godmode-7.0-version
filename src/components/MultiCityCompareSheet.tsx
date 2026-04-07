import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowLeftRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { SUPPORTED_CITIES } from '@/lib/market-service';
import { supabase } from '@/integrations/supabase/client';

interface CityPrice {
  item_name: string;
  avg_price: number;
}

interface CompareRow {
  item: string;
  priceA: number | null;
  priceB: number | null;
  diff: number | null;
  cheaperCity: 'A' | 'B' | 'same' | null;
}

const VOLATILE_ITEMS = ['Chicken', 'Eggs', 'Paneer', 'Tomato', 'Onion', 'Milk', 'Fish', 'Mutton'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCity?: string;
}

export default function MultiCityCompareSheet({ open, onOpenChange, defaultCity }: Props) {
  const [cityA, setCityA] = useState(defaultCity || SUPPORTED_CITIES[0]);
  const [cityB, setCityB] = useState(SUPPORTED_CITIES[1]);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || cityA === cityB) return;
    setLoading(true);

    const fetchPrices = async (city: string): Promise<CityPrice[]> => {
      const { data } = await supabase
        .from('city_prices')
        .select('item_name, avg_price')
        .eq('city', city.toLowerCase())
        .order('price_date', { ascending: false })
        .limit(50);
      return data || [];
    };

    Promise.all([fetchPrices(cityA), fetchPrices(cityB)]).then(([dataA, dataB]) => {
      const mapA = new Map(dataA.map(d => [d.item_name.toLowerCase(), d.avg_price]));
      const mapB = new Map(dataB.map(d => [d.item_name.toLowerCase(), d.avg_price]));

      const compareRows: CompareRow[] = VOLATILE_ITEMS.map(item => {
        const pA = mapA.get(item.toLowerCase()) ?? null;
        const pB = mapB.get(item.toLowerCase()) ?? null;
        let diff: number | null = null;
        let cheaperCity: 'A' | 'B' | 'same' | null = null;
        if (pA != null && pB != null) {
          diff = Math.round(((pB - pA) / pA) * 100);
          cheaperCity = pA < pB ? 'A' : pB < pA ? 'B' : 'same';
        }
        return { item, priceA: pA, priceB: pB, diff, cheaperCity };
      });
      setRows(compareRows);
      setLoading(false);
    });
  }, [open, cityA, cityB]);

  const swapCities = () => {
    const tmp = cityA;
    setCityA(cityB);
    setCityB(tmp);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            Compare City Prices
          </SheetTitle>
        </SheetHeader>

        {/* City Selectors */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1">
            <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">City A</label>
            <select
              value={cityA}
              onChange={e => setCityA(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              {SUPPORTED_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button onClick={swapCities} className="mt-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <label className="text-[9px] font-bold text-muted-foreground uppercase mb-1 block">City B</label>
            <select
              value={cityB}
              onChange={e => setCityB(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
            >
              {SUPPORTED_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {cityA === cityB && (
          <p className="text-[11px] text-accent mt-3 text-center">Select two different cities to compare</p>
        )}

        {/* Comparison Table */}
        {!loading && cityA !== cityB && (
          <div className="mt-4 space-y-2">
            {rows.map(row => {
              const hasData = row.priceA != null || row.priceB != null;
              return (
                <div key={row.item} className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{row.item}</p>
                  </div>
                  <div className="text-right w-16">
                    {row.priceA != null ? (
                      <p className={`text-xs font-bold ${row.cheaperCity === 'A' ? 'text-green-600' : 'text-foreground'}`}>
                        ₹{row.priceA}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No data</p>
                    )}
                  </div>
                  <div className="w-12 flex justify-center">
                    {row.diff != null ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        row.diff > 0 ? 'bg-red-500/10 text-red-500' : row.diff < 0 ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {row.diff > 0 ? '+' : ''}{row.diff}%
                      </span>
                    ) : hasData ? (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="text-right w-16">
                    {row.priceB != null ? (
                      <p className={`text-xs font-bold ${row.cheaperCity === 'B' ? 'text-green-600' : 'text-foreground'}`}>
                        ₹{row.priceB}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No data</p>
                    )}
                  </div>
                </div>
              );
            })}

            {rows.every(r => r.priceA == null && r.priceB == null) && (
              <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">No price data available yet for these cities</p>
                <p className="text-[10px] text-muted-foreground mt-1">Prices will appear as community reports come in</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[9px] text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cityA}</span>
          <span>vs</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cityB}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
