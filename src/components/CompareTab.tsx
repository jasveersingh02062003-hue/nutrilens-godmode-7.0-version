import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Scale, ChefHat, Home, Camera, Mic, ScanLine, Sparkles, Minus, Plus, Pencil, IndianRupee, ImagePlus } from 'lucide-react';
import { searchIndianFoods, type IndianFood } from '@/lib/indian-foods';
import { recipes, type Recipe } from '@/lib/recipes';
import { type CompareItem, buildFromFood, buildFromRecipe, buildFromAnalyzed, rebuildFoodAtServing, COMPARE_METRICS } from '@/lib/compare-helpers';
import { supabase } from '@/integrations/supabase/client';
import VoiceWaveform from '@/components/VoiceWaveform';

// ─── Search hook ───
interface SearchResult {
  id: string;
  name: string;
  type: 'food' | 'recipe';
  sub: string;
  source: IndianFood | Recipe;
}

function useSearch(query: string): SearchResult[] {
  return useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const foodResults = searchIndianFoods(query).slice(0, 8).map(f => ({
      id: `food-${f.id}`,
      name: f.name,
      type: 'food' as const,
      sub: `${Math.round(f.calories * f.defaultServing / 100)} kcal · ${f.category}`,
      source: f,
    }));
    const recipeResults = recipes
      .filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(r => ({
        id: `recipe-${r.id}`,
        name: r.name,
        type: 'recipe' as const,
        sub: `${r.calories} kcal · ${r.cuisine}`,
        source: r,
      }));
    return [...foodResults, ...recipeResults].slice(0, 10);
  }, [query]);
}

// ─── Input Mode Button ───
function ModeButton({ icon: Icon, label, active, onClick, color }: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all ${
        active
          ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
      }`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="text-[8px] font-semibold leading-none">{label}</span>
    </motion.button>
  );
}

// ─── Camera Capture Component ───
function CameraCapture({ onCapture, onClose }: { onCapture: (item: CompareItem) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => onClose());
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [onClose]);

  const capture = useCallback(async () => {
    if (!videoRef.current) return;
    setAnalyzing(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const { data } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64: base64 },
      });
      if (data?.foodItems?.[0]) {
        const item = data.foodItems[0];
        onCapture(buildFromAnalyzed({
          name: item.name,
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
          fiber: item.fiber || 0,
        }));
      }
    } catch {
      // silently fail
    } finally {
      streamRef.current?.getTracks().forEach(t => t.stop());
      onClose();
    }
  }, [onCapture, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]"
    >
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {analyzing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <ScanLine className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-[10px] text-white font-medium">Analyzing...</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={capture}
          disabled={analyzing}
          className="w-12 h-12 rounded-full bg-white/90 border-4 border-primary flex items-center justify-center shadow-lg"
        >
          <Camera className="w-5 h-5 text-primary" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onClose(); }}
          className="w-10 h-10 rounded-full bg-destructive/80 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-white" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Upload from Gallery Component ───
function UploadCapture({ onCapture, onClose }: { onCapture: (item: CompareItem) => void; onClose: () => void }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-open file picker on mount
    fileRef.current?.click();
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }

    setAnalyzing(true);

    // Read as data URL for preview
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];

      try {
        const { data } = await supabase.functions.invoke('analyze-food', {
          body: { imageBase64: base64 },
        });
        if (data?.foodItems?.[0]) {
          const item = data.foodItems[0];
          onCapture(buildFromAnalyzed({
            name: item.name,
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fat: item.fat || 0,
            fiber: item.fiber || 0,
          }));
        } else {
          onClose();
        }
      } catch {
        onClose();
      }
    };
    reader.onerror = () => onClose();
    reader.readAsDataURL(file);
  }, [onCapture, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl bg-muted/80 p-3 flex flex-col items-center gap-2"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {analyzing ? (
        <>
          {preview && (
            <img src={preview} alt="Uploaded" className="w-20 h-20 rounded-lg object-cover" />
          )}
          <div className="flex items-center gap-1.5">
            <ScanLine className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-medium">Analyzing photo...</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-2">
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Select a photo</span>
          <button onClick={() => fileRef.current?.click()}
            className="text-[10px] text-primary font-semibold">Browse</button>
        </div>
      )}
      <button onClick={onClose} className="text-[9px] text-destructive font-semibold">Cancel</button>
    </motion.div>
  );
}

function VoiceInput({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const [amplitude, setAmplitude] = useState(0);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) { onClose(); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setTranscript(text);
      setAmplitude(0.3 + Math.random() * 0.7);
      if (e.results[0]?.isFinal) {
        onResult(text);
      }
    };
    recognition.onerror = () => onClose();
    recognition.onend = () => onClose();
    recognition.start();

    return () => { try { recognition.stop(); } catch {} };
  }, [onResult, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="rounded-xl bg-muted/80 p-3 flex flex-col items-center gap-2"
    >
      <VoiceWaveform amplitude={amplitude} />
      <p className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">
        {transcript || 'Say a food name...'}
      </p>
      <button onClick={() => { try { recognitionRef.current?.stop(); } catch {} onClose(); }}
        className="text-[10px] text-destructive font-semibold">Cancel</button>
    </motion.div>
  );
}

// ─── Quantity Adjuster ───
function QuantityAdjuster({ item, onChange }: { item: CompareItem; onChange: (updated: CompareItem) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(item.servingGrams));

  const adjust = (delta: number) => {
    const newGrams = Math.max(10, item.servingGrams + delta);
    const rebuilt = rebuildFoodAtServing(item, newGrams);
    if (rebuilt) onChange(rebuilt);
  };

  const commitEdit = () => {
    const g = Math.max(10, Math.min(2000, parseInt(inputVal) || item.servingGrams));
    const rebuilt = rebuildFoodAtServing(item, g);
    if (rebuilt) onChange(rebuilt);
    setEditing(false);
  };

  if (!item.sourceFoodId) {
    // Non-editable (recipes/scanned) — show serving info only
    return (
      <span className="text-[9px] text-muted-foreground bg-muted rounded-md px-1.5 py-0.5">
        {item.servingGrams}g
      </span>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => e.key === 'Enter' && commitEdit()}
          className="w-12 text-center text-[10px] font-bold bg-background border border-primary/30 rounded-md py-0.5 outline-none"
        />
        <span className="text-[9px] text-muted-foreground">g</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => adjust(-25)}
        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
        <Minus className="w-2.5 h-2.5 text-muted-foreground" />
      </motion.button>
      <button onClick={() => { setInputVal(String(item.servingGrams)); setEditing(true); }}
        className="text-[10px] font-bold text-foreground bg-muted/60 rounded-md px-1.5 py-0.5 hover:bg-muted flex items-center gap-0.5">
        {item.servingGrams}g <Pencil className="w-2 h-2 text-muted-foreground" />
      </button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => adjust(25)}
        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
        <Plus className="w-2.5 h-2.5 text-muted-foreground" />
      </motion.button>
    </div>
  );
}

// ─── Price Adjuster ───
function PriceAdjuster({ item, onChange }: { item: CompareItem; onChange: (updated: CompareItem) => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(item.cost));

  const adjust = (delta: number) => {
    const newCost = Math.max(1, item.cost + delta);
    onChange({ ...item, cost: newCost });
  };

  const commitEdit = () => {
    const c = Math.max(1, Math.min(9999, parseInt(inputVal) || item.cost));
    onChange({ ...item, cost: c });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <IndianRupee className="w-2.5 h-2.5 text-muted-foreground" />
        <input
          autoFocus
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => e.key === 'Enter' && commitEdit()}
          className="w-12 text-center text-[10px] font-bold bg-background border border-primary/30 rounded-md py-0.5 outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => adjust(-5)}
        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
        <Minus className="w-2.5 h-2.5 text-muted-foreground" />
      </motion.button>
      <button onClick={() => { setInputVal(String(item.cost)); setEditing(true); }}
        className="text-[10px] font-bold text-foreground bg-muted/60 rounded-md px-1.5 py-0.5 hover:bg-muted flex items-center gap-0.5">
        <IndianRupee className="w-2.5 h-2.5" />{item.cost} <Pencil className="w-2 h-2 text-muted-foreground" />
      </button>
      <motion.button whileTap={{ scale: 0.85 }} onClick={() => adjust(5)}
        className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
        <Plus className="w-2.5 h-2.5 text-muted-foreground" />
      </motion.button>
    </div>
  );
}

// ─── Side Slot (Search + Camera + Mic) ───
function SideSlot({
  selected,
  onSelect,
  onClear,
  side,
}: {
  selected: CompareItem | null;
  onSelect: (item: CompareItem) => void;
  onClear: () => void;
  side: 'left' | 'right';
}) {
  const [mode, setMode] = useState<'search' | 'camera' | 'mic' | 'upload' | null>('search');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const results = useSearch(query);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleVoiceResult = useCallback((text: string) => {
    const matches = searchIndianFoods(text);
    if (matches.length > 0) {
      onSelect(buildFromFood(matches[0]));
    }
    setMode('search');
  }, [onSelect]);

  // Selected state — with quantity adjuster
  if (selected) {
    return (
      <motion.div
        initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-muted/50 border border-border/50 min-h-[100px] justify-center"
      >
        {selected.image && (
          <img src={selected.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
        )}
        <p className="text-[11px] font-bold text-foreground text-center line-clamp-2 leading-tight">{selected.name}</p>
        <div className="flex items-center gap-1">
          {selected.type === 'recipe' && <ChefHat className="w-2.5 h-2.5 text-muted-foreground" />}
          {selected.type === 'scanned' && <ScanLine className="w-2.5 h-2.5 text-primary" />}
          <span className="text-[9px] text-muted-foreground">{selected.calories} kcal</span>
        </div>
        {/* Quantity Adjuster */}
        <QuantityAdjuster item={selected} onChange={onSelect} />
        {/* Price Adjuster */}
        <PriceAdjuster item={selected} onChange={onSelect} />
        <button onClick={onClear} className="mt-0.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
          <X className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
      </motion.div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      {/* Mode buttons */}
      <div className="flex gap-1 justify-center">
        <ModeButton icon={Search} label="Search" active={mode === 'search'} onClick={() => setMode('search')} />
        <ModeButton icon={Camera} label="Scan" active={mode === 'camera'} onClick={() => setMode('camera')} />
        <ModeButton icon={ImagePlus} label="Upload" active={mode === 'upload'} onClick={() => setMode('upload')} />
        <ModeButton icon={Mic} label="Voice" active={mode === 'mic'} onClick={() => setMode('mic')} />
      </div>

      <AnimatePresence mode="wait">
        {mode === 'search' && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                placeholder="Search food..."
                className="w-full pl-7 pr-2 py-2 rounded-lg bg-muted text-[11px] outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <AnimatePresence>
              {focused && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-30 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto"
                >
                  {results.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        const item = r.type === 'food'
                          ? buildFromFood(r.source as IndianFood)
                          : buildFromRecipe(r.source as Recipe);
                        onSelect(item);
                        setQuery('');
                        setFocused(false);
                      }}
                      className="w-full px-2 py-2 text-left hover:bg-muted/50 flex items-center gap-1.5 transition-colors"
                    >
                      <span className="text-[9px] flex-shrink-0">{r.type === 'food' ? '🥗' : '🍳'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground truncate">{r.name}</p>
                        <p className="text-[9px] text-muted-foreground">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {mode === 'camera' && (
          <CameraCapture
            key="camera"
            onCapture={(item) => { onSelect(item); setMode('search'); }}
            onClose={() => setMode('search')}
          />
        )}
        {mode === 'mic' && (
          <VoiceInput
            key="mic"
            onResult={handleVoiceResult}
            onClose={() => setMode('search')}
          />
        )}
        {mode === 'upload' && (
          <UploadCapture
            key="upload"
            onCapture={(item) => { onSelect(item); setMode('search'); }}
            onClose={() => setMode('search')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Compare Row ───
function CompareRow({ label, v1, v2, unit, lowerIsBetter, index }: {
  label: string; v1: number; v2: number; unit: string; lowerIsBetter?: boolean; index: number;
}) {
  const winner = lowerIsBetter
    ? v1 < v2 ? 1 : v2 < v1 ? 2 : 0
    : v1 > v2 ? 1 : v2 > v1 ? 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-1.5"
    >
      <div className={`text-right rounded-md py-1 px-1.5 ${winner === 1 ? 'bg-green-500/10' : ''}`}>
        <span className={`text-[11px] font-bold ${winner === 1 ? 'text-green-600' : 'text-foreground'}`}>
          {unit === '₹' ? `₹${v1}` : `${v1}${unit}`}
        </span>
        {winner === 1 && <span className="text-[9px] ml-0.5">✅</span>}
      </div>
      <div className="text-center px-1.5">
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-left rounded-md py-1 px-1.5 ${winner === 2 ? 'bg-green-500/10' : ''}`}>
        {winner === 2 && <span className="text-[9px] mr-0.5">✅</span>}
        <span className={`text-[11px] font-bold ${winner === 2 ? 'text-green-600' : 'text-foreground'}`}>
          {unit === '₹' ? `₹${v2}` : `${v2}${unit}`}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Compare Tab ───
export default function CompareTab() {
  const [item1, setItem1] = useState<CompareItem | null>(null);
  const [item2, setItem2] = useState<CompareItem | null>(null);

  const hasBoth = item1 && item2;
  const pesWinner = hasBoth ? (item1.pes > item2.pes ? 1 : item2.pes > item1.pes ? 2 : 0) : 0;

  const macroMetrics = COMPARE_METRICS.filter(m => m.section === 'macro');
  const microMetrics = COMPARE_METRICS.filter(m => m.section === 'micro');

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="text-center py-1">
        <div className="inline-flex items-center gap-2 text-primary">
          <Scale className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Side-by-Side Compare</span>
        </div>
      </div>

      {/* Side-by-Side Input Slots */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
        <SideSlot
          selected={item1}
          onSelect={setItem1}
          onClear={() => setItem1(null)}
          side="left"
        />
        {/* VS Divider */}
        <div className="flex flex-col items-center justify-center pt-6">
          <motion.div
            animate={hasBoth ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'loop' }}
            className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
          >
            <span className="text-[10px] font-black text-primary">VS</span>
          </motion.div>
        </div>
        <SideSlot
          selected={item2}
          onSelect={setItem2}
          onClear={() => setItem2(null)}
          side="right"
        />
      </div>

      {/* Empty State */}
      {!hasBoth && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-2">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <p className="text-xs font-semibold text-foreground">Pick two items to compare</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Use search, camera, or voice on each side</p>
        </motion.div>
      )}

      {/* Comparison Table */}
      {hasBoth && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="rounded-2xl bg-card border border-border p-3 space-y-1"
        >
          {/* Section: Macros */}
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border/50">
            Macros & Cost
          </p>
          {macroMetrics.map((m, i) => (
            <CompareRow
              key={m.key}
              label={m.label}
              v1={item1[m.key]}
              v2={item2[m.key]}
              unit={m.unit}
              lowerIsBetter={m.lowerIsBetter}
              index={i}
            />
          ))}

          {/* Section: Micros */}
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider pb-1 pt-2 border-b border-border/50">
            Micronutrients
          </p>
          {microMetrics.map((m, i) => (
            <CompareRow
              key={m.key}
              label={m.label}
              v1={item1[m.key]}
              v2={item2[m.key]}
              unit={m.unit}
              lowerIsBetter={m.lowerIsBetter}
              index={macroMetrics.length + i}
            />
          ))}

          {/* PES Score */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-3 border-t border-primary/20 mt-2"
          >
            <div className={`text-center rounded-xl py-2 ${pesWinner === 1 ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
              <p className="text-base font-black text-foreground">{(item1.pes * 10).toFixed(1)}</p>
              {pesWinner === 1 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.5 }}>
                  <Star className="w-3 h-3 text-primary mx-auto mt-0.5 fill-primary" />
                </motion.div>
              )}
            </div>
            <div className="text-center px-1">
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">PES</span>
            </div>
            <div className={`text-center rounded-xl py-2 ${pesWinner === 2 ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}>
              <p className="text-base font-black text-foreground">{(item2.pes * 10).toFixed(1)}</p>
              {pesWinner === 2 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.5 }}>
                  <Star className="w-3 h-3 text-primary mx-auto mt-0.5 fill-primary" />
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Pantry match */}
          {(item1.pantryMatch || item2.pantryMatch) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 py-1.5"
            >
              <div className="text-right">
                {item1.pantryMatch ? (
                  <span className="text-[9px] font-medium text-muted-foreground inline-flex items-center gap-0.5 justify-end">
                    <Home className="w-2.5 h-2.5" /> {item1.pantryMatch.available}/{item1.pantryMatch.total}
                  </span>
                ) : <span className="text-[9px] text-muted-foreground">—</span>}
              </div>
              <div className="text-center px-1.5">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">Pantry</span>
              </div>
              <div className="text-left">
                {item2.pantryMatch ? (
                  <span className="text-[9px] font-medium text-muted-foreground inline-flex items-center gap-0.5">
                    <Home className="w-2.5 h-2.5" /> {item2.pantryMatch.available}/{item2.pantryMatch.total}
                  </span>
                ) : <span className="text-[9px] text-muted-foreground">—</span>}
              </div>
            </motion.div>
          )}

          {/* Verdict */}
          {pesWinner > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.55 }}
              className="mt-2 p-2.5 rounded-xl bg-primary/5 border border-primary/10 text-center"
            >
              <p className="text-[11px] font-bold text-primary inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {pesWinner === 1 ? item1.name : item2.name} wins on value
              </p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Better protein-per-rupee with optimal calorie fit</p>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
