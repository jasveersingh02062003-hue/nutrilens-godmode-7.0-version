import { scopedGet, scopedSet } from "./scoped-storage";
import { safeJsonParse } from "./safe-json";
// ─── Pantry Management ───
// Tracks grocery inventory with FIFO costing and low-stock alerts

import { toLocalDateStr } from './date-utils';

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePaid: number;        // total paid for this batch
  pricePerUnit: number;     // derived: pricePaid / original quantity
  originalQuantity: number;
  purchaseDate: string;
  expiryDate?: string;
  category: string;
}

export interface GroceryPurchase {
  id: string;
  date: string;
  storeName?: string;
  items: GroceryPurchaseItem[];
  totalAmount: number;
  currency: string;
}

export interface GroceryPurchaseItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
}

const PANTRY_KEY = 'nutrilens_pantry';
const PURCHASES_KEY = 'nutrilens_grocery_purchases';

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ─── Pantry CRUD ───

export function getPantryItems(): PantryItem[] {
  const data = scopedGet(PANTRY_KEY);
  return data ? JSON.parse(data) : [];
}

function savePantryItems(items: PantryItem[]) {
  scopedSet(PANTRY_KEY, JSON.stringify(items));
}

export function addPantryItem(item: Omit<PantryItem, 'id' | 'pricePerUnit' | 'originalQuantity'>): PantryItem {
  const items = getPantryItems();
  const newItem: PantryItem = {
    ...item,
    id: genId(),
    originalQuantity: item.quantity,
    pricePerUnit: item.quantity > 0 ? item.pricePaid / item.quantity : 0,
  };
  items.push(newItem);
  savePantryItems(items);
  return newItem;
}

export function updatePantryItem(id: string, updates: Partial<PantryItem>) {
  const items = getPantryItems().map(i => i.id === id ? { ...i, ...updates } : i);
  savePantryItems(items);
}

export function deletePantryItem(id: string) {
  savePantryItems(getPantryItems().filter(i => i.id !== id));
}

/** Deduct quantity from pantry (FIFO). Returns cost of consumed items. */
export function deductFromPantry(itemName: string, quantity: number, unit: string): number {
  const items = getPantryItems();
  const q = itemName.toLowerCase();
  let remaining = quantity;
  let cost = 0;

  // Sort by purchase date (FIFO)
  const matching = items
    .filter(i => i.name.toLowerCase().includes(q) || q.includes(i.name.toLowerCase()))
    .filter(i => i.unit === unit && i.quantity > 0)
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

  for (const item of matching) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, item.quantity);
    cost += take * item.pricePerUnit;
    item.quantity -= take;
    remaining -= take;
  }

  savePantryItems(items);
  return Math.round(cost);
}

// ─── Low Stock Detection ───

export interface LowStockAlert {
  itemName: string;
  remaining: number;
  unit: string;
  percentLeft: number;
  expiryDate?: string;
  isExpiringSoon: boolean;
}

export function getLowStockAlerts(): LowStockAlert[] {
  const items = getPantryItems();
  const alerts: LowStockAlert[] = [];
  const today = toLocalDateStr();
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);
  const threeDaysLater = toLocalDateStr(threeDays);

  for (const item of items) {
    const pctLeft = item.originalQuantity > 0 ? (item.quantity / item.originalQuantity) * 100 : 0;
    const isExpiringSoon = !!item.expiryDate && item.expiryDate <= threeDaysLater && item.expiryDate >= today;
    const isExpired = !!item.expiryDate && item.expiryDate < today;

    if (pctLeft <= 15 || isExpiringSoon || isExpired) {
      alerts.push({
        itemName: item.name,
        remaining: item.quantity,
        unit: item.unit,
        percentLeft: Math.round(pctLeft),
        expiryDate: item.expiryDate,
        isExpiringSoon: isExpiringSoon || isExpired,
      });
    }
  }
  return alerts;
}

// ─── Grocery Purchases ───

export function getGroceryPurchases(): GroceryPurchase[] {
  const data = scopedGet(PURCHASES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveGroceryPurchase(purchase: Omit<GroceryPurchase, 'id'>): GroceryPurchase {
  const purchases = getGroceryPurchases();
  const saved: GroceryPurchase = { ...purchase, id: genId() };
  purchases.push(saved);
  scopedSet(PURCHASES_KEY, JSON.stringify(purchases));

  // Auto-add items to pantry
  for (const item of purchase.items) {
    addPantryItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      pricePaid: item.price,
      purchaseDate: purchase.date,
      category: 'grocery',
    });
  }

  return saved;
}

// ─── Pantry summary for UI ───

export function getPantrySummary(): { totalItems: number; totalValue: number; lowStockCount: number; expiringCount: number } {
  const items = getPantryItems();
  const alerts = getLowStockAlerts();
  const totalValue = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  return {
    totalItems: items.filter(i => i.quantity > 0).length,
    totalValue: Math.round(totalValue),
    lowStockCount: alerts.filter(a => a.percentLeft <= 15).length,
    expiringCount: alerts.filter(a => a.isExpiringSoon).length,
  };
}
