import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ChefHat } from 'lucide-react';
import type { WeekPlan } from '@/lib/meal-planner-store';

// Re-export the sub-tab components from MealPlannerTabs
// They'll be extracted here in the future; for now we pass them as children
interface KitchenTabProps {
  groceriesContent: React.ReactNode;
  recipesContent: React.ReactNode;
}

type KitchenSubTab = 'groceries' | 'recipes';

export default function KitchenTab({ groceriesContent, recipesContent }: KitchenTabProps) {
  const [subTab, setSubTab] = useState<KitchenSubTab>('groceries');

  return (
    <div className="space-y-4">
      {/* Pill Toggle */}
      <div className="flex bg-muted rounded-full p-1">
        {([
          { key: 'groceries' as const, label: '🛒 Groceries', icon: ShoppingCart },
          { key: 'recipes' as const, label: '👩‍🍳 Recipes', icon: ChefHat },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all relative ${
              subTab === tab.key ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {subTab === tab.key && (
              <motion.div
                layoutId="kitchenSubTab"
                className="absolute inset-0 bg-card rounded-full shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'groceries' && groceriesContent}
      {subTab === 'recipes' && recipesContent}
    </div>
  );
}
