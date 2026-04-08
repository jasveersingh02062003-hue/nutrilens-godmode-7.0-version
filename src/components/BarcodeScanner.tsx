import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Loader2, Package, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import PESBadge from '@/components/PESBadge';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductFound?: (product: any) => void;
}

interface ScannedProduct {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  mrp: number;
  selling_price: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  pes_score: number | null;
  cost_per_gram_protein: number | null;
  serving_size: string | null;
  image_url: string | null;
  barcode: string | null;
}

type ScanState = 'idle' | 'scanning' | 'loading' | 'found' | 'not_found' | 'error';

export default function BarcodeScanner({ open, onOpenChange, onProductFound }: BarcodeScannerProps) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
  }, []);

  const lookupBarcode = useCallback(async (code: string) => {
    setScanState('loading');
    setScannedCode(code);

    try {
      // First try exact barcode match
      let { data, error } = await supabase
        .from('packed_products')
        .select('*')
        .eq('barcode', code)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setProduct(data[0] as ScannedProduct);
        setScanState('found');
        onProductFound?.(data[0]);
        return;
      }

      // No match found
      setScanState('not_found');
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed');
      setScanState('error');
    }
  }, [onProductFound]);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;

    setScanState('scanning');
    setProduct(null);
    setScannedCode('');
    setErrorMsg('');

    try {
      await stopScanner();

      const scanner = new Html5Qrcode('barcode-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Stop scanning once we get a result
          scanner.stop().then(() => {
            lookupBarcode(decodedText);
          }).catch(() => {
            lookupBarcode(decodedText);
          });
        },
        () => {} // ignore scan failures
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setErrorMsg('Camera access denied. Please allow camera permissions in your browser settings.');
      } else if (msg.includes('NotFoundError')) {
        setErrorMsg('No camera found on this device.');
      } else {
        setErrorMsg(msg);
      }
      setScanState('error');
    }
  }, [stopScanner, lookupBarcode]);

  useEffect(() => {
    if (open) {
      // Small delay to allow sheet animation
      const timer = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      setScanState('idle');
      setProduct(null);
      setScannedCode('');
    }
  }, [open, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleRescan = () => {
    startScanner();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[95dvh] p-0 rounded-t-3xl">
        <SheetTitle className="sr-only">Barcode Scanner</SheetTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Scan Product</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Scanner viewport */}
        <div className="relative mx-4 rounded-2xl overflow-hidden bg-black" style={{ minHeight: 280 }}>
          <div id="barcode-reader" ref={containerRef} className="w-full" />

          {/* Overlay states */}
          <AnimatePresence mode="wait">
            {scanState === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80"
              >
                <Camera className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Starting camera...</p>
              </motion.div>
            )}

            {scanState === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80"
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <p className="text-sm text-foreground font-semibold">Looking up barcode...</p>
                <p className="text-xs text-muted-foreground mt-1">{scannedCode}</p>
              </motion.div>
            )}

            {scanState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6"
              >
                <CameraOff className="w-10 h-10 text-destructive mb-3" />
                <p className="text-sm text-foreground font-semibold text-center">Camera Error</p>
                <p className="text-xs text-muted-foreground text-center mt-1">{errorMsg}</p>
                <button
                  onClick={handleRescan}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                >
                  Try Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanning guide overlay */}
          {scanState === 'scanning' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[260px] h-[130px] border-2 border-primary/60 rounded-xl relative">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary rounded text-[9px] text-primary-foreground font-bold">
                  Align barcode here
                </div>
                {/* Scanning line animation */}
                <motion.div
                  className="absolute left-2 right-2 h-0.5 bg-primary/80"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results section */}
        <div className="px-4 pb-6 pt-3">
          <AnimatePresence mode="wait">
            {scanState === 'scanning' && (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs text-muted-foreground"
              >
                Point camera at any product barcode
              </motion.p>
            )}

            {scanState === 'not_found' && (
              <motion.div
                key="notfound"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-center"
              >
                <AlertTriangle className="w-8 h-8 text-accent mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Product Not Found</p>
                <p className="text-xs text-muted-foreground mt-1">Barcode: {scannedCode}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  This product isn't in our database yet. We're adding new products daily!
                </p>
                <button
                  onClick={handleRescan}
                  className="mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                >
                  Scan Another
                </button>
              </motion.div>
            )}

            {scanState === 'found' && product && (
              <motion.div
                key="found"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-card border border-border space-y-3"
              >
                {/* Product header */}
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.product_name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Package className="w-7 h-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight">{product.product_name}</p>
                    <p className="text-[11px] text-muted-foreground">{product.brand}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">₹{product.selling_price || product.mrp}</span>
                      {product.selling_price && product.selling_price < product.mrp && (
                        <span className="text-[10px] text-muted-foreground line-through">₹{product.mrp}</span>
                      )}
                      {product.pes_score != null && product.pes_score > 0 && (
                        <PESBadge score={product.pes_score} size="sm" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Nutrition grid */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', value: product.calories, unit: 'kcal' },
                    { label: 'Protein', value: product.protein, unit: 'g' },
                    { label: 'Carbs', value: product.carbs, unit: 'g' },
                    { label: 'Fat', value: product.fat, unit: 'g' },
                  ].map(n => (
                    <div key={n.label} className="p-2 rounded-xl bg-muted/50 text-center">
                      <p className="text-[10px] text-muted-foreground">{n.label}</p>
                      <p className="text-xs font-bold text-foreground">
                        {n.value != null ? `${n.value}${n.unit}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Serving & cost info */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  {product.serving_size && <span>Per serving: {product.serving_size}</span>}
                  {product.cost_per_gram_protein != null && product.cost_per_gram_protein > 0 && (
                    <span className="font-semibold text-foreground">₹{product.cost_per_gram_protein.toFixed(1)}/g protein</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleRescan}
                    className="flex-1 py-2.5 rounded-xl bg-muted text-foreground text-xs font-bold"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={() => {
                      onProductFound?.(product);
                      onOpenChange(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
                  >
                    View Details
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
