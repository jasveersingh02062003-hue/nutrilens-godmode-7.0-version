import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Brain, Trash2, AlertTriangle, BarChart3, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { getAILearningConsent, setAILearningConsent, getCorrections, clearCorrections } from '@/lib/corrections';
import { getLearningData, saveLearningData, setWarningSensitivity } from '@/lib/learning-service';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AILearningSheet({ open, onClose }: Props) {
  const [consent, setConsent] = useState(getAILearningConsent());
  const [learning, setLearning] = useState(getLearningData());
  const corrections = getCorrections();
  const [sensitivity, setSensitivity] = useState(learning.warningSensitivity);

  const handleConsentToggle = (v: boolean) => {
    setConsent(v);
    setAILearningConsent(v);
    toast.success(v ? 'AI learning enabled' : 'AI learning disabled');
  };

  const handleSensitivityChange = (val: number[]) => {
    const v = val[0];
    setSensitivity(v);
    setWarningSensitivity(v);
    setLearning(getLearningData());
  };

  const handleClearCorrections = () => {
    if (!confirm('Clear all AI corrections? This cannot be undone.')) return;
    clearCorrections();
    toast.success('Corrections cleared');
  };

  const handleResetWarnings = () => {
    if (!confirm('Reset all ignored warning counts?')) return;
    const data = getLearningData();
    data.ignoredWarnings = [];
    saveLearningData(data);
    setLearning(getLearningData());
    toast.success('Warning counts reset');
  };

  const totalIgnored = learning.ignoredWarnings.reduce((s, w) => s + w.count, 0);
  const sensitivityLabels = ['Very Low', 'Low', 'Normal', 'High', 'Very High'];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Learning
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4 overflow-y-auto max-h-[70vh] pb-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-elevated p-4 text-center">
              <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{corrections.length}</p>
              <p className="text-[10px] text-muted-foreground">Corrections Stored</p>
            </div>
            <div className="card-elevated p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalIgnored}</p>
              <p className="text-[10px] text-muted-foreground">Ignored Warnings</p>
            </div>
          </div>

          {/* Share Corrections Toggle */}
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Share corrections</p>
                <p className="text-[10px] text-muted-foreground">Help improve AI accuracy anonymously</p>
              </div>
              <Switch checked={consent} onCheckedChange={handleConsentToggle} />
            </div>
          </div>

          {/* Warning Sensitivity */}
          <div className="card-elevated p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Warning Sensitivity</p>
              <span className="text-xs font-semibold text-primary">{sensitivityLabels[sensitivity - 1]}</span>
            </div>
            <Slider
              value={[sensitivity]}
              onValueChange={handleSensitivityChange}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              Higher sensitivity = more frequent warnings about nutrition, budget, and health patterns
            </p>
          </div>

          {/* Ignored Warnings Breakdown */}
          {learning.ignoredWarnings.length > 0 && (
            <div className="card-elevated p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ignored Warnings by Type</p>
              {learning.ignoredWarnings.map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-foreground capitalize">{w.warningType.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{w.count}×</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleClearCorrections}
              disabled={corrections.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" /> Clear All Corrections ({corrections.length})
            </button>
            <button
              onClick={handleResetWarnings}
              disabled={totalIgnored === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" /> Reset Warning Counts
            </button>
          </div>

          {/* Last Updated */}
          <p className="text-[10px] text-muted-foreground text-center">
            Last updated: {new Date(learning.lastUpdated).toLocaleString()}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
