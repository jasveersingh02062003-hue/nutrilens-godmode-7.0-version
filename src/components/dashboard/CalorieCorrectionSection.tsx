import { X } from 'lucide-react';
import { Flame } from 'lucide-react';
import { getTodayKey } from '@/lib/store';
import { setDayType } from '@/lib/calorie-correction';
import { toast } from 'sonner';
import type { DayType } from '@/lib/calorie-correction';

interface Props {
  showCorrectionBadge: boolean;
  setShowCorrectionBadge: (v: boolean) => void;
  setWhyModalOpen: (v: boolean) => void;
  adherenceScore: number;
  balanceStreak: number;
  currentDayType: DayType;
  setCurrentDayType: (v: DayType) => void;
}

export default function CalorieCorrectionSection({
  showCorrectionBadge, setShowCorrectionBadge, setWhyModalOpen,
  adherenceScore, balanceStreak, currentDayType, setCurrentDayType,
}: Props) {
  return (
    <>
      {/* Calorie Correction Badge */}
      {showCorrectionBadge && (
        <div className="animate-fade-in">
          <button onClick={() => setWhyModalOpen(true)} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 border bg-primary/10 border-primary/20 text-left">
            <span className="text-sm">⚖️</span>
            <p className="text-[11px] font-medium text-foreground flex-1">Adjusted for balance — tap to see why</p>
            <X className="w-3.5 h-3.5 text-muted-foreground shrink-0" onClick={(e) => { e.stopPropagation(); setShowCorrectionBadge(false); }} />
          </button>
        </div>
      )}

      {/* Adherence & Streak Row */}
      {(adherenceScore > 0 || balanceStreak > 0) && (
        <div className="flex gap-2 animate-fade-in">
          {adherenceScore > 0 && (
            <div className="flex-1 card-subtle p-3 flex items-center gap-2">
              <span className="text-sm">📋</span>
              <div>
                <p className="text-xs font-semibold text-foreground">Adherence: {adherenceScore}%</p>
                <p className="text-[9px] text-muted-foreground">Last 7 days</p>
              </div>
            </div>
          )}
          {balanceStreak > 0 && (
            <div className="flex-1 card-subtle p-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" />
              <div>
                <p className="text-xs font-semibold text-foreground">{balanceStreak} day{balanceStreak !== 1 ? 's' : ''} balanced</p>
                <p className="text-[9px] text-muted-foreground">Within ±100 kcal</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Day Type Selector */}
      <div className="animate-fade-in flex items-center gap-2">
        {(['normal', 'cheat', 'recovery', 'fasting'] as DayType[]).map(dt => (
          <button
            key={dt}
            onClick={() => {
              const today = getTodayKey();
              setDayType(today, dt);
              setCurrentDayType(dt);
              toast.success(`Day marked as ${dt}`);
            }}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              currentDayType === dt
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {dt === 'normal' ? '🟢 Normal' : dt === 'cheat' ? '🎉 Cheat' : dt === 'recovery' ? '🔄 Recovery' : '🍽️ Fasting'}
          </button>
        ))}
      </div>
    </>
  );
}
