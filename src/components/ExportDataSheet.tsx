import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileText, Calendar, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { getRecentLogs, getAllLogDates, getDailyLog, getDailyTotals } from '@/lib/store';
import { isPremium } from '@/lib/subscription-service';
import UpgradeModal from './UpgradeModal';
import { getSymptomLogs } from '@/lib/symptom-service';
import { getWeightHistory } from '@/lib/store';
import { getPantryItems } from '@/lib/pantry-store';

type DataType = 'meals' | 'expenses' | 'weight' | 'symptoms' | 'pantry';
type DateRange = 'all' | '30' | '90' | 'custom';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExportDataSheet({ open, onClose }: Props) {
  const [selected, setSelected] = useState<DataType[]>(['meals']);
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [exporting, setExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const premium = isPremium();

  const toggle = (t: DataType) => {
    setSelected(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const dataTypes: { key: DataType; label: string; desc: string }[] = [
    { key: 'meals', label: 'Meals & Nutrition', desc: 'Daily meals with calories and macros' },
    { key: 'expenses', label: 'Expenses', desc: 'Food spending per meal' },
    { key: 'weight', label: 'Weight Logs', desc: 'Weight tracking history' },
    { key: 'symptoms', label: 'Symptom Logs', desc: 'Energy, mood, bloating, etc.' },
    { key: 'pantry', label: 'Pantry Items', desc: 'Current pantry inventory' },
  ];

  const ranges: { key: DateRange; label: string }[] = [
    { key: '30', label: 'Last 30 days' },
    { key: '90', label: 'Last 90 days' },
    { key: 'all', label: 'All time' },
  ];

  const handleExport = () => {
    if (!premium) {
      setShowUpgrade(true);
      return;
    }
    if (selected.length === 0) {
      toast.error('Select at least one data type');
      return;
    }

    setExporting(true);

    try {
      const days = dateRange === 'all' ? 365 : dateRange === '90' ? 90 : 30;
      const csvParts: string[] = [];

      if (selected.includes('meals')) {
        csvParts.push(generateMealsCSV(days));
      }
      if (selected.includes('expenses')) {
        csvParts.push(generateExpensesCSV(days));
      }
      if (selected.includes('weight')) {
        csvParts.push(generateWeightCSV(days));
      }
      if (selected.includes('symptoms')) {
        csvParts.push(generateSymptomsCSV());
      }
      if (selected.includes('pantry')) {
        csvParts.push(generatePantryCSV());
      }

      const csv = csvParts.join('\n\n');
      downloadCSV(csv, `nutrilens-export-${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('Data exported successfully!');
    } catch (e) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" /> Export Data
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 overflow-y-auto max-h-[65vh] pb-8">
          {/* Data Types */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Data</p>
            {dataTypes.map(dt => (
              <button
                key={dt.key}
                onClick={() => toggle(dt.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  selected.includes(dt.key) ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50 border border-transparent'
                }`}
              >
                <Checkbox checked={selected.includes(dt.key)} />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{dt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{dt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Range
            </p>
            <div className="flex gap-2">
              {ranges.map(r => (
                <button
                  key={r.key}
                  onClick={() => setDateRange(r.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    dateRange === r.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Info */}
          <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Export format: CSV (compatible with Excel, Google Sheets)</p>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || selected.length === 0}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {premium ? <Download className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
            {!premium ? 'Upgrade to Export' : exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
        </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </SheetContent>
    </Sheet>
  );
}

// ── CSV generators ──

function generateMealsCSV(days: number): string {
  const logs = getRecentLogs(days);
  const rows = ['--- MEALS ---', 'Date,Meal Type,Food,Calories,Protein(g),Carbs(g),Fat(g),Time'];
  for (const log of logs) {
    for (const meal of log.meals) {
      for (const item of meal.items) {
        rows.push(`${log.date},${meal.type},${esc(item.name)},${item.calories},${item.protein},${item.carbs},${item.fat},${meal.time}`);
      }
    }
  }
  return rows.join('\n');
}

function generateExpensesCSV(days: number): string {
  const logs = getRecentLogs(days);
  const rows = ['--- EXPENSES ---', 'Date,Meal Type,Source,Amount,Restaurant'];
  for (const log of logs) {
    for (const meal of log.meals) {
      if (meal.cost?.amount) {
        rows.push(`${log.date},${meal.type},${meal.source?.category || ''},${meal.cost.amount},${esc(meal.restaurantName || '')}`);
      }
    }
  }
  return rows.join('\n');
}

function generateWeightCSV(days: number): string {
  const entries = getWeightHistory(days);
  const rows = ['--- WEIGHT ---', 'Date,Weight,Unit'];
  for (const e of entries) {
    rows.push(`${e.date},${e.weight},${e.unit}`);
  }
  return rows.join('\n');
}

function generateSymptomsCSV(): string {
  const symptoms = getSymptomLogs();
  const rows = ['--- SYMPTOMS ---', 'Date,Energy,Mood,Bloating,Skin,Hunger,Sleep,Notes'];
  for (const s of symptoms) {
    rows.push(`${s.date},${s.energy || ''},${s.mood || ''},${s.bloating || ''},${s.skin || ''},${s.hunger || ''},${s.sleep || ''},${esc(s.notes || '')}`);
  }
  return rows.join('\n');
}

function generatePantryCSV(): string {
  const items = getPantryItems();
  const rows = ['--- PANTRY ---', 'Name,Quantity,Unit,Price Paid,Purchase Date,Expiry Date,Category'];
  for (const i of items) {
    rows.push(`${esc(i.name)},${i.quantity},${i.unit},${i.pricePaid},${i.purchaseDate},${i.expiryDate || ''},${i.category}`);
  }
  return rows.join('\n');
}

function esc(s: string): string {
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
