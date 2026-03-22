import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, Check, Edit3, X, Plus, ScanLine, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { saveGroceryPurchase, type GroceryPurchaseItem } from '@/lib/pantry-store';
import { learnPrice } from '@/lib/price-memory';
import { toast } from 'sonner';

interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  confirmed: boolean;
}

interface Props {
  onComplete: () => void;
  onClose: () => void;
}

export default function GroceryBillScanner({ onComplete, onClose }: Props) {
  const [step, setStep] = useState<'capture' | 'scanning' | 'confirm' | 'manual'>('capture');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [storeName, setStoreName] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // New manual item
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState('1');
  const [manualUnit, setManualUnit] = useState('kg');
  const [manualPrice, setManualPrice] = useState('');

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStep('scanning');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];

      try {
        const { data, error } = await supabase.functions.invoke('scan-receipt', {
          body: { imageBase64: base64 },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        if (data?.items?.length) {
          setScannedItems(data.items.map((item: any) => ({
            name: item.name || 'Unknown item',
            quantity: item.quantity || 1,
            unit: item.unit || 'piece',
            price: item.price || 0,
            confirmed: false,
          })));
          setStoreName(data.storeName || '');
          setStep('confirm');
        } else {
          toast.error('Could not read receipt. Try manual entry.');
          setStep('manual');
        }
      } catch (err: any) {
        console.error('Receipt scan error:', err);
        toast.error(err.message || 'Failed to scan receipt');
        setStep('manual');
      }
    };
    reader.readAsDataURL(file);
  };

  const updateItem = (idx: number, field: keyof ScannedItem, value: any) => {
    setScannedItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (idx: number) => {
    setScannedItems(prev => prev.filter((_, i) => i !== idx));
  };

  const addManualItem = () => {
    if (!manualName.trim()) return;
    setScannedItems(prev => [...prev, {
      name: manualName.trim(),
      quantity: Number(manualQty) || 1,
      unit: manualUnit,
      price: Number(manualPrice) || 0,
      confirmed: true,
    }]);
    setManualName('');
    setManualQty('1');
    setManualPrice('');
  };

  const confirmAll = () => {
    if (scannedItems.length === 0) {
      toast.error('Add at least one item');
      return;
    }

    const purchaseItems: GroceryPurchaseItem[] = scannedItems.map(i => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      price: i.price,
    }));

    const total = purchaseItems.reduce((s, i) => s + i.price, 0);

    saveGroceryPurchase({
      date: new Date().toISOString().split('T')[0],
      storeName: storeName || undefined,
      items: purchaseItems,
      totalAmount: total,
      currency: '₹',
    });

    // Learn prices for future suggestions
    for (const item of scannedItems) {
      if (item.price > 0 && item.quantity > 0) {
        learnPrice(item.name, Math.round((item.price / item.quantity) * 100) / 100, item.unit);
      }
    }

    toast.success(`✅ ${scannedItems.length} items added to pantry!`);
    onComplete();
  };

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />

      {/* Step: Capture */}
      {step === 'capture' && (
        <div className="text-center space-y-4 py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <ScanLine className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Scan Grocery Receipt</p>
            <p className="text-xs text-muted-foreground mt-1">
              Take a photo of your bill to auto-extract items
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
            >
              <Camera className="w-4 h-4" /> Scan Bill
            </button>
            <button
              onClick={() => setStep('manual')}
              className="px-5 py-3 rounded-xl bg-muted text-foreground text-sm font-semibold flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Manual Entry
            </button>
          </div>
        </div>
      )}

      {/* Step: Scanning */}
      {step === 'scanning' && (
        <div className="text-center py-12 space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-foreground">Reading your receipt...</p>
          <p className="text-xs text-muted-foreground">AI is extracting items and prices</p>
        </div>
      )}

      {/* Step: Confirm scanned items */}
      {(step === 'confirm' || step === 'manual') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              {step === 'confirm' ? `${scannedItems.length} Items Found` : 'Add Items'}
            </h3>
            {step === 'confirm' && (
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-primary font-semibold"
              >
                Rescan
              </button>
            )}
          </div>

          {/* Store name */}
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            placeholder="Store name (optional)"
            className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />

          {/* Items list */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {scannedItems.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-subtle p-3 space-y-2"
              >
                {editingIdx === idx ? (
                  <div className="space-y-2">
                    <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" autoFocus />
                    <div className="flex gap-2">
                      <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-20 px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" />
                      <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                        className="px-2.5 py-2 rounded-lg bg-muted text-sm outline-none">
                        <option value="kg">kg</option><option value="g">g</option>
                        <option value="liter">liter</option><option value="ml">ml</option>
                        <option value="piece">piece</option><option value="dozen">dozen</option>
                      </select>
                      <input type="number" value={item.price} onChange={e => updateItem(idx, 'price', Number(e.target.value))}
                        placeholder="₹" className="w-24 px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" />
                    </div>
                    <button onClick={() => setEditingIdx(null)} className="text-xs text-primary font-semibold">Done</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.quantity} {item.unit}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">₹{item.price}</span>
                    <button onClick={() => setEditingIdx(idx)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Add manual item inline */}
          <div className="card-subtle p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground">+ Add item</p>
            <div className="flex gap-2">
              <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Item"
                className="flex-1 px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" />
              <input type="number" value={manualQty} onChange={e => setManualQty(e.target.value)} placeholder="Qty"
                className="w-16 px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" />
            </div>
            <div className="flex gap-2">
              <select value={manualUnit} onChange={e => setManualUnit(e.target.value)}
                className="px-2.5 py-2 rounded-lg bg-muted text-sm outline-none">
                <option value="kg">kg</option><option value="g">g</option>
                <option value="liter">liter</option><option value="ml">ml</option>
                <option value="piece">piece</option><option value="dozen">dozen</option>
              </select>
              <input type="number" value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="₹ Price"
                className="flex-1 px-2.5 py-2 rounded-lg bg-muted text-sm outline-none" />
              <button onClick={addManualItem} disabled={!manualName.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total & confirm */}
          {scannedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted-foreground">Total</span>
                <span className="text-lg font-extrabold text-foreground">
                  ₹{scannedItems.reduce((s, i) => s + i.price, 0)}
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                  Cancel
                </button>
                <button onClick={confirmAll}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Add to Pantry
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
