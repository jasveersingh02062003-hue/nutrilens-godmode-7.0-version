import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Crown } from 'lucide-react';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import { getAllLogDates, getDailyLog, DailyLog } from '@/lib/store';
import { generateScrollStopperInsights } from '@/lib/memoryInsights';
import DayBlock from '@/components/DayBlock';
import ScrollStopperCard from '@/components/ScrollStopperCard';
import DayDetailsSheet from '@/components/DayDetailsSheet';
import FullScreenMemory from '@/components/FullScreenMemory';
import { getPlan } from '@/lib/subscription-service';

interface MonthGroup {
  label: string;
  logs: DailyLog[];
}

const PAGE_SIZE = 60;

export default function FoodArchive() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [memoryState, setMemoryState] = useState<{ date: string; mealId: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const plan = getPlan();
  const isFree = plan === 'free';

  const { monthGroups, totalDates, hasMore } = useMemo(() => {
    const allDates = getAllLogDates().sort().reverse();

    // Free users: only last 7 days
    const cutoff = isFree ? (() => { const d = new Date(Date.now() - 7 * 86400000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : '';

    const eligibleDates = isFree ? allDates.filter(d => d >= cutoff) : allDates;
    const dates = eligibleDates.slice(0, visibleCount);
    const groups: Record<string, DailyLog[]> = {};

    for (const date of dates) {
      const log = getDailyLog(date);
      const hasPhotos = log.meals.some(m => m.photo);
      if (!hasPhotos) continue;

      const monthKey = date.slice(0, 7); // YYYY-MM
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(log);
    }

    const ordered = Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, logs]): MonthGroup => ({
        label: new Date(key + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        logs,
      }));

    return {
      monthGroups: ordered,
      totalDates: eligibleDates.length,
      hasMore: visibleCount < eligibleDates.length,
    };
  }, [refreshKey, visibleCount, isFree]);

  const scrollInsights = useMemo(() => {
    const allLogs = monthGroups.flatMap(g => g.logs);
    return generateScrollStopperInsights(allLogs);
  }, [monthGroups]);

  const refresh = () => setRefreshKey(k => k + 1);
  const loadMore = () => setVisibleCount(c => c + PAGE_SIZE);

  if (monthGroups.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-lg mx-auto px-4 pt-5">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate('/progress')} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Food Archive</h1>
              <SubscriptionBadge />
            </div>
          </div>
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl">📸</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">No food memories yet</p>
              <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
                Snap a photo when you log a meal — they'll show up here as a beautiful timeline.
              </p>
            </div>
            <button
              onClick={() => navigate('/log')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-[0.97] transition-transform"
            >
              📷 Log your first meal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Insert scroll-stopper insights between month groups
  let insightIndex = 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/progress')} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">Food Archive</h1>
            <SubscriptionBadge />
          </div>
        </div>

        {monthGroups.map((group, gi) => (
          <div key={group.label} className="space-y-3">
            {/* Sticky month header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm py-2">
              <h2 className="text-sm font-bold text-foreground">{group.label}</h2>
            </div>

            {group.logs.map((log) => (
              <DayBlock
                key={log.date}
                log={log}
                onOpenDate={(d) => setSelectedDate(d)}
                onOpenMemory={(d, mId) => setMemoryState({ date: d, mealId: mId })}
              />
            ))}

            {/* Scroll stopper after month group */}
            {insightIndex < scrollInsights.length && gi < monthGroups.length - 1 && (() => {
              const insight = scrollInsights[insightIndex++];
              return <ScrollStopperCard key={`insight-${gi}`} emoji={insight.emoji} text={insight.text} />;
            })()}
          </div>
        ))}

        {hasMore && !isFree && (
          <button
            onClick={loadMore}
            className="w-full py-3 rounded-2xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
          >
            Load older memories ({totalDates - visibleCount} more days)
          </button>
        )}

        {isFree && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center space-y-2">
            <Crown className="w-5 h-5 text-accent mx-auto" />
            <p className="text-xs font-semibold text-foreground">Showing last 7 days only</p>
            <p className="text-[10px] text-muted-foreground">Upgrade to Premium to see all your food memories.</p>
          </div>
        )}
      </div>

      <DayDetailsSheet
        open={!!selectedDate}
        date={selectedDate || (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })()}
        onClose={() => setSelectedDate(null)}
        onChanged={refresh}
      />

      <FullScreenMemory
        open={!!memoryState}
        date={memoryState?.date || ''}
        mealId={memoryState?.mealId || ''}
        onClose={() => setMemoryState(null)}
        onChanged={refresh}
      />
    </div>
  );
}
