import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, Mic, MicOff, RotateCcw, ImageIcon, Check, X, Plus, Minus, Loader2, AlertTriangle, ChevronUp, IndianRupee, Search, Gift, ArrowLeft, Sparkles, Pencil, ShieldAlert } from 'lucide-react';
import CostSuggestionBanner from '@/components/CostSuggestionBanner';
import WeatherNudgeCard from '@/components/WeatherNudgeCard';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { addMealToLog, deleteMealFromLog, getTodayKey, FoodItem, MealEntry, MealSource, MealCost, getProfile, getDailyLog, getDailyTotals, CookingMethod } from '@/lib/store';
import type { MealSourceCategory } from '@/lib/store';
import { getDefaultCategory, getSourceEmoji, getSourceLabel, learnCookingMethod } from '@/lib/context-learning';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import VoiceWaveform from '@/components/VoiceWaveform';
import FoodMoodIndicator from '@/components/FoodMoodIndicator';
import MonikaFab from '@/components/MonikaFab';
import AddFoodSheet from '@/components/AddFoodSheet';
import { validateMeal, validateSingleItem, type ValidationResult, type ValidationSuggestion } from '@/lib/validation-engine';
import ValidationFeedback from '@/components/ValidationFeedback';
import { searchIndianFoods, indianFoodToFoodItem, getFoodByName } from '@/lib/indian-foods';
import { toast } from 'sonner';
import { checkBudgetAfterMeal } from '@/lib/budget-service';
import UnitPicker from '@/components/UnitPicker';
import FoodEditModal from '@/components/FoodEditModal';
import { canUseCameraScan, incrementCameraScan, getRemainingCameraScans, getPlan, hasUsedTrial, startFreeTrial } from '@/lib/subscription-service';
import UpgradePrompt from '@/components/UpgradePrompt';
import FoodReplaceSheet from '@/components/FoodReplaceSheet';
import { getUnitOptionsForFood, calculateNutrition, type UnitOption } from '@/lib/unit-conversion';
import PESBreakdownModal from '@/components/PESBreakdownModal';
import { checkAllergens, getAllergenLabel, getAllergenEmoji, hasSevereAllergen } from '@/lib/allergen-engine';
import { checkFoodForConditions, getUserConditions, type FoodConditionWarning } from '@/lib/condition-coach';
import { getSugarWarnings, isSugarDetectionActive } from '@/lib/sugar-detector';
import AnimatedWarningBanner, { type WarningMessage } from '@/components/AnimatedWarningBanner';
import { getActivePlan, getPlanById } from '@/lib/event-plan-service';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Step = 'camera' | 'confirm' | 'edit' | 'save';

interface AnalyzedItem extends FoodItem {
  confidence?: number;
  selected?: boolean;
}

interface SourcePrediction {
  category: MealSourceCategory;
  confidence: number;
  reason: string;
}

function getMealTypeFromTime(): MealType {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 18) return 'snack';
  return 'dinner';
}

const SOURCE_OPTIONS: MealSourceCategory[] = ['home', 'restaurant', 'street_food', 'packaged', 'fast_food', 'office', 'friends', 'other'];
const MEAL_LABELS: Record<MealType, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  snack: { emoji: '🍿', label: 'Snack' },
  dinner: { emoji: '🌙', label: 'Dinner' },
};

export default function CameraHome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const profile = getProfile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Core step state
  const [step, setStep] = useState<Step>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<AnalyzedItem[]>([]);
  const [sourcePrediction, setSourcePrediction] = useState<SourcePrediction | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [mealName, setMealName] = useState('');

  // Camera
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Voice
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceAmplitude, setVoiceAmplitude] = useState(0);

  // Edit step
  const [selectedMealType, setSelectedMealType] = useState<MealType>(getMealTypeFromTime());
  const [selectedSource, setSelectedSource] = useState<MealSourceCategory | null>(null);
  const [mealCost, setMealCost] = useState<MealCost | null>(null);
  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [replacingItemId, setReplacingItemId] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showPESBreakdown, setShowPESBreakdown] = useState(false);
  // Incoming meal type from URL
  useEffect(() => {
    const urlMeal = params.get('meal') as MealType;
    if (urlMeal) setSelectedMealType(urlMeal);
  }, [params]);

  // Start camera
  useEffect(() => {
    if (step === 'camera') startCamera();
    return () => stopCamera();
  }, [facingMode, step]);

  const startCamera = async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch {
      setCameraError(true);
      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  const flipCamera = () => {
    stopCamera();
    setFacingMode(f => f === 'environment' ? 'user' : 'environment');
  };

  // ─── CAPTURE & ANALYZE ───
  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!canUseCameraScan()) { setShowUpgradePrompt(true); return; }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const imageBase64 = imageDataUrl.split(',')[1];
    setCapturedImage(imageDataUrl);
    stopCamera();
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.foodItems?.length) {
        incrementCameraScan();
        processAIResult(data);
      } else {
        toast.error('Could not identify food. Try again or use voice/manual.');
        resetToCamera();
      }
    } catch (e: any) {
      console.error('Analysis error:', e);
      toast.error(e.message || 'Analysis failed');
      resetToCamera();
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── GALLERY ───
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canUseCameraScan()) { setShowUpgradePrompt(true); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setCapturedImage(dataUrl);
      stopCamera();
      setAnalyzing(true);

      try {
        const { data, error } = await supabase.functions.invoke('analyze-food', {
          body: { imageBase64: base64 },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.foodItems?.length) {
          incrementCameraScan();
          processAIResult(data);
        } else {
          toast.error('Could not identify food.');
          resetToCamera();
        }
      } catch (e: any) {
        toast.error(e.message || 'Analysis failed');
        resetToCamera();
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─── VOICE ───
  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech not supported'); return; }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setVoiceText(transcript);
      setVoiceAmplitude(Math.random() * 0.5 + 0.5);
    };

    recognition.onend = async () => {
      setIsListening(false);
      setVoiceAmplitude(0);
      if (voiceText.trim()) analyzeVoice(voiceText);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setVoiceAmplitude(0);
      if (event.error !== 'no-speech') toast.error(`Voice: ${event.error}`);
    };

    setIsListening(true);
    setVoiceText('');
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const analyzeVoice = async (text: string) => {
    if (!text.trim()) return;
    setAnalyzing(true);
    stopCamera();

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { textDescription: text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.foodItems?.length) {
        processAIResult(data);
      } else {
        toast.error('Could not parse. Try again.');
        resetToCamera();
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed');
      resetToCamera();
    } finally {
      setAnalyzing(false);
      setVoiceText('');
    }
  };

  // ─── Process AI Result → STEP 2: Confirm ───
  const processAIResult = (data: any) => {
    const items: AnalyzedItem[] = data.foodItems.map((item: any, i: number) => {
      // Try to find in food database for accurate per100g + unitOptions
      const dbFood = getFoodByName(item.name);
      const per100g = dbFood
        ? { calories: dbFood.calories, protein: dbFood.protein, carbs: dbFood.carbs, fat: dbFood.fat, fiber: dbFood.fiber }
        : { calories: Math.round((item.calories || 0) / ((item.estimatedWeightGrams || 100) / 100)), protein: item.protein || 0, carbs: item.carbs || 0, fat: item.fat || 0, fiber: item.fiber || 0 };
      
      const unitOptions = dbFood
        ? getUnitOptionsForFood(dbFood.id, dbFood.category, dbFood.defaultServing, dbFood.servingUnit)
        : getUnitOptionsForFood('custom', 'Snacks', item.estimatedWeightGrams || 100, item.unit || 'serving');

      const suggestedUnit = item.suggestedUnit || (dbFood?.servingUnit) || item.unit || 'serving';
      const suggestedQty = item.suggestedQuantity || item.quantity || 1;

      // Calculate nutrition from per100g using the unit system
      const nutrition = calculateNutrition(per100g, suggestedQty, suggestedUnit, unitOptions);

      return {
        id: Date.now().toString() + i,
        name: dbFood?.name || item.name,
        calories: nutrition.calories / suggestedQty, // per-unit calories for quantity multiplication
        protein: nutrition.protein / suggestedQty,
        carbs: nutrition.carbs / suggestedQty,
        fat: nutrition.fat / suggestedQty,
        fiber: nutrition.fiber / suggestedQty,
        quantity: suggestedQty,
        unit: suggestedUnit,
        confidence: item.confidence || 70,
        estimatedWeightGrams: nutrition.totalGrams / suggestedQty,
        selected: true,
        per100g,
        unitOptions,
      };
    });

    setDetectedItems(items);
    setMealName(data.mealName || 'Detected Meal');
    setAiSuggestion(data.suggestions || '');
    setSourcePrediction(data.sourcePrediction || null);

    if (data.sourcePrediction?.category) {
      setSelectedSource(data.sourcePrediction.category);
    } else {
      const defaultCat = getDefaultCategory(getMealTypeFromTime());
      if (defaultCat) setSelectedSource(defaultCat);
    }

    setStep('confirm');
  };

  // ─── Calculations ───
  const activeItems = detectedItems.filter(i => i.selected !== false);

  const totalCal = activeItems.reduce((s, f) => s + f.calories * f.quantity, 0);
  const totalProtein = activeItems.reduce((s, f) => s + f.protein * f.quantity, 0);
  const totalCarbs = activeItems.reduce((s, f) => s + f.carbs * f.quantity, 0);
  const totalFat = activeItems.reduce((s, f) => s + f.fat * f.quantity, 0);

  // ─── Validation Engine (replaces old per-item + condition checks) ───
  const validationResult: ValidationResult = useMemo(
    () => validateMeal(activeItems, profile, {
      mealType: selectedMealType,
      costEstimate: mealCost?.amount,
    }),
    [activeItems, profile, selectedMealType, mealCost]
  );

  // Per-item validation for inline display
  const itemIssues = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateSingleItem>>();
    for (const item of activeItems) {
      const issues = validateSingleItem(item);
      if (issues.length > 0) map.set(item.id, issues);
    }
    return map;
  }, [activeItems]);

  // Remaining calories
  const log = getDailyLog();
  const totals = getDailyTotals(log);
  const remaining = (profile?.dailyCalories || 2000) - totals.eaten;

  // ─── Actions ───
  const resetToCamera = () => {
    setCapturedImage(null);
    setDetectedItems([]);
    setSourcePrediction(null);
    setAiSuggestion('');
    setMealName('');
    setMealCost(null);
    setSelectedSource(null);
    setStep('camera');
  };

  const toggleItemSelection = (id: string) => {
    setDetectedItems(prev => prev.map(i =>
      i.id === id ? { ...i, selected: !i.selected } : i
    ));
  };

  const updateQty = (id: string, delta: number) => {
    setDetectedItems(prev => prev.map(f =>
      f.id === id ? { ...f, quantity: Math.max(0.5, +(f.quantity + delta).toFixed(1)) } : f
    ));
  };

  const updateUnit = (id: string, newUnit: string) => {
    setDetectedItems(prev => prev.map(f => {
      if (f.id !== id || !f.per100g || !f.unitOptions) return f;
      // Recalculate per-unit nutrition based on new unit
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

  const updateItemFromEdit = (id: string, updates: { quantity: number; unit: string; itemCost?: number; itemSource?: MealSourceCategory }) => {
    setDetectedItems(prev => prev.map(f => {
      if (f.id !== id || !f.per100g || !f.unitOptions) return { ...f, ...updates };
      const nutrition = calculateNutrition(f.per100g, 1, updates.unit, f.unitOptions);
      return {
        ...f,
        quantity: updates.quantity,
        unit: updates.unit,
        itemCost: updates.itemCost,
        itemSource: updates.itemSource,
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
    setDetectedItems(prev => prev.filter(f => f.id !== id));
  };

  const addMissingItem = (item: FoodItem) => {
    setDetectedItems(prev => [...prev, { ...item, confidence: 100, selected: true }]);
    toast.success(`${item.name} added`);
  };

  const replaceItem = (id: string, food: import('@/lib/indian-foods').IndianFood, unitOptions: UnitOption[]) => {
    setDetectedItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const per100g = { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, fiber: food.fiber };
      // Try to keep original unit if available, else fall back to food's default
      const hasUnit = unitOptions.some(u => u.unit.toLowerCase() === item.unit.toLowerCase());
      const newUnit = hasUnit ? item.unit : food.servingUnit;
      const nutrition = calculateNutrition(per100g, 1, newUnit, unitOptions);
      return {
        ...item,
        name: food.name,
        per100g,
        unitOptions,
        unit: newUnit,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        estimatedWeightGrams: nutrition.totalGrams,
        confidence: 100,
      };
    }));
    toast.success(`Replaced with ${food.name}`);
  };

  const confirmAndEdit = () => {
    // Remove unchecked items
    setDetectedItems(prev => prev.filter(i => i.selected));
    setStep('edit');
  };

  const goToSaveStep = () => {
    setStep('save');
  };

  const saveMeal = () => {
    const items = activeItems;
    if (items.length === 0) {
      toast.error('No items to save');
      return;
    }

    // If there's a cost, show PES breakdown first
    const itemCostTotal = items.reduce((s, i) => s + (i.itemCost || 0), 0);
    const finalCostAmount = itemCostTotal > 0 ? itemCostTotal : (mealCost?.amount || 0);
    if (finalCostAmount > 0 && !showPESBreakdown) {
      setShowPESBreakdown(true);
      return;
    }

    confirmSaveMeal();
  };

  const confirmSaveMeal = () => {
    setShowPESBreakdown(false);
    const items = activeItems;

    const source: MealSource | null = selectedSource ? { category: selectedSource } : null;

    const itemCostTotal = items.reduce((s, i) => s + (i.itemCost || 0), 0);
    const finalCost: MealCost | null = itemCostTotal > 0
      ? { amount: itemCostTotal, currency: '₹' }
      : mealCost;

    const meal: MealEntry = {
      id: Date.now().toString(),
      type: selectedMealType,
      items,
      totalCalories: Math.round(totalCal),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFat: Math.round(totalFat),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source,
      cost: finalCost,
      photo: capturedImage || null,
    };

    const dateKey = getTodayKey();
    addMealToLog(meal);

    toast.success(`✅ ${MEAL_LABELS[selectedMealType].label} logged – ${Math.round(totalCal)} kcal`, {
      action: { label: 'Undo', onClick: () => { deleteMealFromLog(dateKey, meal.id); toast.info('Meal removed'); } },
      duration: 5000,
    });

    // Real-time budget check after logging
    const mealCostAmount = finalCost?.amount || 0;
    if (mealCostAmount > 0) {
      const budgetAlert = checkBudgetAfterMeal(mealCostAmount);
      if (budgetAlert.level === 'warning') toast.warning(budgetAlert.message);
      else if (budgetAlert.level === 'overspend' || budgetAlert.level === 'overspend_severe') toast.error(budgetAlert.message);
    }

    resetToCamera();
    navigate('/dashboard');
  };

  // Cleanup
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopCamera();
    };
  }, []);

  // ═══════════════════════════════════════════
  // STEP 1: CAMERA VIEW
  // ═══════════════════════════════════════════
  if (step === 'camera') {
    return (
      <div className="fixed inset-0 bg-foreground overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />

        {/* Camera feed */}
        <div className="absolute inset-0">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-foreground/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-foreground/80 to-transparent pointer-events-none" />

        {/* Analyzing overlay */}
        <AnimatePresence>
          {analyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
              <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </motion.div>
              <p className="text-primary-foreground font-semibold text-sm mt-4">AI is analyzing...</p>
              <p className="text-primary-foreground/60 text-xs mt-1">Identifying food & nutrition</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice waveform overlay */}
        <AnimatePresence>
          {isListening && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-x-0 top-1/3 z-20 flex flex-col items-center px-6">
              <VoiceWaveform amplitude={voiceAmplitude} />
              <p className="text-primary-foreground text-sm font-medium mt-4">{voiceText || 'Listening... Describe your meal'}</p>
              <button onClick={stopVoice}
                className="mt-3 px-6 py-2 rounded-xl bg-coral text-coral-foreground text-xs font-bold active:scale-95 transition-transform">
                Stop
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top bar */}
        {!analyzing && !isListening && (
          <div className="absolute top-0 inset-x-0 z-10 px-4 pt-12 flex items-center justify-between">
            <button onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">{(profile?.name || 'U')[0].toUpperCase()}</span>
            </button>
            <button onClick={flipCamera}
              className="w-10 h-10 rounded-xl bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
              <RotateCcw className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        )}

        {/* Monika */}
        {!analyzing && !isListening && (
          <div className="absolute top-28 right-4 z-10">
            <MonikaFab variant="camera" />
          </div>
        )}

        {/* Bottom controls */}
        {!analyzing && !isListening && (
          <div className="absolute bottom-0 inset-x-0 z-10 pb-20 px-6">
            {/* Remaining calories chip */}
            <div className="flex justify-center mb-4">
              <div className="px-4 py-2 rounded-2xl bg-primary-foreground/10 backdrop-blur-md">
                <span className="text-primary-foreground/80 text-xs font-medium">
                  {remaining > 0 ? `${remaining} kcal remaining today` : 'Goal reached! 🎉'}
                </span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              {/* Gallery */}
              <button onClick={() => galleryInputRef.current?.click()}
                className="w-12 h-12 rounded-xl bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                <ImageIcon className="w-5 h-5 text-primary-foreground" />
              </button>

              {/* Capture button */}
              <button onClick={captureAndAnalyze}
                className="relative w-[72px] h-[72px] rounded-full border-4 border-primary-foreground/40 flex items-center justify-center active:scale-90 transition-transform">
                <motion.div className="absolute inset-[-6px] rounded-full border-2 border-primary/50"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }} />
                <div className="w-[58px] h-[58px] rounded-full bg-primary-foreground" />
              </button>

              {/* Voice */}
              <button onClick={startVoice}
                className="w-12 h-12 rounded-xl bg-primary-foreground/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform">
                <Mic className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Mode chips: Scan Food | Manual Entry */}
            <div className="flex justify-center gap-2 mt-4">
              <span className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold">
                📸 Scan Food
              </span>
              <button onClick={() => navigate('/log?meal=' + selectedMealType)}
                className="px-3 py-1.5 rounded-xl bg-primary-foreground/10 text-primary-foreground/70 text-[11px] font-medium">
                ✍️ Manual Entry
              </button>
            </div>
          </div>
        )}

        {/* Upgrade prompt overlay */}
        {showUpgradePrompt && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-foreground/80 backdrop-blur-sm px-6">
            <div className="w-full max-w-sm">
              <UpgradePrompt feature="camera" remaining={getRemainingCameraScans()} onUpgraded={() => setShowUpgradePrompt(false)} />
              <button onClick={() => setShowUpgradePrompt(false)} className="w-full mt-3 py-2 rounded-xl bg-primary-foreground/10 text-primary-foreground text-xs font-medium">
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Camera error fallback */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-foreground">
            <Camera className="w-12 h-12 text-primary-foreground/30 mb-4" />
            <p className="text-primary-foreground/60 text-sm font-medium">Camera access denied</p>
            <p className="text-primary-foreground/30 text-xs mt-1 mb-4">Allow camera access or use gallery</p>
            <div className="flex gap-3">
              <button onClick={() => galleryInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform">
                Upload Photo
              </button>
              <button onClick={() => navigate('/log?meal=' + selectedMealType)}
                className="px-5 py-2.5 rounded-xl bg-primary-foreground/10 text-primary-foreground text-sm font-semibold active:scale-95 transition-transform">
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 2: CONFIRM DETECTED ITEMS (Checkboxes)
  // ═══════════════════════════════════════════
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background pb-6">
        <canvas ref={canvasRef} className="hidden" />

        {/* Captured image (small preview) */}
        {capturedImage && (
          <div className="relative h-48 overflow-hidden">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
            <button onClick={resetToCamera}
              className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-foreground/50 backdrop-blur-md flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-primary-foreground" />
            </button>
            <button onClick={resetToCamera}
              className="absolute top-4 right-4 h-9 px-3 rounded-xl bg-foreground/50 backdrop-blur-md flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary-foreground" />
              <span className="text-primary-foreground text-xs font-semibold">Retake</span>
            </button>
          </div>
        )}

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">We found these items</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Uncheck anything that's wrong, or tap ✏️ to correct</p>
          </div>

          {/* Detected items with checkboxes */}
          <div className="space-y-2">
            {detectedItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-subtle p-3.5 transition-all ${
                  item.selected ? 'border-primary/30 bg-primary/5' : 'opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button onClick={() => toggleItemSelection(item.id)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                      item.selected ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                    {item.selected && <Check className="w-4 h-4 text-primary-foreground" />}
                  </button>

                  {/* Food info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                      {/* Edit/Replace pencil icon */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplacingItemId(item.id); }}
                        className="w-6 h-6 rounded-md hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors"
                        title="Replace this food"
                      >
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                      </button>
                      {item.confidence !== undefined && <ConfidenceBadge confidence={item.confidence} />}
                    </div>
                  </div>
                </div>

                {/* Unit picker row - only when selected */}
                {item.selected && item.per100g && item.unitOptions && (
                  <div className="mt-2 pl-9" onClick={e => e.stopPropagation()}>
                    <UnitPicker
                      quantity={item.quantity}
                      unit={item.unit}
                      unitOptions={item.unitOptions}
                      per100g={item.per100g}
                      onQuantityChange={(qty) => updateQty(item.id, qty - item.quantity)}
                      onUnitChange={(u) => updateUnit(item.id, u)}
                      showNutrition={true}
                    />
                  </div>
                )}

                {/* Fallback for items without unit system */}
                {item.selected && (!item.per100g || !item.unitOptions) && (
                  <p className="text-[11px] text-muted-foreground mt-1 pl-9">
                    {item.quantity} {item.unit} · {Math.round(item.calories * item.quantity)} kcal
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add missing item */}
          <button onClick={() => setAddFoodOpen(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Missing Item
          </button>

          {/* Allergen warning banner */}
          {(() => {
            const userAllergens = profile?.allergens || [];
            if (userAllergens.length === 0 && getUserConditions(profile as any).length === 0) return null;
            const userConds = getUserConditions(profile as any);

            // Allergen messages
            const allergenMessages: WarningMessage[] = [];
            const allergenItems = activeItems.filter(item => checkAllergens(item.name, userAllergens).hasConflict);
            for (const item of allergenItems) {
              const matched = checkAllergens(item.name, userAllergens).matched;
              for (const a of matched) {
                allergenMessages.push({
                  icon: getAllergenEmoji(a),
                  text: `${item.name} contains ${getAllergenLabel(a)}`,
                  itemId: item.id,
                  itemName: item.name,
                });
              }
            }

            // Health condition messages
            const condMessages: WarningMessage[] = [];
            for (const item of activeItems) {
              const warnings = checkFoodForConditions(item.name, userConds);
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

            // Sugar Cut plan warnings
            const sugarWarnings: WarningMessage[] = [];
            if (isSugarDetectionActive()) {
              const sugarCheck = getSugarWarnings(activeItems);
              if (sugarCheck.hasWarnings) {
                for (const sw of sugarCheck.messages) {
                  sugarWarnings.push({
                    icon: sw.icon,
                    text: sw.text,
                    itemId: sw.itemId,
                    itemName: sw.itemName,
                  });
                }
              }
            }

            // Plan rule violation warnings
            const planWarnings: WarningMessage[] = [];
            const activePlan = getActivePlan();
            if (activePlan) {
              const planMeta = getPlanById(activePlan.planId);
              const ruleTexts = (planMeta?.rules || []).map(r => r.toLowerCase());
              const hasHomeOnly = ruleTexts.some(r => r.includes('home-cooked') || r.includes('home cooked'));
              const hasNoJunk = ruleTexts.some(r => r.includes('no junk') || r.includes('no processed'));

              // Home-cooked only check
              if (hasHomeOnly && selectedSource && ['restaurant', 'street_food', 'packaged', 'fast_food'].includes(selectedSource)) {
                planWarnings.push({
                  icon: '🎯',
                  text: `This meal isn't home-cooked — your ${planMeta?.name || 'plan'} requires home-cooked meals`,
                });
              }

              // No junk food check
              if (hasNoJunk) {
                const junkKeywords = ['pizza', 'burger', 'fries', 'chips', 'soda', 'cola', 'pepsi', 'maggi', 'noodles', 'instant', 'samosa', 'pakora', 'bhatura', 'jalebi', 'gulab jamun', 'cake', 'pastry', 'candy', 'chocolate', 'ice cream', 'fried'];
                for (const item of activeItems) {
                  const nameLower = item.name.toLowerCase();
                  const matchedJunk = junkKeywords.find(k => nameLower.includes(k));
                  if (matchedJunk) {
                    planWarnings.push({
                      icon: '🎯',
                      text: `${item.name} is flagged as junk food — not allowed in your plan`,
                      itemId: item.id,
                      itemName: item.name,
                    });
                  }
                }
              }
            }

            const allMessages = [...allergenMessages, ...condMessages, ...sugarWarnings, ...planWarnings];
            if (allMessages.length === 0) return null;

            const allMatched = [...new Set(allergenItems.flatMap(item => checkAllergens(item.name, userAllergens).matched))];
            const isSevere = hasSevereAllergen(allMatched);
            const hasHighCondition = condMessages.some(m => {
              const item = activeItems.find(i => i.id === m.itemId);
              if (!item) return false;
              return checkFoodForConditions(item.name, userConds).some(w => w.severity === 'high');
            });

            const severity = (isSevere || hasHighCondition) ? 'high' as const : 'medium' as const;
            const hasPlanWarnings = planWarnings.length > 0;
            const type = allergenMessages.length > 0 && condMessages.length > 0 ? 'combined' as const
              : allergenMessages.length > 0 ? 'allergen' as const : 'health' as const;
            const title = isSevere ? '🚨 Severe Allergen Detected'
              : allergenMessages.length > 0 ? '⚠️ Allergen Warning'
              : hasHighCondition ? '🚨 Health Condition Alert'
              : hasPlanWarnings ? '🎯 Plan Rule Violation'
              : '⚠️ Health Advisory';

            return (
              <AnimatedWarningBanner
                type={type}
                severity={hasPlanWarnings && !isSevere && !hasHighCondition ? 'medium' : severity}
                title={title}
                messages={allMessages}
                onRemoveItem={(id) => toggleItemSelection(id)}
                onFindAlternative={hasPlanWarnings ? () => setReplaceOpen(true) : undefined}
              />
            );
          })()}

          {/* Low confidence warning */}
          {detectedItems.some(f => f.confidence !== undefined && f.confidence < 70) && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <AlertTriangle className="w-4 h-4 text-accent shrink-0" />
              <span className="text-[11px] text-accent font-medium">Some items have low confidence – please verify</span>
            </div>
          )}

          {/* Weather-aware nudge for this meal */}
          <WeatherNudgeCard mealItems={activeItems} onAddFood={(food) => {
            addMissingItem({
              id: Date.now().toString(),
              name: food.name,
              calories: food.calories,
              protein: 2,
              carbs: 10,
              fat: 1,
              quantity: 1,
              unit: 'serving',
              emoji: food.emoji,
            });
          }} compact />

          {/* Live total preview */}
          <div className="card-elevated p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Quick Total</span>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-foreground">{Math.round(totalCal)}</span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
            </div>
            <div className="flex gap-3 text-[11px] text-muted-foreground mt-1">
              <span>P {Math.round(totalProtein)}g</span>
              <span>C {Math.round(totalCarbs)}g</span>
              <span>F {Math.round(totalFat)}g</span>
            </div>
          </div>

          {/* Continue button */}
          <button onClick={confirmAndEdit} disabled={activeItems.length === 0}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-40">
            <Check className="w-4 h-4" /> Continue ({activeItems.length} items)
          </button>
        </div>

        <AddFoodSheet open={addFoodOpen} onOpenChange={setAddFoodOpen} onAdd={addMissingItem} />

        {/* Food Replace Sheet */}
        {replacingItemId && (() => {
          const rItem = detectedItems.find(i => i.id === replacingItemId);
          if (!rItem) return null;
          return (
            <FoodReplaceSheet
              open={!!replacingItemId}
              onOpenChange={(v) => { if (!v) setReplacingItemId(null); }}
              originalName={rItem.name}
              originalQuantity={rItem.quantity}
              originalUnit={rItem.unit}
              onReplace={(food, unitOptions) => {
                replaceItem(replacingItemId, food, unitOptions);
                setReplacingItemId(null);
              }}
            />
          );
        })()}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 3: QUICK EDIT (Portions + Live Calc)
  // ═══════════════════════════════════════════
  if (step === 'edit') {
    return (
      <div className="min-h-screen bg-background pb-6">
        <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('confirm')}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Adjust Portions</h1>
              <p className="text-xs text-muted-foreground">Tap [-] [+] to change. Quantities update live.</p>
            </div>
          </div>

          {/* Food items with unit pickers */}
          <div className="space-y-2">
            {detectedItems.map(item => {
              const itemCal = Math.round(item.calories * item.quantity);
              const itemP = Math.round(item.protein * item.quantity * 10) / 10;
              const itemC = Math.round(item.carbs * item.quantity * 10) / 10;
              const itemF = Math.round(item.fat * item.quantity * 10) / 10;
              const issues = itemIssues.get(item.id) || [];

              return (
                <div key={item.id} className={`card-subtle p-3.5 ${issues.some(w => w.severity === 'block') ? 'border-destructive/40 border' : ''}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={() => setEditingItemId(item.id)} className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-foreground">{item.name}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplacingItemId(item.id); }}
                          className="w-5 h-5 rounded-md hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors"
                          title="Replace this food"
                        >
                          <Pencil className="w-3 h-3 text-primary" />
                        </button>
                        {item.confidence !== undefined && <ConfidenceBadge confidence={item.confidence} />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {itemCal} kcal · P {itemP}g · C {itemC}g · F {itemF}g
                      </p>
                      {item.estimatedWeightGrams && (
                        <p className="text-[10px] text-muted-foreground/60">
                          ≈ {Math.round(item.estimatedWeightGrams * item.quantity)}g total
                          {item.itemSource && ` · ${item.itemSource}`}
                        </p>
                      )}
                    </button>

                    {/* Per-item cost input */}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] text-muted-foreground">₹</span>
                      <input
                        type="number"
                        value={item.itemCost || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDetectedItems(prev => prev.map(f =>
                            f.id === item.id ? { ...f, itemCost: val ? parseFloat(val) : undefined } : f
                          ));
                        }}
                        placeholder="Cost"
                        className="w-16 h-6 text-[11px] px-1.5 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      {item.itemCost ? (
                        <span className="text-[10px] font-medium text-accent">₹{item.itemCost}</span>
                      ) : null}
                    </div>

                    {/* Remove */}
                    <button onClick={() => removeItem(item.id)}
                      className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center shrink-0">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
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
                      <button onClick={() => updateQty(item.id, -0.5)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center active:scale-90 transition-transform">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold min-w-[3.5rem] text-center">{item.quantity} {item.unit}</span>
                      <button onClick={() => updateQty(item.id, 0.5)}
                        className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center active:scale-90 transition-transform">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </div>
                  )}

                  {/* Validation issues */}
                  {issues.map((w, wi) => (
                    <div key={wi} className="flex items-center gap-1 mt-1.5">
                      <AlertTriangle className={`w-3 h-3 ${w.severity === 'block' ? 'text-destructive' : 'text-accent'}`} />
                      <span className={`text-[10px] font-medium ${w.severity === 'block' ? 'text-destructive' : 'text-accent'}`}>{w.message}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Add more */}
          <button onClick={() => setAddFoodOpen(true)}
            className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> Add more items
          </button>

          {/* ── LIVE MEAL SUMMARY (updates in real-time) ── */}
          {(() => {
            const itemCostSum = detectedItems.reduce((s, i) => s + (i.itemCost || 0), 0);
            return (
              <div className="card-elevated p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">Meal Total</span>
                    <FoodMoodIndicator protein={totalProtein} carbs={totalCarbs} fat={totalFat} calories={totalCal} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-foreground">{Math.round(totalCal)}</span>
                    <span className="text-xs text-muted-foreground">kcal</span>
                  </div>
                </div>
                <div className="flex gap-4 text-[11px] text-muted-foreground">
                  <span>Protein: {Math.round(totalProtein)}g</span>
                  <span>Carbs: {Math.round(totalCarbs)}g</span>
                  <span>Fat: {Math.round(totalFat)}g</span>
                </div>
                {itemCostSum > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-border">
                    <span className="text-[11px] font-semibold text-accent">Total Cost</span>
                    <span className="text-sm font-bold text-accent">₹{itemCostSum}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground/70 pt-1">
                  {remaining - Math.round(totalCal) > 0
                    ? `${Math.max(0, remaining - Math.round(totalCal))} kcal remaining after this meal`
                    : '⚠️ This will exceed your daily goal'}
                </div>
              </div>
            );
          })()}

          {/* ── VALIDATION ENGINE FEEDBACK ── */}
          <ValidationFeedback result={validationResult} />

          {/* AI suggestion */}
          {aiSuggestion && (
            <div className="text-xs text-primary/80 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" /> {aiSuggestion}
            </div>
          )}

          {/* Continue to save – blocked if validation fails */}
          <button onClick={goToSaveStep} disabled={detectedItems.length === 0 || validationResult.hasBlocks}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-40">
            {validationResult.hasBlocks ? '⚠️ Fix issues to continue' : 'Continue'}
          </button>
        </div>

        <AddFoodSheet open={addFoodOpen} onOpenChange={setAddFoodOpen} onAdd={addMissingItem} />

        {/* Food Edit Modal */}
        {editingItemId && (() => {
          const editItem = detectedItems.find(i => i.id === editingItemId);
          if (!editItem || !editItem.per100g || !editItem.unitOptions) return null;
          return (
            <FoodEditModal
              open={true}
              onOpenChange={(open) => { if (!open) setEditingItemId(null); }}
              item={{
                id: editItem.id,
                name: editItem.name,
                quantity: editItem.quantity,
                unit: editItem.unit,
                per100g: editItem.per100g,
                unitOptions: editItem.unitOptions,
                itemCost: editItem.itemCost,
                itemSource: editItem.itemSource,
              }}
              onSave={(updates) => {
                updateItemFromEdit(editItem.id, updates);
                setEditingItemId(null);
              }}
            />
          );
        })()}

        {/* Food Replace Sheet (edit step) */}
        {replacingItemId && (() => {
          const rItem = detectedItems.find(i => i.id === replacingItemId);
          if (!rItem) return null;
          return (
            <FoodReplaceSheet
              open={!!replacingItemId}
              onOpenChange={(v) => { if (!v) setReplacingItemId(null); }}
              originalName={rItem.name}
              originalQuantity={rItem.quantity}
              originalUnit={rItem.unit}
              onReplace={(food, unitOptions) => {
                replaceItem(replacingItemId, food, unitOptions);
                setReplacingItemId(null);
              }}
            />
          );
        })()}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 4: SAVE (Meal Type + Source + Cost)
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-6">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('edit')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Confirm & Save</h1>
            <p className="text-xs text-muted-foreground">Pick meal slot, source, and cost</p>
          </div>
        </div>

        {/* Meal type selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Meal Slot</p>
          <div className="grid grid-cols-4 gap-2">
            {(['breakfast', 'lunch', 'snack', 'dinner'] as MealType[]).map(mt => (
              <button key={mt} onClick={() => setSelectedMealType(mt)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                  selectedMealType === mt ? 'border-primary bg-primary/10' : 'border-border bg-card'
                }`}>
                <span className="text-lg">{MEAL_LABELS[mt].emoji}</span>
                <span className="text-[11px] font-semibold text-foreground">{MEAL_LABELS[mt].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Source selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Where from?</p>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_OPTIONS.map(opt => (
              <button key={opt} onClick={() => setSelectedSource(opt)}
                className={`px-3 py-2 rounded-xl text-[11px] font-medium border transition-all ${
                  selectedSource === opt
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-foreground hover:border-primary/40'
                }`}>
                {getSourceEmoji(opt)} {getSourceLabel(opt)}
              </button>
            ))}
          </div>
        </div>

        {/* Cost section */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost</p>
          <CostSuggestionBanner
            items={activeItems.map(f => ({ name: f.name, quantity: f.quantity, unit: f.unit }))}
            onCostConfirm={(amount) => setMealCost({ amount, currency: '₹' })}
            onFree={() => setMealCost({ amount: 0, currency: '₹' })}
          />
          {mealCost && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
              {mealCost.amount === 0 ? '🎁 Marked as free (home/treated)' : `💰 Cost: ₹${mealCost.amount}`}
              <button onClick={() => setMealCost(null)} className="text-primary text-[10px] font-semibold">Change</button>
            </div>
          )}
        </div>

        {/* Final summary */}
        <div className="card-elevated p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">{MEAL_LABELS[selectedMealType].emoji} {MEAL_LABELS[selectedMealType].label}</span>
            <span className="text-lg font-bold text-foreground">{Math.round(totalCal)} <span className="text-xs font-medium text-muted-foreground">kcal</span></span>
          </div>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span>P {Math.round(totalProtein)}g</span>
            <span>C {Math.round(totalCarbs)}g</span>
            <span>F {Math.round(totalFat)}g</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 space-y-1">
            {activeItems.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.name} ({item.quantity} {item.unit})</span>
                <div className="flex items-center gap-2">
                  {item.itemCost ? <span className="font-medium text-accent">₹{item.itemCost}</span> : null}
                  <span className="font-medium text-foreground">{Math.round(item.calories * item.quantity)} kcal</span>
                </div>
              </div>
            ))}
          </div>
          {selectedSource && (
            <div className="text-[11px] text-muted-foreground">
              {getSourceEmoji(selectedSource)} {getSourceLabel(selectedSource)}
              {mealCost ? (mealCost.amount === 0 ? ' · 🎁 Free' : ` · ₹${mealCost.amount}`) : ''}
            </div>
          )}
          <div className="text-xs text-muted-foreground/70">
            Budget left today: ₹{Math.max(0, remaining - Math.round(totalCal))} kcal after this
          </div>
        </div>

        {/* Validation feedback on save step */}
        {validationResult.issues.length > 0 && (
          <ValidationFeedback result={validationResult} compact />
        )}

        {/* Save button */}
        <button onClick={saveMeal} disabled={validationResult.hasBlocks}
          className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base font-bold disabled:opacity-40">
          <Check className="w-5 h-5" /> {validationResult.hasBlocks ? '⚠️ Fix issues first' : 'Save Meal'}
        </button>
      </div>

      {/* PES Breakdown Modal */}
      <PESBreakdownModal
        open={showPESBreakdown}
        food={{
          name: mealName || activeItems.map(i => i.name).join(', '),
          cost: activeItems.reduce((s, i) => s + (i.itemCost || 0), 0) || mealCost?.amount || 0,
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          fat: Math.round(totalFat),
          calories: Math.round(totalCal),
        }}
        mealLabel={MEAL_LABELS[selectedMealType].label}
        onConfirm={confirmSaveMeal}
        onEdit={() => setShowPESBreakdown(false)}
      />
    </div>
  );
}
