import { memo } from 'react';
import { Plus } from 'lucide-react';
import { SupplementEntry } from '@/lib/store';

interface Props {
  supplements: SupplementEntry[];
  onAdd: () => void;
  onTap: (supplement: SupplementEntry) => void;
}

export default memo(function SupplementsCompact({ supplements, onAdd, onTap }: Props) {
  return (
    <div className="card-subtle p-3 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
            <span className="text-sm">💊</span>
          </div>
          <p className="font-semibold text-xs text-foreground">Supplements</p>
        </div>
        <button
          onClick={onAdd}
          className="w-7 h-7 rounded-lg bg-violet/10 flex items-center justify-center text-violet hover:bg-violet/20 transition-colors active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {supplements.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No supplements today</p>
      ) : (
        <div className="space-y-1">
          {supplements.slice(0, 2).map(s => (
            <button
              key={s.id}
              onClick={() => onTap(s)}
              className="w-full flex items-center gap-1.5 text-left"
            >
              <span className="text-xs flex-shrink-0">{s.icon}</span>
              <p className="text-[10px] text-foreground truncate font-medium">{s.name}</p>
            </button>
          ))}
          {supplements.length > 2 && (
            <p className="text-[10px] text-muted-foreground">+{supplements.length - 2} more</p>
          )}
        </div>
      )}
    </div>
  );
});
