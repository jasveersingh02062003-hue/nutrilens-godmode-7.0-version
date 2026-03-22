import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Plus, Camera, Flame, Scale, Calendar, StickyNote } from 'lucide-react';
import { getWeeklyWeightEntries, getWeightStreak, type WeightEntry } from '@/lib/weight-history';

interface Props {
  refreshKey?: number;
  onLogWeight: () => void;
}

export default function WeeklyWeightTimeline({ refreshKey, onLogWeight }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<WeightEntry | null>(null);
  const weeks = getWeeklyWeightEntries(12);
  const streak = getWeightStreak();

  const formatWeekLabel = (weekStart: string) => {
    const d = new Date(weekStart + 'T00:00:00');
    const month = d.toLocaleString('default', { month: 'short' });
    return `${d.getDate()} ${month}`;
  };

  const today = new Date().toISOString().split('T')[0];
  const currentWeekStart = weeks.find(w => w.weekStart <= today)?.weekStart;

  return (
    <div className="card-elevated p-4">
      {/* Header with streak */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Weekly Weigh-ins</h3>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10">
            <Flame className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs font-bold text-accent">{streak} week{streak !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Horizontal scroll timeline */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {weeks.map((week) => {
          const isCurrentWeek = week.weekStart === currentWeekStart;
          const hasEntry = !!week.entry;
          const isVerified = week.entry?.verified;

          return (
            <button
              key={week.weekStart}
              onClick={() => {
                if (hasEntry) {
                  setSelectedEntry(week.entry);
                } else if (isCurrentWeek) {
                  onLogWeight();
                }
              }}
              className={`flex-shrink-0 w-[72px] rounded-xl p-2 border transition-all text-center ${
                hasEntry
                  ? isVerified
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-accent/30 bg-accent/5'
                  : isCurrentWeek
                    ? 'border-primary/40 bg-primary/5 border-dashed'
                    : 'border-border bg-muted/30'
              }`}
            >
              {/* Photo thumbnail or icon */}
              <div className="w-10 h-10 mx-auto rounded-lg overflow-hidden mb-1.5 bg-muted flex items-center justify-center">
                {hasEntry && week.entry?.photo ? (
                  <img src={week.entry.photo} alt="" className="w-full h-full object-cover" />
                ) : hasEntry ? (
                  <Check className={`w-4 h-4 ${isVerified ? 'text-primary' : 'text-accent'}`} />
                ) : isCurrentWeek ? (
                  <Plus className="w-4 h-4 text-primary" />
                ) : (
                  <X className="w-3.5 h-3.5 text-muted-foreground/40" />
                )}
              </div>

              {/* Weight value */}
              {hasEntry ? (
                <p className="text-[11px] font-bold text-foreground">{week.entry!.weight} {week.entry!.unit}</p>
              ) : isCurrentWeek ? (
                <p className="text-[10px] font-semibold text-primary">Log now</p>
              ) : (
                <p className="text-[10px] text-muted-foreground/50">—</p>
              )}

              {/* Week label */}
              <p className="text-[9px] text-muted-foreground mt-0.5">{formatWeekLabel(week.weekStart)}</p>

              {/* Verification indicator */}
              {hasEntry && (
                <div className={`mt-1 mx-auto w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-primary' : 'bg-accent'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Verified</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Unverified</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Missed</span>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm mx-4 bg-card rounded-2xl shadow-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Photo */}
              {selectedEntry.photo && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={selectedEntry.photo} alt="Weigh-in" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{selectedEntry.weight} {selectedEntry.unit}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{selectedEntry.date}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    selectedEntry.verified
                      ? 'bg-primary/10 text-primary'
                      : 'bg-accent/10 text-accent'
                  }`}>
                    {selectedEntry.verified ? '✓ Verified' : '⚠ Unverified'}
                  </div>
                </div>

                {selectedEntry.note && (
                  <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3">
                    <StickyNote className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <p className="text-xs text-foreground">{selectedEntry.note}</p>
                  </div>
                )}

                <button
                  onClick={() => setSelectedEntry(null)}
                  className="w-full py-2.5 rounded-xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
