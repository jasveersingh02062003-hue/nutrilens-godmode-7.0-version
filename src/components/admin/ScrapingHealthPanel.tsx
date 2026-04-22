import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, RefreshCw, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CityHealth {
  city: string;
  latest: string | null;
  today_count: number;
  total_count: number;
}

const KNOWN_CITIES = [
  'hyderabad', 'bangalore', 'mumbai', 'delhi', 'chennai',
  'pune', 'kolkata', 'ahmedabad', 'jaipur', 'lucknow',
];

export default function ScrapingHealthPanel() {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<CityHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from('city_prices')
      .select('city, updated_at')
      .eq('source', 'firecrawl');

    if (error || !rows) {
      setData([]);
      setLoading(false);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const byCity = new Map<string, CityHealth>();
    for (const c of KNOWN_CITIES) {
      byCity.set(c, { city: c, latest: null, today_count: 0, total_count: 0 });
    }
    for (const row of rows as { city: string; updated_at: string }[]) {
      const key = row.city.toLowerCase();
      let entry = byCity.get(key);
      if (!entry) {
        entry = { city: key, latest: null, today_count: 0, total_count: 0 };
        byCity.set(key, entry);
      }
      entry.total_count++;
      if (row.updated_at && row.updated_at.startsWith(todayStr)) entry.today_count++;
      if (!entry.latest || (row.updated_at && row.updated_at > entry.latest)) {
        entry.latest = row.updated_at;
      }
    }

    setData(Array.from(byCity.values()).sort((a, b) => a.city.localeCompare(b.city)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runScrape = async () => {
    setRunning(true);
    toast.info('Starting scrape across all cities (~30-90s)…');
    try {
      const { error } = await supabase.functions.invoke('firecrawl-prices', {
        body: { scrapeAll: true },
      });
      if (error) throw error;
      toast.success('Scrape complete — refreshing health…');
      await load();
    } catch (e) {
      toast.error(`Scrape failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setRunning(false);
    }
  };

  const statusFor = (latest: string | null): { color: string; label: string } => {
    if (!latest) return { color: 'bg-muted text-muted-foreground', label: 'No data' };
    const hours = (Date.now() - new Date(latest).getTime()) / 3600000;
    if (hours < 24) return { color: 'bg-green-500/15 text-green-700 border-green-500/30', label: 'Fresh' };
    if (hours < 72) return { color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', label: 'Aging' };
    return { color: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Stale' };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <Activity className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-xs font-bold text-foreground">Scraping Health</p>
          <p className="text-[10px] text-muted-foreground">
            Firecrawl freshness across {KNOWN_CITIES.length} cities
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border">
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={runScrape}
              disabled={running}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {running ? 'Scraping…' : 'Run scrape now'}
            </button>
            <button
              onClick={load}
              className="px-3 py-2 rounded-lg bg-muted text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="px-3 pb-3 max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">Loading…</p>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-1.5 font-semibold">City</th>
                    <th className="text-right py-1.5 font-semibold">Today</th>
                    <th className="text-right py-1.5 font-semibold">Last scrape</th>
                    <th className="text-right py-1.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => {
                    const status = statusFor(row.latest);
                    return (
                      <tr key={row.city} className="border-b border-border/30 last:border-0">
                        <td className="py-1.5 font-semibold capitalize text-foreground">{row.city}</td>
                        <td className="py-1.5 text-right tabular-nums text-foreground">{row.today_count}</td>
                        <td className="py-1.5 text-right text-muted-foreground tabular-nums">
                          {row.latest ? formatDistanceToNow(new Date(row.latest), { addSuffix: true }) : '—'}
                        </td>
                        <td className="py-1.5 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
