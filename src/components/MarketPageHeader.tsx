import { ArrowLeft, Store, MapPin, Search, X, ChevronDown, Leaf, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SUPPORTED_CITIES } from '@/lib/market-service';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useMarket } from '@/contexts/MarketContext';
import BarcodeScanner from '@/components/BarcodeScanner';

interface MarketPageHeaderProps {
  title?: string;
  city?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onCityChange?: (city: string) => void;
}

export default function MarketPageHeader({
  title = 'Smart Market',
  city,
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search eggs, chicken, paneer, whey...',
  onCityChange,
}: MarketPageHeaderProps) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { vegOnly, setVegOnly } = useMarket();
  const [searchOpen, setSearchOpen] = useState(showSearch);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const displayCity = city || (profile as any)?.city || 'All India';

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/50">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-xl bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            {title}
          </h1>
          <button
            onClick={() => setCityPickerOpen(!cityPickerOpen)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <MapPin className="w-3 h-3 text-primary/70" />
            <span>{displayCity}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${cityPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Scan button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setScannerOpen(true)}
          className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
          aria-label="Scan barcode"
        >
          <ScanBarcode className="w-4 h-4 text-primary" />
        </motion.button>

        {/* Veg toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setVegOnly(!vegOnly)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
            vegOnly
              ? 'bg-green-500/15 text-green-600 border-green-500/30'
              : 'bg-muted/80 text-muted-foreground border-transparent hover:bg-muted'
          }`}
        >
          <Leaf className={`w-3 h-3 ${vegOnly ? 'text-green-600' : 'text-muted-foreground'}`} />
          Veg
        </motion.button>

        {/* Search toggle */}
        {onSearchChange && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchOpen(!searchOpen)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              searchOpen ? 'bg-primary/10 text-primary' : 'bg-muted/80 text-muted-foreground hover:bg-muted'
            }`}
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* City picker dropdown */}
      <AnimatePresence>
        {cityPickerOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">Select your city</p>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTED_CITIES.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setCityPickerOpen(false);
                      onCityChange?.(c);
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                      displayCity.toLowerCase() === c.toLowerCase()
                        ? 'bg-primary text-primary-foreground scale-105'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated search bar */}
      <AnimatePresence>
        {searchOpen && onSearchChange && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/80 text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary/30 transition-shadow"
                />
                {searchValue && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BarcodeScanner open={scannerOpen} onOpenChange={setScannerOpen} />
    </div>
  );
}
