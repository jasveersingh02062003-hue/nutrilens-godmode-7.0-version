import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { Scale, Star, Check } from 'lucide-react';
import { type CompareItem, COMPARE_METRICS, getWinnerIndex } from '@/lib/compare-helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  items: CompareItem[];
  onPick: (item: CompareItem) => void;
}

export default function ComparisonSheet({ open, onClose, items, onPick }: Props) {
  if (items.length < 2) return null;

  const pesValues = items.map(i => i.pes);
  const pesWinner = getWinnerIndex(pesValues);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Scale className="w-4 h-4 text-primary" /> Compare Items
          </SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6">
          {/* Column headers */}
          <div className={`grid gap-2 pb-3 border-b border-border`} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
            {items.map((item, i) => (
              <div key={item.id} className="text-center">
                {item.image && (
                  <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover mx-auto mb-1" />
                )}
                <p className="text-xs font-bold text-foreground line-clamp-2">{item.name}</p>
              </div>
            ))}
          </div>

          {/* Metric rows */}
          {COMPARE_METRICS.map((metric, rowIdx) => {
            const values = items.map(i => i[metric.key] as number);
            const winner = getWinnerIndex(values, metric.lowerIsBetter);

            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIdx * 0.05 }}
                className="grid gap-2 py-2.5 border-b border-border/50 last:border-0 items-center"
                style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
              >
                {items.map((item, colIdx) => (
                  <div
                    key={item.id}
                    className={`text-center rounded-lg py-1.5 ${winner === colIdx ? 'bg-green-500/10' : ''}`}
                  >
                    <span className={`text-sm font-bold ${winner === colIdx ? 'text-green-600' : 'text-foreground'}`}>
                      {metric.unit === '₹' ? '₹' : ''}{(item[metric.key] as number)}{metric.unit !== '₹' ? metric.unit : ''}
                    </span>
                    {winner === colIdx && <span className="text-[10px] ml-0.5">✅</span>}
                  </div>
                ))}
              </motion.div>
            );
          })}

          {/* Row label strip (centered below) */}
          <div className="flex justify-center gap-3 py-2 flex-wrap">
            {COMPARE_METRICS.map(m => (
              <span key={m.key} className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{m.label}</span>
            ))}
          </div>

          {/* PES Score row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="grid gap-2 py-3 border-t border-primary/20 mt-1"
            style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
          >
            {items.map((item, i) => (
              <div key={item.id} className={`text-center rounded-xl py-2 ${pesWinner === i ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
                <p className="text-lg font-black text-foreground">{(item.pes * 10).toFixed(1)}</p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-wider">PES</p>
                {pesWinner === i && <Star className="w-3.5 h-3.5 text-primary mx-auto mt-0.5 fill-primary" />}
              </div>
            ))}
          </motion.div>

          {/* Pick buttons */}
          <div className="grid gap-2 mt-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
            {items.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                onClick={() => { onPick(item); onClose(); }}
                className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform ${
                  pesWinner === i
                    ? 'bg-primary text-primary-foreground shadow-fab'
                    : 'bg-muted text-foreground'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Pick
              </motion.button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
