import { Plus, ChevronRight } from 'lucide-react';
import { SupplementEntry } from '@/lib/store';

interface Props {
  supplements: SupplementEntry[];
  onAdd: () => void;
  onTap: (supplement: SupplementEntry) => void;
}

export default function SupplementsCard({ supplements, onAdd, onTap }: Props) {
  return (
    <div className="card-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-violet/10 flex items-center justify-center">
            <span className="text-lg">💊</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Supplements</p>
            <p className="text-[11px] text-muted-foreground">
              {supplements.length > 0
                ? `${supplements.length} logged today`
                : 'Track your daily supplements'}
            </p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet/10 text-violet text-xs font-semibold hover:bg-violet/20 transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {supplements.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No supplements logged today</p>
      ) : (
        <div className="space-y-1.5">
          {supplements.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onTap(s)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left animate-fade-in active:scale-[0.98]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-lg flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {s.name}{s.brand ? ` – ${s.brand}` : ''}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.dosage} {s.unit} · {s.time}
                </p>
              </div>
              {(s.calories > 0) && (
                <span className="text-[10px] font-bold text-muted-foreground">{s.calories} kcal</span>
              )}
              <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
