import { useState } from 'react';
import { Flame, Footprints, Plus, Trash2, Info, Dumbbell } from 'lucide-react';
import { DailyLog, deleteActivity, updateSteps, getTodayKey } from '@/lib/store';
import { ACTIVITY_TYPES } from '@/lib/activities';
import { calculateBurnBreakdown } from '@/lib/burn-service';
import { getExerciseAdjustmentSummary, getEatBackFactor } from '@/lib/exercise-adjustment';
import ActivityLogSheet from './ActivityLogSheet';
import { isPremium } from '@/lib/subscription-service';

interface Props {
  log: DailyLog;
  weightKg: number;
  onRefresh: () => void;
}

export default function CaloriesBurnedCard({ log, weightKg, onRefresh }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [stepsInput, setStepsInput] = useState('');
  const [editingSteps, setEditingSteps] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const burned = log.burned || { steps: 0, stepsCount: 0, activities: [], total: 0 };
  const breakdown = calculateBurnBreakdown(burned);
  const exerciseSummary = getExerciseAdjustmentSummary(log.date || getTodayKey());
  const eatBackFactor = getEatBackFactor();

  const handleStepsSave = () => {
    const count = parseInt(stepsInput) || 0;
    updateSteps(count, weightKg);
    setEditingSteps(false);
    setStepsInput('');
    onRefresh();
  };

  const handleDeleteActivity = (id: string) => {
    deleteActivity(id);
    onRefresh();
  };

  const getActivityIcon = (type: string) =>
    ACTIVITY_TYPES.find(a => a.id === type)?.icon || '🏅';

  const getActivityName = (type: string) =>
    ACTIVITY_TYPES.find(a => a.id === type)?.name || type;

  return (
    <>
      <div className="card-subtle p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-coral/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-coral" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Calories Burned</p>
              <p className="text-[11px] text-muted-foreground">Steps & activities</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-coral">{breakdown.effectiveBurn}</p>
            <p className="text-[10px] text-muted-foreground">kcal used</p>
          </div>
        </div>

        {/* Raw vs Effective breakdown */}
        {breakdown.rawBurn > 0 && (
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 mb-2 text-left"
          >
            <div className="flex items-center gap-1.5">
              <Info className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {breakdown.rawBurn} kcal burned → {breakdown.effectiveBurn} kcal used
                {breakdown.capApplied && ' (capped)'}
              </span>
            </div>
          </button>
        )}

        {showBreakdown && breakdown.rawBurn > 0 && (
          <div className="px-3 py-2 rounded-lg bg-muted/20 mb-2 space-y-1 text-[10px] text-muted-foreground">
            <p>Raw burned: <span className="font-semibold text-foreground">{breakdown.rawBurn} kcal</span></p>
            <p>Confidence-weighted: <span className="font-semibold text-foreground">{breakdown.weightedBurn} kcal</span></p>
            <p>Safety cap (70%): <span className="font-semibold text-foreground">{Math.round(breakdown.rawBurn * 0.7)} kcal</span></p>
            <p>Effective (used): <span className="font-bold text-coral">{breakdown.effectiveBurn} kcal</span></p>
            <p className="text-[9px] mt-1 italic">Burns are weighted by activity type and source reliability to prevent over-eating.</p>
          </div>
        )}

        {/* Steps */}
        <div className="p-3 rounded-xl bg-muted/50 mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {burned.stepsCount > 0 ? `${burned.stepsCount.toLocaleString()} steps` : '— steps'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {burned.steps > 0 ? `${burned.steps} kcal burned` : 'Tap to enter steps'}
                </p>
              </div>
            </div>
            {editingSteps ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={stepsInput}
                  onChange={e => setStepsInput(e.target.value)}
                  placeholder="Steps"
                  className="w-20 px-2 py-1 text-xs rounded-lg border border-input bg-background text-foreground"
                  autoFocus
                />
                <button onClick={handleStepsSave} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold">
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingSteps(true); setStepsInput(burned.stepsCount > 0 ? String(burned.stepsCount) : ''); }}
                className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold"
              >
                {burned.stepsCount > 0 ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
        </div>

        {/* Activities */}
        {burned.activities.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {burned.activities.map((a, i) => (
              <div key={a.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="text-lg flex-shrink-0">{getActivityIcon(a.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{getActivityName(a.type)}</p>
                  <p className="text-[10px] text-muted-foreground">{a.duration}min · {a.intensity} · {a.time}</p>
                </div>
                <span className="text-xs font-bold text-coral">{a.calories} kcal</span>
                <button onClick={() => handleDeleteActivity(a.id)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Per-Exercise Adjustment Breakdown (Premium only) */}
        {isPremium() && exerciseSummary && (
          <div className="p-2.5 rounded-lg bg-coral/5 border border-coral/20 mb-2 space-y-2">
            <div className="flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-coral" />
              <span className="text-[11px] font-semibold text-foreground">
                Meal Adjustments
              </span>
              <span className="text-[9px] text-muted-foreground ml-auto">
                {Math.round(eatBackFactor * 100)}% eat-back
              </span>
            </div>

            {/* Per-exercise entries */}
            {exerciseSummary.perExercise.map((ex, i) => (
              <div key={i} className="px-2 py-1.5 rounded-md bg-muted/30 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-foreground capitalize">
                    {ex.activityType} · {ex.rawCalories} kcal burned
                  </span>
                  <span className="text-[10px] font-bold text-coral">
                    +{ex.addedCalories} kcal
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {ex.distribution.map(d => (
                    <span key={d.mealType} className="text-[9px] text-muted-foreground">
                      {d.mealType}: <span className="font-semibold text-coral">+{d.added}</span>
                    </span>
                  ))}
                </div>
                {ex.wasLateLogged && (
                  <p className="text-[9px] text-status-warning italic">⏰ Late-logged — impact reduced 50%</p>
                )}
              </div>
            ))}

            {/* Totals */}
            <div className="flex items-center justify-between pt-1 border-t border-border/30">
              <span className="text-[10px] font-semibold text-muted-foreground">Total added to meals</span>
              <span className="text-[11px] font-bold text-coral">+{exerciseSummary.totalAdded} kcal</span>
            </div>

            {exerciseSummary.hasRecoverySnack && (
              <p className="text-[9px] text-primary">
                🥤 Recovery snack: +{exerciseSummary.recoverySnackCalories} kcal available
              </p>
            )}
            {exerciseSummary.hasCarryForward && (
              <p className="text-[9px] text-muted-foreground">
                📅 +{exerciseSummary.carryForwardCalories} kcal carried to tomorrow
              </p>
            )}
          </div>
        )}

        {/* Add Activity button */}
        <button
          onClick={() => setSheetOpen(true)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-coral/10 text-coral text-xs font-semibold hover:bg-coral/20 transition-colors active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" /> Add Activity
        </button>
      </div>

      <ActivityLogSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={onRefresh}
        weightKg={weightKg}
      />
    </>
  );
}
