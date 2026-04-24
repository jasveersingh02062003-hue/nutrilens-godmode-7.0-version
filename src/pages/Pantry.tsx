import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Package, Plus, Minus, Edit3, Trash2, AlertTriangle,
  ShoppingBag, ScanLine, X, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getPantryItems, addPantryItem, updatePantryItem, deletePantryItem,
  getLowStockAlerts, type PantryItem
} from '@/lib/pantry-store';
import GroceryBillScanner from '@/components/GroceryBillScanner';
import MonikaFab from '@/components/MonikaFab';
import { toast } from 'sonner';

function UseItemModal({ item, onClose, onUsed }: { item: PantryItem; onClose: () => void; onUsed: () => void }) {
  const [amount, setAmount] = useState('');

  const handleUse = () => {
    const qty = Number(amount);
    if (!qty || qty <= 0) return;
    if (qty > item.quantity) {
      toast.error(`Only ${item.quantity}${item.unit} available`);
      return;
    }
    updatePantryItem(item.id, { quantity: Math.round((item.quantity - qty) * 100) / 100 });
    toast.success(`Used ${qty}${item.unit} of ${item.name}`);
    onUsed();
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Use {item.name}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Available: {item.quantity} {item.unit}
        </p>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="Quantity" autoFocus
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20" />
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">Cancel</button>
          <button onClick={handleUse} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Deduct</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EditItemModal({ item, onClose, onSaved }: { item: PantryItem; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.quantity));
  const [unit, setUnit] = useState(item.unit);
  const [expiryDate, setExpiryDate] = useState(item.expiryDate || '');

  const handleSave = () => {
    updatePantryItem(item.id, {
      name: name.trim() || item.name,
      quantity: Number(qty) || item.quantity,
      unit,
      expiryDate: expiryDate || undefined,
    });
    toast.success('Updated');
    onSaved();
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Edit Item</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
          className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" autoFocus />
        <div className="flex gap-2">
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty"
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          <select value={unit} onChange={e => setUnit(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-muted text-sm outline-none">
            <option value="kg">kg</option><option value="g">g</option>
            <option value="liter">liter</option><option value="ml">ml</option>
            <option value="piece">piece</option><option value="dozen">dozen</option>
          </select>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Expiry Date (optional)</p>
          <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Save</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AddItemForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const handleSave = () => {
    if (!name.trim() || !qty) return;
    addPantryItem({
      name: name.trim(),
      quantity: Number(qty),
      unit,
      pricePaid: Number(price) || 0,
      purchaseDate: (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })(),
      expiryDate: expiryDate || undefined,
      category: 'grocery',
    });
    toast.success(`${name.trim()} added to pantry`);
    onAdded();
    onClose();
  };

  return (
    <div className="card-subtle p-4 space-y-3">
      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Add Item</h3>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name"
        className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" autoFocus />
      <div className="flex gap-2">
        <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty"
          className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        <select value={unit} onChange={e => setUnit(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-muted text-sm outline-none">
          <option value="kg">kg</option><option value="g">g</option>
          <option value="liter">liter</option><option value="ml">ml</option>
          <option value="piece">piece</option><option value="dozen">dozen</option>
        </select>
      </div>
      <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price paid (₹)"
        className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Expiry Date (optional)</p>
        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-sm font-semibold text-muted-foreground">Cancel</button>
        <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Add</button>
      </div>
    </div>
  );
}

export default function Pantry() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [useItem, setUseItem] = useState<PantryItem | null>(null);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);

  const refresh = () => setRefreshKey(k => k + 1);

  const allItems = useMemo(() => getPantryItems(), [refreshKey]);
  const alerts = useMemo(() => getLowStockAlerts(), [refreshKey]);

  const items = useMemo(() => {
    const active = allItems.filter(i => i.quantity > 0);
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter(i => i.name.toLowerCase().includes(q));
  }, [allItems, search, refreshKey]);

  const totalValue = useMemo(() =>
    items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0), [items]);

  const handleDelete = (item: PantryItem) => {
    deletePantryItem(item.id);
    toast.success(`${item.name} removed`);
    refresh();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">My Pantry</h1>
            <p className="text-xs text-muted-foreground">{items.length} items · ₹{Math.round(totalValue)} value</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pantry..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        {/* Low stock alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="text-[11px] font-bold text-destructive uppercase tracking-wider px-1">⚠️ Alerts</h3>
            {alerts.slice(0, 4).map(a => (
              <div key={a.itemName} className="flex items-center gap-2 text-xs bg-destructive/5 border border-destructive/10 rounded-xl p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <span className="text-foreground font-medium truncate flex-1">{a.itemName}</span>
                <span className="text-muted-foreground text-[10px]">
                  {a.isExpiringSoon ? 'Expiring soon!' : `${a.remaining}${a.unit} (${a.percentLeft}%)`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Items list */}
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map(item => {
              const pctLeft = item.originalQuantity > 0 ? (item.quantity / item.originalQuantity) * 100 : 100;
              const barColor = pctLeft <= 15 ? 'bg-destructive' : pctLeft <= 40 ? 'bg-accent' : 'bg-primary';

              return (
                <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="card-subtle p-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Bought {new Date(item.purchaseDate + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        {item.pricePaid > 0 && ` · ₹${item.pricePaid}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{item.quantity}{item.unit}</p>
                      {item.pricePerUnit > 0 && (
                        <p className="text-[10px] text-muted-foreground">₹{Math.round(item.pricePerUnit)}/{item.unit}</p>
                      )}
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, pctLeft)}%` }} />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setUseItem(item)}
                      className="flex-1 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center gap-1">
                      <Minus className="w-3 h-3" /> Use
                    </button>
                    <button onClick={() => setEditItem(item)}
                      className="flex-1 py-1.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center gap-1">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleDelete(item)}
                      className="py-1.5 px-3 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 px-4 space-y-4"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto">
              <Package className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-foreground">
                {search ? 'No items match your search' : 'Your pantry is empty'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {search
                  ? 'Try a different name or clear the search to see all items'
                  : 'Track what you have at home so we can suggest meals using your ingredients and reduce waste'}
              </p>
            </div>
            {!search && (
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2 max-w-xs mx-auto">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAddForm(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowScanner(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-muted text-foreground text-xs font-semibold border border-border"
                >
                  <ScanLine className="w-3.5 h-3.5" /> Scan Bill
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* Add item form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <AddItemForm onClose={() => setShowAddForm(false)} onAdded={refresh} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner */}
        <AnimatePresence>
          {showScanner && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              <GroceryBillScanner
                onComplete={() => { setShowScanner(false); refresh(); }}
                onClose={() => setShowScanner(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick actions */}
        {!showAddForm && !showScanner && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowAddForm(true)}
              className="py-3 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
            <button onClick={() => setShowScanner(true)}
              className="py-3 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5" /> Scan Receipt
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {useItem && <UseItemModal item={useItem} onClose={() => setUseItem(null)} onUsed={refresh} />}
      </AnimatePresence>
      <AnimatePresence>
        {editItem && <EditItemModal item={editItem} onClose={() => setEditItem(null)} onSaved={refresh} />}
      </AnimatePresence>

      <MonikaFab />
    </div>
  );
}
