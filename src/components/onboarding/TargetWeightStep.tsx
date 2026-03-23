import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Info, AlertTriangle, Lightbulb, Target, Minus, Plus, Sparkles } from 'lucide-react';

interface WeightInsight {
  type: string;
  color: 'green' | 'amber' | 'red';
  message: string;
  suggestion?: number;
  milestone?: number;
}

interface TargetWeightStepProps {
  currentWeight: number;
  heightCm: number;
  age: number;
  goal: string;
  targetWeight: number;
  onChangeTarget: (v: number) => void;
  healthyMin: number;
  healthyMax: number;
  targetBMI: number;
  insight: WeightInsight | null;
}

export default function TargetWeightStep({
  currentWeight, heightCm, age, goal, targetWeight, onChangeTarget,
  healthyMin, healthyMax, targetBMI, insight,
}: TargetWeightStepProps) {
  const isLose = goal === 'lose';
  const hM = heightCm / 100;

  // Range bar calculations
  const rangeMin = Math.min(healthyMin - 10, targetWeight - 5, 40);
  const rangeMax = Math.max(healthyMax + 10, currentWeight + 5, targetWeight + 5);
  const span = rangeMax - rangeMin;
  const healthyStartPct = ((healthyMin - rangeMin) / span) * 100;
  const healthyWidthPct = ((healthyMax - healthyMin) / span) * 100;
  const targetPct = targetWeight > 0 ? ((targetWeight - rangeMin) / span) * 100 : 0;
  const currentPct = ((currentWeight - rangeMin) / span) * 100;
  const inGreenZone = insight?.color === 'green';

  const step = (delta: number) => {
    const next = +(targetWeight + delta).toFixed(1);
    if (next > 0 && next <= 300) onChangeTarget(next);
  };

  const bmiColor = targetBMI >= 18.5 && targetBMI <= 24.9
    ? 'bg-primary/15 text-primary'
    : targetBMI >= 16 && targetBMI <= 29.9
      ? 'bg-accent/15 text-accent'
      : 'bg-destructive/15 text-destructive';

  const insightColors = {
    green: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary' },
    amber: { bg: 'bg-accent/5', border: 'border-accent/20', icon: 'text-accent' },
    red: { bg: 'bg-destructive/5', border: 'border-destructive/20', icon: 'text-destructive' },
  };

  return (
    <div className="space-y-5">
      {/* Stepper input */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-5">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => step(-0.5)}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground active:bg-muted/70 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </motion.button>

          <div className="text-center">
            <motion.span
              key={targetWeight}
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl font-bold text-foreground tabular-nums"
            >
              {targetWeight > 0 ? targetWeight : '—'}
            </motion.span>
            <span className="text-lg text-muted-foreground ml-1">kg</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => step(0.5)}
            className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-foreground active:bg-muted/70 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        {/* BMI pill + healthy range */}
        {targetWeight > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1">
            <motion.span
              key={targetBMI}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${bmiColor}`}
            >
              BMI {targetBMI}
            </motion.span>
            <p className="text-[10px] text-muted-foreground">
              Healthy range: <span className="font-semibold text-primary">{healthyMin}–{healthyMax} kg</span>
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Manual input */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div className="relative">
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="number"
            value={targetWeight || ''}
            onChange={e => onChangeTarget(parseFloat(e.target.value) || 0)}
            placeholder="Enter target weight"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/40 transition-all"
          />
        </div>
      </motion.div>

      {/* Gradient range bar */}
      {targetWeight > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Weight Range</p>
          <div className="relative h-4 rounded-full overflow-hidden"
            style={{
              background: `linear-gradient(to right, hsl(var(--destructive)) 0%, hsl(var(--accent)) ${Math.max(0, healthyStartPct - 5)}%, hsl(var(--primary)) ${healthyStartPct}%, hsl(var(--primary)) ${healthyStartPct + healthyWidthPct}%, hsl(var(--accent)) ${healthyStartPct + healthyWidthPct + 5}%, hsl(var(--destructive)) 100%)`
            }}
          >
            {/* Current weight tick */}
            <div className="absolute top-0 w-0.5 h-full bg-foreground/40"
              style={{ left: `${Math.min(99, Math.max(1, currentPct))}%` }} />

            {/* Target marker */}
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-[3px] border-card"
              style={{
                backgroundColor: insight?.color === 'green' ? 'hsl(var(--primary))' : insight?.color === 'amber' ? 'hsl(var(--accent))' : 'hsl(var(--destructive))',
                boxShadow: inGreenZone ? '0 0 12px hsl(var(--primary) / 0.5)' : '0 2px 6px rgba(0,0,0,0.2)',
              }}
              initial={{ left: '50%' }}
              animate={{ left: `${Math.min(96, Math.max(4, targetPct))}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>{Math.round(rangeMin)} kg</span>
            <span className="text-primary font-semibold">{healthyMin}–{healthyMax}</span>
            <span>{Math.round(rangeMax)} kg</span>
          </div>
        </motion.div>
      )}

      {/* Insight card */}
      <AnimatePresence mode="wait">
        {insight && targetWeight > 0 && (
          <motion.div
            key={insight.type + insight.message}
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className={`${insightColors[insight.color].bg} border ${insightColors[insight.color].border} rounded-xl p-4 space-y-3 overflow-hidden`}
          >
            <div className="flex items-start gap-2.5">
              {insight.color === 'green' && <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${insightColors.green.icon}`} />}
              {insight.color === 'amber' && <Info className={`w-4 h-4 mt-0.5 shrink-0 ${insightColors.amber.icon}`} />}
              {insight.color === 'red' && <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${insightColors.red.icon}`} />}
              <p className="text-xs text-foreground leading-relaxed">{insight.message}</p>
            </div>

            {insight.suggestion && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onChangeTarget(insight.suggestion!)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                Suggest healthy weight: {insight.suggestion} kg
              </motion.button>
            )}

            {insight.milestone && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onChangeTarget(insight.milestone!)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/15 transition-colors"
              >
                <Target className="w-3.5 h-3.5" />
                Set 7.5% milestone: {insight.milestone} kg
              </motion.button>
            )}

            {age < 20 && (
              <p className="text-[10px] text-muted-foreground italic">
                Teen growth rates vary — these ranges are general guidance. Consult a healthcare professional for personalized advice.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
