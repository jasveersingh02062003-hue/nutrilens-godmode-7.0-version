import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { MARKET_ITEMS, getCityPrice, calculateMarketPES, getMarketPESColor, FRESH_CATEGORIES, type RawMarketItem } from '@/lib/market-data';
import { type MarketItem as LegacyMarketItem } from '@/lib/market-service';
import { detectCity } from '@/lib/auto-location';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { INDIAN_FOODS } from '@/lib/indian-foods';
import { buildFromFood } from '@/lib/compare-helpers';
import { toast } from 'sonner';

export interface ProcessedMarketItem extends RawMarketItem {
  cityPrice: number;
  pes: number;
  pesColor: 'green' | 'yellow' | 'red';
  costPerGram: number;
}

interface MarketContextValue {
  city: string;
  cityLabel: string;
  detectedCity: string;
  isAutoDetected: boolean;
  locationLoading: boolean;
  setCity: (city: string) => void;
  handleCitySelect: (city: string) => Promise<void>;
  processedItems: ProcessedMarketItem[];
  compareItems: LegacyMarketItem[];
  toggleCompare: (item: ProcessedMarketItem, e: React.MouseEvent) => void;
  setCompareItems: React.Dispatch<React.SetStateAction<LegacyMarketItem[]>>;
  compareData: any[];
  toMarketItem: (item: RawMarketItem, priceChange?: number) => LegacyMarketItem;
  vegOnly: boolean;
  setVegOnly: (v: boolean) => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within MarketProvider');
  return ctx;
}

function convertToMarketItem(item: RawMarketItem, city: string, priceChange?: number): LegacyMarketItem {
  const price = getCityPrice(item.basePrice, city);
  const pes = calculateMarketPES(item.protein, price);
  const costPerGram = item.protein > 0 ? Math.round((price / item.protein) * 100) / 100 : 999;
  return {
    id: item.id, name: item.name, price, protein: item.protein, calories: item.calories,
    pes: Math.round(pes * 100) / 100, pesColor: getMarketPESColor(pes), costPerGramProtein: costPerGram,
    category: item.isVeg ? 'Veg' : 'Non-Veg', unit: item.unit, source: 'fresh', imageUrl: item.emoji,
    lastUpdated: 'static', priceChange: priceChange || 0, carbs: item.carbs, fat: item.fat, fiber: item.fiber,
  };
}

const VEG_STORAGE_KEY = 'nutrilens_veg_only';

export function MarketProvider({ children }: { children: ReactNode }) {
  const { profile, updateProfile } = useUserProfile();
  const { user } = useAuth();

  const [city, setCity] = useState<string>('');
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [isAutoDetected, setIsAutoDetected] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [compareItems, setCompareItems] = useState<LegacyMarketItem[]>([]);
  const [vegOnly, setVegOnlyState] = useState<boolean>(() => {
    try { return localStorage.getItem(VEG_STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  const setVegOnly = useCallback((v: boolean) => {
    setVegOnlyState(v);
    try { localStorage.setItem(VEG_STORAGE_KEY, String(v)); } catch {}
  }, []);

  // Auto-detect city once
  useEffect(() => {
    const profileCity = (profile as any)?.city || '';
    setLocationLoading(true);
    detectCity(profileCity).then(result => {
      setCity(result.resolvedCity);
      setDetectedCity(result.city);
      setIsAutoDetected(result.isAutoDetected);
      setLocationLoading(false);
      if (result.isAutoDetected && !profileCity && result.resolvedCity !== 'India') {
        if (updateProfile) updateProfile({ city: result.resolvedCity } as any);
        if (user?.id) supabase.from('profiles').update({ city: result.resolvedCity }).eq('id', user.id);
        toast.success(`📍 Location detected: ${result.city}`, { duration: 3000 });
      }
    });
  }, [(profile as any)?.city]);

  const handleCitySelect = useCallback(async (selectedCity: string) => {
    setCity(selectedCity);
    setIsAutoDetected(false);
    if (updateProfile) updateProfile({ city: selectedCity } as any);
    if (user?.id) await supabase.from('profiles').update({ city: selectedCity }).eq('id', user.id);
    toast.success(`📍 Prices updated for ${selectedCity}`);
  }, [updateProfile, user?.id]);

  // Fetch live prices from city_prices DB
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; updatedAt: string }>>({});

  useEffect(() => {
    const resolvedCity = city || 'India';
    if (resolvedCity === 'India') return;
    supabase
      .from('city_prices')
      .select('item_name, avg_price, updated_at')
      .ilike('city', resolvedCity.toLowerCase())
      .then(({ data }) => {
        if (data && data.length > 0) {
          const prices: Record<string, { price: number; updatedAt: string }> = {};
          for (const row of data) {
            prices[row.item_name.toLowerCase()] = { price: Number(row.avg_price), updatedAt: row.updated_at };
          }
          setLivePrices(prices);
        }
      });
  }, [city]);

  const processedItems = useMemo(() => {
    const resolvedCity = city || 'India';
    return MARKET_ITEMS.map(item => {
      // Check DB live price first (match by PRICE_SEARCH_KEYS or item name)
      const searchKey = PRICE_SEARCH_KEYS[item.name]?.toLowerCase();
      const liveMatch = searchKey ? livePrices[searchKey] : livePrices[item.name.toLowerCase()];
      
      const price = liveMatch ? liveMatch.price : getCityPrice(item.basePrice, resolvedCity);
      const pes = calculateMarketPES(item.protein, price, item.unit);
      const pricePer100g = item.unit === 'kg' ? price / 10 : price;
      const costPerGram = item.protein > 0 ? Math.round((pricePer100g / item.protein) * 100) / 100 : 999;
      return { 
        ...item, 
        cityPrice: price, 
        pes: Math.round(pes * 100) / 100, 
        pesColor: getMarketPESColor(pes), 
        costPerGram,
        lastUpdated: liveMatch ? liveMatch.updatedAt : 'static',
      } as ProcessedMarketItem;
    });
  }, [city, livePrices]);

  const toMarketItem = useCallback((item: RawMarketItem, priceChange?: number) => {
    return convertToMarketItem(item, city || 'India', priceChange);
  }, [city]);

  const toggleCompare = useCallback((item: ProcessedMarketItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const marketItem = convertToMarketItem(MARKET_ITEMS.find(m => m.id === item.id)!, city || 'India');
    setCompareItems(prev => {
      if (prev.find(i => i.id === item.id)) return prev.filter(i => i.id !== item.id);
      if (prev.length >= 4) { toast.error('Max 4 items'); return prev; }
      return [...prev, marketItem];
    });
  }, [city]);

  const compareData = useMemo(() => {
    return compareItems.map(item => {
      const food = INDIAN_FOODS.find(f => f.name.toLowerCase() === item.name.toLowerCase());
      if (food) return buildFromFood(food);
      return { type: 'food' as const, id: item.id, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs || 0, fat: item.fat || 0, fiber: item.fiber || 0, iron: 0, calcium: 0, vitC: 0, cost: item.price, pes: item.pes, image: item.imageUrl, servingGrams: 100 };
    });
  }, [compareItems]);

  const cityLabel = city && city !== 'India' ? city : 'All India';

  return (
    <MarketContext.Provider value={{
      city, cityLabel, detectedCity, isAutoDetected, locationLoading, setCity, handleCitySelect,
      processedItems, compareItems, toggleCompare, setCompareItems, compareData, toMarketItem,
      vegOnly, setVegOnly,
    }}>
      {children}
    </MarketContext.Provider>
  );
}
