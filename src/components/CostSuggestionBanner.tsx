import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Gift, ChevronDown, ChevronUp, Sparkles, Edit3, Check, X, Info, Save } from 'lucide-react';
import { mobileOverlayMotion, mobileOverlayTransition, mobileSheetMotion, mobileSheetTransition } from '@/hooks/use-body-scroll-lock';
import { estimateCostWithBreakdown, onPriceAccepted, onPriceEdited, type CostEstimate } from '@/lib/price-memory';
import { wouldExceedBudget } from '@/lib/budget-alerts';

interface Props {
  items: { name: string; quantity?: number; unit?: string }[];
  onCostConfirm: (amount: number) => void;
  onFree: () => void;
  dark?: boolean;
}

export default function CostSuggestionBanner({ items, onCostConfirm, onFree, dark = false }: Props) {
  const estimate = useMemo(() => estimateCostWithBreakdown(items), [items]);
  const [customAmount, setCustomAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);
  const [editPerUnit, setEditPerUnit] = useState('');

  const budgetCheck = useMemo(
    () => estimate.totalCost > 0 ? wouldExceedBudget(estimate.totalCost) : null,
    [estimate.totalCost]
  );

  const handleAccept = () => {
    const amount = editing && customAmount ? parseFloat(customAmount) : estimate.totalCost;
    // Learn from accepted price
    for (const b of estimate.breakdown) {
      onPriceAccepted(b.name, b.pricePerUnit, b.unit);
    }
    onCostConfirm(amount > 0 ? amount : 0);
  };

  const handleEditSave = () => {
    if (editItemIdx !== null && editPerUnit) {
      const item = estimate.breakdown[editItemIdx];
      const newPrice = parseFloat(editPerUnit);
      if (newPrice > 0) {
        onPriceEdited(item.name, newPrice, item.unit, saveAsDefault);
      }
    } else if (customAmount) {
      // Editing total — proportionally learn prices
      const ratio = parseFloat(customAmount) / (estimate.totalCost || 1);
      for (const b of estimate.breakdown) {
        onPriceEdited(b.name, Math.round(b.pricePerUnit * ratio * 100) / 100, b.unit, saveAsDefault);
      }
    }
    setShowEditModal(false);
    setEditItemIdx(null);
    const amount = customAmount ? parseFloat(customAmount) : estimate.totalCost;
    onCostConfirm(amount);
  };

  const handleFree = () => {
    onFree();
  };

  const openEditItem = (idx: number) => {
    setEditItemIdx(idx);
    setEditPerUnit(String(estimate.breakdown[idx].pricePerUnit));
    setShowEditModal(true);
  };

  const openEditTotal = () => {
    setEditing(true);
    setCustomAmount(String(estimate.totalCost));
    setEditItemIdx(null);
    setShowEditModal(true);
  };

  // ─── No price data: simple input ───
  if (estimate.totalCost === 0 && estimate.breakdown.length === 0) {
    return (
      <div className={`rounded-2xl p-3 space-y-2 ${dark ? 'bg-primary-foreground/10 border border-primary-foreground/10' : 'card-subtle'}`}>
        <div className="flex items-center gap-2">
          <IndianRupee className={`w-3.5 h-3.5 ${dark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`} />
          <span className={`text-xs font-semibold ${dark ? 'text-primary-foreground/80' : 'text-foreground'}`}>
            Add meal cost (optional)
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 flex-1">
            <span className={`text-xs ${dark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>₹</span>
            <input
              type="number"
              inputMode="numeric"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="0"
              className={`flex-1 px-2.5 py-2 rounded-xl text-sm outline-none ${
                dark
                  ? 'bg-primary-foreground/10 border border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary/50'
                  : 'bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20'
              }`}
            />
          </div>
          <button
            onClick={() => {
              if (customAmount) {
                // Learn the price
                for (const item of items) {
                  if (items.length === 1 && customAmount) {
                    onPriceEdited(item.name, parseFloat(customAmount) / (item.quantity || 1), item.unit || 'serving', true);
                  }
                }
                onCostConfirm(parseFloat(customAmount));
              } else {
                onFree();
              }
            }}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
          >
            {customAmount ? 'Save' : 'Skip'}
          </button>
          <button onClick={handleFree}
            className={`px-2.5 py-2 rounded-xl text-xs font-medium ${dark ? 'bg-primary-foreground/10 text-primary-foreground/70' : 'bg-muted text-muted-foreground'}`}>
            <Gift className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Confidence label
  const confidenceLabel = estimate.confidence === 'high' ? 'AI confident' :
    estimate.confidence === 'medium' ? 'Partial estimate' : 'Rough estimate';
  const sourceLabel = estimate.source === 'user_history' ? 'from your history' : 'market rate';

  return (
    <>
      <div className={`rounded-2xl p-3.5 space-y-2.5 ${dark ? 'bg-primary-foreground/10 border border-primary-foreground/10' : 'card-subtle'}`}>
        {/* Header with estimate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dark ? 'bg-emerald-500/20' : 'bg-primary/10'}`}>
              <IndianRupee className={`w-3.5 h-3.5 ${dark ? 'text-emerald-400' : 'text-primary'}`} />
            </div>
            <div>
              <span className={`text-xs font-semibold ${dark ? 'text-primary-foreground' : 'text-foreground'}`}>
                Cost Estimate
              </span>
              <div className="flex items-center gap-1">
                <Sparkles className={`w-2.5 h-2.5 ${dark ? 'text-primary-foreground/40' : 'text-muted-foreground'}`} />
                <span className={`text-[10px] ${dark ? 'text-primary-foreground/40' : 'text-muted-foreground'}`}>
                  {confidenceLabel} · {sourceLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`text-xl font-extrabold ${dark ? 'text-primary-foreground' : 'text-foreground'}`}>
              ₹{estimate.totalCost}
            </span>
            <button onClick={openEditTotal}
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${dark ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'bg-muted hover:bg-muted/80'}`}>
              <Edit3 className={`w-3 h-3 ${dark ? 'text-primary-foreground/60' : 'text-muted-foreground'}`} />
            </button>
          </div>
        </div>

        {/* Budget warning */}
        {budgetCheck?.exceeds && (
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
            dark ? 'bg-destructive/20 border border-destructive/30 text-destructive' : 'bg-destructive/10 border border-destructive/20 text-destructive'
          }`}>
            ⚠️ This will push you over budget (₹{budgetCheck.newTotal}/₹{budgetCheck.budget})
          </div>
        )}

        {/* Why this price? + Breakdown toggle */}
        {estimate.breakdown.length > 0 && (
          <button onClick={() => setShowBreakdown(!showBreakdown)}
            className={`flex items-center gap-1 text-[11px] font-medium ${dark ? 'text-primary-foreground/50 hover:text-primary-foreground/70' : 'text-muted-foreground hover:text-foreground'}`}>
            {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <Info className="w-3 h-3" />}
            {showBreakdown ? 'Hide details' : 'Why this price?'}
          </button>
        )}

        {/* Breakdown details */}
        <AnimatePresence>
          {showBreakdown && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-1.5 pt-1">
                {estimate.breakdown.map((b, i) => (
                  <div key={i} className={`px-2.5 py-2 rounded-xl space-y-1 ${dark ? 'bg-primary-foreground/5' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${dark ? 'text-primary-foreground/80' : 'text-foreground'}`}>
                        {b.name} ({b.quantity} {b.unit})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${dark ? 'text-primary-foreground' : 'text-foreground'}`}>
                          ₹{b.subtotal}
                        </span>
                        <button onClick={() => openEditItem(i)}
                          className={`w-5 h-5 rounded flex items-center justify-center ${dark ? 'hover:bg-primary-foreground/10' : 'hover:bg-muted'}`}>
                          <Edit3 className={`w-2.5 h-2.5 ${dark ? 'text-primary-foreground/40' : 'text-muted-foreground'}`} />
                        </button>
                      </div>
                    </div>
                    <div className={`text-[10px] ${dark ? 'text-primary-foreground/30' : 'text-muted-foreground'}`}>
                      ₹{b.pricePerUnit}/{b.unit}
                      {b.priceRange && ` (range: ₹${b.priceRange.min}–₹${b.priceRange.max})`}
                      {' · '}{b.source === 'user_history' ? '📌 Your data' : '📊 Market avg'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={handleAccept}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Accept ₹{estimate.totalCost}
          </button>
          <button onClick={openEditTotal}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              dark ? 'bg-primary-foreground/10 text-primary-foreground/70' : 'bg-muted text-muted-foreground'
            }`}>
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={handleFree}
            className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              dark ? 'bg-primary-foreground/10 text-primary-foreground/70' : 'bg-muted text-muted-foreground'
            }`}>
            <Gift className="w-3.5 h-3.5" /> Home/Free
          </button>
        </div>
      </div>

      {/* ─── Edit Price Modal ─── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm px-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Edit Price</h3>
                <button onClick={() => setShowEditModal(false)} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {editItemIdx !== null ? (
                // Editing a specific item
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {estimate.breakdown[editItemIdx].name} (per {estimate.breakdown[editItemIdx].unit})
                  </p>
                  {estimate.breakdown[editItemIdx].priceRange && (
                    <p className="text-[11px] text-muted-foreground">
                      Current range: ₹{estimate.breakdown[editItemIdx].priceRange!.min}–₹{estimate.breakdown[editItemIdx].priceRange!.max}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={editPerUnit}
                      onChange={e => setEditPerUnit(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <span className="text-xs text-muted-foreground">/{estimate.breakdown[editItemIdx].unit}</span>
                  </div>
                </div>
              ) : (
                // Editing total cost
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Total meal cost
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Save as default checkbox */}
              <button
                onClick={() => setSaveAsDefault(!saveAsDefault)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  saveAsDefault
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  saveAsDefault ? 'bg-primary border-primary' : 'border-border'
                }`}>
                  {saveAsDefault && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                <Save className="w-3.5 h-3.5" />
                Save as my default for this item
              </button>

              <p className={`text-[10px] ${saveAsDefault ? 'text-primary/70' : 'text-muted-foreground'}`}>
                {saveAsDefault
                  ? '✨ Future suggestions will use this price'
                  : 'Apply only this time — won\'t change future suggestions'}
              </p>

              <div className="flex gap-2">
                <button onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                  Cancel
                </button>
                <button onClick={handleEditSave}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
