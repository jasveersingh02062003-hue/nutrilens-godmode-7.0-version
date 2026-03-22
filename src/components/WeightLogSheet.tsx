import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, X, ArrowUpDown, Camera, Image as ImageIcon, AlertTriangle, StickyNote } from 'lucide-react';
import { logWeight, getTodayKey } from '@/lib/store';
import { addWeightEntry, getWeekStart, type WeightEntry } from '@/lib/weight-history';
import { watermarkImage } from '@/lib/photo-watermark';
import { fileToDataUrl } from '@/lib/photo-store';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultWeight?: number;
}

type Step = 'photo' | 'details';

export default function WeightLogSheet({ open, onClose, onSaved, defaultWeight }: Props) {
  const [step, setStep] = useState<Step>('photo');
  const [weight, setWeight] = useState(defaultWeight?.toString() || '');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [date, setDate] = useState(getTodayKey());
  const [note, setNote] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showGalleryWarning, setShowGalleryWarning] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('photo');
    setWeight(defaultWeight?.toString() || '');
    setUnit('kg');
    setDate(getTodayKey());
    setNote('');
    setPhotoDataUrl(null);
    setWatermarkedUrl(null);
    setIsVerified(false);
    setProcessing(false);
    setShowGalleryWarning(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePhotoCapture = async (file: File, verified: boolean) => {
    setProcessing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhotoDataUrl(dataUrl);
      setIsVerified(verified);

      const watermarked = await watermarkImage(dataUrl, {
        verified,
        timestamp: new Date(),
      });
      setWatermarkedUrl(watermarked);
      setStep('details');
    } catch {
      toast.error('Failed to process photo');
    }
    setProcessing(false);
  };

  const handleSkipPhoto = () => {
    setIsVerified(false);
    setPhotoDataUrl(null);
    setWatermarkedUrl(null);
    setStep('details');
  };

  const handleSave = () => {
    const val = parseFloat(weight);
    if (!val || val <= 0 || val > 500) {
      toast.error('Enter a valid weight');
      return;
    }

    // Save to daily log (backward compat)
    logWeight(date, val, unit);

    // Save to weight history
    const entry: WeightEntry = {
      id: `wt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      date,
      weekStart: getWeekStart(date),
      weight: val,
      unit,
      photo: watermarkedUrl,
      verified: isVerified,
      note,
      timestamp: new Date().toISOString(),
    };
    addWeightEntry(entry);

    toast.success(
      `Weight logged: ${val} ${unit}${isVerified ? ' ✓' : ''}`,
      { description: isVerified ? 'Verified with live photo' : undefined }
    );
    onSaved();
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 500 }}
            animate={{ y: 0 }}
            exit={{ y: 500 }}
            className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  {step === 'photo' ? 'Take Scale Photo' : 'Log Weight'}
                </h3>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: '75vh' }}>
              <AnimatePresence mode="wait">
                {/* STEP 1: Photo Capture */}
                {step === 'photo' && (
                  <motion.div
                    key="photo"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Guide text */}
                    <div className="text-center py-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="text-base font-bold text-foreground mb-1">Capture Your Scale</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                        Take a live photo of yourself on the weighing scale for verified tracking. 
                        A timestamp & NutriLens AI watermark will be added automatically.
                      </p>
                    </div>

                    {/* Camera button (primary) */}
                    <button
                      onClick={() => cameraRef.current?.click()}
                      disabled={processing}
                      className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2.5 shadow-fab active:scale-[0.98] transition-transform"
                    >
                      <Camera className="w-5 h-5" />
                      {processing ? 'Processing...' : 'Take Live Photo'}
                    </button>

                    {/* Recommended badge */}
                    <p className="text-center text-[10px] text-primary font-semibold -mt-2">⭐ Recommended for verified tracking</p>

                    {/* Gallery fallback */}
                    <button
                      onClick={() => setShowGalleryWarning(true)}
                      disabled={processing}
                      className="w-full py-3 rounded-2xl bg-muted text-muted-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted/80 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Upload from Gallery
                    </button>

                    {/* Skip photo */}
                    <button
                      onClick={handleSkipPhoto}
                      className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Skip photo — log weight only
                    </button>

                    {/* Hidden inputs */}
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoCapture(file, true);
                        e.target.value = '';
                      }}
                    />
                    <input
                      ref={galleryRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoCapture(file, false);
                        e.target.value = '';
                      }}
                    />

                    {/* Gallery warning dialog */}
                    <AnimatePresence>
                      {showGalleryWarning && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="bg-accent/5 border border-accent/20 rounded-2xl p-4 space-y-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold text-foreground">Use a live photo instead?</p>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                For accurate tracking, we recommend taking a live photo. 
                                Gallery photos may not reflect your current progress and will be marked as "unverified."
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowGalleryWarning(false);
                                galleryRef.current?.click();
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-muted text-xs font-semibold text-foreground"
                            >
                              Continue anyway
                            </button>
                            <button
                              onClick={() => {
                                setShowGalleryWarning(false);
                                cameraRef.current?.click();
                              }}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground"
                            >
                              Take Live Photo
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* STEP 2: Weight + Details */}
                {step === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {/* Photo preview (if captured) */}
                    {watermarkedUrl && (
                      <div className="rounded-2xl overflow-hidden aspect-[4/3] max-h-44 mx-auto relative">
                        <img src={watermarkedUrl} alt="Scale photo" className="w-full h-full object-cover" />
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isVerified ? 'bg-primary/80 text-primary-foreground' : 'bg-accent/80 text-accent-foreground'
                        }`}>
                          {isVerified ? '✓ Verified' : '⚠ Unverified'}
                        </div>
                      </div>
                    )}

                    {/* Weight input */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weight *</label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input
                          type="number"
                          step="0.1"
                          value={weight}
                          onChange={e => setWeight(e.target.value)}
                          placeholder="0.0"
                          className="flex-1 px-4 py-3 rounded-xl bg-muted text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                          autoFocus
                        />
                        <button
                          onClick={() => setUnit(u => u === 'kg' ? 'lbs' : 'kg')}
                          className="px-4 py-3 rounded-xl bg-muted text-sm font-bold text-foreground flex items-center gap-1.5 hover:bg-primary/10 transition-colors"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          {unit}
                        </button>
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <StickyNote className="w-3 h-3" /> Note (optional)
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g., morning fasted"
                        className="w-full mt-1.5 px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        max={getTodayKey()}
                        className="w-full mt-1.5 px-4 py-3 rounded-xl bg-muted text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStep('photo')}
                        className="px-4 py-3 rounded-2xl bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-fab active:scale-[0.98] transition-transform"
                      >
                        Save Weight {isVerified ? '✓' : ''}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
