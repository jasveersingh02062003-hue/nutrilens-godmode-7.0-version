import { useState, useRef } from 'react';
import { Share2, Download, X, CalendarDays } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { generateReportData, renderReportToCanvas, downloadReport, shareReport } from '@/lib/progress-report';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ProgressReportSheet({ open, onClose }: Props) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const generate = (p: 'weekly' | 'monthly') => {
    setPeriod(p);
    const data = generateReportData(p);
    const canvas = renderReportToCanvas(data);
    canvasRef.current = canvas;
    setPreviewUrl(canvas.toDataURL('image/png'));
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    downloadReport(canvasRef.current, period);
    toast.success('Report downloaded!');
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    const shared = await shareReport(canvasRef.current, period);
    if (!shared) {
      downloadReport(canvasRef.current, period);
      toast.success('Report saved — you can share it from your gallery');
    }
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0 bg-background">
        <SheetHeader className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-foreground">Progress Report</SheetTitle>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="px-5 space-y-4 overflow-y-auto max-h-[calc(92vh-80px)] pb-8">
          {/* Period selector */}
          <div className="flex gap-2">
            {(['weekly', 'monthly'] as const).map(p => (
              <button
                key={p}
                onClick={() => generate(p)}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border ${
                  previewUrl && period === p
                    ? 'bg-primary text-primary-foreground border-primary shadow-fab'
                    : 'bg-card border-border hover:border-primary/30'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                {p === 'weekly' ? '7-Day Report' : '30-Day Report'}
              </button>
            ))}
          </div>

          {!previewUrl && (
            <div className="card-elevated p-8 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Share2 className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Generate a shareable report</p>
              <p className="text-xs text-muted-foreground">Choose weekly or monthly above to create a beautiful progress summary you can share.</p>
            </div>
          )}

          {previewUrl && (
            <>
              {/* Preview */}
              <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
                <img src={previewUrl} alt="Progress report preview" className="w-full" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-fab active:scale-[0.98] transition-transform"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={handleDownload}
                  className="py-3.5 px-5 rounded-2xl bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted transition-colors active:scale-[0.98]"
                >
                  <Download className="w-4 h-4" /> Save
                </button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
