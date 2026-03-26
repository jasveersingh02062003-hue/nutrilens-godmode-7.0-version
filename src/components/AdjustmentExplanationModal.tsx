import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getAdjustmentDetails } from '@/lib/calorie-correction';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AdjustmentExplanationModal({ open, onClose }: Props) {
  const details = getAdjustmentDetails();

  // Compute status message from today's adjustments
  const totalFutureAdj = details.futureAdjustments.reduce((s, a) => s + a.adjustment, 0);
  const statusMessage = totalFutureAdj === 0
    ? 'Your intake is well balanced — no adjustments needed.'
    : totalFutureAdj < 0
      ? `${Math.abs(totalFutureAdj)} kcal being reduced across ${details.futureAdjustments.length} days to balance surplus.`
      : `${totalFutureAdj} kcal being added across ${details.futureAdjustments.length} days to recover from deficit.`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <span>⚖️</span> Why your calories changed
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {statusMessage}
          </DialogDescription>
        </DialogHeader>

        {/* Source days that caused adjustments */}
        {details.recentSurplusDays.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What happened</p>
            {details.recentSurplusDays.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-sm">{d.surplus > 0 ? '📈' : '📉'}</span>
                <p className="text-xs text-foreground flex-1">
                  <span className="font-semibold">{format(new Date(d.date + 'T00:00:00'), 'EEEE, MMM d')}</span>
                  {' — '}
                  {d.surplus > 0 ? 'Surplus' : 'Deficit'}: {Math.abs(d.surplus)} kcal
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Future adjustment plan with sources */}
        {details.futureAdjustments.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjustment Plan</p>
            {details.futureAdjustments.map((adj) => (
              <div key={adj.date} className="rounded-lg bg-card border border-border px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {format(new Date(adj.date + 'T00:00:00'), 'EEE, MMM d')}
                  </span>
                  <span className={`text-xs font-bold ${adj.adjustment < 0 ? 'text-destructive' : 'text-primary'}`}>
                    {adj.adjustment > 0 ? '+' : ''}{adj.adjustment} kcal
                  </span>
                </div>
                {adj.sources.length > 0 && (
                  <div className="pl-2 border-l-2 border-muted space-y-0.5">
                    {adj.sources.map((src, j) => (
                      <p key={j} className="text-[10px] text-muted-foreground">
                        From {format(new Date(src.sourceDate + 'T00:00:00'), 'EEE')}: {src.appliedAdjustment > 0 ? '+' : ''}{src.appliedAdjustment} kcal
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2">
          <span className="text-sm">💪</span>
          <p className="text-[11px] text-foreground">Your protein target stays the same — always protected.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
