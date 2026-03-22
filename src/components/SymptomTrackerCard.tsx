import { useState, useMemo } from 'react';
import { Activity, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSymptomLogs, getSymptomInsights, type SymptomLog } from '@/lib/symptom-service';
import SymptomLogSheet from '@/components/SymptomLogSheet';

const insightColors = {
  warning: 'bg-destructive/10 text-destructive',
  positive: 'bg-primary/10 text-primary',
  info: 'bg-accent/10 text-accent',
};

interface Props {
  refreshKey?: number;
}

export default function SymptomTrackerCard({ refreshKey }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const todayKey = new Date().toISOString().split('T')[0];

  const recentLogs = useMemo(() => getSymptomLogs().slice(0, 7), [refreshKey]);
  const todayLog = recentLogs.find(l => l.date === todayKey);
  const insights = useMemo(() => getSymptomInsights(7), [refreshKey]);

  const avgEnergy = recentLogs.length > 0
    ? (recentLogs.reduce((s, l) => s + (l.energy || 3), 0) / recentLogs.length).toFixed(1)
    : null;

  return (
    <>
      <div className="card-elevated p-4 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm text-foreground">Symptom Tracker</h3>
              <p className="text-[10px] text-muted-foreground">
                {todayLog ? '✅ Logged today' : 'Tap to log how you feel'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {avgEnergy && (
              <div className="px-2 py-1 rounded-lg bg-muted">
                <span className="text-[10px] text-muted-foreground">⚡ Avg</span>
                <span className="text-sm font-bold text-foreground ml-1">{avgEnergy}</span>
              </div>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              {/* Quick log button */}
              <button
                onClick={() => setSheetOpen(true)}
                className="w-full py-2.5 rounded-xl bg-primary/10 text-primary font-semibold text-xs border border-primary/20 active:scale-[0.98] transition-transform"
              >
                {todayLog ? '✏️ Edit Today\'s Log' : '📝 Log Symptoms'}
              </button>

              {/* Weekly mini view */}
              {recentLogs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">This Week</p>
                  <div className="flex gap-1">
                    {recentLogs.slice(0, 7).reverse().map((log, i) => {
                      const energy = log.energy || 3;
                      const color = energy >= 4 ? 'bg-primary' : energy >= 3 ? 'bg-accent' : 'bg-destructive';
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className={`w-full h-6 rounded-md ${color}/30 flex items-center justify-center`}>
                            <span className="text-[9px] font-bold text-foreground">{energy}</span>
                          </div>
                          <span className="text-[8px] text-muted-foreground">{log.date.slice(8)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Insights */}
              {insights.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-primary" />
                    <p className="text-[11px] font-semibold text-muted-foreground">Insights</p>
                  </div>
                  {insights.slice(0, 3).map((insight, i) => (
                    <div key={i} className={`px-3 py-2 rounded-xl text-xs font-medium ${insightColors[insight.type]}`}>
                      {insight.emoji} {insight.text}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SymptomLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        date={todayKey}
        onSaved={() => {}}
      />
    </>
  );
}
