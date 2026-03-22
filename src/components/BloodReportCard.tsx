import { useMemo } from 'react';
import { Droplets, AlertTriangle, CheckCircle } from 'lucide-react';
import { getLatestBloodReport, analyzeDeficiencies, getSupplementSuggestions } from '@/lib/blood-report-service';
import { useUserProfile } from '@/contexts/UserProfileContext';

const statusColors = {
  low: 'bg-destructive/10 text-destructive border-destructive/10',
  borderline: 'bg-accent/10 text-accent border-accent/10',
  high: 'bg-destructive/10 text-destructive border-destructive/10',
  normal: 'bg-primary/10 text-primary border-primary/10',
};

interface Props {
  refreshKey?: number;
}

export default function BloodReportCard({ refreshKey }: Props) {
  const { profile } = useUserProfile();
  const report = useMemo(() => getLatestBloodReport(), [refreshKey]);
  const deficiencies = useMemo(() => report ? analyzeDeficiencies(report, profile?.gender) : [], [report, profile]);
  const conditions = (profile as any)?.conditions || {};
  const supplements = useMemo(() => getSupplementSuggestions(report, conditions), [report, conditions]);

  if (!report && supplements.length === 0) return null;

  return (
    <div className="card-elevated p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
          <Droplets className="w-4 h-4 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-foreground">Health Insights</h3>
          <p className="text-[10px] text-muted-foreground">
            {report ? `Last report: ${new Date(report.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Based on your conditions'}
          </p>
        </div>
      </div>

      {/* Deficiencies */}
      {deficiencies.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">Key Findings</p>
          {deficiencies.slice(0, 4).map((d, i) => (
            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${statusColors[d.status]}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{d.emoji}</span>
                <div>
                  <p className="text-[11px] font-semibold">{d.label}: {d.value} {d.unit}</p>
                  <p className="text-[9px] opacity-70">{d.suggestion}</p>
                </div>
              </div>
              <span className="text-[9px] font-bold uppercase">{d.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Supplement Suggestions */}
      {supplements.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">💊 Supplement Suggestions</p>
          {supplements.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
              <span className="text-sm mt-0.5">{s.emoji}</span>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-foreground">{s.name} – {s.dosage}</p>
                <p className="text-[9px] text-muted-foreground">{s.reason}</p>
                <p className="text-[8px] text-muted-foreground/70 mt-0.5 italic">{s.disclaimer}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
