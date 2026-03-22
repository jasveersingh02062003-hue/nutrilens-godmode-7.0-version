import { useState } from 'react';
import { ArrowLeft, Clock, Flame, Beef, Wheat, Droplets, ChefHat, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { Recipe } from '@/lib/recipes';
import { getRecipeImage } from '@/lib/recipe-images';

interface Props {
  recipe: Recipe;
  onBack: () => void;
}

export default function RecipeDetail({ recipe, onBack }: Props) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const imageUrl = getRecipeImage(recipe.id, recipe.mealType[0]);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="max-w-lg mx-auto">
        {/* Hero with real image */}
        <div className="relative">
          <div className="h-52 overflow-hidden">
            <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
          <button onClick={onBack} className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-background/80 backdrop-blur border border-border flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="text-xl font-bold text-foreground">{recipe.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">{recipe.description}</p>
            <div className="flex gap-3 mt-2">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {recipe.prepTime + recipe.cookTime} min</span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><ChefHat className="w-3 h-3" /> {recipe.difficulty}</span>
              <span className="text-[11px] text-muted-foreground">{recipe.servings} serving{recipe.servings > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        <div className="px-4 space-y-5 mt-2">
          {/* Nutrition */}
          <div className="card-elevated p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Nutrition per serving</h3>
            <div className="grid grid-cols-5 gap-2">
              {[
                { icon: Flame, label: 'Calories', val: `${recipe.calories}`, unit: 'kcal', color: 'text-coral' },
                { icon: Beef, label: 'Protein', val: `${recipe.protein}`, unit: 'g', color: 'text-coral' },
                { icon: Wheat, label: 'Carbs', val: `${recipe.carbs}`, unit: 'g', color: 'text-primary' },
                { icon: Droplets, label: 'Fat', val: `${recipe.fat}`, unit: 'g', color: 'text-gold' },
                { icon: Wheat, label: 'Fiber', val: `${recipe.fiber}`, unit: 'g', color: 'text-mint' },
              ].map(n => (
                <div key={n.label} className="text-center">
                  <n.icon className={`w-4 h-4 mx-auto mb-1 ${n.color}`} />
                  <p className="text-sm font-bold text-foreground">{n.val}</p>
                  <p className="text-[9px] text-muted-foreground">{n.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Ingredients</h3>
            <div className="space-y-1.5">
              {recipe.ingredients.map((ing, idx) => (
                <motion.button key={idx} onClick={() => toggleIngredient(idx)} whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${checkedIngredients.has(idx) ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checkedIngredients.has(idx) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {checkedIngredients.has(idx) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-sm flex-1 text-left ${checkedIngredients.has(idx) ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {ing.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{ing.quantity}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-3">Instructions</h3>
            <div className="space-y-3">
              {recipe.steps.map((s, idx) => (
                <motion.button key={idx} onClick={() => toggleStep(idx)} whileTap={{ scale: 0.98 }}
                  className={`w-full flex gap-3 p-3 rounded-xl border text-left transition-all ${completedSteps.has(idx) ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all ${completedSteps.has(idx) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {completedSteps.has(idx) ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <p className={`text-sm leading-relaxed ${completedSteps.has(idx) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{s}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tips */}
          {recipe.tips && (
            <div className="card-subtle p-3 bg-accent/5 border-accent/20">
              <p className="text-xs font-semibold text-accent mb-1">💡 Tip</p>
              <p className="text-xs text-foreground/80">{recipe.tips}</p>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pb-4">
            {recipe.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-medium text-muted-foreground capitalize">{tag.replace(/-/g, ' ')}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
