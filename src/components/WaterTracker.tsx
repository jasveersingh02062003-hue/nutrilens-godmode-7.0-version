import { memo } from 'react';
import { Droplets, Plus } from 'lucide-react';

interface Props {
  cups: number;
  goal: number;
  onAdd: () => void;
}

export default memo(function WaterTracker({ cups, goal, onAdd }: Props) {
  const goalCups = Math.round(goal / 250);
  const pct = Math.min(100, (cups / goalCups) * 100);

  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Droplets className="w-4.5 h-4.5 text-secondary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Hydration</p>
            <p className="text-[11px] text-muted-foreground">{cups * 250}ml of {goal}ml</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold hover:bg-secondary/20 transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add Cup
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-secondary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">{cups}/{goalCups}</span>
      </div>
    </div>
  );
});
