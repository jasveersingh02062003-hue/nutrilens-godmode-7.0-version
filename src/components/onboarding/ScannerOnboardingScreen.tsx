import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Camera, Upload, Sparkles, Flame, Wheat, Droplets } from 'lucide-react';

interface ScannerOnboardingScreenProps {
  onBack: () => void;
  onContinue: () => void;
}

const MOCK_RESULT = {
  name: 'Paneer Butter Masala with Naan',
  calories: 580,
  protein: 22,
  carbs: 48,
  fat: 32,
  confidence: 94,
};

type ScanState = 'idle' | 'scanning' | 'result';

export default function ScannerOnboardingScreen({ onBack, onContinue }: ScannerOnboardingScreenProps) {
  const [state, setState] = useState<ScanState>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    runScan();
  };

  const runScan = () => {
    setState('scanning');
    setTimeout(() => setState('result'), 2000);
  };

  const handleDemoScan = () => {
    setPreview(null);
    runScan();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <div>
          <h1 className="text-lg font-display font-bold text-foreground tracking-tight">Try AI Scanner</h1>
          <p className="text-xs text-muted-foreground">See how NutriLens analyzes your food</p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex-1 flex flex-col"
            >
              {/* Upload area */}
              <motion.div
                whileTap={{ scale: 0.99 }}
                onClick={() => fileRef.current?.click()}
                className="relative border-2 border-dashed border-border rounded-2xl bg-card flex flex-col items-center justify-center py-16 px-6 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Camera className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Drop a meal photo or tap to upload</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG — we'll identify every item</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </motion.div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Demo scan button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleDemoScan}
                className="w-full py-4 rounded-2xl bg-card border border-border font-semibold text-sm flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                Try Demo Scan
              </motion.button>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                No camera? The demo uses a sample meal to show you the magic.
              </p>
            </motion.div>
          )}

          {state === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center justify-center"
            >
              {preview && (
                <div className="w-48 h-48 rounded-2xl overflow-hidden mb-6 border border-border">
                  <img src={preview} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
              )}
              {!preview && (
                <div className="w-48 h-48 rounded-2xl bg-card border border-border mb-6 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}

              {/* Scanning animation */}
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                />
                <span className="text-sm font-semibold text-foreground">Analyzing your meal…</span>
              </div>

              {/* Pulsing dots */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-primary"
                  />
                ))}
              </div>
            </motion.div>
          )}

          {state === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Result card */}
              <div className="rounded-2xl bg-card border border-border p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Detected Meal</p>
                    <h3 className="text-base font-bold text-foreground mt-1">{MOCK_RESULT.name}</h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {MOCK_RESULT.confidence}%
                  </span>
                </div>

                {/* Calories hero */}
                <div className="text-center py-4 mb-4 rounded-xl bg-muted/50">
                  <p className="text-3xl font-bold text-foreground">{MOCK_RESULT.calories}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">calories</p>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3">
                  <MacroPill icon={<Flame className="w-3.5 h-3.5" />} label="Protein" value={`${MOCK_RESULT.protein}g`} color="text-coral" bg="bg-coral/10" />
                  <MacroPill icon={<Wheat className="w-3.5 h-3.5" />} label="Carbs" value={`${MOCK_RESULT.carbs}g`} color="text-primary" bg="bg-primary/10" />
                  <MacroPill icon={<Droplets className="w-3.5 h-3.5" />} label="Fat" value={`${MOCK_RESULT.fat}g`} color="text-accent" bg="bg-accent/10" />
                </div>
              </div>

              {/* Success message */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl bg-primary/5 border border-primary/10 p-4 mb-4"
              >
                <p className="text-sm text-foreground font-medium">
                  ✨ That's how fast NutriLens works!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Snap any meal and get instant AI-powered nutrition analysis — tailored to Indian foods.
                </p>
              </motion.div>

              <div className="flex-1" />

              {/* CTA */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                className="w-full py-4 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2"
              >
                Continue to Set Up Profile <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MacroPill({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`rounded-xl ${bg} p-3 text-center`}>
      <div className={`${color} flex justify-center mb-1.5`}>{icon}</div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
    </div>
  );
}
