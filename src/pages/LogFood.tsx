import { useState, useRef, useEffect, useMemo } from 'react';
import LastMealConfirmSheet from '@/components/LastMealConfirmSheet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Mic, MicOff, Search, ArrowLeft, Plus, Minus, Check, X, Loader2, AlertTriangle, ShieldAlert, Scale } from 'lucide-react';
import { addMealToLog, addMealToLogForDate, FoodItem, MealEntry, MealSource, MealCost, CookingMethod } from '@/lib/store';
import { saveManualExpense } from '@/lib/expense-store';
import CostSuggestionBanner from '@/components/CostSuggestionBanner';
import PESBreakdownModal from '@/components/PESBreakdownModal';
import ContextPickerSheet from '@/components/ContextPickerSheet';
import { getDefaultCategory, learnCookingMethod } from '@/lib/context-learning';
import { searchIndianFoods, indianFoodToFoodItem, type IndianFood } from '@/lib/indian-foods';
import ComparisonSheet from '@/components/ComparisonSheet';
import { buildFromFoodItem, type CompareItem } from '@/lib/compare-helpers';
import { supabase } from '@/integrations/supabase/client';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { validateMeal, validateSingleItem, type ValidationResult } from '@/lib/validation-engine';
import ValidationFeedback from '@/components/ValidationFeedback';
import { getProfile, getDailyLog, getDailyTotals } from '@/lib/store';
import { toast } from 'sonner';
import { checkBudgetAfterMeal } from '@/lib/budget-service';
import UnitPicker from '@/components/UnitPicker';
import { calculateNutrition, getUnitOptionsForFood } from '@/lib/unit-conversion';
import { syncDailyBalance, getContextualMealToast, getDinnerNotificationSummary } from '@/lib/calorie-correction';
import AdjustmentExplanationModal from '@/components/AdjustmentExplanationModal';
import LivePriceBanner from '@/components/LivePriceBanner';
import { reportPrice } from '@/lib/live-price-service';
import { checkAllergens, getAllergenLabel, getAllergenEmoji, hasSevereAllergen } from '@/lib/allergen-engine';
import { checkFoodForConditions, getUserConditions, type FoodConditionWarning } from '@/lib/condition-coach';
import AnimatedWarningBanner, { type WarningMessage } from '@/components/AnimatedWarningBanner';
import { motion, AnimatePresence } from 'framer-motion';
import { getActivePlan } from '@/lib/event-plan-service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface AnalyzedItem extends FoodItem {
  confidence?: number;
}

export default function LogFood() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mealType = (params.get('meal') as MealType) || 'breakfast';
  const targetDate = params.get('date') || undefined;
  const mode = params.get('mode') || null;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AnalyzedItem[]>([]);
  const [step, setStep] = useState<'search' | 'adjust'>('search');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const recognitionRef = useRef<any>(null);
  const [contextPickerOpen, setContextPickerOpen] = useState(false);
  const [mealCost, setMealCost] = useState<MealCost | null>(null);
  const [showPES, setShowPES] = useState(false);
  const [pendingSource, setPendingSource] = useState<MealSource | null | undefined>(undefined);
  const [pendingCookingMethod, setPendingCookingMethod] = useState<CookingMethod | null | undefined>(undefined);
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [lastMealSheetOpen, setLastMealSheetOpen] = useState(false);
  const [pendingAllergenItem, setPendingAllergenItem] = useState<{ food: FoodItem; matched: string[] } | null>(null);
  const [showSevereConfirm, setShowSevereConfirm] = useState(false);
  const [severeButtonEnabled, setSevereButtonEnabled] = useState(false);
  const [compareSelection, setCompareSelection] = useState<FoodItem[]>([]);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);

  // userAllergens moved after profile declaration below

  // Delayed enable for severe allergy confirmation button
  useEffect(() => {
    if (showSevereConfirm) {
      setSevereButtonEnabled(false);
      const timer = setTimeout(() => setSevereButtonEnabled(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSevereConfirm]);

  const mealLabels: Record<MealType, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };
  
  // Search Indian foods
  const filtered = search.trim()
    ? searchIndianFoods(search).map(indianFoodToFoodItem)
    : searchIndianFoods('').map(indianFoodToFoodItem);

  const addFood = (food: FoodItem) => {
    const finalItem = { ...food, id: Date.now().toString(), confidenceScore: 0.9 };
    const allergenCheck = checkAllergens(food.name, userAllergens);
    if (allergenCheck.hasConflict) {
      setPendingAllergenItem({ food: finalItem, matched: allergenCheck.matched });
      return;
    }
    setSelected(prev => [...prev, finalItem]);
    setStep('adjust');
  };

  const confirmAllergenAdd = () => {
    if (!pendingAllergenItem) return;
    if (hasSevereAllergen(pendingAllergenItem.matched) && !showSevereConfirm) {
      setShowSevereConfirm(true);
      return;
    }
    setSelected(prev => [...prev, pendingAllergenItem.food]);
    setStep('adjust');
    setPendingAllergenItem(null);
    setShowSevereConfirm(false);
  };

  const findAllergenAlternative = () => {
    if (pendingAllergenItem) {
      setSearch('');
      setPendingAllergenItem(null);
      setShowSevereConfirm(false);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setSelected(prev => prev.map(f => f.id === id ? { ...f, quantity: Math.max(0.5, +(f.quantity + delta).toFixed(1)) } : f));
  };

  const updateUnit = (id: string, newUnit: string) => {
    setSelected(prev => prev.map(f => {
      if (f.id !== id || !f.per100g || !f.unitOptions) return f;
      const nutrition = calculateNutrition(f.per100g, 1, newUnit, f.unitOptions);
      return {
        ...f,
        unit: newUnit,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        estimatedWeightGrams: nutrition.totalGrams,
      };
    }));
  };

  const removeItem = (id: string) => {
    setSelected(prev => prev.filter(f => f.id !== id));
    if (selected.length <= 1) setStep('search');
  };

  const totalCal = selected.reduce((s, f) => s + f.calories * f.quantity, 0);
  const totalProtein = selected.reduce((s, f) => s + f.protein * f.quantity, 0);
  const totalCarbs = selected.reduce((s, f) => s + f.carbs * f.quantity, 0);
  const totalFat = selected.reduce((s, f) => s + f.fat * f.quantity, 0);

  // Validation engine
  const profile = getProfile();
  const userAllergens: string[] = (profile as any)?.allergens || [];
  const userConditions: string[] = getUserConditions(profile as any);
  const validationResult: ValidationResult = useMemo(
    () => validateMeal(selected, profile, { mealType }),
    [selected, profile, mealType]
  );

  const itemIssues = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateSingleItem>>();
    for (const item of selected) {
      const issues = validateSingleItem(item);
      if (issues.length > 0) map.set(item.id, issues);
    }
    return map;
  }, [selected]);

  const saveMeal = () => {
    // Auto-tag barcode scans as "Packaged" — skip context picker
    if (mode === 'barcode') {
      toast.success('📦 Tagged as Packaged');
      finalizeMeal({ category: 'packaged' });
      return;
    }
    setContextPickerOpen(true);
  };

  const finalizeMeal = (source?: MealSource | null, cookingMethod?: CookingMethod | null) => {
    // Show PES breakdown if meal has cost
    const costAmount = mealCost?.amount || 0;
    if (costAmount > 0 && totalProtein > 0) {
      setPendingSource(source);
      setPendingCookingMethod(cookingMethod);
      setContextPickerOpen(false);
      setShowPES(true);
      return;
    }
    // No cost → save directly
    commitMeal(source, cookingMethod);
  };

  const commitMeal = (source?: MealSource | null, cookingMethod?: CookingMethod | null) => {
    // Learn cooking preference for these food items
    if (cookingMethod && selected.length > 0) {
      learnCookingMethod(selected.map(s => s.name), cookingMethod);
    }
    const meal: MealEntry = {
      id: Date.now().toString(), type: mealType, items: selected,
      totalCalories: Math.round(totalCal), totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs), totalFat: Math.round(totalFat),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: source || undefined,
      cookingMethod: cookingMethod || undefined,
      cost: mealCost,
    };
    if (targetDate) {
      addMealToLogForDate(targetDate, meal);
    } else {
      addMealToLog(meal);
    }

    // Auto-create expense for non-home meals (restaurant, street food, etc.)
    const costAmount = mealCost?.amount || 0;
    const sourceCategory = source?.category;
    if (costAmount > 0 && sourceCategory && sourceCategory !== 'home') {
      const expenseCategory = sourceCategory === 'restaurant' || sourceCategory === 'fast_food' ? 'restaurant'
        : sourceCategory === 'street_food' ? 'street_food'
        : 'other';
      saveManualExpense({
        id: `meal-auto-${meal.id}`,
        date: (targetDate || new Date().toISOString().split('T')[0]),
        amount: costAmount,
        currency: '₹',
        category: expenseCategory,
        description: `${mealLabels[mealType]} – ${selected.map(s => s.name).join(', ')}`,
        mealId: meal.id,
        type: 'meal',
      });
    }

    // Real-time budget check after logging
    if (costAmount > 0) {
      const alert = checkBudgetAfterMeal(costAmount);
      if (alert.level === 'warning') toast.warning(alert.message);
      else if (alert.level === 'overspend') toast.error(alert.message);
      else if (alert.level === 'overspend_severe') toast.error(alert.message);
    }

    // Sync daily balance after logging
    syncDailyBalance();

    // Meal completion toast with protein progress (Fix 6)
    const profile2 = getProfile();
    const proteinTarget = profile2?.dailyProtein || 60;
    const totalProteinEaten = getDailyTotals(getDailyLog()).protein;
    const proteinPct = Math.min(100, Math.round((totalProteinEaten / proteinTarget) * 100));
    toast.success(`${mealLabels[mealType]} logged ✅ Protein goal ${proteinPct}% done 💪`, { duration: 4000 });

    // Show contextual correction toast if needed
    const mealToast = getContextualMealToast();
    if (mealToast) toast(mealToast.message, { duration: 4000 });

    // After-dinner: show LastMealConfirmSheet
    if (mealType === 'dinner') {
      const todayKey = targetDate || new Date().toISOString().split('T')[0];
      const dinnerKey = `nutrilens_dinner_notif_${todayKey}`;
      if (!localStorage.getItem(dinnerKey)) {
        localStorage.setItem(dinnerKey, '1');
        setLastMealSheetOpen(true);
        // Don't navigate yet — let sheet handle it
        setContextPickerOpen(false);
        setShowPES(false);
        return;
      }
    }

    setContextPickerOpen(false);
    setShowPES(false);
    navigate(targetDate ? '/progress' : '/dashboard');
  };

  // === REAL CAMERA + AI ANALYSIS ===
  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraOpen(false);
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    setCameraOpen(false);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    stopCamera();

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.foodItems?.length) {
        const items: AnalyzedItem[] = data.foodItems.map((item: any, i: number) => ({
          id: Date.now().toString() + i,
          name: item.name,
          calories: Math.round(item.calories || 0),
          protein: Math.round((item.protein || 0) * 10) / 10,
          carbs: Math.round((item.carbs || 0) * 10) / 10,
          fat: Math.round((item.fat || 0) * 10) / 10,
          quantity: item.quantity || 1,
          unit: item.unit || 'serving',
          confidence: item.confidence || 70,
          confidenceScore: 0.7,
        }));
        setSelected(items);
        setStep('adjust');
        if (data.suggestions) toast.info(`💡 ${data.suggestions}`);
      } else {
        toast.error('Could not identify food items. Try again or add manually.');
      }
    } catch (e: any) {
      console.error('Analysis error:', e);
      toast.error(e.message || 'Failed to analyze image');
    } finally {
      setAnalyzing(false);
    }
  };

  // === REAL VOICE LOGGING ===
  const startVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian English
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setVoiceText(transcript);
    };

    recognition.onend = async () => {
      setIsListening(false);
      if (voiceText.trim()) {
        await analyzeVoiceInput(voiceText);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    setIsListening(true);
    setVoiceText('');
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const analyzeVoiceInput = async (text: string) => {
    if (!text.trim()) return;
    setAnalyzing(true);
    toast.info(`Analyzing: "${text}"`);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { textDescription: text },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.foodItems?.length) {
        const items: AnalyzedItem[] = data.foodItems.map((item: any, i: number) => ({
          id: Date.now().toString() + i,
          name: item.name,
          calories: Math.round(item.calories || 0),
          protein: Math.round((item.protein || 0) * 10) / 10,
          carbs: Math.round((item.carbs || 0) * 10) / 10,
          fat: Math.round((item.fat || 0) * 10) / 10,
          quantity: item.quantity || 1,
          unit: item.unit || 'serving',
          confidence: item.confidence || 75,
          confidenceScore: 0.6,
        }));
        setSelected(items);
        setStep('adjust');
      } else {
        toast.error('Could not parse food items. Try again or search manually.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to analyze voice input');
    } finally {
      setAnalyzing(false);
      setVoiceText('');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // === CAMERA VIEW ===
  if (cameraOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-foreground flex flex-col">
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex items-center justify-between p-4 bg-foreground/90">
          <button onClick={stopCamera} className="w-10 h-10 rounded-xl bg-card/10 flex items-center justify-center">
            <X className="w-5 h-5 text-background" />
          </button>
          <span className="text-background font-semibold text-sm">Scan Your Meal</span>
          <div className="w-10" />
        </div>
        <div className="flex-1 relative">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-12 pointer-events-none border-2 border-background/30 rounded-3xl" />
          {analyzing && (
            <div className="absolute inset-0 bg-foreground/70 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-background font-medium text-sm">AI is analyzing your meal...</p>
            </div>
          )}
        </div>
        <div className="p-8 flex items-center justify-center bg-foreground/90">
          <button onClick={captureAndAnalyze} disabled={analyzing} className="w-16 h-16 rounded-full border-4 border-background/50 flex items-center justify-center active:scale-90 transition-transform">
            <div className="w-12 h-12 rounded-full bg-background" />
          </button>
        </div>
      </div>
    );
  }

  // === ANALYZING OVERLAY ===
  if (analyzing && !cameraOpen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-foreground">Analyzing with AI...</p>
          <p className="text-xs text-muted-foreground">Identifying food items and nutrition</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <canvas ref={canvasRef} className="hidden" />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Log {mealLabels[mealType]}</h1>
            <p className="text-xs text-muted-foreground">Add items to your meal</p>
          </div>
        </div>

        {step === 'search' && (
          <>
            {/* AI Input Methods */}
            <div className="flex gap-2">
              <button onClick={openCamera} className="flex-1 card-subtle p-4 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Camera className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-semibold text-foreground">Camera</p><p className="text-[10px] text-muted-foreground">AI food scan</p></div>
              </button>
              <button
                onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
                className={`flex-1 card-subtle p-4 flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.98] ${isListening ? 'ring-2 ring-coral' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isListening ? 'bg-coral/20 animate-pulse' : 'bg-coral/10'}`}>
                  {isListening ? <MicOff className="w-5 h-5 text-coral" /> : <Mic className="w-5 h-5 text-coral" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{isListening ? 'Listening...' : 'Voice'}</p>
                  <p className="text-[10px] text-muted-foreground">{isListening ? 'Tap to stop' : 'Describe meal'}</p>
                </div>
              </button>
            </div>

            {/* Voice feedback */}
            {voiceText && (
              <div className="card-subtle p-3 bg-coral/5 border-coral/20">
                <p className="text-xs text-muted-foreground">Hearing:</p>
                <p className="text-sm font-medium text-foreground">{voiceText}</p>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Indian & global foods..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow" />
            </div>

            {/* Results */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
                {search ? 'Results' : 'Popular Indian Foods'}
              </p>
              {filtered.map(food => {
                const allergenCheck = checkAllergens(food.name, userAllergens);
                const conditionWarnings = checkFoodForConditions(food.name, userConditions);
                const hasAnyWarning = allergenCheck.hasConflict || conditionWarnings.length > 0;
                const isCompareSelected = compareSelection.some(c => c.id === food.id);
                return (
                  <div key={food.id} className={`card-subtle p-3 flex items-center gap-3 w-full text-left hover:shadow-md transition-shadow ${isCompareSelected ? 'ring-2 ring-primary/50' : ''}`}>
                    <button onClick={() => addFood(food)} className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.99]">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">{food.calories}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-foreground">{food.name}</p>
                          {allergenCheck.hasConflict && allergenCheck.matched.map(a => (
                            <span key={a} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-[9px] font-bold text-destructive animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {getAllergenLabel(a)}
                            </span>
                          ))}
                          {conditionWarnings.map((w, i) => (
                            <span key={`cond-${i}`} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${
                              w.severity === 'high'
                                ? 'bg-destructive/10 border-destructive/20 text-destructive animate-pulse'
                                : w.severity === 'medium'
                                ? 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400'
                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                            }`}>
                              <span className="text-[8px]">{w.icon}</span>
                              {w.condition}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">1 {food.unit} · {food.calories} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompareSelection(prev => {
                            if (prev.some(c => c.id === food.id)) return prev.filter(c => c.id !== food.id);
                            if (prev.length >= 3) return prev;
                            return [...prev, food];
                          });
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCompareSelected ? 'bg-primary/20' : 'bg-muted'}`}
                      >
                        <Scale className={`w-3.5 h-3.5 ${isCompareSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                      <button onClick={() => addFood(food)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${hasAnyWarning ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                        <Plus className={`w-4 h-4 ${hasAnyWarning ? 'text-destructive' : 'text-primary'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Compare Pill */}
            {compareSelection.length >= 2 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-fab flex items-center gap-2 active:scale-[0.97] transition-transform"
                onClick={() => setCompareSheetOpen(true)}
              >
                <Scale className="w-4 h-4" /> Compare ({compareSelection.length})
              </motion.button>
            )}
          </>
        )}

        {/* Comparison Sheet */}
        <ComparisonSheet
          open={compareSheetOpen}
          onClose={() => { setCompareSheetOpen(false); setCompareSelection([]); }}
          items={compareSelection.map(buildFromFoodItem)}
          onPick={(picked) => {
            const food = compareSelection.find(f => `food-${f.id}` === picked.id);
            if (food) addFood(food);
            setCompareSelection([]);
          }}
        />

        {step === 'adjust' && (
          <>
            {/* Allergen warning banner for items added via voice/camera/barcode */}
            {(() => {
              const allergenItems = selected.filter(item => checkAllergens(item.name, userAllergens).hasConflict);
              if (allergenItems.length === 0) return null;
              const allergenMessages: WarningMessage[] = allergenItems.flatMap(item => {
                const matched = checkAllergens(item.name, userAllergens).matched;
                return matched.map(a => ({
                  icon: getAllergenEmoji(a),
                  text: `${item.name} contains ${getAllergenLabel(a)}`,
                  itemId: item.id,
                  itemName: item.name,
                }));
              });
              const allMatched = [...new Set(allergenItems.flatMap(item => checkAllergens(item.name, userAllergens).matched))];
              const isSevere = hasSevereAllergen(allMatched);
              return (
                <AnimatedWarningBanner
                  type="allergen"
                  severity={isSevere ? 'high' : 'medium'}
                  title={isSevere ? '🚨 Severe Allergen Detected' : '⚠️ Allergen Warning'}
                  messages={allergenMessages}
                  onRemoveItem={(id) => removeItem(id)}
                />
              );
            })()}

            {/* Health condition warning banner */}
            {(() => {
              if (userConditions.length === 0) return null;
              const condMessages: WarningMessage[] = [];
              for (const item of selected) {
                const warnings = checkFoodForConditions(item.name, userConditions);
                for (const w of warnings) {
                  condMessages.push({
                    icon: w.icon,
                    text: `${item.name}: ${w.text}`,
                    condition: w.condition,
                    itemId: item.id,
                    itemName: item.name,
                  });
                }
              }
              if (condMessages.length === 0) return null;
              const maxSeverity = condMessages.some(m => {
                const w = checkFoodForConditions(
                  selected.find(s => s.id === m.itemId)?.name || '', userConditions
                );
                return w.some(x => x.severity === 'high');
              }) ? 'high' as const : 'medium' as const;
              return (
                <AnimatedWarningBanner
                  type="health"
                  severity={maxSeverity}
                  title={maxSeverity === 'high' ? '🚨 Health Condition Alert' : '⚠️ Health Advisory'}
                  messages={condMessages}
                  onRemoveItem={(id) => removeItem(id)}
                />
              );
            })()}
            <div className="space-y-2">
              {selected.map(item => {
                const itemCal = Math.round(item.calories * item.quantity);
                const itemP = Math.round(item.protein * item.quantity);
                const itemC = Math.round(item.carbs * item.quantity);
                const itemF = Math.round(item.fat * item.quantity);
                const warnings = itemIssues.get(item.id) || [];
                return (
                  <div key={item.id} className={`card-subtle p-3.5 ${warnings.some(w => w.severity === 'block') ? 'border-destructive/40 border' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground">{item.name}</p>
                          {item.confidence !== undefined && <ConfidenceBadge confidence={item.confidence} />}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {itemCal} kcal · P {itemP}g · C {itemC}g · F {itemF}g
                        </p>
                        {item.estimatedWeightGrams && (
                          <p className="text-[10px] text-muted-foreground/60">
                            ≈ {Math.round(item.estimatedWeightGrams * item.quantity)}g total
                          </p>
                        )}
                        {warnings.map((w, wi) => (
                          <div key={wi} className="flex items-center gap-1 mt-1">
                            <AlertTriangle className={`w-3 h-3 ${w.severity === 'block' ? 'text-destructive' : 'text-accent'}`} />
                            <span className={`text-[10px] font-medium ${w.severity === 'block' ? 'text-destructive' : 'text-accent'}`}>{w.message}</span>
                          </div>
                        ))}
                        {item.confidence !== undefined && item.confidence < 70 && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-accent" />
                            <span className="text-[10px] text-accent font-medium">Please verify this item</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>

                    {/* Unit picker */}
                    {item.per100g && item.unitOptions ? (
                      <div className="mt-2">
                        <UnitPicker
                          quantity={item.quantity}
                          unit={item.unit}
                          unitOptions={item.unitOptions}
                          per100g={item.per100g}
                          onQuantityChange={(qty) => updateQty(item.id, qty - item.quantity)}
                          onUnitChange={(u) => updateUnit(item.id, u)}
                          showNutrition={false}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQty(item.id, -0.5)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform"><Minus className="w-3 h-3" /></button>
                        <span className="text-sm font-bold min-w-[3.5rem] text-center">{item.quantity} {item.unit}</span>
                        <button onClick={() => updateQty(item.id, 0.5)} className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"><Plus className="w-3 h-3 text-primary" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={() => setStep('search')} className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              + Add more items
            </button>

            <div className="card-elevated p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">Meal Total</span>
                <span className="text-lg font-bold text-foreground">{Math.round(totalCal)} <span className="text-xs font-medium text-muted-foreground">kcal</span></span>
              </div>
              <div className="flex gap-4 text-[11px] text-muted-foreground">
                <span>Protein: {Math.round(totalProtein)}g</span>
                <span>Carbs: {Math.round(totalCarbs)}g</span>
                <span>Fat: {Math.round(totalFat)}g</span>
              </div>
            </div>

            {/* Validation Engine Feedback */}
            <ValidationFeedback result={validationResult} />

            {/* Live Price Banners for volatile items */}
            {selected.map(item => (
              <LivePriceBanner key={`price-${item.id}`} itemName={item.name} />
            ))}

            {/* Cost Suggestion Banner */}
            <CostSuggestionBanner
              items={selected.map(f => ({ name: f.name, quantity: f.quantity, unit: f.unit }))}
              onCostConfirm={(amount) => {
                setMealCost({ amount, currency: '₹' });
                // Crowdsource: report individual item prices
                for (const item of selected) {
                  const perUnitCost = amount / selected.length;
                  reportPrice(item.name, perUnitCost, item.unit).catch(() => {});
                }
              }}
              onFree={() => setMealCost({ amount: 0, currency: '₹' })}
            />

            {mealCost && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {mealCost.amount === 0 ? '🎁 Marked as free (home/treated)' : `💰 Cost: ₹${mealCost.amount}`}
                <button onClick={() => setMealCost(null)} className="text-primary text-[10px] font-semibold">Change</button>
              </div>
            )}

            <button onClick={saveMeal} disabled={validationResult.hasBlocks}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-40">
              <Check className="w-4 h-4" /> {validationResult.hasBlocks ? '⚠️ Fix issues first' : 'Save Meal'}
            </button>
          </>
        )}
      </div>
      {/* Context Picker */}
      <ContextPickerSheet
        open={contextPickerOpen}
        defaultCategory={getDefaultCategory(mealType)}
        foodNames={selected.map(s => s.name)}
        onSave={(source, cookingMethod) => finalizeMeal(source, cookingMethod)}
        onSkip={() => finalizeMeal(null)}
      />
      {/* PES Breakdown Modal */}
      <PESBreakdownModal
        open={showPES}
        food={{
          name: selected.map(s => s.name).join(', '),
          cost: mealCost?.amount || 0,
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          calories: Math.round(totalCal),
        }}
        mealLabel={mealLabels[mealType]}
        onConfirm={() => commitMeal(pendingSource, pendingCookingMethod)}
        onEdit={() => { setShowPES(false); }}
      />
      <AdjustmentExplanationModal open={adjModalOpen} onClose={() => setAdjModalOpen(false)} />
      <LastMealConfirmSheet
        open={lastMealSheetOpen}
        onClose={() => { setLastMealSheetOpen(false); navigate(targetDate ? '/progress' : '/dashboard'); }}
        todayKey={targetDate || new Date().toISOString().split('T')[0]}
      />

      {/* Standard Allergen Confirmation Dialog */}
      <AlertDialog open={!!pendingAllergenItem && !showSevereConfirm} onOpenChange={v => { if (!v) { setPendingAllergenItem(null); setShowSevereConfirm(false); } }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 mx-auto mb-2 rounded-full bg-destructive/10 flex items-center justify-center"
            >
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-center">⚠️ Allergen Warning</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              <span className="font-semibold text-foreground">{pendingAllergenItem?.food.name}</span> contains{' '}
              <span className="font-bold text-destructive">
                {pendingAllergenItem?.matched.map(a => `${getAllergenEmoji(a)} ${getAllergenLabel(a)}`).join(', ')}
              </span>.
              <br />
              <span className="text-muted-foreground">Are you sure you want to log this?</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <button onClick={findAllergenAlternative} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              🔄 Find Safe Alternative
            </button>
            <AlertDialogAction onClick={confirmAllergenAdd} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Log Anyway
            </AlertDialogAction>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Severe Allergy Double Confirmation */}
      <AlertDialog open={showSevereConfirm} onOpenChange={v => { if (!v) { setShowSevereConfirm(false); setPendingAllergenItem(null); } }}>
        <AlertDialogContent className="rounded-2xl border-2 border-destructive/50">
          <AlertDialogHeader>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-16 h-16 mx-auto mb-2 rounded-full bg-destructive/20 flex items-center justify-center"
            >
              <ShieldAlert className="w-8 h-8 text-destructive animate-pulse" />
            </motion.div>
            <AlertDialogTitle className="text-center text-destructive text-lg">
              🚨 Severe Allergy Risk
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2">
              <span className="block font-bold text-foreground text-base">{pendingAllergenItem?.food.name}</span>
              <span className="block text-destructive font-semibold">
                This food may contain {pendingAllergenItem?.matched.map(a => `${getAllergenEmoji(a)} ${getAllergenLabel(a)}`).join(', ')} which can cause a severe allergic reaction.
              </span>
              <span className="block text-muted-foreground text-xs mt-2">
                This is a high-risk allergen. Please confirm you understand the risk.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <button onClick={findAllergenAlternative} className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
              🔄 Find Safe Alternative
            </button>
            <button
              onClick={confirmAllergenAdd}
              disabled={!severeButtonEnabled}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-all ${
                severeButtonEnabled
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              }`}
            >
              {severeButtonEnabled ? 'I understand the risk – Log Anyway' : 'Please wait (3s)...'}
            </button>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
