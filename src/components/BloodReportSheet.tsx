import { useState, useEffect } from 'react';
import { Save, ShieldAlert } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { BloodReport, saveBloodReport } from '@/lib/blood-report-service';
import { useAgeTier } from '@/hooks/useAgeTier';
import { toast } from 'sonner';

const FIELDS: Array<{ key: string; label: string; unit: string; placeholder: string; step?: string }> = [
  { key: 'hba1c', label: 'HbA1c', unit: '%', placeholder: '5.7', step: '0.1' },
  { key: 'fastingBloodSugar', label: 'Fasting Blood Sugar', unit: 'mg/dL', placeholder: '95' },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'ng/mL', placeholder: '25' },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'pg/mL', placeholder: '400' },
  { key: 'iron', label: 'Iron', unit: 'μg/dL', placeholder: '80' },
  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', placeholder: '13', step: '0.1' },
  { key: 'tsh', label: 'TSH', unit: 'mIU/L', placeholder: '2.5', step: '0.01' },
  { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL', placeholder: '180' },
  { key: 'ferritin', label: 'Ferritin', unit: 'ng/mL', placeholder: '50' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function BloodReportSheet({ open, onClose, onSaved }: Props) {
  const now = new Date();
  const [date, setDate] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`);
  const [values, setValues] = useState<Record<string, string>>({});

  const set = (key: string, val: string) => setValues(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    const report: BloodReport = {
      id: `br_${Date.now()}`,
      date,
      source: 'manual',
    };
    for (const field of FIELDS) {
      const val = values[field.key];
      if (val && !isNaN(Number(val))) {
        (report as any)[field.key] = Number(val);
      }
    }
    saveBloodReport(report);
    onSaved?.();
    onClose();
    setValues({});
  };

  const filledCount = Object.values(values).filter(v => v && !isNaN(Number(v))).length;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-bold">Enter Blood Report</SheetTitle>
          <p className="text-[11px] text-muted-foreground">Enter values you have. Leave unknown fields empty.</p>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-card border border-border text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
            />
          </div>

          {/* Fields */}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(field => (
              <div key={field.key}>
                <label className="text-[10px] font-semibold text-muted-foreground">
                  {field.label} <span className="text-muted-foreground/60">({field.unit})</span>
                </label>
                <input
                  type="number"
                  step={field.step || '1'}
                  value={values[field.key] || ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full mt-0.5 px-3 py-2.5 rounded-lg bg-card border border-border text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                />
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="px-3 py-2 rounded-xl bg-accent/10 border border-accent/10">
            <p className="text-[10px] text-accent font-medium">
              ⚠️ This data is used for personalised food recommendations only and is NOT a medical diagnosis. Always consult your doctor.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={filledCount === 0}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              filledCount > 0 ? 'bg-primary text-primary-foreground shadow-fab active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" /> Save Report ({filledCount} values)
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
